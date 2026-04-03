import { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface PencilSectionCardProps {
  title?: string
  description?: string
  className?: string
  bodyClassName?: string
  children: ReactNode
}

export function PencilSectionCard({ title, description, className, bodyClassName, children }: PencilSectionCardProps) {
  return (
    <section className={cn('rounded-xl border border-slate-200 bg-white p-4 shadow-sm', className)}>
      {title ? (
        <div className="mb-3 space-y-1">
          <h2 className="text-base font-semibold text-slate-900">{title}</h2>
          {description ? <p className="text-sm text-slate-500">{description}</p> : null}
        </div>
      ) : null}
      <div className={cn('space-y-3', bodyClassName)}>{children}</div>
    </section>
  )
}
