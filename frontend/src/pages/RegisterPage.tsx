import { useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation } from '@tanstack/react-query'
import { useNavigate, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import axios from 'axios'
import { useAuthStore } from '@/store/authStore'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

type FormData = { fullName: string; email: string; password: string }

export default function RegisterPage() {
  const { t } = useTranslation()
  const setAuth = useAuthStore((s) => s.setAuth)
  const navigate = useNavigate()

  const schema = useMemo(
    () =>
      z.object({
        fullName: z.string().min(2, t('auth.fullNameMin')),
        email: z.string().email(t('auth.invalidEmail')),
        password: z.string().min(8, t('auth.passwordMin')),
      }),
    [t]
  )

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) })

  const { mutate, isPending } = useMutation({
    mutationFn: (data: FormData) =>
      axios.post('/api/auth/register', data).then((r) => r.data),
    onSuccess: (data) => {
      setAuth(data.user, data.accessToken, data.refreshToken)
      navigate('/')
    },
    onError: (error: unknown) => {
      const message = axios.isAxiosError(error)
        ? (Object.values(error.response?.data?.errors ?? {}).flat() as string[]).join(', ') ||
          t('auth.registrationFailed')
        : t('auth.registrationFailed')
      setError('root', { message })
    },
  })

  return (
    <form onSubmit={handleSubmit((data) => mutate(data))} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="fullName">{t('auth.fullName')}</Label>
        <Input id="fullName" autoComplete="name" {...register('fullName')} />
        {errors.fullName && <p className="text-sm text-destructive">{errors.fullName.message}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="email">{t('auth.email')}</Label>
        <Input id="email" type="email" autoComplete="email" {...register('email')} />
        {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="password">{t('auth.password')}</Label>
        <Input id="password" type="password" autoComplete="new-password" {...register('password')} />
        {errors.password && <p className="text-sm text-destructive">{errors.password.message}</p>}
      </div>

      {errors.root && <p className="text-sm text-destructive">{errors.root.message}</p>}

      <Button type="submit" className="w-full" disabled={isPending}>
        {isPending ? t('auth.creatingAccount') : t('auth.createAccount')}
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        {t('auth.alreadyHaveAccount')}{' '}
        <Link to="/login" className="text-primary hover:underline">
          {t('auth.signIn')}
        </Link>
      </p>
    </form>
  )
}
