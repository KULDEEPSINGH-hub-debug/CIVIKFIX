import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Shield, User, Building2, MapPin, FileText, Phone, Mail } from 'lucide-react'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Textarea } from '../components/ui/Textarea'
import { FormField } from '../components/ui/FormField'
import { Alert } from '../components/ui/Alert'
import api from '../lib/api'

const schema = z.object({
  applicantName: z.string().min(2, 'Name is required'),
  designation: z.string().min(2, 'Designation is required'),
  department: z.string().min(2, 'Department name is required'),
  officialEmail: z.string().email('Enter a valid official email'),
  workPhone: z.string().optional(),
  officeLocation: z.string().min(5, 'Office location is required'),
  requestedJurisdiction: z.string().min(3, 'Jurisdiction is required'),
  requestedResponsibilities: z.string().min(20, 'Please describe your responsibilities (min 20 chars)'),
  supervisorName: z.string().optional(),
  supervisorContact: z.string().optional(),
  password: z.string().min(8, 'Password must be at least 8 characters'),
})

type FormValues = z.infer<typeof schema>

export default function AuthorityApplyPage() {
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) })

  const onSubmit = async (data: FormValues) => {
    setError(null)
    try {
      const response = await api.post('/auth/authority/apply', data)
      if (response.data.success) {
        setSuccess(true)
      } else {
        setError(response.data.error?.message || 'Application failed')
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Submission failed. Please try again.')
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
            <h2 className="text-xl font-bold text-text-primary mb-2">Application Submitted!</h2>
            <p className="text-text-secondary text-sm mb-6">
              Your authority application has been received. Our team will review your credentials
              within 2–5 business days and contact you at your official email.
            </p>
            <Button asChild variant="outline" className="w-full">
              <Link to="/">Return to Home</Link>
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-page-bg py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2 mb-4">
            <div className="h-10 w-10 rounded-xl bg-navy flex items-center justify-center">
              <Shield className="h-6 w-6 text-white" />
            </div>
            <span className="text-2xl font-bold text-navy">
              Civic<span className="text-civic-blue">Fix</span>
            </span>
          </Link>
          <h1 className="text-2xl font-bold text-text-primary">Apply for Authority Access</h1>
          <p className="text-text-secondary mt-2 max-w-md mx-auto">
            Government officials can apply to manage and respond to civic reports in their
            jurisdiction. All applications are manually reviewed.
          </p>
        </div>

        <div className="bg-surface rounded-2xl border border-border p-8 shadow-sm">
          {error && (
            <Alert variant="danger" className="mb-6" onClose={() => setError(null)}>
              {error}
            </Alert>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <h2 className="font-semibold text-text-primary border-b border-border pb-3">
              Personal & Professional Information
            </h2>

            <div className="grid sm:grid-cols-2 gap-4">
              <FormField label="Full Name" htmlFor="applicantName" required error={errors.applicantName?.message}>
                <Input
                  id="applicantName"
                  placeholder="Rajesh Kumar"
                  leftIcon={<User className="h-4 w-4" />}
                  error={errors.applicantName?.message}
                  {...register('applicantName')}
                />
              </FormField>
              <FormField label="Designation" htmlFor="designation" required error={errors.designation?.message}>
                <Input
                  id="designation"
                  placeholder="Executive Engineer"
                  error={errors.designation?.message}
                  {...register('designation')}
                />
              </FormField>
            </div>

            <FormField label="Department Name" htmlFor="department" required error={errors.department?.message}>
              <Input
                id="department"
                placeholder="Public Works Department, Jaipur"
                leftIcon={<Building2 className="h-4 w-4" />}
                error={errors.department?.message}
                {...register('department')}
              />
            </FormField>

            <div className="grid sm:grid-cols-2 gap-4">
              <FormField label="Official Email" htmlFor="officialEmail" required error={errors.officialEmail?.message}>
                <Input
                  id="officialEmail"
                  type="email"
                  placeholder="name@raj.gov.in"
                  leftIcon={<Mail className="h-4 w-4" />}
                  error={errors.officialEmail?.message}
                  {...register('officialEmail')}
                />
              </FormField>
              <FormField label="Work Phone" htmlFor="workPhone" error={errors.workPhone?.message}>
                <Input
                  id="workPhone"
                  type="tel"
                  placeholder="+91 98765 43210"
                  leftIcon={<Phone className="h-4 w-4" />}
                  error={errors.workPhone?.message}
                  {...register('workPhone')}
                />
              </FormField>
            </div>

            <FormField label="Office Location" htmlFor="officeLocation" required error={errors.officeLocation?.message}>
              <Input
                id="officeLocation"
                placeholder="PWD Office, Civil Lines, Jaipur"
                leftIcon={<MapPin className="h-4 w-4" />}
                error={errors.officeLocation?.message}
                {...register('officeLocation')}
              />
            </FormField>

            <FormField label="Requested Jurisdiction" htmlFor="requestedJurisdiction" required
              error={errors.requestedJurisdiction?.message}
              hint="The geographic area you are responsible for">
              <Input
                id="requestedJurisdiction"
                placeholder="Jaipur Municipal Corporation"
                error={errors.requestedJurisdiction?.message}
                {...register('requestedJurisdiction')}
              />
            </FormField>

            <FormField
              label="Requested Responsibilities"
              htmlFor="requestedResponsibilities"
              required
              error={errors.requestedResponsibilities?.message}
              hint="Describe what types of civic issues you are responsible for">
              <Textarea
                id="requestedResponsibilities"
                placeholder="I am responsible for road maintenance, pothole repairs, and street infrastructure in Zone 3..."
                rows={4}
                error={errors.requestedResponsibilities?.message}
                {...register('requestedResponsibilities')}
              />
            </FormField>

            <h2 className="font-semibold text-text-primary border-b border-border pb-3 pt-2">
              Supervisor Information (Optional)
            </h2>

            <div className="grid sm:grid-cols-2 gap-4">
              <FormField label="Supervisor Name" htmlFor="supervisorName" error={errors.supervisorName?.message}>
                <Input
                  id="supervisorName"
                  placeholder="Supervisor's full name"
                  error={errors.supervisorName?.message}
                  {...register('supervisorName')}
                />
              </FormField>
              <FormField label="Supervisor Contact" htmlFor="supervisorContact" error={errors.supervisorContact?.message}>
                <Input
                  id="supervisorContact"
                  placeholder="Phone or email"
                  error={errors.supervisorContact?.message}
                  {...register('supervisorContact')}
                />
              </FormField>
            </div>

            <h2 className="font-semibold text-text-primary border-b border-border pb-3 pt-2">
              Account Password
            </h2>

            <FormField label="Create Password" htmlFor="password" required error={errors.password?.message}
              hint="Min 8 characters">
              <Input
                id="password"
                type="password"
                placeholder="Create a secure password"
                leftIcon={<FileText className="h-4 w-4" />}
                error={errors.password?.message}
                {...register('password')}
              />
            </FormField>

            <Alert variant="info">
              By submitting this application you confirm that you are a genuine government official
              and that all provided information is accurate. False applications will be reported
              to relevant authorities.
            </Alert>

            <Button type="submit" isLoading={isSubmitting} className="w-full" size="lg">
              Submit Application
            </Button>
          </form>
        </div>

        <p className="text-center text-sm text-text-secondary mt-6">
          Already applied?{' '}
          <Link to="/authority/login" className="text-civic-blue font-medium hover:underline">
            Check Status / Login
          </Link>
        </p>
      </div>
    </div>
  )
}
