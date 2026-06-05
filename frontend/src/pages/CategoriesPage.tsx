import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import client from '@/api/client'
import type { Category } from '@/types'

type FormData = { name: string; color: string; icon: string }

function CategoryForm({
  defaultValues,
  onSubmit,
  isPending,
}: {
  defaultValues?: FormData
  onSubmit: (data: FormData) => void
  isPending: boolean
}) {
  const { t } = useTranslation()

  const schema = useMemo(
    () =>
      z.object({
        name: z.string().min(1, t('categories.nameRequired')),
        color: z.string().min(1, t('categories.colorRequired')),
        icon: z.string().min(1, t('categories.iconRequired')),
      }),
    [t]
  )

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: defaultValues ?? { name: '', color: '#6366f1', icon: '📁' },
  })

  return (
    <form id="category-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">{t('categories.name')}</Label>
        <Input id="name" {...register('name')} />
        {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="color">{t('categories.color')}</Label>
          <input
            id="color"
            type="color"
            {...register('color')}
            className="h-9 w-full cursor-pointer rounded-md border border-input p-1"
          />
          {errors.color && <p className="text-sm text-destructive">{errors.color.message}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="icon">{t('categories.icon')}</Label>
          <Input id="icon" {...register('icon')} />
          {errors.icon && <p className="text-sm text-destructive">{errors.icon.message}</p>}
        </div>
      </div>

      <DialogFooter>
        <Button type="submit" form="category-form" disabled={isPending}>
          {isPending ? t('categories.saving') : t('categories.save')}
        </Button>
      </DialogFooter>
    </form>
  )
}

export default function CategoriesPage() {
  const { t } = useTranslation()
  const qc = useQueryClient()
  const [createOpen, setCreateOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<Category | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Category | null>(null)

  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ['categories'],
    queryFn: () => client.get('/categories').then((r) => r.data),
  })

  const invalidate = () => qc.invalidateQueries({ queryKey: ['categories'] })

  const createMutation = useMutation({
    mutationFn: (data: FormData) => client.post('/categories', data).then((r) => r.data),
    onSuccess: () => { invalidate(); setCreateOpen(false); toast.success(t('categories.toastCreated')) },
    onError: () => toast.error(t('common.error')),
  })

  const updateMutation = useMutation({
    mutationFn: (data: FormData) =>
      client.put(`/categories/${editTarget!.id}`, data).then((r) => r.data),
    onSuccess: () => { invalidate(); setEditTarget(null); toast.success(t('categories.toastUpdated')) },
    onError: () => toast.error(t('common.error')),
  })

  const deleteMutation = useMutation({
    mutationFn: () => client.delete(`/categories/${deleteTarget!.id}`),
    onSuccess: () => { invalidate(); setDeleteTarget(null); toast.success(t('categories.toastDeleted')) },
    onError: () => toast.error(t('common.error')),
  })

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl md:text-2xl font-bold truncate">{t('categories.title')}</h1>
          <p className="text-muted-foreground text-sm">
            {t('categories.count', { count: categories.length })}
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)} className="shrink-0">
          <Plus className="h-4 w-4 md:mr-1" />
          <span className="hidden sm:inline">{t('categories.newCategory')}</span>
        </Button>
      </div>

      {categories.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground text-sm">
            {t('categories.noCategories')}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
          {categories.map((cat) => (
            <Card key={cat.id}>
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center text-lg shrink-0"
                    style={{ backgroundColor: `${cat.color}22`, border: `2px solid ${cat.color}` }}
                  >
                    {cat.icon}
                  </div>
                  <span className="font-medium truncate">{cat.name}</span>
                </div>
                <div className="flex gap-1 shrink-0">
                  <Button variant="ghost" size="icon" onClick={() => setEditTarget(cat)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-destructive hover:text-destructive"
                    onClick={() => setDeleteTarget(cat)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="w-[calc(100%-2rem)] max-w-md">
          <DialogHeader>
            <DialogTitle>{t('categories.createTitle')}</DialogTitle>
          </DialogHeader>
          <CategoryForm
            onSubmit={(data) => createMutation.mutate(data)}
            isPending={createMutation.isPending}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={!!editTarget} onOpenChange={(open) => !open && setEditTarget(null)}>
        <DialogContent className="w-[calc(100%-2rem)] max-w-md">
          <DialogHeader>
            <DialogTitle>{t('categories.editTitle')}</DialogTitle>
          </DialogHeader>
          {editTarget && (
            <CategoryForm
              defaultValues={{ name: editTarget.name, color: editTarget.color, icon: editTarget.icon }}
              onSubmit={(data) => updateMutation.mutate(data)}
              isPending={updateMutation.isPending}
            />
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent className="w-[calc(100%-2rem)] max-w-md">
          <DialogHeader>
            <DialogTitle>{t('categories.deleteTitle')}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            {t('categories.deleteConfirm')} <strong>{deleteTarget?.name}</strong>?{' '}
            {t('categories.deleteWarning')}
          </p>
          <DialogFooter className="flex-row justify-end gap-2">
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              {t('categories.cancel')}
            </Button>
            <Button
              variant="destructive"
              disabled={deleteMutation.isPending}
              onClick={() => deleteMutation.mutate()}
            >
              {deleteMutation.isPending ? t('categories.deleting') : t('categories.delete')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
