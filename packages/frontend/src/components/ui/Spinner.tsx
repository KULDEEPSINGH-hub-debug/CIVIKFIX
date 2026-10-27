import React from 'react'
import { cn } from '../../lib/utils'

interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const SIZE_CLASSES = {
  sm: 'h-4 w-4 border-2',
  md: 'h-8 w-8 border-2',
  lg: 'h-12 w-12 border-4',
}

function Spinner({ size = 'md', className }: SpinnerProps) {
  return (
    <div
      role="status"
      className={cn(
        'animate-spin rounded-full border-gray-200 border-t-navy',
        SIZE_CLASSES[size],
        className
      )}
      aria-label="Loading"
    />
  )
}

function LoadingSpinner({ message = 'Loading...' }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-12">
      <Spinner size="lg" />
      <p className="text-text-secondary text-sm">{message}</p>
    </div>
  )
}

export { Spinner, LoadingSpinner }
