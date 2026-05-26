"use client";

import { createContext, useContext } from "react";
import { useSync } from "@/hooks/use-sync";

type SyncContextValue = ReturnType<typeof useSync>;

const SyncContext = createContext<SyncContextValue>({
  syncState: {
    status: "idle",
    lastSyncAt: null,
    filesProcessed: 0,
    messagesIngested: 0,
    error: null,
  },
  isSyncing: false,
  triggerSync: async () => {},
  syncVersion: 0,
});

export function SyncProvider({ children }: { children: React.ReactNode }) {
  const sync = useSync(true);
  return <SyncContext.Provider value={sync}>{children}</SyncContext.Provider>;
}

export function useSyncContext() {
  return useContext(SyncContext);
}
