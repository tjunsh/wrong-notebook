import { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface PencilErrorStateProps {
  title: string
  message: string
  action?: ReactNode
  className?: string
}

export function PencilErrorState({ title, message, action, className }: PencilErrorStateProps) {
  return (
    <div className={cn('rounded-xl border border-red-200 bg-red-50 p-4', className)}>
      <p className="text-sm font-semibold text-red-700">{title}</p>
      <p className="mt-1 text-sm text-red-600">{message}</p>
      {action ? <div className="mt-3">{action}</div> : null}
    </div>
  )
}
