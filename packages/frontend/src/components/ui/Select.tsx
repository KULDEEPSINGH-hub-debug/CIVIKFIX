import React from 'react'
import { cn } from '../../lib/utils'

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  error?: string
  placeholder?: string
  options?: { value: string; label: string }[]
}

const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, error, placeholder, options, children, ...props }, ref) => {
    return (
      <div className="w-full">
        <select
          className={cn(
            'flex h-10 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text-primary',
            'focus:outline-none focus:ring-2 focus:ring-navy focus:border-transparent',
            'disabled:cursor-not-allowed disabled:opacity-50',
            'transition-colors appearance-none',
            'bg-[url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'12\' height=\'12\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'%23586779\' stroke-width=\'2\'%3E%3Cpolyline points=\'6 9 12 15 18 9\'%3E%3C/polyline%3E%3C/svg%3E")] bg-no-repeat bg-[right_12px_center] pr-8',
            error && 'border-danger focus:ring-danger',
            className
          )}
          ref={ref}
          {...props}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {children ? (
            children
          ) : (
            options?.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))
          )}
        </select>
        {error && <p className="mt-1 text-xs text-danger">{error}</p>}
      </div>
    )
  }
)
Select.displayName = 'Select'

export { Select }
