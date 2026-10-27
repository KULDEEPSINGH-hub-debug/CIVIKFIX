import React from 'react'
import { Link } from 'react-router-dom'
import { Shield, MapPin, Home } from 'lucide-react'
import { Button } from '../components/ui/Button'

export default function NotFoundPage() {
  return (
    <div className="min-h-screen bg-page-bg flex items-center justify-center p-4">
      <div className="text-center max-w-md">
        <div className="flex items-center justify-center gap-2 mb-8">
          <div className="h-10 w-10 rounded-xl bg-navy flex items-center justify-center">
            <Shield className="h-6 w-6 text-white" />
          </div>
          <span className="text-2xl font-bold text-navy">
            Civic<span className="text-civic-blue">Fix</span>
          </span>
        </div>
        <div className="text-8xl font-bold text-border mb-4">404</div>
        <h1 className="text-2xl font-bold text-text-primary mb-2">Page Not Found</h1>
        <p className="text-text-secondary mb-8">
          The page you're looking for doesn't exist or has been moved. Let's get you back on track.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button asChild>
            <Link to="/">
              <Home className="h-4 w-4" /> Go Home
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link to="/explore">
              <MapPin className="h-4 w-4" /> Explore Issues
            </Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
