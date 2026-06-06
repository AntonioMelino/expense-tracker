import { test, expect, Browser } from '@playwright/test'
import { makeTestUser, registerAndLogin, login, TestUser } from './helpers/auth'

let user: TestUser

test.beforeAll(async ({ browser }: { browser: Browser }) => {
  user = makeTestUser()
  const page = await browser.newPage()
  await registerAndLogin(page, user)
  await page.close()
})

test.beforeEach(async ({ page }) => {
  await login(page, user)
})

test.describe('Dashboard', () => {
  test('shows income, expenses, and net balance cards', async ({ page }) => {
    await expect(page.getByText('Ingresos').first()).toBeVisible()
    await expect(page.getByText('Gastos').first()).toBeVisible()
    await expect(page.getByText('Balance neto')).toBeVisible()
  })

  test('navigates to previous month and updates the header', async ({ page }) => {
    const now = new Date()
    const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const months = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
    ]
    const expectedLabel = `${months[prevMonth.getMonth()]} ${prevMonth.getFullYear()}`

    await page.getByRole('button', { name: 'Mes anterior' }).click()
    await expect(page.getByText(expectedLabel)).toBeVisible()
  })

  test('"Mes actual" button appears after navigating back and restores current month', async ({ page }) => {
    const now = new Date()
    const months = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
    ]
    const currentLabel = `${months[now.getMonth()]} ${now.getFullYear()}`

    // Navigate to previous month — "Mes actual" button should appear
    await page.getByRole('button', { name: 'Mes anterior' }).click()
    await expect(page.getByRole('button', { name: 'Mes actual' })).toBeVisible()

    // Return to current month — "Mes actual" button should disappear
    await page.getByRole('button', { name: 'Mes actual' }).click()
    await expect(page.getByText(currentLabel)).toBeVisible()
    await expect(page.getByRole('button', { name: 'Mes actual' })).not.toBeVisible()
  })

  test('next month button is disabled when on current month', async ({ page }) => {
    const nextButton = page.getByRole('button', { name: 'Mes siguiente' })
    await expect(nextButton).toBeDisabled()
  })
})
