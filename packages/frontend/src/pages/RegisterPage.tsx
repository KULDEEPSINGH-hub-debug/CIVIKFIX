import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Shield, Mail, Lock, Eye, EyeOff, User } from 'lucide-react'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { FormField } from '../components/ui/FormField'
import { Checkbox } from '../components/ui/FormField'
import { Alert } from '../components/ui/Alert'
import { useAuth } from '../hooks/useAuth'

const registerSchema = z
  .object({
    displayName: z
      .string()
      .min(2, 'Name must be at least 2 characters')
      .max(50, 'Name cannot exceed 50 characters'),
    email: z.string().email('Enter a valid email address'),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(/[A-Z]/, 'Must contain at least one uppercase letter')
      .regex(/[0-9]/, 'Must contain at least one number')
      .regex(/[^A-Za-z0-9]/, 'Must contain at least one special character'),
    confirmPassword: z.string(),
    agreeTerms: z.boolean().refine((v) => v, 'You must agree to the terms'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })

type RegisterFormValues = z.infer<typeof registerSchema>

export default function RegisterPage() {
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const { register: registerUser } = useAuth()
  const navigate = useNavigate()

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { agreeTerms: false },
  })

  const onSubmit = async (data: RegisterFormValues) => {
    setError(null)
    try {
      await registerUser({
        email: data.email,
        password: data.password,
        displayName: data.displayName,
      })
      setSuccess(true)
      setTimeout(() => navigate('/login'), 3000)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Registration failed. Please try again.')
    }
  }

  if (success) {
    return (
      <div className="min-h-screen bg-page-bg flex items-center justify-center p-4">
        <div className="w-full max-w-md text-center">
          <div className="bg-surface rounded-2xl border border-border p-8 shadow-sm">
            <div className="h-16 w-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
              <Shield className="h-8 w-8 text-success" />
            </div>
            <h2 className="text-xl font-bold text-text-primary mb-2">Account Created!</h2>
            <p className="text-text-secondary text-sm">
              A verification email has been sent to your inbox. Please verify your email before
              logging in. Redirecting to login...
            </p>
          </div>
        </div>
      </div>
    )
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
          <h1 className="text-2xl font-bold text-text-primary">Create your account</h1>
          <p className="text-text-secondary mt-1">Join thousands of active citizens</p>
        </div>

        <div className="bg-surface rounded-2xl border border-border p-8 shadow-sm">
          {error && (
            <Alert variant="danger" className="mb-6" onClose={() => setError(null)}>
              {error}
            </Alert>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <FormField label="Display Name" htmlFor="displayName" required error={errors.displayName?.message}>
              <Input
                id="displayName"
                placeholder="Your public name"
                leftIcon={<User className="h-4 w-4" />}
                error={errors.displayName?.message}
                {...register('displayName')}
              />
            </FormField>

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

            <FormField label="Password" htmlFor="password" required error={errors.password?.message}
              hint="Min 8 chars, 1 uppercase, 1 number, 1 special character">
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Create a strong password"
                autoComplete="new-password"
                leftIcon={<Lock className="h-4 w-4" />}
                rightIcon={
                  <button type="button" onClick={() => setShowPassword(!showPassword)}
                    className="focus:outline-none" aria-label="Toggle password visibility">
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                }
                error={errors.password?.message}
                {...register('password')}
              />
            </FormField>

            <FormField label="Confirm Password" htmlFor="confirmPassword" required
              error={errors.confirmPassword?.message}>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="Repeat your password"
                autoComplete="new-password"
                leftIcon={<Lock className="h-4 w-4" />}
                error={errors.confirmPassword?.message}
                {...register('confirmPassword')}
              />
            </FormField>

            <Checkbox
              id="agreeTerms"
              label="I agree to the Terms of Service and Privacy Policy"
              error={errors.agreeTerms?.message}
              {...register('agreeTerms')}
            />

            <Button type="submit" isLoading={isSubmitting} className="w-full" size="lg">
              Create Account
            </Button>
          </form>
        </div>

        <p className="text-center text-sm text-text-secondary mt-6">
          Already have an account?{' '}
          <Link to="/login" className="text-civic-blue font-medium hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}
