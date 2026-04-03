import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { PencilPageShell } from '@/components/pencil/pencil-page-shell'
import { PencilSectionCard } from '@/components/pencil/pencil-section-card'
import { PencilStatusChip } from '@/components/pencil/pencil-status-chip'

describe('pencil shell contract', () => {
  it('renders canonical shell and status vocabulary', () => {
    const html = renderToStaticMarkup(
      <PencilPageShell title="Notebook">
        <PencilSectionCard title="Queue">
          <PencilStatusChip status="pending" />
        </PencilSectionCard>
      </PencilPageShell>,
    )

    expect(html).toContain('Notebook')
    expect(html).toContain('Queue')
    expect(html).toContain('待处理')
  })
})
