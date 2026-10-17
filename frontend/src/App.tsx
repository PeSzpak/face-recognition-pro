import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from './components/AppShell'
import { Skeleton } from './components/ui/Skeleton'
import { useAuth } from './lib/auth'
import { LoginPage } from './pages/LoginPage'

const page = <K extends string>(load: () => Promise<Record<K, React.ComponentType>>, name: K) =>
  lazy(() => load().then((module) => ({ default: module[name] })))

const DashboardPage = page(() => import('./pages/DashboardPage'), 'DashboardPage')
const RecognizePage = page(() => import('./pages/RecognizePage'), 'RecognizePage')
const PeoplePage = page(() => import('./pages/PeoplePage'), 'PeoplePage')
const PersonPage = page(() => import('./pages/PersonPage'), 'PersonPage')
const HistoryPage = page(() => import('./pages/HistoryPage'), 'HistoryPage')
const SettingsPage = page(() => import('./pages/SettingsPage'), 'SettingsPage')

export function App() {
  const { user } = useAuth()

  if (!user) {
    return (
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    )
  }

  return (
    <Suspense fallback={<Skeleton className="m-10 h-64 rounded-xl" />}>
      <Routes>
        <Route element={<AppShell />}>
          <Route index element={<DashboardPage />} />
          <Route path="recognize" element={<RecognizePage />} />
          <Route path="people" element={<PeoplePage />} />
          <Route path="people/:id" element={<PersonPage />} />
          <Route path="history" element={<HistoryPage />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  )
}
