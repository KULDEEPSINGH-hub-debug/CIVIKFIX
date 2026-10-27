import React, { Suspense, lazy } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { Layout } from './components/layout/Layout'
import { LoadingSpinner } from './components/ui/Spinner'

// Lazy-loaded pages
const HomePage = lazy(() => import('./pages/HomePage'))
const LoginPage = lazy(() => import('./pages/LoginPage'))
const RegisterPage = lazy(() => import('./pages/RegisterPage'))
const AuthorityLoginPage = lazy(() => import('./pages/AuthorityLoginPage'))
const AuthorityApplyPage = lazy(() => import('./pages/AuthorityApplyPage'))
const AdminLoginPage = lazy(() => import('./pages/AdminLoginPage'))
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'))

// Core application pages
const ExploreIssuesPage = lazy(() => import('./pages/ExploreIssuesPage'))
const ReportIssuePage = lazy(() => import('./pages/ReportIssuePage'))
const LiveMapPage = lazy(() => import('./pages/LiveMapPage'))
const AuthorityFinderPage = lazy(() => import('./pages/AuthorityFinderPage'))
const ReportDetailPage = lazy(() => import('./pages/ReportDetailPage'))
const HowItWorksPage = lazy(() => import('./pages/HowItWorksPage'))
const HelpPage = lazy(() => import('./pages/HelpPage'))
const CitizenDashboardPage = lazy(() => import('./pages/CitizenDashboardPage'))
const AuthorityDashboardPage = lazy(() => import('./pages/AuthorityDashboardPage'))
const AdminDashboardPage = lazy(() => import('./pages/AdminDashboardPage'))

function PageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-page-bg">
      <LoadingSpinner message="Loading CivicFix..." />
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            {/* Main layout routes */}
            <Route
              path="/"
              element={
                <Layout>
                  <HomePage />
                </Layout>
              }
            />
            <Route
              path="/explore"
              element={
                <Layout>
                  <ExploreIssuesPage />
                </Layout>
              }
            />
            <Route
              path="/issues"
              element={
                <Layout>
                  <ExploreIssuesPage />
                </Layout>
              }
            />
            <Route
              path="/report"
              element={
                <Layout>
                  <ReportIssuePage />
                </Layout>
              }
            />
            <Route
              path="/map"
              element={
                <Layout>
                  <LiveMapPage />
                </Layout>
              }
            />
            <Route
              path="/find-authority"
              element={
                <Layout>
                  <AuthorityFinderPage />
                </Layout>
              }
            />
            <Route
              path="/authority-finder"
              element={
                <Layout>
                  <AuthorityFinderPage />
                </Layout>
              }
            />
            <Route
              path="/report/:id"
              element={
                <Layout>
                  <ReportDetailPage />
                </Layout>
              }
            />
            <Route
              path="/reports/:id"
              element={
                <Layout>
                  <ReportDetailPage />
                </Layout>
              }
            />
            <Route
              path="/how-it-works"
              element={
                <Layout>
                  <HowItWorksPage />
                </Layout>
              }
            />
            <Route
              path="/help"
              element={
                <Layout>
                  <HelpPage />
                </Layout>
              }
            />
            <Route
              path="/dashboard"
              element={
                <Layout>
                  <CitizenDashboardPage />
                </Layout>
              }
            />
            <Route
              path="/profile"
              element={
                <Layout>
                  <CitizenDashboardPage />
                </Layout>
              }
            />
            <Route
              path="/my-reports"
              element={
                <Layout>
                  <CitizenDashboardPage />
                </Layout>
              }
            />
            <Route
              path="/authority/dashboard"
              element={
                <Layout>
                  <AuthorityDashboardPage />
                </Layout>
              }
            />
            <Route
              path="/admin/dashboard"
              element={
                <Layout>
                  <AdminDashboardPage />
                </Layout>
              }
            />

            {/* Auth routes */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/authority/login" element={<AuthorityLoginPage />} />
            <Route path="/authority/apply" element={<AuthorityApplyPage />} />
            <Route path="/admin/login" element={<AdminLoginPage />} />

            {/* 404 Catch-All */}
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </Suspense>
      </AuthProvider>
    </BrowserRouter>
  )
}
