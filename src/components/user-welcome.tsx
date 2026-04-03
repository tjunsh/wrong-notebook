"use client";

import { useState, useEffect } from "react";

import { useLanguage } from "@/contexts/LanguageContext";
import { useSession, signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { LogOut, User } from "lucide-react";

export function UserWelcome() {
    const { t, language } = useLanguage();
    const { data: session } = useSession();
    const [mounted, setMounted] = useState(false);
    const [offlineName, setOfflineName] = useState<string | null>(null);

    useEffect(() => {
        setMounted(true);
    }, []);

    useEffect(() => {
        const loadOfflineName = async () => {
            if (typeof window === 'undefined' || !window.__OFFLINE_SQLITE_CONNECTION__) {
                return;
            }
            try {
                const { apiClient } = await import('@/lib/api-client');
                const data = await apiClient.get<{ name?: string }>("/api/user");
                if (data?.name) {
                    setOfflineName(data.name);
                }
            } catch {}
        };

        void loadOfflineName();
    }, []);

    // Server always renders 'User' (no session). Client matches this initially.
    // After mount, we show the real name.
    const userName = mounted
        ? (session?.user?.name || session?.user?.email || offlineName || 'Local User')
        : 'User';

    return (
        <div className="flex items-center gap-2 bg-card p-4 rounded-lg border shadow-sm animate-in fade-in slide-in-from-top-4 duration-700">
            <User className="h-5 w-5 text-primary" />
            <span className="font-medium">
                {t.common.welcome || 'Welcome back, '}
                {userName}
            </span>
        </div>
    );
}
