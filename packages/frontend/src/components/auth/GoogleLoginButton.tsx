import React, { useEffect, useState, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { AlertCircle, CheckCircle2, Info } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import api from '../../lib/api'

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: any) => void
          renderButton: (parent: HTMLElement, options: any) => void
          prompt: () => void
        }
      }
    }
  }
}

interface GoogleLoginButtonProps {
  redirectPath?: string
  text?: 'signin' | 'signup' | 'continue'
  className?: string
}

export function GoogleLoginButton({
  redirectPath = '/dashboard',
  text = 'continue',
  className = '',
}: GoogleLoginButtonProps) {
  const { loginWithGoogle, isAuthenticated } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  const [clientId, setClientId] = useState<string | null>(null)
  const [isConfigured, setIsConfigured] = useState<boolean>(false)
  const [checkingConfig, setCheckingConfig] = useState<boolean>(true)
  const [loading, setLoading] = useState<boolean>(false)
  const [authError, setAuthError] = useState<string | null>(null)
  const [showConfigHelp, setShowConfigHelp] = useState<boolean>(false)
  const googleBtnRef = useRef<HTMLDivElement>(null)

  // Check URL error parameter (e.g. from redirect callback)
  useEffect(() => {
    const errParam = searchParams.get('error')
    if (errParam) {
      if (errParam === 'OAUTH_NOT_CONFIGURED') {
        setAuthError('Google Sign-In is not configured yet on this server.')
        setShowConfigHelp(true)
      } else if (errParam === 'ACCOUNT_INACTIVE') {
        setAuthError('Your account is deactivated or suspended. Please contact civic support.')
      } else {
        setAuthError(`Google authentication error: ${errParam}`)
      }
    }
  }, [searchParams])

  // Check server OAuth configuration
  useEffect(() => {
    let mounted = true
    api
      .get('/auth/google/config')
      .then((res) => {
        if (!mounted) return
        if (res.data.success && res.data.data.configured) {
          setIsConfigured(true)
          setClientId(res.data.data.clientId)
        } else {
          setIsConfigured(false)
        }
      })
      .catch(() => {
        if (mounted) setIsConfigured(false)
      })
      .finally(() => {
        if (mounted) setCheckingConfig(false)
      })

    return () => {
      mounted = false
    }
  }, [])

  // Initialize Google Identity Services if client ID is configured
  useEffect(() => {
    if (!isConfigured || !clientId || isAuthenticated) return

    const existingScript = document.getElementById('google-gsi-client')
    const handleCredentialResponse = async (response: { credential: string }) => {
      setLoading(true)
      setAuthError(null)
      try {
        await loginWithGoogle({ credential: response.credential })
        const target = searchParams.get('redirect') || redirectPath
        navigate(target)
      } catch (err: any) {
        console.error('Google login error:', err)
        setAuthError(
          err?.response?.data?.error?.message ||
            err?.message ||
            'Failed to authenticate with Google. Please retry.'
        )
      } finally {
        setLoading(false)
      }
    }

    const initGsi = () => {
      if (window.google?.accounts?.id) {
        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: handleCredentialResponse,
          auto_select: false,
          cancel_on_tap_outside: true,
        })

        if (googleBtnRef.current) {
          googleBtnRef.current.innerHTML = ''
          window.google.accounts.id.renderButton(googleBtnRef.current, {
            type: 'standard',
            theme: 'outline',
            size: 'large',
            text: text === 'signup' ? 'signup_with' : text === 'signin' ? 'signin_with' : 'continue_with',
            shape: 'rectangular',
            logo_alignment: 'left',
            width: 380,
          })
        }
      }
    }

    if (!existingScript) {
      const script = document.createElement('script')
      script.id = 'google-gsi-client'
      script.src = 'https://accounts.google.com/gsi/client'
      script.async = true
      script.defer = true
      script.onload = initGsi
      document.body.appendChild(script)
    } else {
      initGsi()
    }
  }, [isConfigured, clientId, isAuthenticated, loginWithGoogle, navigate, redirectPath, searchParams, text])

  const handleCustomButtonClick = () => {
    setAuthError(null)

    if (!isConfigured) {
      setShowConfigHelp(true)
      return
    }

    if (window.google?.accounts?.id) {
      window.google.accounts.id.prompt()
    } else {
      // Direct redirect fallback to backend OAuth route
      window.location.href = `${api.defaults.baseURL}/auth/google`
    }
  }

  const labelText =
    text === 'signup'
      ? 'Sign up with Google'
      : text === 'signin'
      ? 'Sign in with Google'
      : 'Continue with Google'

  return (
    <div className={`w-full space-y-3 ${className}`}>
      {/* Error Notice */}
      {authError && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2 text-xs text-red-700">
          <AlertCircle className="h-4 w-4 shrink-0 text-red-600 mt-0.5" />
          <span>{authError}</span>
        </div>
      )}

      {/* Configuration Help Banner if credentials not yet configured */}
      {showConfigHelp && !isConfigured && (
        <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-lg text-xs space-y-2 text-amber-900">
          <div className="flex items-start gap-2 font-semibold text-amber-900">
            <Info className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" />
            <span>Google OAuth Credentials Required</span>
          </div>
          <p className="text-[11px] text-amber-800 leading-relaxed">
            To enable real Google authentication, obtain an OAuth Client ID from Google Cloud Console
            and set it in <code className="bg-amber-100 px-1 py-0.5 rounded font-mono">packages/backend/.env</code>:
          </p>
          <div className="bg-white p-2 rounded border border-amber-200 font-mono text-[10px] text-amber-950 overflow-x-auto">
            GOOGLE_CLIENT_ID="your-client-id.apps.googleusercontent.com"<br />
            GOOGLE_CLIENT_SECRET="your-client-secret"
          </div>
          <p className="text-[10px] text-amber-700">
            Authorized Origin: <code className="font-mono">http://localhost:5173</code> &bull; Redirect URI: <code className="font-mono">http://localhost:3001/api/v1/auth/google/callback</code>
          </p>
        </div>
      )}

      {/* GIS Rendered Button or Custom Button */}
      {isConfigured ? (
        <div className="flex flex-col items-center justify-center">
          <div ref={googleBtnRef} className="w-full flex justify-center min-h-[44px]" />
          {loading && (
            <p className="text-xs text-text-secondary mt-2 animate-pulse">
              Verifying Google identity with CivicFix...
            </p>
          )}
        </div>
      ) : (
        <button
          type="button"
          onClick={handleCustomButtonClick}
          disabled={checkingConfig || loading}
          className="w-full h-11 px-4 bg-white hover:bg-gray-50 text-gray-700 font-medium text-xs rounded-lg border border-gray-300 shadow-sm flex items-center justify-center gap-3 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-blue-500 disabled:opacity-60"
        >
          {/* Google Official Multicolored "G" SVG */}
          <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
            />
          </svg>
          <span>{labelText}</span>
        </button>
      )}
    </div>
  )
}
