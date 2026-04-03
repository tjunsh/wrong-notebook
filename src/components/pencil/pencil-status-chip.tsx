import { cn } from '@/lib/utils'

export type PencilStatus = 'pending' | 'processing' | 'success' | 'failed'

const statusLabelMap: Record<PencilStatus, string> = {
  pending: '待处理',
  processing: '处理中',
  success: '已成功',
  failed: '失败',
}

const statusClassMap: Record<PencilStatus, string> = {
  pending: 'bg-amber-100 text-amber-700 border-amber-200',
  processing: 'bg-blue-100 text-blue-700 border-blue-200',
  success: 'bg-green-100 text-green-700 border-green-200',
  failed: 'bg-red-100 text-red-700 border-red-200',
}

interface PencilStatusChipProps {
  status: PencilStatus
  className?: string
}

export function PencilStatusChip({ status, className }: PencilStatusChipProps) {
  return (
    <span className={cn('inline-flex items-center rounded-full border px-2 py-1 text-xs font-semibold', statusClassMap[status], className)}>
      {statusLabelMap[status]}
    </span>
  )
}
