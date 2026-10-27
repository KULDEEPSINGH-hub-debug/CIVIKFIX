import React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '../../lib/utils'

const buttonVariants = cva(
  'inline-flex items-center justify-center whitespace-nowrap rounded-lg text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 gap-2',
  {
    variants: {
      variant: {
        primary:
          'bg-navy text-white hover:bg-navy-700 focus-visible:ring-navy shadow-sm',
        secondary:
          'bg-civic-blue text-white hover:bg-blue-700 focus-visible:ring-civic-blue shadow-sm',
        outline:
          'border border-border bg-surface text-text-primary hover:bg-gray-50 focus-visible:ring-navy',
        ghost:
          'text-text-secondary hover:bg-gray-100 hover:text-text-primary focus-visible:ring-navy',
        danger:
          'bg-danger text-white hover:bg-red-700 focus-visible:ring-danger shadow-sm',
        link:
          'text-civic-blue underline-offset-4 hover:underline focus-visible:ring-civic-blue',
      },
      size: {
        sm: 'h-8 px-3 py-1.5 text-xs rounded-md',
        md: 'h-10 px-4 py-2',
        lg: 'h-12 px-6 py-3 text-base',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
  isLoading?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, isLoading, children, disabled, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button'
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        disabled={disabled || isLoading}
        {...props}
      >
        {isLoading ? (
          <>
            <svg
              className="animate-spin h-4 w-4"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              />
            </svg>
            {children}
          </>
        ) : (
          children
        )}
      </Comp>
    )
  }
)
Button.displayName = 'Button'

export { Button, buttonVariants }
