import { Compass } from 'lucide-react'
import { HashRouter, Link, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { EmptyState } from '../components/ui'
import { ToastProvider } from '../components/ui/Toast'
import { AnalysisPage } from '../features/analysis/AnalysisPage'
import { AvisosPage } from '../features/avisos/AvisosPage'
import { AvisosProvider } from '../features/avisos/AvisosProvider'
import { DatosPage } from '../features/datos/DatosPage'
import { NewReportWizard } from '../features/reports/NewReportWizard'
import { ReportsProvider, useReports } from '../features/reports/store'
import { accessUrl } from '../features/auth/demoSession'
import { Layout } from './Layout'
import { AccessPage } from './pages/AccessPage'
import { HomePage } from './pages/Home'
import { MapPage } from './pages/MapPage'
import { ProfilePage } from './pages/ProfilePage'
import { ReportDetail } from './pages/ReportDetail'
import { ReportsPage } from './pages/ReportsPage'
import { ScrollToTop } from './ScrollToTop'

function NewReportPage() {
  return <div className="px-4 py-4 md:px-8 md:py-7"><NewReportWizard /></div>
}

function RequireDemoSession({ children }: { children: React.ReactNode }) {
  const { demoProfile } = useReports()
  const location = useLocation()
  return demoProfile ? children : <Navigate to={accessUrl(location.pathname + location.search)} replace />
}

function NotFound() {
  return <div className="px-4 py-8 md:px-8"><div className="card"><EmptyState icon={Compass} title="Página no encontrada" action={<Link to="/" className="btn btn-primary">Ir al inicio</Link>}>La dirección no existe en este prototipo.</EmptyState></div></div>
}

/** HashRouter: funciona en cualquier hosting estático y al abrir el HTML con doble clic (file://). */
export function App() {
  return (
    <HashRouter>
      <ToastProvider>
        <ReportsProvider>
        <AvisosProvider>
          <ScrollToTop />
          <Routes>
            <Route element={<Layout />}>
              <Route index element={<HomePage />} />
              <Route path="mapa" element={<MapPage />} />
              <Route path="reportes" element={<ReportsPage />} />
              <Route path="reportes/:id" element={<ReportDetail />} />
              <Route path="reportar" element={<RequireDemoSession><NewReportPage /></RequireDemoSession>} />
              <Route path="acceso" element={<AccessPage />} />
              <Route path="analisis" element={<AnalysisPage />} />
              <Route path="avisos" element={<AvisosPage />} />
              <Route path="datos" element={<DatosPage />} />
              <Route path="perfil" element={<ProfilePage />} />
              <Route path="*" element={<NotFound />} />
            </Route>
          </Routes>
        </AvisosProvider>
        </ReportsProvider>
      </ToastProvider>
    </HashRouter>
  )
}
