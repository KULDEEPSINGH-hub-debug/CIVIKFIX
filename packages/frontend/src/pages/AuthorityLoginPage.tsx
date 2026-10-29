import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Shield, Mail, Lock, Eye, EyeOff, Building2 } from 'lucide-react'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { FormField } from '../components/ui/FormField'
import { Alert } from '../components/ui/Alert'
import { useAuth } from '../hooks/useAuth'
import api from '../lib/api'

const schema = z.object({
  email: z.string().email('Enter a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
})

type FormValues = z.infer<typeof schema>

export default function AuthorityLoginPage() {
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { refreshUser } = useAuth()
  const navigate = useNavigate()

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) })

  const onSubmit = async (data: FormValues) => {
    if (isSubmitting) return
    setError(null)
    try {
      const res = await api.post('/auth/authority/login', data)
      if (res.data.success) {
        await refreshUser()
        navigate('/authority/dashboard')
      } else {
        setError(res.data.error?.message || 'Login failed.')
      }
    } catch (err: any) {
      const msg =
        err.response?.data?.error?.message ||
        (err instanceof Error ? err.message : 'Login failed.')
      setError(msg)
    }
  }

  return (
    <div className="min-h-screen bg-page-bg flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2 mb-4">
            <div className="h-10 w-10 rounded-xl bg-navy flex items-center justify-center">
              <Shield className="h-6 w-6 text-white" />
            </div>
            <span className="text-2xl font-bold text-navy">
              Civic<span className="text-civic-blue">Fix</span>
            </span>
          </Link>
          <div className="inline-flex items-center gap-2 bg-civic-blue-light text-civic-blue px-4 py-1.5 rounded-full text-sm font-medium mb-3">
            <Building2 className="h-4 w-4" /> Authority Portal
          </div>
          <h1 className="text-2xl font-bold text-text-primary">Authority Sign In</h1>
          <p className="text-text-secondary mt-1">Sign in with your verified authority account</p>
        </div>

        <div className="bg-surface rounded-2xl border border-border p-8 shadow-sm">
          {error && (
            <Alert variant="danger" className="mb-6" onClose={() => setError(null)}>
              {error}
            </Alert>
          )}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <FormField label="Official Email" htmlFor="email" required error={errors.email?.message}>
              <Input
                id="email"
                type="email"
                placeholder="your.name@dept.gov.in"
                leftIcon={<Mail className="h-4 w-4" />}
                error={errors.email?.message}
                {...register('email')}
              />
            </FormField>
            <FormField label="Password" htmlFor="password" required error={errors.password?.message}>
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Enter your password"
                leftIcon={<Lock className="h-4 w-4" />}
                rightIcon={
                  <button type="button" onClick={() => setShowPassword(!showPassword)}
                    className="focus:outline-none" aria-label="Toggle password">
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                }
                error={errors.password?.message}
                {...register('password')}
              />
            </FormField>
            <Button type="submit" isLoading={isSubmitting} className="w-full" size="lg">
              Sign In as Authority
            </Button>
          </form>
          {/* Demo credentials */}
          <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <p className="text-xs font-semibold text-blue-800 mb-2">Demo Authority Credentials</p>
            <p className="text-xs text-blue-700">
              Email: <code className="bg-white px-1 py-0.5 rounded">demo-authority@civicfix.demo</code>
            </p>
            <p className="text-xs text-blue-700 mt-1">
              Password: <code className="bg-white px-1 py-0.5 rounded">DemoAuthority123!</code>
            </p>
          </div>
        </div>

        <div className="text-center mt-6 space-y-2">
          <p className="text-sm text-text-secondary">
            Not yet registered?{' '}
            <Link to="/authority/apply" className="text-civic-blue font-medium hover:underline">
              Apply for Authority Access
            </Link>
          </p>
          <p className="text-sm text-text-secondary">
            <Link to="/login" className="text-text-secondary hover:text-text-primary">
              ← Back to Citizen Login
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
