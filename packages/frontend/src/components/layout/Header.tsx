import React, { useState } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { Shield, Menu, X, Bell, ChevronDown, LogOut, User, Settings, Building2 } from 'lucide-react'
import { Button } from '../ui'
import { useAuth } from '../../hooks/useAuth'
import { cn } from '../../lib/utils'

const NAV_LINKS = [
  { to: '/', label: 'Home', exact: true },
  { to: '/explore', label: 'Explore Issues' },
  { to: '/report', label: 'Report an Issue' },
  { to: '/map', label: 'Live Map' },
  { to: '/find-authority', label: 'Find Authority' },
  { to: '/how-it-works', label: 'How It Works' },
  { to: '/help', label: 'Help' },
]

export function Header() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const { user, isAuthenticated, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = async () => {
    await logout()
    navigate('/')
    setUserMenuOpen(false)
  }

  const displayName =
    user?.citizenProfile?.displayName ||
    user?.email?.split('@')[0] ||
    'User'

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border bg-surface/95 backdrop-blur-sm">
      <div className="container-app">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 shrink-0">
            <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-navy">
              <Shield className="h-5 w-5 text-white" />
            </div>
            <span className="text-xl font-bold text-navy">
              Civic<span className="text-civic-blue">Fix</span>
            </span>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden lg:flex items-center gap-1">
            {NAV_LINKS.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.exact}
                className={({ isActive }) =>
                  cn(
                    'px-3 py-2 rounded-md text-sm font-medium transition-colors',
                    isActive
                      ? 'text-navy bg-civic-blue-light'
                      : 'text-text-secondary hover:text-text-primary hover:bg-gray-50'
                  )
                }
              >
                {link.label}
              </NavLink>
            ))}
          </nav>

          {/* Auth Buttons */}
          <div className="hidden lg:flex items-center gap-2">
            {isAuthenticated ? (
              <>
                <Link
                  to="/dashboard"
                  className="relative p-2 rounded-md text-text-secondary hover:text-text-primary hover:bg-gray-50 transition-colors"
                  title="Notifications & Alerts"
                >
                  <Bell className="h-5 w-5" />
                  <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-danger" />
                </Link>
                <div className="relative">
                  <button
                    onClick={() => setUserMenuOpen(!userMenuOpen)}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium text-text-primary hover:bg-gray-50 transition-colors border border-border"
                  >
                    <div className="h-7 w-7 rounded-full bg-navy flex items-center justify-center text-white text-xs font-bold">
                      {displayName[0].toUpperCase()}
                    </div>
                    <span className="max-w-[100px] truncate">{displayName}</span>
                    <ChevronDown className="h-4 w-4 text-text-secondary" />
                  </button>
                  {userMenuOpen && (
                    <div className="absolute right-0 mt-2 w-52 rounded-xl border border-border bg-surface shadow-lg py-1 z-50">
                      <div className="px-3 py-2 border-b border-border">
                        <p className="text-sm font-medium text-text-primary truncate">{displayName}</p>
                        <p className="text-xs text-text-secondary truncate">{user?.email}</p>
                        <span className="inline-block mt-1 text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-100 text-civic-blue">
                          {user?.role}
                        </span>
                      </div>
                      <Link
                        to="/dashboard"
                        onClick={() => setUserMenuOpen(false)}
                        className="flex items-center gap-2 px-3 py-2 text-sm text-text-secondary hover:text-text-primary hover:bg-gray-50 transition-colors"
                      >
                        <User className="h-4 w-4" /> Citizen Dashboard
                      </Link>
                      {user?.role === 'AUTHORITY' && (
                        <Link
                          to="/authority/dashboard"
                          onClick={() => setUserMenuOpen(false)}
                          className="flex items-center gap-2 px-3 py-2 text-sm text-civic-blue font-semibold hover:bg-blue-50 transition-colors"
                        >
                          <Building2 className="h-4 w-4" /> Authority Portal
                        </Link>
                      )}
                      {user?.role === 'ADMIN' && (
                        <Link
                          to="/admin/dashboard"
                          onClick={() => setUserMenuOpen(false)}
                          className="flex items-center gap-2 px-3 py-2 text-sm text-purple-700 font-semibold hover:bg-purple-50 transition-colors"
                        >
                          <Shield className="h-4 w-4" /> Admin Console
                        </Link>
                      )}
                      <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-danger hover:bg-red-50 transition-colors"
                      >
                        <LogOut className="h-4 w-4" /> Sign Out
                      </button>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <>
                <Button variant="ghost" size="sm" asChild>
                  <Link to="/login">Citizen Login</Link>
                </Button>
                <Button variant="outline" size="sm" asChild>
                  <Link to="/authority/login">Authority Login</Link>
                </Button>
                <Button variant="primary" size="sm" asChild>
                  <Link to="/register">Get Started</Link>
                </Button>
              </>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            className="lg:hidden p-2 rounded-md text-text-secondary hover:text-text-primary hover:bg-gray-50 transition-colors"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
          >
            {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Nav */}
      {mobileOpen && (
        <div className="lg:hidden border-t border-border bg-surface animate-slide-up">
          <nav className="container-app py-4 space-y-1">
            {NAV_LINKS.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.exact}
                onClick={() => setMobileOpen(false)}
                className={({ isActive }) =>
                  cn(
                    'block px-3 py-2 rounded-md text-sm font-medium transition-colors',
                    isActive
                      ? 'text-navy bg-civic-blue-light'
                      : 'text-text-secondary hover:text-text-primary hover:bg-gray-50'
                  )
                }
              >
                {link.label}
              </NavLink>
            ))}
            <div className="pt-4 border-t border-border flex flex-col gap-2">
              {isAuthenticated ? (
                <Button variant="outline" onClick={handleLogout} className="w-full">
                  <LogOut className="h-4 w-4" /> Sign Out
                </Button>
              ) : (
                <>
                  <Button variant="outline" asChild className="w-full">
                    <Link to="/login" onClick={() => setMobileOpen(false)}>
                      Citizen Login
                    </Link>
                  </Button>
                  <Button variant="outline" asChild className="w-full">
                    <Link to="/authority/login" onClick={() => setMobileOpen(false)}>
                      Authority Login
                    </Link>
                  </Button>
                  <Button asChild className="w-full">
                    <Link to="/register" onClick={() => setMobileOpen(false)}>
                      Get Started
                    </Link>
                  </Button>
                </>
              )}
            </div>
          </nav>
        </div>
      )}
    </header>
  )
}
