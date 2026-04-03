"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { BackButton } from "@/components/ui/back-button";
import { Plus, House } from "lucide-react";
import Link from "next/link";
import { NotebookCard } from "@/components/notebook-card";
import { CreateNotebookDialog } from "@/components/create-notebook-dialog";
import { PencilPageShell } from "@/components/pencil/pencil-page-shell";
import { PencilSectionCard } from "@/components/pencil/pencil-section-card";
import { PencilEmptyState } from "@/components/pencil/pencil-empty-state";

import { Notebook } from "@/types/api";
import { apiClient } from "@/lib/api-client";

import { useLanguage } from "@/contexts/LanguageContext";

// ... imports

export default function NotebooksPage() {
    const router = useRouter();
    const { t } = useLanguage(); // Use hook
    const [notebooks, setNotebooks] = useState<Notebook[]>([]);
    const [loading, setLoading] = useState(true);
    const [dialogOpen, setDialogOpen] = useState(false);

    useEffect(() => {
        fetchNotebooks();
    }, []);

    const fetchNotebooks = async () => {
        try {
            const data = await apiClient.get<Notebook[]>("/api/notebooks");
            setNotebooks(data);
        } catch (error) {
            console.error("Failed to fetch notebooks:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = async (name: string) => {
        try {
            await apiClient.post("/api/notebooks", { name });
            await fetchNotebooks();
        } catch (error: any) {
            console.error(error);
            const message = error.data?.message || t.notebooks?.createError || "Failed to create";
            alert(message);
        }
    };

    const handleDelete = async (id: string, errorCount: number, name: string) => {
        if (errorCount > 0) {
            alert(t.notebooks?.deleteNotEmpty || "Please clear all items in this notebook first.");
            return;
        }
        if (!confirm((t.notebooks?.deleteConfirm || "Are you sure?").replace("{name}", name))) return;

        try {
            await apiClient.delete(`/api/notebooks/${id}`);
            await fetchNotebooks();
        } catch (error: any) {
            console.error(error);
            const message = error.data?.message || t.notebooks?.deleteError || "Failed to delete";
            alert(message);
        }
    };

    const handleNotebookClick = (id: string) => {
        router.push(`/notebooks/${id}`);
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <p className="text-muted-foreground">{t.common.loading}</p>
            </div>
        );
    }

    return (
        <PencilPageShell
            title={t.notebooks?.title || "My Notebooks"}
            subtitle={t.notebooks?.subtitle || "Manage your mistakes by subject"}
            actions={
                <>
                    <Button onClick={() => setDialogOpen(true)} size="sm" className="hidden sm:flex">
                        <Plus className="mr-2 h-4 w-4" />
                        {t.notebooks?.create || "New Notebook"}
                    </Button>
                    <Button onClick={() => setDialogOpen(true)} size="icon" className="sm:hidden">
                        <Plus className="h-4 w-4" />
                    </Button>
                    <Link href="/">
                        <Button variant="ghost" size="icon">
                            <House className="h-5 w-5" />
                        </Button>
                    </Link>
                </>
            }
        >
            <PencilSectionCard>
                <div className="flex items-start gap-4">
                    <BackButton fallbackUrl="/" />
                </div>
            </PencilSectionCard>

            <PencilSectionCard>
                {notebooks.length === 0 ? (
                    <PencilEmptyState
                        title={t.notebooks?.empty || "No notebooks yet."}
                        action={
                            <Button onClick={() => setDialogOpen(true)}>
                                <Plus className="mr-2 h-4 w-4" />
                                {t.notebooks?.createFirst || "Create Notebook"}
                            </Button>
                        }
                    />
                ) : (
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {notebooks.map((notebook) => (
                            <NotebookCard
                                key={notebook.id}
                                id={notebook.id}
                                name={notebook.name}
                                errorCount={notebook._count?.errorItems || 0}
                                onClick={() => handleNotebookClick(notebook.id)}
                                onDelete={() => handleDelete(notebook.id, notebook._count?.errorItems || 0, notebook.name)}
                                itemLabel={t.notebooks?.items || "items"}
                            />
                        ))}
                    </div>
                )}
            </PencilSectionCard>

                <CreateNotebookDialog
                    key={t.common.loading} // Force re-render when language changes
                    open={dialogOpen}
                    onOpenChange={setDialogOpen}
                    onCreate={handleCreate}
                />
        </PencilPageShell>
    );
}
