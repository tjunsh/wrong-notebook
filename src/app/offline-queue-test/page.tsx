"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { QueueStatusPanel, QueueTaskView } from "@/components/offline/queue-status-panel";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type QueueStatus = QueueTaskView["status"];

function createTask(status: QueueStatus): QueueTaskView {
  return {
    id: `task_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    status,
    errorItemId: `ei_${Math.random().toString(36).slice(2, 6)}`,
  };
}

export default function OfflineQueueTestPage() {
  const [paused, setPaused] = useState(false);
  const [tasks, setTasks] = useState<QueueTaskView[]>([
    { id: "task_1", status: "failed", errorItemId: "ei_math_001" },
    { id: "task_2", status: "processing", errorItemId: "ei_phy_014" },
    { id: "task_3", status: "success", errorItemId: "ei_eng_031" },
  ]);

  const counters = useMemo(() => {
    return tasks.reduce(
      (acc, item) => {
        acc[item.status] += 1;
        return acc;
      },
      { pending: 0, processing: 0, success: 0, failed: 0 },
    );
  }, [tasks]);

  const handleRetryAll = async () => {
    setTasks((prev) => prev.map((task) => (task.status === "failed" ? { ...task, status: "pending" } : task)));
  };

  return (
    <main className="min-h-screen bg-slate-50 p-6">
      <div className="mx-auto max-w-4xl space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-slate-900">AI 队列状态 · 设计预览</h1>
          <Link href="/notebooks" className="text-sm text-primary underline-offset-4 hover:underline">
            返回错题本
          </Link>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>快速操作</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={() => setTasks((prev) => [createTask("failed"), ...prev])}>
                添加失败任务
              </Button>
              <Button variant="outline" size="sm" onClick={() => setTasks((prev) => [createTask("pending"), ...prev])}>
                添加待处理任务
              </Button>
              <Button variant="outline" size="sm" onClick={() => setTasks((prev) => [createTask("processing"), ...prev])}>
                添加处理中任务
              </Button>
              <Button variant="outline" size="sm" onClick={() => setTasks((prev) => [createTask("success"), ...prev])}>
                添加成功任务
              </Button>
              <Button variant="destructive" size="sm" onClick={() => setTasks([])}>
                清空任务
              </Button>
            </div>

            <div className="text-sm text-muted-foreground">
              pending {counters.pending} · processing {counters.processing} · success {counters.success} · failed {counters.failed} · paused {paused ? "yes" : "no"}
            </div>
          </CardContent>
        </Card>

        <QueueStatusPanel
          tasks={tasks}
          paused={paused}
          onRetryAll={handleRetryAll}
          onTogglePause={() => setPaused((v) => !v)}
          online={!paused}
          labels={{
            title: 'AI 队列状态',
            queueCountTitle: `待处理任务（${tasks.length}）`,
            retryAll: '全部重试',
            pause: '暂停队列',
            resume: '恢复队列',
            empty: '暂无任务',
            offline: '当前离线',
            online: '当前在线',
          }}
        />
      </div>
    </main>
  );
}
