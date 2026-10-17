import { useQuery } from '@tanstack/react-query'
import clsx from 'clsx'
import { History, LayoutDashboard, LogOut, Menu, ScanFace, Settings, Users, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { api } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import { initials } from '@/lib/format'
import { Logo } from './Logo'

const NAV = [
  { to: '/', label: 'Visão geral', icon: LayoutDashboard },
  { to: '/recognize', label: 'Reconhecer', icon: ScanFace },
  { to: '/people', label: 'Pessoas', icon: Users },
  { to: '/history', label: 'Histórico', icon: History },
  { to: '/settings', label: 'Configurações', icon: Settings },
]

function SystemStatus() {
  const { data } = useQuery({
    queryKey: ['system'],
    queryFn: api.system,
    refetchInterval: (query) => (query.state.data?.models_ready ? 60_000 : 3_000),
  })
  const ready = data?.models_ready && data.database && data.vector_store
  return (
    <div className="flex items-center gap-2 rounded-lg border border-line bg-canvas px-3 py-2 text-[12px]">
      <span className={clsx('relative flex h-2 w-2', !ready && 'animate-pulse')}>
        <span className={clsx('h-2 w-2 rounded-full', ready ? 'bg-ok' : 'bg-warn')} />
      </span>
      <span className="text-muted">{!data ? 'Conectando…' : ready ? `${data.model} pronto` : 'Carregando modelos…'}</span>
    </div>
  )
}

export function AppShell() {
  const { user, signOut } = useAuth()
  const [open, setOpen] = useState(false)
  const location = useLocation()
  useEffect(() => setOpen(false), [location.pathname])

  const sidebar = (
    <nav className="flex h-full flex-col gap-6 p-4">
      <div className="flex items-center gap-2.5 px-2 pt-1">
        <Logo />
        <div className="leading-tight">
          <div className="text-[14px] font-semibold">Face Recognition</div>
          <div className="font-mono text-[11px] text-faint">PRO · v2</div>
        </div>
      </div>
      <ul className="space-y-0.5">
        {NAV.map(({ to, label, icon: Icon }) => (
          <li key={to}>
            <NavLink
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                clsx(
                  'flex h-9 items-center gap-3 rounded-lg px-3 text-[13.5px] font-medium transition-colors',
                  isActive ? 'bg-raised text-ink' : 'text-muted hover:bg-raised/60 hover:text-ink',
                )
              }
            >
              {({ isActive }) => (
                <>
                  <Icon className={clsx('h-4 w-4', isActive && 'text-accent')} />
                  {label}
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
      <div className="mt-auto space-y-3">
        <SystemStatus />
        <div className="flex items-center gap-3 rounded-lg px-2 py-1.5">
          <div className="grid h-8 w-8 place-items-center rounded-full bg-accent/15 text-[12px] font-semibold text-accent">
            {initials(user?.full_name || user?.username || '?')}
          </div>
          <div className="min-w-0 flex-1 leading-tight">
            <div className="truncate text-[13px] font-medium">{user?.full_name || user?.username}</div>
            <div className="truncate text-[12px] text-faint">{user?.email ?? (user?.password_login ? user?.username : 'Acesso por Face ID')}</div>
          </div>
          <button onClick={signOut} className="rounded-md p-1.5 text-faint hover:bg-raised hover:text-ink" aria-label="Sair" title="Sair">
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </nav>
  )

  return (
    <div className="min-h-screen lg:pl-64">
      <aside className="fixed inset-y-0 left-0 hidden w-64 border-r border-line bg-surface lg:block">{sidebar}</aside>

      {open && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/60" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-72 animate-fade-in border-r border-line bg-surface">
            <button onClick={() => setOpen(false)} className="absolute right-3 top-4 rounded-md p-1.5 text-faint" aria-label="Fechar menu">
              <X className="h-4 w-4" />
            </button>
            {sidebar}
          </aside>
        </div>
      )}

      <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-line bg-canvas/80 px-4 backdrop-blur lg:hidden">
        <button onClick={() => setOpen(true)} className="rounded-md p-1.5 text-muted" aria-label="Abrir menu">
          <Menu className="h-5 w-5" />
        </button>
        <Logo className="h-7 w-7" />
        <span className="font-semibold">Face Recognition Pro</span>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-10 lg:py-10">
        <Outlet />
      </main>
    </div>
  )
}
