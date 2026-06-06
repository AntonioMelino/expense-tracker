import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, Pencil, Trash2, ChevronLeft, ChevronRight, Download } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import client from '@/api/client'
import type { Category, PagedResult, Transaction } from '@/types'

type FormData = {
  amount: number
  description: string
  date: string
  type: number
  categoryId: string
}

function TransactionForm({
  defaultValues,
  categories,
  onSubmit,
  isPending,
}: {
  defaultValues?: Partial<FormData>
  categories: Category[]
  onSubmit: (data: FormData) => void
  isPending: boolean
}) {
  const { t } = useTranslation()

  const schema = useMemo(
    () =>
      z.object({
        amount: z.number().positive(t('transactions.amountPositive')),
        description: z.string().min(1, t('transactions.descriptionRequired')),
        date: z.string().min(1, t('transactions.dateRequired')),
        type: z.number().int().min(0).max(1),
        categoryId: z.string().min(1, t('transactions.categoryRequired')),
      }),
    [t]
  )

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      amount: undefined,
      description: '',
      date: new Date().toISOString().slice(0, 10),
      type: 1,
      categoryId: '',
      ...defaultValues,
    },
  })

  const type = watch('type')
  const categoryId = watch('categoryId')

  return (
    <form id="transaction-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="amount">{t('transactions.amount')}</Label>
          <Input
            id="amount"
            type="number"
            step="0.01"
            min="0.01"
            {...register('amount', { valueAsNumber: true })}
          />
          {errors.amount && <p className="text-sm text-destructive">{errors.amount.message}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="date">{t('transactions.date')}</Label>
          <Input id="date" type="date" {...register('date')} />
          {errors.date && <p className="text-sm text-destructive">{errors.date.message}</p>}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">{t('transactions.description')}</Label>
        <Input id="description" {...register('description')} />
        {errors.description && (
          <p className="text-sm text-destructive">{errors.description.message}</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>{t('transactions.type')}</Label>
          <Select
            value={String(type)}
            onValueChange={(v) => setValue('type', Number(v) as 0 | 1)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="0">{t('transactions.income')}</SelectItem>
              <SelectItem value="1">{t('transactions.expense')}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>{t('transactions.category')}</Label>
          <Select value={categoryId} onValueChange={(v) => setValue('categoryId', v)}>
            <SelectTrigger>
              <SelectValue placeholder={t('transactions.selectCategory')} />
            </SelectTrigger>
            <SelectContent>
              {categories.map((cat) => (
                <SelectItem key={cat.id} value={cat.id}>
                  {cat.icon} {cat.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.categoryId && (
            <p className="text-sm text-destructive">{errors.categoryId.message}</p>
          )}
        </div>
      </div>

      <DialogFooter>
        <Button type="submit" form="transaction-form" disabled={isPending}>
          {isPending ? t('transactions.saving') : t('transactions.save')}
        </Button>
      </DialogFooter>
    </form>
  )
}

const PAGE_SIZE = 10

export default function TransactionsPage() {
  const { t, i18n } = useTranslation()
  const qc = useQueryClient()
  const now = new Date()

  const [month, setMonth] = useState(now.getMonth() + 1)
  const [year, setYear] = useState(now.getFullYear())
  const [categoryId, setCategoryId] = useState('')
  const [type, setType] = useState('')
  const [page, setPage] = useState(1)

  const [createOpen, setCreateOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<Transaction | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Transaction | null>(null)
  const [isExporting, setIsExporting] = useState(false)

  const locale = i18n.language === 'es' ? 'es-AR' : 'en-US'
  const months = t('months.full', { returnObjects: true }) as string[]

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat(locale, { style: 'currency', currency: 'USD' }).format(amount)

  const formatDate = (dateStr: string) => {
    const [y, m, d] = dateStr.split('-').map(Number)
    return new Intl.DateTimeFormat(locale, { month: 'short', day: 'numeric', year: 'numeric' }).format(
      new Date(y, m - 1, d)
    )
  }

  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ['categories'],
    queryFn: () => client.get('/categories').then((r) => r.data),
  })

  const params = new URLSearchParams({
    month: String(month),
    year: String(year),
    page: String(page),
    pageSize: String(PAGE_SIZE),
  })
  if (categoryId) params.set('categoryId', categoryId)
  if (type !== '') params.set('type', type)

  const { data, isLoading } = useQuery<PagedResult<Transaction>>({
    queryKey: ['transactions', { month, year, categoryId, type, page }],
    queryFn: () => client.get(`/transactions?${params}`).then((r) => r.data),
  })

  const invalidate = () => qc.invalidateQueries({ queryKey: ['transactions'] })

  const createMutation = useMutation({
    mutationFn: (fd: FormData) => client.post('/transactions', fd).then((r) => r.data),
    onSuccess: () => { invalidate(); setCreateOpen(false); toast.success(t('transactions.toastCreated')) },
    onError: () => toast.error(t('common.error')),
  })

  const updateMutation = useMutation({
    mutationFn: (fd: FormData) =>
      client.put(`/transactions/${editTarget!.id}`, fd).then((r) => r.data),
    onSuccess: () => { invalidate(); setEditTarget(null); toast.success(t('transactions.toastUpdated')) },
    onError: () => toast.error(t('common.error')),
  })

  const deleteMutation = useMutation({
    mutationFn: () => client.delete(`/transactions/${deleteTarget!.id}`),
    onSuccess: () => { invalidate(); setDeleteTarget(null); toast.success(t('transactions.toastDeleted')) },
    onError: () => toast.error(t('common.error')),
  })

  const totalPages = data ? Math.ceil(data.total / PAGE_SIZE) : 1
  const resetPage = () => setPage(1)

  const exportToCsv = async () => {
    setIsExporting(true)
    try {
      const exportParams = new URLSearchParams({
        month: String(month),
        year: String(year),
        page: '1',
        pageSize: '10000',
      })
      if (categoryId) exportParams.set('categoryId', categoryId)
      if (type !== '') exportParams.set('type', type)

      const result = await client.get<PagedResult<Transaction>>(`/transactions?${exportParams}`)
      const items = result.data.items

      if (!items.length) {
        toast.info(t('transactions.exportEmpty'))
        return
      }

      const headers = [
        t('transactions.date'),
        t('transactions.description'),
        t('transactions.category'),
        t('transactions.type'),
        t('transactions.amount'),
      ]

      const escape = (s: string) => `"${s.replace(/"/g, '""')}"`

      const rows = items.map((tx) => [
        tx.date,
        escape(tx.description),
        escape(tx.categoryName),
        tx.type === 0 ? t('transactions.income') : t('transactions.expense'),
        tx.type === 0 ? tx.amount : -tx.amount,
      ])

      const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n')
      const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `transactions-${year}-${String(month).padStart(2, '0')}.csv`
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      toast.error(t('common.error'))
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl md:text-2xl font-bold">{t('transactions.title')}</h1>
          {data && (
            <p className="text-muted-foreground text-sm">
              {t('transactions.found', { count: data.total })}
            </p>
          )}
        </div>
        <div className="flex gap-2 shrink-0">
          <Button
            variant="outline"
            onClick={exportToCsv}
            disabled={isExporting}
          >
            <Download className="h-4 w-4 md:mr-1" />
            <span className="hidden sm:inline">
              {isExporting ? t('transactions.exporting') : t('transactions.exportCsv')}
            </span>
          </Button>
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4 md:mr-1" />
            <span className="hidden sm:inline">{t('transactions.newTransaction')}</span>
          </Button>
        </div>
      </div>

      {/* Filters: 2-col grid on mobile, flex row on sm+ */}
      <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:gap-3">
        <Select
          value={String(month)}
          onValueChange={(v) => { setMonth(Number(v)); resetPage() }}
        >
          <SelectTrigger className="w-full sm:w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {months.map((m, i) => (
              <SelectItem key={i + 1} value={String(i + 1)}>
                {m}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={String(year)}
          onValueChange={(v) => { setYear(Number(v)); resetPage() }}
        >
          <SelectTrigger className="w-full sm:w-28">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {[now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1].map((y) => (
              <SelectItem key={y} value={String(y)}>
                {y}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={categoryId || 'all'}
          onValueChange={(v) => { setCategoryId(v === 'all' ? '' : v); resetPage() }}
        >
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue placeholder={t('transactions.allCategories')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('transactions.allCategories')}</SelectItem>
            {categories.map((cat) => (
              <SelectItem key={cat.id} value={cat.id}>
                {cat.icon} {cat.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={type || 'all'}
          onValueChange={(v) => { setType(v === 'all' ? '' : v); resetPage() }}
        >
          <SelectTrigger className="w-full sm:w-32">
            <SelectValue placeholder={t('transactions.allTypes')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('transactions.allTypes')}</SelectItem>
            <SelectItem value="0">{t('transactions.income')}</SelectItem>
            <SelectItem value="1">{t('transactions.expense')}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Transaction list */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="divide-y">
              {Array.from({ length: PAGE_SIZE }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 px-4 py-3">
                  <Skeleton className="h-8 w-8 rounded-full shrink-0" />
                  <div className="flex-1 space-y-1.5">
                    <div className="flex justify-between gap-2">
                      <Skeleton className="h-4 w-1/2" />
                      <Skeleton className="h-4 w-16 shrink-0" />
                    </div>
                    <Skeleton className="h-3 w-1/3" />
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Skeleton className="h-8 w-8" />
                    <Skeleton className="h-8 w-8" />
                  </div>
                </div>
              ))}
            </div>
          ) : !data?.items.length ? (
            <p className="text-center text-muted-foreground py-8">{t('transactions.noTransactions')}</p>
          ) : (
            <div className="divide-y">
              {data.items.map((tx) => (
                <div key={tx.id} className="flex items-center gap-3 px-4 py-3">
                  <span className="text-xl shrink-0">{tx.categoryIcon}</span>

                  {/* Main info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium truncate">{tx.description}</p>
                      <span
                        className={`text-sm font-semibold shrink-0 ${
                          tx.type === 0 ? 'text-green-600' : 'text-red-600'
                        }`}
                      >
                        {tx.type === 0 ? '+' : '-'}{formatCurrency(tx.amount)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-2 mt-0.5">
                      <p className="text-xs text-muted-foreground truncate">
                        {tx.categoryName} · {formatDate(tx.date)}
                      </p>
                      <Badge
                        variant={tx.type === 0 ? 'default' : 'destructive'}
                        className="text-xs shrink-0 hidden xs:inline-flex"
                      >
                        {tx.type === 0 ? t('transactions.income') : t('transactions.expense')}
                      </Badge>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-1 shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => setEditTarget(tx)}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => setDeleteTarget(tx)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3">
          <Button
            variant="outline"
            size="icon"
            disabled={page === 1}
            onClick={() => setPage((p) => p - 1)}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm text-muted-foreground">
            {t('transactions.page')} {page} {t('transactions.of')} {totalPages}
          </span>
          <Button
            variant="outline"
            size="icon"
            disabled={page === totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Dialogs */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="w-[calc(100%-2rem)] max-w-md">
          <DialogHeader>
            <DialogTitle>{t('transactions.createTitle')}</DialogTitle>
          </DialogHeader>
          <TransactionForm
            categories={categories}
            onSubmit={(data) => createMutation.mutate(data)}
            isPending={createMutation.isPending}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={!!editTarget} onOpenChange={(open) => !open && setEditTarget(null)}>
        <DialogContent className="w-[calc(100%-2rem)] max-w-md">
          <DialogHeader>
            <DialogTitle>{t('transactions.editTitle')}</DialogTitle>
          </DialogHeader>
          {editTarget && (
            <TransactionForm
              defaultValues={{
                amount: editTarget.amount,
                description: editTarget.description,
                date: editTarget.date,
                type: editTarget.type,
                categoryId: editTarget.categoryId,
              }}
              categories={categories}
              onSubmit={(data) => updateMutation.mutate(data)}
              isPending={updateMutation.isPending}
            />
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent className="w-[calc(100%-2rem)] max-w-md">
          <DialogHeader>
            <DialogTitle>{t('transactions.deleteTitle')}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            {t('transactions.deleteConfirm')} <strong>{deleteTarget?.description}</strong>?{' '}
            {t('transactions.deleteWarning')}
          </p>
          <DialogFooter className="flex-row justify-end gap-2">
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              {t('transactions.cancel')}
            </Button>
            <Button
              variant="destructive"
              disabled={deleteMutation.isPending}
              onClick={() => deleteMutation.mutate()}
            >
              {deleteMutation.isPending ? t('transactions.deleting') : t('transactions.delete')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
