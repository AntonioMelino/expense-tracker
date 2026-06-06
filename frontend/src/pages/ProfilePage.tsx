import { useMemo } from 'react'
import { useMutation } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { useTranslation } from 'react-i18next'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuthStore } from '@/store/authStore'
import client from '@/api/client'
import type { User } from '@/types'

type ProfileFormData = { fullName: string }
type PasswordFormData = { currentPassword: string; newPassword: string; confirmPassword: string }

export default function ProfilePage() {
  const { t } = useTranslation()
  const { user, updateUser } = useAuthStore()

  const profileSchema = useMemo(
    () => z.object({ fullName: z.string().min(2, t('profile.fullNameMin')) }),
    [t]
  )

  const passwordSchema = useMemo(
    () =>
      z
        .object({
          currentPassword: z.string().min(1, t('profile.currentPasswordRequired')),
          newPassword: z.string().min(8, t('profile.newPasswordMin')),
          confirmPassword: z.string(),
        })
        .refine((d) => d.newPassword === d.confirmPassword, {
          message: t('profile.passwordsDoNotMatch'),
          path: ['confirmPassword'],
        }),
    [t]
  )

  const {
    register: regProfile,
    handleSubmit: handleProfile,
    formState: { errors: profileErrors },
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: { fullName: user?.fullName ?? '' },
  })

  const {
    register: regPassword,
    handleSubmit: handlePassword,
    reset: resetPassword,
    formState: { errors: passwordErrors },
  } = useForm<PasswordFormData>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { currentPassword: '', newPassword: '', confirmPassword: '' },
  })

  const profileMutation = useMutation({
    mutationFn: (data: ProfileFormData) =>
      client.put<User>('/profile', data).then((r) => r.data),
    onSuccess: (updated) => {
      updateUser(updated)
      toast.success(t('profile.toastProfileUpdated'))
    },
    onError: () => toast.error(t('common.error')),
  })

  const passwordMutation = useMutation({
    mutationFn: (data: PasswordFormData) =>
      client.put('/profile/change-password', {
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
      }),
    onSuccess: () => {
      resetPassword()
      toast.success(t('profile.toastPasswordChanged'))
    },
    onError: () => toast.error(t('common.error')),
  })

  return (
    <div className="space-y-4 md:space-y-6">
      <div>
        <h1 className="text-xl md:text-2xl font-bold">{t('profile.title')}</h1>
        <p className="text-muted-foreground text-sm">{user?.email}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Edit profile */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t('profile.editProfile')}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleProfile((data) => profileMutation.mutate(data))} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">{t('profile.email')}</Label>
                <Input id="email" value={user?.email ?? ''} disabled className="opacity-60" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="fullName">{t('profile.fullName')}</Label>
                <Input id="fullName" {...regProfile('fullName')} />
                {profileErrors.fullName && (
                  <p className="text-sm text-destructive">{profileErrors.fullName.message}</p>
                )}
              </div>

              <Button type="submit" disabled={profileMutation.isPending}>
                {profileMutation.isPending ? t('profile.saving') : t('profile.save')}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Change password */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t('profile.changePassword')}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handlePassword((data) => passwordMutation.mutate(data))} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="currentPassword">{t('profile.currentPassword')}</Label>
                <Input id="currentPassword" type="password" {...regPassword('currentPassword')} />
                {passwordErrors.currentPassword && (
                  <p className="text-sm text-destructive">{passwordErrors.currentPassword.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="newPassword">{t('profile.newPassword')}</Label>
                <Input id="newPassword" type="password" {...regPassword('newPassword')} />
                {passwordErrors.newPassword && (
                  <p className="text-sm text-destructive">{passwordErrors.newPassword.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">{t('profile.confirmPassword')}</Label>
                <Input id="confirmPassword" type="password" {...regPassword('confirmPassword')} />
                {passwordErrors.confirmPassword && (
                  <p className="text-sm text-destructive">{passwordErrors.confirmPassword.message}</p>
                )}
              </div>

              <Button type="submit" disabled={passwordMutation.isPending}>
                {passwordMutation.isPending ? t('profile.saving') : t('profile.save')}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
