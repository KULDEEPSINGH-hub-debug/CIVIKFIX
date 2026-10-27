import React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '../../lib/utils'
import { AlertCircle, CheckCircle, Info, AlertTriangle, X } from 'lucide-react'

const alertVariants = cva(
  'relative w-full rounded-lg border p-4 flex gap-3',
  {
    variants: {
      variant: {
        default: 'border-border bg-surface text-text-primary',
        success: 'border-green-200 bg-green-50 text-green-800',
        warning: 'border-yellow-200 bg-yellow-50 text-yellow-800',
        danger: 'border-red-200 bg-red-50 text-red-800',
        info: 'border-blue-200 bg-blue-50 text-blue-800',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
)

const ICONS = {
  default: Info,
  success: CheckCircle,
  warning: AlertTriangle,
  danger: AlertCircle,
  info: Info,
}

export interface AlertProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof alertVariants> {
  title?: string
  onClose?: () => void
}

function Alert({ className, variant = 'default', title, children, onClose, ...props }: AlertProps) {
  const Icon = ICONS[variant ?? 'default']
  return (
    <div role="alert" className={cn(alertVariants({ variant }), className)} {...props}>
      <Icon className="h-5 w-5 mt-0.5 shrink-0" />
      <div className="flex-1">
        {title && <div className="font-medium mb-1">{title}</div>}
        <div className="text-sm">{children}</div>
      </div>
      {onClose && (
        <button
          onClick={onClose}
          className="shrink-0 rounded-sm opacity-70 hover:opacity-100 transition-opacity"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  )
}

export { Alert, alertVariants }
