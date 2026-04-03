import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import path from 'node:path'

const ROOT = '/Users/tangjun/opencode/smart-wrong-book'

function read(rel: string): string {
  return readFileSync(path.join(ROOT, rel), 'utf-8')
}

describe('route ui parity rollout', () => {
  it('uses shared pencil shell on key routes', () => {
    const files = [
      'src/app/page.tsx',
      'src/app/notebooks/page.tsx',
      'src/app/notebooks/[id]/page.tsx',
      'src/app/notebooks/[id]/add/page.tsx',
      'src/app/stats/page.tsx',
      'src/app/tags/page.tsx',
      'src/app/login/page.tsx',
      'src/app/register/page.tsx',
    ]

    for (const file of files) {
      const source = read(file)
      expect(source.includes('PencilPageShell')).toBe(true)
    }
  })

  it('uses shared section cards on core editable surfaces', () => {
    const files = [
      'src/app/page.tsx',
      'src/app/notebooks/page.tsx',
      'src/app/notebooks/[id]/add/page.tsx',
      'src/components/correction-editor.tsx',
      'src/components/settings-dialog.tsx',
    ]

    for (const file of files) {
      const source = read(file)
      expect(source.includes('PencilSectionCard')).toBe(true)
    }
  })

  it('shows item detail ai status chip contract', () => {
    const source = read('src/app/error-items/[id]/page.tsx')
    expect(source.includes('PencilStatusChip')).toBe(true)
  })
})
