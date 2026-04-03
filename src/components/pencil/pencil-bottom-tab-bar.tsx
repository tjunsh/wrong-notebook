"use client"

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { BookOpen, BarChart3, Brain, Settings2 } from 'lucide-react'
import { cn } from '@/lib/utils'

const tabs = [
  { href: '/notebooks', label: 'Notebook', icon: BookOpen },
  { href: '/practice', label: 'Review', icon: Brain },
  { href: '/stats', label: 'Stats', icon: BarChart3 },
  { href: '/tags', label: 'Settings', icon: Settings2 },
]

export function PencilBottomTabBar() {
  const pathname = usePathname()
  const currentPath = pathname ?? ''

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/90">
      <div className="mx-auto grid max-w-6xl grid-cols-4">
        {tabs.map((tab) => {
          const active = currentPath === tab.href || currentPath.startsWith(`${tab.href}/`)
          const Icon = tab.icon
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                'flex flex-col items-center justify-center gap-1 py-2 text-xs transition-colors',
                active ? 'text-orange-600' : 'text-slate-500 hover:text-slate-800',
              )}
            >
              <Icon className="h-4 w-4" />
              <span>{tab.label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
