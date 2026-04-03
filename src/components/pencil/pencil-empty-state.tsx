import { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface PencilEmptyStateProps {
  title: string
  description?: string
  action?: ReactNode
  className?: string
}

export function PencilEmptyState({ title, description, action, className }: PencilEmptyStateProps) {
  return (
    <div className={cn('rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 p-8 text-center', className)}>
      <p className="text-base font-semibold text-slate-800">{title}</p>
      {description ? <p className="mt-2 text-sm text-slate-500">{description}</p> : null}
      {action ? <div className="mt-4 flex justify-center">{action}</div> : null}
    </div>
  )
}
