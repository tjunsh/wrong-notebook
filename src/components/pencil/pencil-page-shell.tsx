import { ReactNode } from 'react'

interface PencilPageShellProps {
  title: string
  subtitle?: string
  actions?: ReactNode
  children: ReactNode
}

export function PencilPageShell({ title, subtitle, actions, children }: PencilPageShellProps) {
  return (
    <main className="min-h-screen bg-background">
      <div className="container mx-auto max-w-6xl space-y-6 p-4 pb-20 md:p-8">
        <header className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{title}</h1>
            {subtitle ? <p className="text-sm text-muted-foreground sm:text-base">{subtitle}</p> : null}
          </div>
          {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
        </header>
        {children}
      </div>
    </main>
  )
}
