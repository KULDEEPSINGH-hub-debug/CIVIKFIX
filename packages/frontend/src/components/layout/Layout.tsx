import React from 'react'
import { Header } from './Header'
import { Footer } from './Footer'

interface LayoutProps {
  children: React.ReactNode
  showFooter?: boolean
}

export function Layout({ children, showFooter = true }: LayoutProps) {
  return (
    <div className="min-h-screen flex flex-col bg-page-bg">
      <Header />
      <main className="flex-1">{children}</main>
      {showFooter && <Footer />}
    </div>
  )
}
