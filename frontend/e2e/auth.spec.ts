import { test, expect } from '@playwright/test'
import { makeTestUser, login, registerAndLogin } from './helpers/auth'

test.describe('Auth', () => {
  test('redirects to /login when unauthenticated', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveURL('/login')
  })

  test('registers a new user and lands on dashboard', async ({ page }) => {
    const user = makeTestUser()
    await registerAndLogin(page, user)
    await expect(page).toHaveURL('/')
    await expect(page.getByRole('heading', { name: 'Panel' })).toBeVisible()
  })

  test('shows error on invalid credentials', async ({ page }) => {
    await page.goto('/login')
    await page.getByLabel('Correo electrónico').fill('nobody@example.com')
    await page.getByLabel('Contraseña').fill('wrongpassword')
    await page.getByRole('button', { name: 'Iniciar sesión' }).click()
    await expect(page.getByText('Email o contraseña inválidos')).toBeVisible()
  })

  test('logs out and redirects to /login', async ({ page }) => {
    const user = makeTestUser()
    await registerAndLogin(page, user)
    await page.getByRole('button', { name: 'Cerrar sesión' }).click()
    await expect(page).toHaveURL('/login')
  })

  test('login with valid credentials lands on dashboard', async ({ page }) => {
    const user = makeTestUser()
    // Create the user first via registration
    await registerAndLogin(page, user)
    // Logout
    await page.getByRole('button', { name: 'Cerrar sesión' }).click()
    // Login again
    await login(page, user)
    await expect(page).toHaveURL('/')
    await expect(page.getByRole('heading', { name: 'Panel' })).toBeVisible()
  })
})
