import { test, expect, Browser } from '@playwright/test'
import { makeTestUser, registerAndLogin, login, TestUser } from './helpers/auth'

let user: TestUser
const CATEGORY_NAME = 'E2E Categoría'

test.beforeAll(async ({ browser }: { browser: Browser }) => {
  user = makeTestUser()
  const page = await browser.newPage()
  await registerAndLogin(page, user)

  // Create a category required for transaction tests
  await page.goto('/categories')
  await page.getByRole('button', { name: 'Nueva categoría' }).click()
  await page.getByLabel('Nombre').fill(CATEGORY_NAME)
  await page.getByLabel('Ícono (emoji)').fill('💰')
  await page.getByRole('button', { name: 'Guardar' }).click()
  await expect(page.getByText(CATEGORY_NAME)).toBeVisible()

  await page.close()
})

test.beforeEach(async ({ page }) => {
  await login(page, user)
  await page.goto('/transactions')
})

test.describe('Transactions', () => {
  test('creates a new income transaction', async ({ page }) => {
    await page.getByRole('button', { name: 'Nueva transacción' }).click()

    await page.getByLabel('Monto').fill('1500')
    await page.getByLabel('Descripción').fill('Sueldo de prueba')

    // Type select: default is "Gasto" — switch to "Ingreso"
    await page.getByRole('combobox').filter({ hasText: 'Gasto' }).click()
    await page.getByRole('option', { name: 'Ingreso' }).click()

    // Category select
    await page.getByRole('combobox').filter({ hasText: 'Seleccionar' }).click()
    await page.getByRole('option', { name: CATEGORY_NAME }).click()

    await page.getByRole('button', { name: 'Guardar' }).click()

    await expect(page.getByText('Sueldo de prueba')).toBeVisible()
  })

  test('creates an expense transaction', async ({ page }) => {
    await page.getByRole('button', { name: 'Nueva transacción' }).click()

    await page.getByLabel('Monto').fill('200')
    await page.getByLabel('Descripción').fill('Supermercado prueba')

    // Type is already "Gasto" by default — just pick category
    await page.getByRole('combobox').filter({ hasText: 'Seleccionar' }).click()
    await page.getByRole('option', { name: CATEGORY_NAME }).click()

    await page.getByRole('button', { name: 'Guardar' }).click()

    await expect(page.getByText('Supermercado prueba')).toBeVisible()
  })

  test('filters transactions by type', async ({ page }) => {
    // Filter by Ingreso — only income transactions should appear
    await page.getByRole('combobox').filter({ hasText: 'Todos los tipos' }).click()
    await page.getByRole('option', { name: 'Ingreso' }).click()

    // All visible amount signs should be "+"
    const amounts = page.locator('span.text-green-600')
    const count = await amounts.count()
    // At least one income or empty state — no red (expense) amounts
    const redAmounts = page.locator('span.text-red-600')
    await expect(redAmounts).toHaveCount(0)

    // Switch to Gasto filter
    await page.getByRole('combobox').filter({ hasText: 'Ingreso' }).click()
    await page.getByRole('option', { name: 'Gasto' }).click()

    await expect(page.locator('span.text-green-600')).toHaveCount(0)
  })

  test('exports transactions as CSV', async ({ page }) => {
    // Start listening for download before clicking
    const downloadPromise = page.waitForEvent('download')
    await page.getByRole('button', { name: 'Exportar CSV' }).click()
    const download = await downloadPromise

    expect(download.suggestedFilename()).toMatch(/^transactions-\d{4}-\d{2}\.csv$/)
  })
})
