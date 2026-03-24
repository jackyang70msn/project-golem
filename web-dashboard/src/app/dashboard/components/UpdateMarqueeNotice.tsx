"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowRight, BellRing } from "lucide-react";
import { apiGet } from "@/lib/api-client";

type UpdateInfo = {
    remoteVersion?: string;
    isOutdated?: boolean;
    installMode: string;
    gitInfo?: {
        currentBranch: string;
        behindCount: number;
    };
};

const REFRESH_INTERVAL_MS = 5 * 60 * 1000;

function resolveUpdateMessage(updateInfo: UpdateInfo | null): string | null {
    if (!updateInfo) return null;

    if (updateInfo.installMode === "git") {
        const behindCount = updateInfo.gitInfo?.behindCount ?? 0;
        if (behindCount > 0) {
            const branch = updateInfo.gitInfo?.currentBranch || "main";
            return `GitHub ${branch} 分支有 ${behindCount} 個更新，前往「設定總表」可一鍵更新。`;
        }
        return null;
    }

    if (!updateInfo.isOutdated) return null;

    const remoteVersion = updateInfo.remoteVersion;
    if (remoteVersion && remoteVersion !== "Unknown") {
        return `GitHub 發現新版本 v${remoteVersion}，前往「設定總表」可一鍵更新。`;
    }
    return "GitHub 發現新版本，前往「設定總表」可一鍵更新。";
}

export default function UpdateMarqueeNotice() {
    const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);

    const fetchUpdateInfo = useCallback(async () => {
        try {
            const info = await apiGet<UpdateInfo>("/api/system/update/check");
            setUpdateInfo(info);
        } catch {
            // Keep the dashboard usable even when update-check endpoint is temporarily unavailable.
        }
    }, []);

    useEffect(() => {
        void fetchUpdateInfo();
    }, [fetchUpdateInfo]);

    useEffect(() => {
        const intervalId = window.setInterval(() => {
            if (document.visibilityState !== "visible") return;
            void fetchUpdateInfo();
        }, REFRESH_INTERVAL_MS);

        return () => window.clearInterval(intervalId);
    }, [fetchUpdateInfo]);

    const message = useMemo(() => resolveUpdateMessage(updateInfo), [updateInfo]);

    if (!message) return null;

    return (
        <Link
            href="/dashboard/settings"
            className="group block rounded-xl border border-amber-500/40 bg-gradient-to-r from-amber-500/15 via-orange-500/10 to-amber-500/15 px-4 py-2.5 shadow-sm hover:from-amber-500/25 hover:via-orange-500/15 hover:to-amber-500/25 transition-colors"
        >
            <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5 shrink-0 text-amber-700 dark:text-amber-300">
                    <BellRing className="w-4 h-4" />
                    <span className="text-[11px] font-semibold tracking-wide uppercase">Update</span>
                </div>

                <div className="min-w-0 flex-1 overflow-hidden">
                    <div className="dashboard-update-marquee-track group-hover:[animation-play-state:paused]">
                        <span className="pr-10 text-sm font-medium text-amber-900 dark:text-amber-200">{message}</span>
                        <span aria-hidden className="pr-10 text-sm font-medium text-amber-900 dark:text-amber-200">{message}</span>
                    </div>
                </div>

                <div className="shrink-0 hidden sm:flex items-center gap-1 text-xs font-semibold text-amber-700 dark:text-amber-300">
                    前往設定總表
                    <ArrowRight className="w-3.5 h-3.5" />
                </div>
            </div>
        </Link>
    );
}
