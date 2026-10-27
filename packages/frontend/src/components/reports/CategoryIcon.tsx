import React from 'react'
import {
  AlertTriangle,
  Lightbulb,
  Trash2,
  Droplets,
  Wind,
  TrafficCone,
  Building2,
  HelpCircle,
} from 'lucide-react'
import type { IssueCategory } from '../../types'
import { cn } from '../../lib/utils'

const CATEGORY_ICONS: Record<IssueCategory, React.ElementType> = {
  ROAD_DAMAGE: AlertTriangle,
  STREETLIGHT: Lightbulb,
  GARBAGE: Trash2,
  WATER_LEAKAGE: Droplets,
  DRAINAGE: Wind,
  TRAFFIC_SIGNAL: TrafficCone,
  PUBLIC_INFRASTRUCTURE: Building2,
  OTHER: HelpCircle,
}

interface CategoryIconProps {
  category: IssueCategory
  className?: string
}

export function CategoryIcon({ category, className }: CategoryIconProps) {
  const Icon = CATEGORY_ICONS[category] || HelpCircle
  return <Icon className={cn('h-5 w-5', className)} />
}
