import { NavLink, useNavigate } from 'react-router-dom'
import { LayoutDashboard, ArrowLeftRight, Tag, LogOut, Wallet, Globe, Moon, Sun } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useAuthStore } from '@/store/authStore'
import { useThemeStore } from '@/store/themeStore'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import client from '@/api/client'

interface AppLayoutProps {
  children: React.ReactNode
}

export default function AppLayout({ children }: AppLayoutProps) {
  const { user, logout } = useAuthStore()
  const { isDark, toggle: toggleTheme } = useThemeStore()
  const navigate = useNavigate()
  const { t, i18n } = useTranslation()

  const navItems = [
    { to: '/', icon: LayoutDashboard, label: t('nav.dashboard') },
    { to: '/transactions', icon: ArrowLeftRight, label: t('nav.transactions') },
    { to: '/categories', icon: Tag, label: t('nav.categories') },
  ]

  const handleLogout = async () => {
    try {
      await client.post('/auth/logout')
    } catch {
      // proceed with local logout regardless
    }
    logout()
    navigate('/login')
  }

  const toggleLanguage = () => {
    i18n.changeLanguage(i18n.language === 'es' ? 'en' : 'es')
  }

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
      isActive
        ? 'bg-primary text-primary-foreground'
        : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
    }`

  return (
    <div className="flex h-screen bg-background">
      {/* ── Desktop sidebar ── */}
      <aside className="hidden md:flex w-60 border-r bg-card flex-col shrink-0">
        <div className="p-5 flex items-center gap-2">
          <Wallet className="h-5 w-5 text-primary" />
          <span className="font-bold">{t('appName')}</span>
        </div>

        <Separator />

        <nav className="flex-1 p-3 space-y-1">
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink key={to} to={to} end={to === '/'} className={navLinkClass}>
              <Icon className="h-4 w-4" />
              {label}
            </NavLink>
          ))}
        </nav>

        <Separator />

        <div className="p-4 space-y-1">
          <p className="text-sm font-medium truncate">{user?.fullName}</p>
          <p className="text-xs text-muted-foreground truncate mb-2">{user?.email}</p>
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start text-muted-foreground"
            onClick={toggleLanguage}
          >
            <Globe className="h-4 w-4 mr-2" />
            {t('language.toggle')}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start text-muted-foreground"
            onClick={toggleTheme}
            aria-label={isDark ? t('theme.toggleLight') : t('theme.toggleDark')}
          >
            {isDark ? <Sun className="h-4 w-4 mr-2" /> : <Moon className="h-4 w-4 mr-2" />}
            {isDark ? t('theme.toggleLight') : t('theme.toggleDark')}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start text-muted-foreground"
            onClick={handleLogout}
          >
            <LogOut className="h-4 w-4 mr-2" />
            {t('nav.logout')}
          </Button>
        </div>
      </aside>

      {/* ── Content column ── */}
      <div className="flex flex-col flex-1 min-w-0">
        {/* Mobile top header */}
        <header className="md:hidden flex items-center justify-between px-4 py-3 border-b bg-card shrink-0">
          <div className="flex items-center gap-2">
            <Wallet className="h-5 w-5 text-primary" />
            <span className="font-semibold text-sm">{t('appName')}</span>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={toggleTheme}
              aria-label={isDark ? t('theme.toggleLight') : t('theme.toggleDark')}
            >
              {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
            <Button variant="ghost" size="icon" onClick={toggleLanguage} className="h-8 w-8">
              <Globe className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={handleLogout} className="h-8 w-8">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </header>

        {/* Page content — extra bottom padding on mobile for the bottom nav */}
        <main className="flex-1 overflow-auto pb-16 md:pb-0">
          <div className="p-4 md:p-6 max-w-5xl mx-auto">{children}</div>
        </main>

        {/* Mobile bottom navigation */}
        <nav className="md:hidden fixed bottom-0 inset-x-0 border-t bg-card flex z-50">
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `flex flex-col items-center justify-center flex-1 py-2 gap-0.5 text-xs font-medium transition-colors ${
                  isActive ? 'text-primary' : 'text-muted-foreground'
                }`
              }
            >
              <Icon className="h-5 w-5" />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>
      </div>
    </div>
  )
}
