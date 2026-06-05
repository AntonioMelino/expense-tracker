import { useQuery } from '@tanstack/react-query'
import { TrendingUp, TrendingDown, Wallet } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import client from '@/api/client'
import type { MonthlySummary, PagedResult, Transaction } from '@/types'

export default function DashboardPage() {
  const { t, i18n } = useTranslation()
  const now = new Date()
  const month = now.getMonth() + 1
  const year = now.getFullYear()

  const locale = i18n.language === 'es' ? 'es-AR' : 'en-US'

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat(locale, { style: 'currency', currency: 'USD' }).format(amount)

  const formatDate = (dateStr: string) => {
    const [y, m, d] = dateStr.split('-').map(Number)
    return new Intl.DateTimeFormat(locale, { month: 'short', day: 'numeric' }).format(
      new Date(y, m - 1, d)
    )
  }

  const months = t('months.short', { returnObjects: true }) as string[]

  const { data: summary } = useQuery<MonthlySummary>({
    queryKey: ['summary', month, year],
    queryFn: () =>
      client.get(`/transactions/summary?month=${month}&year=${year}`).then((r) => r.data),
  })

  const { data: recent } = useQuery<PagedResult<Transaction>>({
    queryKey: ['transactions', { month, year, page: 1, pageSize: 5 }],
    queryFn: () =>
      client.get(`/transactions?month=${month}&year=${year}&page=1&pageSize=5`).then((r) => r.data),
  })

  const incomeLabel = t('dashboard.income')
  const expensesLabel = t('dashboard.expenses')
  const chartData = summary
    ? [{ name: months[month - 1], [incomeLabel]: summary.totalIncome, [expensesLabel]: summary.totalExpenses }]
    : []

  return (
    <div className="space-y-4 md:space-y-6">
      <div>
        <h1 className="text-xl md:text-2xl font-bold">{t('dashboard.title')}</h1>
        <p className="text-muted-foreground text-sm">
          {months[month - 1]} {year}
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 pt-4 px-4">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t('dashboard.income')}
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500 shrink-0" />
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <p className="text-xl md:text-2xl font-bold text-green-600">
              {formatCurrency(summary?.totalIncome ?? 0)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">{t('dashboard.thisMonth')}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 pt-4 px-4">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t('dashboard.expenses')}
            </CardTitle>
            <TrendingDown className="h-4 w-4 text-red-500 shrink-0" />
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <p className="text-xl md:text-2xl font-bold text-red-600">
              {formatCurrency(summary?.totalExpenses ?? 0)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">{t('dashboard.thisMonth')}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 pt-4 px-4">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t('dashboard.netBalance')}
            </CardTitle>
            <Wallet className="h-4 w-4 text-blue-500 shrink-0" />
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <p
              className={`text-xl md:text-2xl font-bold ${(summary?.net ?? 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}
            >
              {formatCurrency(summary?.net ?? 0)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">{t('dashboard.thisMonth')}</p>
          </CardContent>
        </Card>
      </div>

      {/* Chart + recent transactions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 md:gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm md:text-base">{t('dashboard.incomeVsExpenses')}</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={chartData} barCategoryGap="40%">
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `$${v}`} width={50} />
                <Tooltip formatter={(v) => formatCurrency(Number(v))} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey={incomeLabel} fill="#22c55e" radius={[4, 4, 0, 0]} />
                <Bar dataKey={expensesLabel} fill="#ef4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm md:text-base">{t('dashboard.recentTransactions')}</CardTitle>
          </CardHeader>
          <CardContent>
            {!recent?.items.length ? (
              <p className="text-muted-foreground text-sm text-center py-6">
                {t('dashboard.noTransactionsThisMonth')}
              </p>
            ) : (
              <div className="space-y-3">
                {recent.items.map((tx) => (
                  <div key={tx.id} className="flex items-center gap-3">
                    <span className="text-lg shrink-0">{tx.categoryIcon}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{tx.description}</p>
                      <p className="text-xs text-muted-foreground">
                        {tx.categoryName} · {formatDate(tx.date)}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <span
                        className={`text-sm font-semibold ${tx.type === 0 ? 'text-green-600' : 'text-red-600'}`}
                      >
                        {tx.type === 0 ? '+' : '-'}{formatCurrency(tx.amount)}
                      </span>
                      <Badge variant={tx.type === 0 ? 'default' : 'destructive'} className="text-xs">
                        {tx.type === 0 ? t('dashboard.incomeBadge') : t('dashboard.expenseBadge')}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
