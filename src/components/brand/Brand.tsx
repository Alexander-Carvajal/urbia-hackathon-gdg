import { Link } from 'react-router-dom'
import logo from './urbia-logo.png'
import pyramid from './maya-pyramid-transparent.png'

export function Logo({ compact = false, onDark = false }: { compact?: boolean; onDark?: boolean }) {
  return (
    <Link to="/" className={`city-brand ${compact ? 'city-brand-compact' : ''} ${onDark ? 'city-brand-light' : ''}`} aria-label="URBIA Cancún, ir al inicio">
      <span className="brand-symbol"><img src={logo} alt="" /></span>
      {!compact && <span className="brand-wordmark"><img src={logo} alt="" /></span>}
    </Link>
  )
}

export function SidebarArt() {
  return <img src={pyramid} className="sidebar-art" aria-hidden="true" alt="" />
}
