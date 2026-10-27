import React from 'react'
import { Link } from 'react-router-dom'
import { MapPin, Clock, ThumbsUp, MessageSquare } from 'lucide-react'
import { Card, CardContent } from '../ui/Card'
import { StatusBadge } from './StatusBadge'
import { CategoryIcon } from './CategoryIcon'
import type { Report } from '../../types'
import { formatRelativeTime, truncate } from '../../lib/utils'

interface ReportCardProps {
  report: Report
}

export function ReportCard({ report }: ReportCardProps) {
  const reporterName =
    report.reporter?.citizenProfile?.displayName || 'Anonymous Citizen'

  return (
    <Card className="hover:shadow-md transition-shadow group">
      <CardContent className="p-4">
        {/* Header Row */}
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="flex items-center gap-2 min-w-0">
            <div className="h-8 w-8 rounded-lg bg-civic-blue-light flex items-center justify-center shrink-0">
              <CategoryIcon category={report.category} className="h-4 w-4 text-civic-blue" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-text-secondary font-mono">{report.publicId}</p>
            </div>
          </div>
          <StatusBadge status={report.status} />
        </div>

        {/* Title */}
        <Link to={`/report/${report.publicId}`}>
          <h3 className="font-semibold text-text-primary mb-1 group-hover:text-civic-blue transition-colors line-clamp-2">
            {report.title}
          </h3>
        </Link>

        {/* Description */}
        <p className="text-sm text-text-secondary mb-3 line-clamp-2">
          {truncate(report.description, 120)}
        </p>

        {/* Location */}
        {(report.city || report.address) && (
          <div className="flex items-center gap-1 text-xs text-text-secondary mb-3">
            <MapPin className="h-3 w-3 shrink-0" />
            <span className="truncate">{report.city || report.address}</span>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between text-xs text-text-secondary">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <ThumbsUp className="h-3 w-3" />
              {report._count?.support || 0}
            </span>
            <span className="flex items-center gap-1">
              <MessageSquare className="h-3 w-3" />
              {report._count?.comments || 0}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {formatRelativeTime(report.createdAt)}
          </div>
        </div>

        {/* Reporter */}
        <div className="mt-3 pt-3 border-t border-border">
          <p className="text-xs text-text-secondary">
            Reported by <span className="font-medium text-text-primary">{reporterName}</span>
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
