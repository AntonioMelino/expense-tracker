import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, Pencil, Trash2, ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
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

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount)
}

function formatDate(dateStr: string) {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(
    new Date(y, m - 1, d)
  )
}

const schema = z.object({
  amount: z.number().positive('Amount must be positive'),
  description: z.string().min(1, 'Description is required'),
  date: z.string().min(1, 'Date is required'),
  type: z.number().int().min(0).max(1),
  categoryId: z.string().min(1, 'Please select a category'),
})

type FormData = z.infer<typeof schema>

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
          <Label htmlFor="amount">Amount</Label>
          <Input id="amount" type="number" step="0.01" min="0.01" {...register('amount', { valueAsNumber: true })} />
          {errors.amount && <p className="text-sm text-destructive">{errors.amount.message}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="date">Date</Label>
          <Input id="date" type="date" {...register('date')} />
          {errors.date && <p className="text-sm text-destructive">{errors.date.message}</p>}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Input id="description" {...register('description')} />
        {errors.description && (
          <p className="text-sm text-destructive">{errors.description.message}</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Type</Label>
          <Select
            value={String(type)}
            onValueChange={(v) => setValue('type', Number(v) as 0 | 1)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="0">Income</SelectItem>
              <SelectItem value="1">Expense</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Category</Label>
          <Select value={categoryId} onValueChange={(v) => setValue('categoryId', v)}>
            <SelectTrigger>
              <SelectValue placeholder="Select…" />
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
          {isPending ? 'Saving…' : 'Save'}
        </Button>
      </DialogFooter>
    </form>
  )
}

const PAGE_SIZE = 10

export default function TransactionsPage() {
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
    onSuccess: () => { invalidate(); setCreateOpen(false) },
  })

  const updateMutation = useMutation({
    mutationFn: (fd: FormData) =>
      client.put(`/transactions/${editTarget!.id}`, fd).then((r) => r.data),
    onSuccess: () => { invalidate(); setEditTarget(null) },
  })

  const deleteMutation = useMutation({
    mutationFn: () => client.delete(`/transactions/${deleteTarget!.id}`),
    onSuccess: () => { invalidate(); setDeleteTarget(null) },
  })

  const totalPages = data ? Math.ceil(data.total / PAGE_SIZE) : 1

  const resetPage = () => setPage(1)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Transactions</h1>
          {data && (
            <p className="text-muted-foreground text-sm">{data.total} transactions found</p>
          )}
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4 mr-1" />
          New Transaction
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <Select
          value={String(month)}
          onValueChange={(v) => { setMonth(Number(v)); resetPage() }}
        >
          <SelectTrigger className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {MONTHS.map((m, i) => (
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
          <SelectTrigger className="w-28">
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
          <SelectTrigger className="w-40">
            <SelectValue placeholder="All categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
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
          <SelectTrigger className="w-32">
            <SelectValue placeholder="All types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            <SelectItem value="0">Income</SelectItem>
            <SelectItem value="1">Expense</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <p className="text-center text-muted-foreground py-8">Loading…</p>
          ) : !data?.items.length ? (
            <p className="text-center text-muted-foreground py-8">No transactions found</p>
          ) : (
            <div className="divide-y">
              {data.items.map((tx) => (
                <div key={tx.id} className="flex items-center gap-4 px-4 py-3">
                  <span className="text-xl shrink-0">{tx.categoryIcon}</span>

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{tx.description}</p>
                    <p className="text-xs text-muted-foreground">
                      {tx.categoryName} · {formatDate(tx.date)}
                    </p>
                  </div>

                  <Badge variant={tx.type === 0 ? 'default' : 'destructive'} className="shrink-0">
                    {tx.type === 0 ? 'Income' : 'Expense'}
                  </Badge>

                  <span
                    className={`text-sm font-semibold w-24 text-right shrink-0 ${
                      tx.type === 0 ? 'text-green-600' : 'text-red-600'
                    }`}
                  >
                    {tx.type === 0 ? '+' : '-'}
                    {formatCurrency(tx.amount)}
                  </span>

                  <div className="flex gap-1 shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setEditTarget(tx)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive hover:text-destructive"
                      onClick={() => setDeleteTarget(tx)}
                    >
                      <Trash2 className="h-4 w-4" />
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
            Page {page} of {totalPages}
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

      {/* Create dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Transaction</DialogTitle>
          </DialogHeader>
          <TransactionForm
            categories={categories}
            onSubmit={(data) => createMutation.mutate(data)}
            isPending={createMutation.isPending}
          />
        </DialogContent>
      </Dialog>

      {/* Edit dialog */}
      <Dialog open={!!editTarget} onOpenChange={(open) => !open && setEditTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Transaction</DialogTitle>
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

      {/* Delete confirmation */}
      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Transaction</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Are you sure you want to delete <strong>{deleteTarget?.description}</strong>? This
            cannot be undone.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={deleteMutation.isPending}
              onClick={() => deleteMutation.mutate()}
            >
              {deleteMutation.isPending ? 'Deleting…' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
