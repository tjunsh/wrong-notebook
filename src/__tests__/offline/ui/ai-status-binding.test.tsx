import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { QueueStatusPanel, mapAiStatusLabel } from '@/components/offline/queue-status-panel'

describe('queue status panel', () => {
  it('renders retry-all and pause/resume controls', () => {
    const html = renderToStaticMarkup(
      <QueueStatusPanel tasks={[]} paused={false} onRetryAll={async () => {}} onTogglePause={() => {}} />,
    )

    expect(html).toContain('全部重试')
    expect(html).toContain('暂停队列')
  })

  it('renders telemetry summary and fallback hint labels when provided', () => {
    const html = renderToStaticMarkup(
      <QueueStatusPanel
        tasks={[]}
        paused={false}
        onRetryAll={async () => {}}
        onTogglePause={() => {}}
        settingsWarning="OFFLINE_SETTINGS_SYNC_USING_LOCAL_CONFIG"
        labels={{
          queueLastRun: '最近执行',
          queueLastRunSuccess: '执行成功',
          queueFallbackHint: '设置同步失败，已使用本地配置。',
        }}
      />,
    )

    expect(html).toContain('最近执行')
    expect(html).toContain('执行成功')
    expect(html).toContain('设置同步失败，已使用本地配置。')
  })

  it('does not render fallback hint when no settings warning is provided', () => {
    const html = renderToStaticMarkup(
      <QueueStatusPanel
        tasks={[]}
        paused={false}
        onRetryAll={async () => {}}
        onTogglePause={() => {}}
        labels={{
          queueFallbackHint: '设置同步失败，已使用本地配置。',
        }}
      />,
    )

    expect(html).not.toContain('设置同步失败，已使用本地配置。')
  })
})

describe('ai status vocabulary mapping', () => {
  it('uses Pencil baseline vocabulary', () => {
    expect(mapAiStatusLabel('pending')).toBe('待处理')
    expect(mapAiStatusLabel('processing')).toBe('处理中')
    expect(mapAiStatusLabel('success')).toBe('已成功')
    expect(mapAiStatusLabel('failed')).toBe('失败')
  })
})
