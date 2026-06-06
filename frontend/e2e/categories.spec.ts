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
  await page.goto('/categories')
})

async function createCategory(page: Parameters<typeof login>[0], name: string, icon = '⭐') {
  await page.getByRole('button', { name: 'Nueva categoría' }).click()
  await page.getByLabel('Nombre').fill(name)
  await page.getByLabel('Ícono (emoji)').fill(icon)
  await page.getByRole('button', { name: 'Guardar' }).click()
  await expect(page.getByText(name)).toBeVisible()
}

test.describe('Categories', () => {
  test('creates a new category and shows it in the list', async ({ page }) => {
    await page.getByRole('button', { name: 'Nueva categoría' }).click()
    await page.getByLabel('Nombre').fill('Alimentación')
    await page.getByLabel('Ícono (emoji)').fill('🍕')
    await page.getByRole('button', { name: 'Guardar' }).click()

    await expect(page.getByText('Alimentación')).toBeVisible()
  })

  test('edits an existing category', async ({ page }) => {
    await createCategory(page, 'Transporte', '🚗')

    // Find the category card and click Edit (first button)
    const card = page.locator('div.rounded-xl.border').filter({ hasText: 'Transporte' })
    await card.getByRole('button').first().click()

    // Dialog opens pre-filled — change the name
    await page.getByLabel('Nombre').fill('Transporte Público')
    await page.getByRole('button', { name: 'Guardar' }).click()

    await expect(page.getByText('Transporte Público')).toBeVisible()
    await expect(page.getByText('Transporte', { exact: true })).not.toBeVisible()
  })

  test('deletes a category and removes it from the list', async ({ page }) => {
    await createCategory(page, 'Temporal', '🗑️')

    // Find the card and click Delete (second button)
    const card = page.locator('div.rounded-xl.border').filter({ hasText: 'Temporal' })
    await card.getByRole('button').nth(1).click()

    // Confirm deletion in dialog
    await page.getByRole('button', { name: 'Eliminar' }).click()

    await expect(page.getByText('Temporal')).not.toBeVisible()
  })

  test('shows category count in header', async ({ page }) => {
    await createCategory(page, 'Salud', '💊')
    // The count label should mention at least 1 category
    await expect(page.getByText(/categoría/i)).toBeVisible()
  })
})
