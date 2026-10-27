import React from 'react'
import { cn } from '../../lib/utils'

interface LabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> {
  required?: boolean
}

function Label({ className, required, children, ...props }: LabelProps) {
  return (
    <label
      className={cn('block text-sm font-medium text-text-primary mb-1', className)}
      {...props}
    >
      {children}
      {required && <span className="ml-1 text-danger">*</span>}
    </label>
  )
}

interface CheckboxProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
}

const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, label, error, id, ...props }, ref) => {
    return (
      <div className="flex flex-col">
        <div className="flex items-center gap-2">
          <input
            id={id}
            type="checkbox"
            ref={ref}
            className={cn(
              'h-4 w-4 rounded border-border text-navy',
              'focus:ring-2 focus:ring-navy focus:ring-offset-2',
              'disabled:cursor-not-allowed disabled:opacity-50',
              'accent-navy',
              className
            )}
            {...props}
          />
          {label && (
            <label htmlFor={id} className="text-sm text-text-primary cursor-pointer">
              {label}
            </label>
          )}
        </div>
        {error && <p className="mt-1 text-xs text-danger">{error}</p>}
      </div>
    )
  }
)
Checkbox.displayName = 'Checkbox'

interface FormFieldProps {
  label?: string
  required?: boolean
  error?: string
  hint?: string
  htmlFor?: string
  children: React.ReactNode
  className?: string
}

function FormField({ label, required, error, hint, htmlFor, children, className }: FormFieldProps) {
  return (
    <div className={cn('flex flex-col gap-1', className)}>
      {label && (
        <Label htmlFor={htmlFor} required={required}>
          {label}
        </Label>
      )}
      {children}
      {hint && !error && <p className="text-xs text-text-secondary">{hint}</p>}
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  )
}

export { Label, Checkbox, FormField }
