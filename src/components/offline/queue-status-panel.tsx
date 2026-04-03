"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export type QueueStatus = 'pending' | 'processing' | 'success' | 'failed'

export interface QueueTaskView {
  id: string
  status: QueueStatus
  errorItemId: string
  lastError?: string
}

interface QueueTelemetryView {
  at?: number
  executed?: number
  succeeded?: number
  failed?: number
  status?: 'ok' | 'skipped' | 'error'
}

export function mapAiStatusLabel(status: QueueStatus): string {
  if (status === 'pending') return '待处理'
  if (status === 'processing') return '处理中'
  if (status === 'success') return '已成功'
  return '失败'
}

function statusPillClassName(status: QueueStatus): string {
  if (status === 'failed') return 'bg-red-100 text-red-700 border-red-200'
  if (status === 'processing') return 'bg-blue-100 text-blue-700 border-blue-200'
  if (status === 'success') return 'bg-green-100 text-green-700 border-green-200'
  return 'bg-amber-100 text-amber-700 border-amber-200'
}

interface QueueStatusPanelProps {
  tasks: QueueTaskView[]
  paused: boolean
  onRetryAll: () => Promise<void>
  onTogglePause: () => void
  labels?: {
    title?: string
    queueCountTitle?: string
    retryAll?: string
    pause?: string
    resume?: string
    empty?: string
    offline?: string
    online?: string
    queueLastRun?: string
    queueLastRunSuccess?: string
    queueLastRunSkipped?: string
    queueLastRunError?: string
    queueFallbackHint?: string
    queueFallbackUsingLocalHint?: string
    queueFallbackNoLocalHint?: string
  }
  online?: boolean
  telemetry?: QueueTelemetryView
  settingsWarning?: string
}

export function QueueStatusPanel({ tasks, paused, onRetryAll, onTogglePause, labels, online = true, telemetry, settingsWarning }: QueueStatusPanelProps) {
  const lastRunStatusLabel = telemetry?.status === 'error'
    ? (labels?.queueLastRunError ?? '执行失败')
    : telemetry?.status === 'skipped'
      ? (labels?.queueLastRunSkipped ?? '已跳过')
      : (labels?.queueLastRunSuccess ?? '执行成功')

  const lastRunText = telemetry?.at
    ? `${labels?.queueLastRun ?? '最近执行'}：${new Date(telemetry.at).toLocaleTimeString()} · ${lastRunStatusLabel} · ok ${telemetry.succeeded ?? 0} / fail ${telemetry.failed ?? 0} / total ${telemetry.executed ?? 0}`
    : `${labels?.queueLastRun ?? '最近执行'}：${labels?.queueLastRunSuccess ?? '执行成功'}`

  const fallbackText = settingsWarning === 'OFFLINE_SETTINGS_SYNC_NO_LOCAL_CONFIG'
    ? (labels?.queueFallbackNoLocalHint ?? labels?.queueFallbackHint ?? '设置同步失败且未找到本地配置，请先在设置中配置 AI。')
    : settingsWarning === 'OFFLINE_SETTINGS_SYNC_USING_LOCAL_CONFIG'
      ? (labels?.queueFallbackUsingLocalHint ?? labels?.queueFallbackHint ?? '设置同步失败，已使用本地离线配置。')
      : settingsWarning

  return (
    <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
      <h3 className="text-xl font-bold text-slate-900">{labels?.title ?? 'AI 队列状态'}</h3>

      <div className={cn("inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold", online ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800")}>
        <span>●</span>
        <span>{online ? (labels?.online ?? '当前在线') : (labels?.offline ?? '当前离线')}</span>
      </div>

      <div className="space-y-2 rounded-xl border border-slate-200 bg-white p-3">
        <p className="text-sm font-semibold text-slate-700">{labels?.queueCountTitle ?? `待处理任务（${tasks.length}）`}</p>

        {tasks.length === 0 ? (
          <p className="text-sm text-muted-foreground">{labels?.empty ?? '暂无任务'}</p>
        ) : (
          tasks.map((task) => (
            <div key={task.id} className="flex items-center justify-between gap-3 text-sm">
              <div className="min-w-0">
                <p className="truncate text-slate-700">{task.errorItemId}</p>
                {task.lastError ? <p className="truncate text-xs text-slate-400">{task.lastError}</p> : null}
              </div>
              <Badge variant="outline" className={statusPillClassName(task.status)}>{mapAiStatusLabel(task.status)}</Badge>
            </div>
          ))
        )}
      </div>

      <div className="flex flex-col gap-2">
        <Button size="sm" className="h-11 bg-orange-500 hover:bg-orange-600" onClick={() => void onRetryAll()}>{labels?.retryAll ?? '全部重试'}</Button>
        <Button size="sm" variant="outline" className="h-11" onClick={onTogglePause}>{paused ? (labels?.resume ?? '恢复队列') : (labels?.pause ?? '暂停队列')}</Button>
      </div>

      <p className="text-xs text-slate-500">{lastRunText}</p>

      {settingsWarning ? (
        <p className="text-xs text-amber-700">{fallbackText}</p>
      ) : null}

      {paused ? (
        <p className="text-xs text-amber-700">队列已暂停，点击“恢复队列”继续处理。</p>
      ) : null}
    </div>
  )
}
