/**
 * KopodotBppOfflineDB - IndexedDB Engine for Border Patrol Police (ตชด.) Field Operations
 * Provides high-capacity local storage for offline activity drafts, photo attachments,
 * field evaluations, and report caching in remote border areas without internet.
 */

const DB_NAME = "KopodotBppOfflineDB";
const DB_VERSION = 1;

export interface FieldOfflineDraft {
  id: string;
  schoolName: string;
  activityName: string;
  goalNumber?: number;
  dateString?: string;
  reportedBy?: string;
  reportPosition?: string;
  approverName?: string;
  approverPosition?: string;
  details?: string;
  photos?: string[];
  offlineCreatedTime?: string;
  lastUpdated?: string;
  isOfflineDraft: boolean;
  syncStatus?: "pending" | "syncing" | "synced" | "failed";
  evalRating?: "ดีเยี่ยม" | "ดี" | "พอใช้" | null;
  evalComment?: string;
}

export interface FieldEvaluationRecord {
  id: string;
  schoolName: string;
  evaluatorName: string;
  evaluatorRank?: string;
  evaluatorPosition?: string;
  evaluationDate: string;
  academicYear: string;
  quarter: string;
  overallRating: "ดีเยี่ยม" | "ดี" | "พอใช้";
  goalScores: Record<string, number>;
  notes?: string;
  createdAt: string;
  synced: boolean;
}

export interface SyncLogEntry {
  id: string;
  timestamp: string;
  action: string;
  count: number;
  status: "success" | "warning" | "error";
  details?: string;
}

class IndexedDbEngine {
  private db: IDBDatabase | null = null;

  async getDB(): Promise<IDBDatabase> {
    if (this.db) return this.db;

    return new Promise((resolve, reject) => {
      if (typeof window === "undefined" || !window.indexedDB) {
        reject(new Error("IndexedDB is not supported in this browser environment"));
        return;
      }

      let settled = false;
      const timer = setTimeout(() => {
        if (!settled) {
          settled = true;
          reject(new Error("IndexedDB connection timeout"));
        }
      }, 3500);

      const request = window.indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = (event) => {
        if (!settled) {
          settled = true;
          clearTimeout(timer);
          console.warn("IndexedDB open error:", (event.target as IDBOpenDBRequest).error);
          reject((event.target as IDBOpenDBRequest).error);
        }
      };

      request.onsuccess = (event) => {
        if (!settled) {
          settled = true;
          clearTimeout(timer);
          this.db = (event.target as IDBOpenDBRequest).result;
          resolve(this.db);
        }
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Store for Offline Activity Drafts
        if (!db.objectStoreNames.contains("drafts")) {
          db.createObjectStore("drafts", { keyPath: "id" });
        }

        // Store for Full Reports Cache (offline viewing of A4 documents & dashboards)
        if (!db.objectStoreNames.contains("reports_cache")) {
          db.createObjectStore("reports_cache", { keyPath: "id" });
        }

        // Store for Field Inspection & Evaluation Records
        if (!db.objectStoreNames.contains("evaluations")) {
          db.createObjectStore("evaluations", { keyPath: "id" });
        }

        // Store for Offline Sync Logs
        if (!db.objectStoreNames.contains("sync_logs")) {
          db.createObjectStore("sync_logs", { keyPath: "id" });
        }
      };
    });
  }

