import React from 'react'
import { cn } from '../../lib/utils'

interface AvatarProps {
  src?: string
  alt?: string
  fallback?: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
  className?: string
}

const SIZE_CLASSES = {
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-12 w-12 text-base',
  xl: 'h-16 w-16 text-lg',
}

function Avatar({ src, alt, fallback, size = 'md', className }: AvatarProps) {
  const [imgError, setImgError] = React.useState(false)
  const sizeClass = SIZE_CLASSES[size]
  const initials = fallback
    ? fallback
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : '?'

  return (
    <div
      className={cn(
        'relative inline-flex items-center justify-center rounded-full overflow-hidden bg-navy text-white font-semibold shrink-0',
        sizeClass,
        className
      )}
    >
      {src && !imgError ? (
        <img
          src={src}
          alt={alt || fallback || 'Avatar'}
          className="h-full w-full object-cover"
          onError={() => setImgError(true)}
        />
      ) : (
        <span>{initials}</span>
      )}
    </div>
  )
}

export { Avatar }
