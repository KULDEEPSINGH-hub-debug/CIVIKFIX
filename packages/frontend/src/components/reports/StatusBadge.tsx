import React from 'react'
import { cn } from '../../lib/utils'
import type { ReportStatus } from '../../types'
import { STATUS_COLORS } from '../../types'
import { formatStatusLabel } from '../../lib/utils'

interface StatusBadgeProps {
  status: ReportStatus
  className?: string
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const colorClass = STATUS_COLORS[status] || 'bg-gray-100 text-gray-800'
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap',
        colorClass,
        className
      )}
    >
      {formatStatusLabel(status)}
    </span>
  )
}
