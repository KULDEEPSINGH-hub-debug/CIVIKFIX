import React, { createContext, useContext, useState } from 'react'
import { cn } from '../../lib/utils'

interface TabsContextType {
  activeTab: string
  setActiveTab: (tab: string) => void
}

const TabsContext = createContext<TabsContextType | undefined>(undefined)

function useTabs() {
  const ctx = useContext(TabsContext)
  if (!ctx) throw new Error('Tabs subcomponent must be used inside <Tabs>')
  return ctx
}

interface TabsProps {
  defaultValue: string
  value?: string
  onValueChange?: (value: string) => void
  className?: string
  children: React.ReactNode
}

function Tabs({ defaultValue, value, onValueChange, className, children }: TabsProps) {
  const [internalActive, setInternalActive] = useState(defaultValue)
  const activeTab = value ?? internalActive
  const setActiveTab = (tab: string) => {
    setInternalActive(tab)
    onValueChange?.(tab)
  }

  return (
    <TabsContext.Provider value={{ activeTab, setActiveTab }}>
      <div className={cn('w-full', className)}>{children}</div>
    </TabsContext.Provider>
  )
}

function TabsList({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div
      role="tablist"
      className={cn(
        'inline-flex h-10 items-center justify-center rounded-lg bg-gray-100 p-1 text-text-secondary gap-1',
        className
      )}
    >
      {children}
    </div>
  )
}

function TabsTrigger({
  value,
  className,
  children,
}: {
  value: string
  className?: string
  children: React.ReactNode
}) {
  const { activeTab, setActiveTab } = useTabs()
  const isActive = activeTab === value

  return (
    <button
      role="tab"
      aria-selected={isActive}
      onClick={() => setActiveTab(value)}
      className={cn(
        'inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium ring-offset-white transition-all',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy focus-visible:ring-offset-2',
        'disabled:pointer-events-none disabled:opacity-50',
        isActive ? 'bg-surface text-text-primary shadow-sm' : 'hover:text-text-primary',
        className
      )}
    >
      {children}
    </button>
  )
}

function TabsContent({
  value,
  className,
  children,
}: {
  value: string
  className?: string
  children: React.ReactNode
}) {
  const { activeTab } = useTabs()
  if (activeTab !== value) return null

  return (
    <div
      role="tabpanel"
      className={cn('mt-2 ring-offset-white focus-visible:outline-none', className)}
    >
      {children}
    </div>
  )
}

export { Tabs, TabsList, TabsTrigger, TabsContent }
