export interface User {
  id: string
  email: string
  fullName: string
}

export type TransactionType = 0 | 1

export interface Category {
  id: string
  name: string
  color: string
  icon: string
}

export interface Transaction {
  id: string
  amount: number
  description: string
  date: string
  type: TransactionType
  categoryId: string
  categoryName: string
  categoryColor: string
  categoryIcon: string
  createdAt: string
}

export interface PagedResult<T> {
  items: T[]
  total: number
  page: number
  pageSize: number
}

export interface MonthlySummary {
  totalIncome: number
  totalExpenses: number
  net: number
}
