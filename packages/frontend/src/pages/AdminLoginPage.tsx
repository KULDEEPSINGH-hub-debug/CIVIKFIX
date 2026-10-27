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

const schema = z.object({
  email: z.string().email('Enter a valid email address'),
  password: z.string().min(8, 'Password required'),
})

type FormValues = z.infer<typeof schema>

export default function AdminLoginPage() {
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { login } = useAuth()
  const navigate = useNavigate()

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) })

  const onSubmit = async (data: FormValues) => {
    setError(null)
    try {
      await login(data.email, data.password)
      navigate('/admin/dashboard')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Login failed.')
    }
  }

  return (
    <div className="min-h-screen bg-navy flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="h-12 w-12 rounded-xl bg-white/10 flex items-center justify-center mx-auto mb-4">
            <Shield className="h-7 w-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">CivicFix Admin</h1>
          <p className="text-white/60 mt-1 text-sm">Restricted access — authorized personnel only</p>
        </div>

        <div className="bg-white rounded-2xl p-8 shadow-xl">
          {error && (
            <Alert variant="danger" className="mb-6" onClose={() => setError(null)}>
              {error}
            </Alert>
          )}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <FormField label="Admin Email" htmlFor="email" required error={errors.email?.message}>
              <Input
                id="email"
                type="email"
                placeholder="admin@civicfix.demo"
                leftIcon={<Mail className="h-4 w-4" />}
                error={errors.email?.message}
                {...register('email')}
              />
            </FormField>
            <FormField label="Password" htmlFor="password" required error={errors.password?.message}>
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Admin password"
                leftIcon={<Lock className="h-4 w-4" />}
                rightIcon={
                  <button type="button" onClick={() => setShowPassword(!showPassword)}
                    className="focus:outline-none">
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                }
                error={errors.password?.message}
                {...register('password')}
              />
            </FormField>
            <Button type="submit" isLoading={isSubmitting} className="w-full" size="lg">
              Sign In
            </Button>
          </form>
          <div className="mt-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
            <p className="text-xs text-gray-500 text-center">
              Demo: demo-admin@civicfix.demo / DemoAdmin123!
            </p>
          </div>
        </div>

        <p className="text-center text-xs text-white/40 mt-6">
          <Link to="/" className="hover:text-white/60 transition-colors">← Back to CivicFix</Link>
        </p>
      </div>
    </div>
  )
}