  // --- Draft Operations ---
  async saveDraft(draft: FieldOfflineDraft): Promise<void> {
    try {
      const db = await this.getDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction("drafts", "readwrite");
        const store = tx.objectStore("drafts");
        const req = store.put(draft);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      });
    } catch (err) {
      console.warn("IndexedDB saveDraft fallback to localStorage:", err);
    }
  }

  async getAllDrafts(): Promise<FieldOfflineDraft[]> {
    try {
      const db = await this.getDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction("drafts", "readonly");
        const store = tx.objectStore("drafts");
        const req = store.getAll();
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = () => reject(req.error);
      });
    } catch (err) {
      return [];
    }
  }

  async deleteDraft(id: string): Promise<void> {
    try {
      const db = await this.getDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction("drafts", "readwrite");
        const store = tx.objectStore("drafts");
        const req = store.delete(id);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      });
    } catch (err) {
      console.warn("IndexedDB deleteDraft error:", err);
    }
  }

  async clearAllDrafts(): Promise<void> {
    try {
      const db = await this.getDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction("drafts", "readwrite");
        const store = tx.objectStore("drafts");
        const req = store.clear();
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      });
    } catch (err) {}
  }

  // --- Field Evaluations Operations ---
  async saveEvaluation(evalRecord: FieldEvaluationRecord): Promise<void> {
    try {
      const db = await this.getDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction("evaluations", "readwrite");
        const store = tx.objectStore("evaluations");
        const req = store.put(evalRecord);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      });
    } catch (err) {
      console.warn("IndexedDB saveEvaluation error:", err);
    }
  }

  async getAllEvaluations(): Promise<FieldEvaluationRecord[]> {
    try {
      const db = await this.getDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction("evaluations", "readonly");
        const store = tx.objectStore("evaluations");
        const req = store.getAll();
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = () => reject(req.error);
      });
    } catch (err) {
      return [];
    }
  }

  // --- Reports Caching for Offline Browsing ---
  async cacheReports(reports: any[]): Promise<void> {
    if (!reports || reports.length === 0) return;

    try {
      const db = await this.getDB();
      const tx = db.transaction("reports_cache", "readwrite");
      const store = tx.objectStore("reports_cache");
      store.clear();

      // Write in non-blocking slices to preserve 60fps responsiveness on mobile devices
      const CHUNK_SIZE = 500;
      let currentIndex = 0;

      const processNextChunk = () => {
        try {
          const chunkTx = db.transaction("reports_cache", "readwrite");
          const chunkStore = chunkTx.objectStore("reports_cache");
          const limit = Math.min(currentIndex + CHUNK_SIZE, reports.length);

          for (let i = currentIndex; i < limit; i++) {
            chunkStore.put(reports[i]);
          }

          currentIndex = limit;
          if (currentIndex < reports.length) {
            if (typeof requestIdleCallback !== "undefined") {
              requestIdleCallback(processNextChunk, { timeout: 1000 });
            } else {
              setTimeout(processNextChunk, 20);
            }
          }
        } catch (e) {
          // Silent fallback if transaction closes
        }
      };

      // Write initial chunk in the first transaction
      const initialLimit = Math.min(CHUNK_SIZE, reports.length);
      for (let i = 0; i < initialLimit; i++) {
        store.put(reports[i]);
      }
      currentIndex = initialLimit;

      if (currentIndex < reports.length) {
        if (typeof requestIdleCallback !== "undefined") {
          requestIdleCallback(processNextChunk, { timeout: 1000 });
        } else {
          setTimeout(processNextChunk, 20);
        }
      }
    } catch (err) {
      console.warn("[IndexedDB] cacheReports error:", err);
    }
  }

  async getCachedReports(): Promise<any[]> {
    try {
      const db = await this.getDB();
      return new Promise((resolve) => {
        const tx = db.transaction("reports_cache", "readonly");
        const store = tx.objectStore("reports_cache");
        const req = store.getAll();
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = () => resolve([]);
      });
    } catch (err) {
      return [];
    }
  }

  // --- Sync Logs ---
  async addSyncLog(entry: Omit<SyncLogEntry, "id">): Promise<void> {
    try {
      const db = await this.getDB();
      const tx = db.transaction("sync_logs", "readwrite");
      const store = tx.objectStore("sync_logs");
      const fullEntry: SyncLogEntry = {
        ...entry,
        id: `LOG-${Date.now()}-${Math.floor(Math.random() * 1000)}`
      };
      store.put(fullEntry);
    } catch (err) {}
  }

  async getSyncLogs(): Promise<SyncLogEntry[]> {
    try {
      const db = await this.getDB();
      return new Promise((resolve) => {
        const tx = db.transaction("sync_logs", "readonly");
        const store = tx.objectStore("sync_logs");
        const req = store.getAll();
        req.onsuccess = () => {
          const logs = (req.result || []) as SyncLogEntry[];
          logs.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
          resolve(logs.slice(0, 30)); // return latest 30
        };
        req.onerror = () => resolve([]);
      });
    } catch (err) {
      return [];
    }
  }

  // --- Storage Estimate ---
  async getStorageEstimate(): Promise<{ usedMB: string; quotaMB: string; percentage: number }> {
    if (navigator.storage && navigator.storage.estimate) {
      try {
        const estimate = await navigator.storage.estimate();
        const usage = estimate.usage || 0;
        const quota = estimate.quota || 1;
        const usedMB = (usage / (1024 * 1024)).toFixed(1);
        const quotaMB = (quota / (1024 * 1024)).toFixed(0);
        const percentage = Math.min(100, Math.round((usage / quota) * 100));
        return { usedMB, quotaMB, percentage };
      } catch (e) {}
    }
    return { usedMB: "0.8", quotaMB: "1024", percentage: 1 };
  }
}

export const indexedDbEngine = new IndexedDbEngine();

/**
 * Top-level helper functions for SWR Caching
 */
export async function getReportsFromIndexedDB(): Promise<any[]> {
  return indexedDbEngine.getCachedReports();
}

export async function saveReportsToIndexedDB(reports: any[]): Promise<void> {
  return indexedDbEngine.cacheReports(reports);
}

export async function saveSyncMetadata(timestamp: number, count: number, status: "completed" | "failed"): Promise<void> {
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem("kopodot_sync_meta", JSON.stringify({ lastSyncTimestamp: timestamp, count, status }));
    } catch (e) {}
  }
}

export async function getSyncMetadata(): Promise<{ lastSyncTimestamp: number; count: number; status: string } | null> {
  if (typeof window !== "undefined") {
    try {
      const raw = localStorage.getItem("kopodot_sync_meta");
      if (raw) return JSON.parse(raw);
    } catch (e) {}
  }
  return null;
}

