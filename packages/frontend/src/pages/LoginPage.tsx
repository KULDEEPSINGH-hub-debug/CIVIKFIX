import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Shield, Mail, Lock, Eye, EyeOff } from 'lucide-react'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { FormField } from '../components/ui/FormField'
import { Alert } from '../components/ui/Alert'
import { useAuth } from '../hooks/useAuth'

const loginSchema = z.object({
  email: z.string().email('Enter a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
})

type LoginFormValues = z.infer<typeof loginSchema>

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { login } = useAuth()
  const navigate = useNavigate()

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
  })

  const onSubmit = async (data: LoginFormValues) => {
    setError(null)
    try {
      await login(data.email, data.password)
      navigate('/')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Login failed. Please try again.')
    }
  }

  return (
    <div className="min-h-screen bg-page-bg flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2 mb-4">
            <div className="h-10 w-10 rounded-xl bg-navy flex items-center justify-center">
              <Shield className="h-6 w-6 text-white" />
            </div>
            <span className="text-2xl font-bold text-navy">
              Civic<span className="text-civic-blue">Fix</span>
            </span>
          </Link>
          <h1 className="text-2xl font-bold text-text-primary">Welcome back</h1>
          <p className="text-text-secondary mt-1">Sign in to your citizen account</p>
        </div>

        {/* Form Card */}
        <div className="bg-surface rounded-2xl border border-border p-8 shadow-sm">
          {error && (
            <Alert variant="danger" className="mb-6" onClose={() => setError(null)}>
              {error}
            </Alert>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <FormField label="Email Address" htmlFor="email" required error={errors.email?.message}>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                autoComplete="email"
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
                autoComplete="current-password"
                leftIcon={<Lock className="h-4 w-4" />}
                rightIcon={
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="focus:outline-none"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                }
                error={errors.password?.message}
                {...register('password')}
              />
            </FormField>

            <div className="flex justify-end">
              <Link
                to="/forgot-password"
                className="text-sm text-civic-blue hover:underline"
              >
                Forgot password?
              </Link>
            </div>

            <Button type="submit" isLoading={isSubmitting} className="w-full" size="lg">
              Sign In
            </Button>
          </form>

          {/* Demo credentials */}
          <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <p className="text-xs font-semibold text-blue-800 mb-2">Demo Credentials</p>
            <p className="text-xs text-blue-700">
              Email: <code className="bg-white px-1 py-0.5 rounded">demo-citizen@civicfix.demo</code>
            </p>
            <p className="text-xs text-blue-700 mt-1">
              Password: <code className="bg-white px-1 py-0.5 rounded">DemoCitizen123!</code>
            </p>
          </div>
        </div>

        {/* Footer links */}
        <p className="text-center text-sm text-text-secondary mt-6">
          Don't have an account?{' '}
          <Link to="/register" className="text-civic-blue font-medium hover:underline">
            Register here
          </Link>
        </p>
        <p className="text-center text-sm text-text-secondary mt-2">
          Are you a government authority?{' '}
          <Link to="/authority/login" className="text-civic-blue font-medium hover:underline">
            Authority Login
          </Link>
        </p>
      </div>
    </div>
  )
}
