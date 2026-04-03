"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { BackButton } from "@/components/ui/back-button";
import { Plus, House } from "lucide-react";
import Link from "next/link";
import { ErrorList } from "@/components/error-list";
import { QueueStatusPanel } from "@/components/offline/queue-status-panel";
import { createOfflineErrorItemServiceFromWindow } from "@/offline/error-items/offline-service-factory";
import { AiTask } from "@/offline/ai/types";
import { ensureOfflineAiRuntime } from "@/offline/ai/runtime-factory";
import { queueRuntimeTelemetryState } from "@/offline/ai/runtime-telemetry-state";
import { Notebook } from "@/types/api";
import { apiClient } from "@/lib/api-client";
import { useLanguage } from "@/contexts/LanguageContext";
import { offlineRuntimeState } from "@/offline/runtime/offline-runtime-state";
import { PencilPageShell } from "@/components/pencil/pencil-page-shell";
import { PencilSectionCard } from "@/components/pencil/pencil-section-card";

export default function NotebookDetailPage() {
    const params = useParams();
    const router = useRouter();
    const { t } = useLanguage();
    const [notebook, setNotebook] = useState<Notebook | null>(null);
    const [loading, setLoading] = useState(true);
    const [queueTasks, setQueueTasks] = useState<AiTask[]>([]);
    const [paused, setPaused] = useState(false);
    const [lastQueueRun, setLastQueueRun] = useState(() => queueRuntimeTelemetryState.getSnapshot().lastRun);
    const [settingsWarning, setSettingsWarning] = useState(() => offlineRuntimeState.getSnapshot().settingsWarning);

    const notebookLabels = t.notebook as {
        queueTitle?: string;
        queueCountTitle?: string;
        retryAll?: string;
        pause?: string;
        resume?: string;
        queueEmpty?: string;
        queueOffline?: string;
        queueOnline?: string;
        queueLastRun?: string;
        queueLastRunSuccess?: string;
        queueLastRunSkipped?: string;
        queueLastRunError?: string;
        queueFallbackHint?: string;
        queueFallbackUsingLocalHint?: string;
        queueFallbackNoLocalHint?: string;
    };

    const fetchNotebook = useCallback(async (id: string) => {
        try {
            const data = await apiClient.get<Notebook>(`/api/notebooks/${id}`);
            setNotebook(data);
        } catch (error) {
            console.error("Failed to fetch notebook:", error);
            alert(t.notebooks?.notFound || "Notebook not found");
            router.push("/notebooks");
        } finally {
            setLoading(false);
        }
    }, [router, t.notebooks?.notFound]);

    const refreshQueueTasks = useCallback(async () => {
        if (typeof window === "undefined") {
            return;
        }

        const offline = createOfflineErrorItemServiceFromWindow();
        if (!offline) {
            return;
        }

        const [pending, processing, failed] = await Promise.all([
            offline.taskRepository.listTasksByStatus(offline.ownerProfileId, "pending", 10),
            offline.taskRepository.listTasksByStatus(offline.ownerProfileId, "processing", 10),
            offline.taskRepository.listTasksByStatus(offline.ownerProfileId, "failed", 10),
        ]);

        const merged = [...pending, ...processing, ...failed]
            .sort((a, b) => b.createdAt - a.createdAt)
            .slice(0, 20);

        setQueueTasks(merged);
    }, []);

    useEffect(() => {
        if (params.id) {
            void fetchNotebook(params.id as string);
        }
    }, [fetchNotebook, params.id]);

    useEffect(() => {
        const loadQueue = async () => {
            await refreshQueueTasks();
            setPaused(false);
        };

        void loadQueue();
    }, [params.id, refreshQueueTasks]);

    useEffect(() => {
        return queueRuntimeTelemetryState.subscribe((snapshot) => {
            setLastQueueRun(snapshot.lastRun);
        });
    }, []);

    useEffect(() => {
        return offlineRuntimeState.subscribe((snapshot) => {
            setSettingsWarning(snapshot.settingsWarning);
        });
    }, []);

    const handleRetryAll = async () => {
        const offline = typeof window !== "undefined" ? createOfflineErrorItemServiceFromWindow() : null;
        if (!offline) {
            return;
        }

        await offline.taskRepository.retryAllFailedTasks(offline.ownerProfileId, Date.now());
        const connection = typeof window !== "undefined" ? window.__OFFLINE_SQLITE_CONNECTION__ : undefined;
        if (connection) {
            await ensureOfflineAiRuntime(connection).runNow();
        }
        await refreshQueueTasks();
    };

    const handleTogglePause = () => {
        setPaused((value) => !value);
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <p className="text-muted-foreground">{t.common.loading}</p>
            </div>
        );
    }

    if (!notebook) return null;

    return (
        <PencilPageShell
            title={notebook.name}
            subtitle={(t.notebooks?.totalErrors || "Total {count} errors").replace("{count}", (notebook._count?.errorItems || 0).toString())}
            actions={
                <>
                    <Link href={`/notebooks/${notebook.id}/add`}>
                        <Button size="sm" className="hidden sm:flex">
                            <Plus className="mr-2 h-4 w-4" />
                            {t.notebooks?.addError || "Add Error"}
                        </Button>
                        <Button size="icon" className="sm:hidden">
                            <Plus className="h-4 w-4" />
                        </Button>
                    </Link>
                    <Link href="/">
                        <Button variant="ghost" size="icon">
                            <House className="h-5 w-5" />
                        </Button>
                    </Link>
                </>
            }
        >
            <PencilSectionCard>
                <BackButton fallbackUrl="/notebooks" className="shrink-0" />
            </PencilSectionCard>

            <PencilSectionCard>
                <ErrorList subjectId={notebook.id} subjectName={notebook.name} />
            </PencilSectionCard>

            <PencilSectionCard title={notebookLabels.queueTitle || "AI 队列状态"}>
                <QueueStatusPanel
                    tasks={queueTasks.map((task) => ({
                        id: task.id,
                        status: task.status,
                        errorItemId: task.errorItemId,
                        lastError: task.lastError,
                    }))}
                    paused={paused}
                    onRetryAll={handleRetryAll}
                    onTogglePause={handleTogglePause}
                    online={!paused}
                    telemetry={lastQueueRun ? {
                        at: lastQueueRun.at,
                        executed: lastQueueRun.executed,
                        succeeded: lastQueueRun.succeeded,
                        failed: lastQueueRun.failed,
                        status: lastQueueRun.status,
                    } : undefined}
                    settingsWarning={settingsWarning}
                    labels={{
                        title: notebookLabels.queueTitle || "AI 队列状态",
                        queueCountTitle: notebookLabels.queueCountTitle || `待处理任务（${queueTasks.length}）`,
                        retryAll: notebookLabels.retryAll || "全部重试",
                        pause: notebookLabels.pause || "暂停队列",
                        resume: notebookLabels.resume || "恢复队列",
                        empty: notebookLabels.queueEmpty || "暂无任务",
                        offline: notebookLabels.queueOffline || "当前离线",
                        online: notebookLabels.queueOnline || "当前在线",
                        queueLastRun: notebookLabels.queueLastRun || "最近执行",
                        queueLastRunSuccess: notebookLabels.queueLastRunSuccess || "执行成功",
                        queueLastRunSkipped: notebookLabels.queueLastRunSkipped || "已跳过",
                        queueLastRunError: notebookLabels.queueLastRunError || "执行失败",
                        queueFallbackHint: notebookLabels.queueFallbackHint || "设置同步失败，已使用本地离线配置。",
                        queueFallbackUsingLocalHint: notebookLabels.queueFallbackUsingLocalHint || "设置同步失败，已使用本地离线配置。",
                        queueFallbackNoLocalHint: notebookLabels.queueFallbackNoLocalHint || "设置同步失败且未找到本地配置，请先在设置中配置 AI。",
                    }}
                />
            </PencilSectionCard>
        </PencilPageShell>
    );
}
