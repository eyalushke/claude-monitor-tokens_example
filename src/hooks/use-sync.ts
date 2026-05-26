"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { SYNC_CONFIG } from "@/lib/constants";
import { supabaseAvailable } from "@/lib/utils";

interface SyncState {
  status: "idle" | "running" | "error" | "server_unavailable";
  lastSyncAt: string | null;
  filesProcessed: number;
  messagesIngested: number;
  error: string | null;
}

const INITIAL_STATE: SyncState = {
  status: "idle",
  lastSyncAt: null,
  filesProcessed: 0,
  messagesIngested: 0,
  error: null,
};

const SESSION_KEY = "claude-monitor-auto-triggered";

function log(phase: string, ...args: unknown[]) {
  console.log(`[Sync] ${phase}:`, ...args);
}

export function useSync(autoTrigger: boolean = true) {
  const [syncState, setSyncState] = useState<SyncState>(INITIAL_STATE);
  const [syncVersion, setSyncVersion] = useState(0);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const mountedRef = useRef(true);
  const initialLoadDone = useRef(false);

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
      log("polling", "stopped");
    }
  }, []);

  const pollSyncState = useCallback(async () => {
    if (!supabaseAvailable()) return;
    try {
      const { createBrowserClient } = await import("@/lib/supabase/client");
      const supabase = createBrowserClient();
      const { data } = await supabase
        .from("sync_state")
        .select("*")
        .order("id", { ascending: false })
        .limit(1);

      if (!mountedRef.current) return;
      if (data && data.length > 0) {
        const row = data[0];
        log("polling", `db status=${row.status}, last_sync=${row.last_sync_at}`);
        if (row.status === "idle" && syncState.status === "running") {
          log("polling", "sync completed! refreshing data...");
          setSyncState((prev) => ({
            ...prev,
            status: "idle",
            lastSyncAt: row.last_sync_at,
            filesProcessed: row.files_processed ?? 0,
            messagesIngested: row.messages_ingested ?? 0,
            error: null,
          }));
          setSyncVersion((v) => v + 1);
          stopPolling();
        }
      }
    } catch (e) {
      log("polling", "error polling supabase:", e);
    }
  }, [syncState.status, stopPolling]);

  const startPolling = useCallback(() => {
    stopPolling();
    log("polling", "started (every 2s)");
    const startTime = Date.now();
    pollRef.current = setInterval(() => {
      if (Date.now() - startTime > SYNC_CONFIG.maxPollDurationMs) {
        log("polling", "timed out after 2 minutes");
        stopPolling();
        setSyncState((prev) => ({
          ...prev,
          status: "error",
          error: "Sync timed out. Check the trigger server logs.",
        }));
        return;
      }
      pollSyncState();
    }, SYNC_CONFIG.pollIntervalMs);
  }, [stopPolling, pollSyncState]);

  const triggerSync = useCallback(async () => {
    log("trigger", `status=${syncState.status}, lastSync=${syncState.lastSyncAt}`);

    if (syncState.status === "running") {
      log("trigger", "skipped — already running");
      return;
    }

    if (syncState.lastSyncAt) {
      const lastSync = new Date(syncState.lastSyncAt).getTime();
      const agoMs = Date.now() - lastSync;
      if (agoMs < SYNC_CONFIG.debounceMinutes * 60 * 1000) {
        log("trigger", `skipped — debounce (synced ${Math.round(agoMs / 1000)}s ago)`);
        return;
      }
    }

    const url = `${SYNC_CONFIG.triggerUrl}/trigger`;
    log("trigger", `POST ${url}`);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    try {
      const res = await fetch(url, {
        method: "POST",
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (!mountedRef.current) return;

      log("trigger", `response: ${res.status} ${res.statusText}`);

      if (res.ok || res.status === 409) {
        setSyncState((prev) => ({ ...prev, status: "running", error: null }));
        sessionStorage.setItem(SESSION_KEY, String(Date.now()));
        startPolling();
      } else {
        const body = await res.json().catch(() => ({}));
        log("trigger", "unexpected response:", body);
        setSyncState((prev) => ({
          ...prev,
          status: "error",
          error: body.error || `Server returned ${res.status}`,
        }));
      }
    } catch (e) {
      clearTimeout(timeoutId);
      if (!mountedRef.current) return;
      log("trigger", "fetch failed:", e);
      setSyncState((prev) => ({
        ...prev,
        status: "server_unavailable",
        error: "Local sync server not running. Start it with: python3 scripts/trigger_server.py",
      }));
    }
  }, [syncState.status, syncState.lastSyncAt, startPolling]);

  // Load initial sync state from Supabase
  useEffect(() => {
    async function loadInitialState() {
      log("init", `supabaseAvailable=${supabaseAvailable()}`);
      if (!supabaseAvailable()) {
        log("init", "no supabase — using defaults");
        initialLoadDone.current = true;
        return;
      }
      try {
        const { createBrowserClient } = await import("@/lib/supabase/client");
        const supabase = createBrowserClient();
        const { data, error } = await supabase
          .from("sync_state")
          .select("*")
          .order("id", { ascending: false })
          .limit(1);

        if (!mountedRef.current) return;
        if (error) {
          log("init", "supabase error:", error);
        } else if (data && data.length > 0) {
          const row = data[0];
          log("init", `loaded: status=${row.status}, last_sync=${row.last_sync_at}, files=${row.files_processed}`);
          setSyncState((prev) => ({
            ...prev,
            lastSyncAt: row.last_sync_at,
            filesProcessed: row.files_processed ?? 0,
            messagesIngested: row.messages_ingested ?? 0,
            status: row.status === "running" ? "running" : "idle",
          }));
          if (row.status === "running") {
            log("init", "db says running — starting poll");
            startPolling();
          }
        } else {
          log("init", "no sync_state rows found");
        }
      } catch (e) {
        log("init", "failed to load initial state:", e);
      }
      initialLoadDone.current = true;
    }
    loadInitialState();
    return () => {
      mountedRef.current = false;
      stopPolling();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-trigger on mount (after initial state is loaded)
  useEffect(() => {
    if (!autoTrigger || !initialLoadDone.current) {
      log("auto", `skip — autoTrigger=${autoTrigger}, initialLoadDone=${initialLoadDone.current}`);
      return;
    }
    if (syncState.status === "running") {
      log("auto", "skip — already running");
      return;
    }

    const alreadyTriggered = sessionStorage.getItem(SESSION_KEY);
    if (alreadyTriggered) {
      const triggeredAt = parseInt(alreadyTriggered, 10);
      const agoMs = Date.now() - triggeredAt;
      if (agoMs < SYNC_CONFIG.debounceMinutes * 60 * 1000) {
        log("auto", `skip — session debounce (triggered ${Math.round(agoMs / 1000)}s ago)`);
        return;
      }
    }

    if (syncState.lastSyncAt) {
      const lastSync = new Date(syncState.lastSyncAt).getTime();
      const agoMs = Date.now() - lastSync;
      if (agoMs < SYNC_CONFIG.debounceMinutes * 60 * 1000) {
        log("auto", `skip — sync debounce (synced ${Math.round(agoMs / 1000)}s ago)`);
        return;
      }
    }

    log("auto", "auto-triggering sync...");
    const id = setTimeout(triggerSync, 0);
    return () => clearTimeout(id);
  }, [autoTrigger, syncState.lastSyncAt, syncState.status, triggerSync]);

  return {
    syncState,
    isSyncing: syncState.status === "running",
    triggerSync,
    syncVersion,
  };
}
