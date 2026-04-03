"use client";

import { useEffect } from "react";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { SessionProvider } from "next-auth/react";
import { OfflineBootstrap } from "@/offline/runtime/offline-bootstrap.client";
import { initializeCapacitorEntry } from "@/offline/runtime/capacitor-entry";

declare global {
    interface Window {
        Capacitor?: {
            isNativePlatform?: () => boolean;
        };
        CapacitorSQLite?: {
            isConnection: (options: { database: string; readonly: boolean }) => Promise<{ result: boolean }>;
            retrieveConnection: (options: { database: string; readonly: boolean }) => Promise<{
                open: () => Promise<void>;
                close?: () => Promise<void>;
                execute?: (statement: string, values?: Array<string | number | null>) => Promise<{ changes?: number | { changes?: number; lastId?: number | string } }>;
                run?: (statement: string, values?: Array<string | number | null>) => Promise<{ changes?: number | { changes?: number; lastId?: number | string } }>;
                query?: (statement: string, values?: Array<string | number | null>) => Promise<{ values?: Array<Record<string, unknown>> }>;
            }>;
            createConnection: (options: {
                database: string;
                version: number;
                encrypted: boolean;
                mode: 'no-encryption' | 'secret' | 'encryption';
                readonly: boolean;
            }) => Promise<{
                open: () => Promise<void>;
                close?: () => Promise<void>;
                execute?: (statement: string, values?: Array<string | number | null>) => Promise<{ changes?: number | { changes?: number; lastId?: number | string } }>;
                run?: (statement: string, values?: Array<string | number | null>) => Promise<{ changes?: number | { changes?: number; lastId?: number | string } }>;
                query?: (statement: string, values?: Array<string | number | null>) => Promise<{ values?: Array<Record<string, unknown>> }>;
            }>;
        };
    }
}

export function Providers({ children }: { children: React.ReactNode }) {
    useEffect(() => {
        const boot = async () => {
            if (typeof window === 'undefined') {
                return;
            }

            const isNative = window.Capacitor?.isNativePlatform?.() === true;
            const sqlite = window.CapacitorSQLite;
            if (!isNative || !sqlite) {
                return;
            }

            await initializeCapacitorEntry(sqlite);
        };

        void boot();
    }, []);

    return (
        <SessionProvider>
            <OfflineBootstrap />
            <LanguageProvider>
                {children}
            </LanguageProvider>
        </SessionProvider>
    );
}
