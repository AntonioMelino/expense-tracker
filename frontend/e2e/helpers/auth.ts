import type { Page } from '@playwright/test'

export interface TestUser {
  email: string
  password: string
  fullName: string
}

export function makeTestUser(): TestUser {
  return {
    email: `e2e-${Date.now()}@test.com`,
    password: 'E2ETest123!',
    fullName: 'E2E Tester',
  }
}

export async function registerAndLogin(page: Page, user: TestUser): Promise<void> {
  await page.goto('/register')
  await page.getByLabel('Nombre completo').fill(user.fullName)
  await page.getByLabel('Correo electrónico').fill(user.email)
  await page.getByLabel('Contraseña').fill(user.password)
  await page.getByRole('button', { name: 'Crear cuenta' }).click()
  await page.waitForURL('/')
}

export async function login(page: Page, user: TestUser): Promise<void> {
  await page.goto('/login')
  await page.getByLabel('Correo electrónico').fill(user.email)
  await page.getByLabel('Contraseña').fill(user.password)
  await page.getByRole('button', { name: 'Iniciar sesión' }).click()
  await page.waitForURL('/')
}
