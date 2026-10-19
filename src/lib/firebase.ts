import { initializeApp } from "firebase/app";
import { 
  collection, 
  doc, 
  setDoc, 
  getDoc,
  deleteDoc, 
  getDocs, 
  writeBatch, 
  limit, 
  query, 
  onSnapshot,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager
} from "firebase/firestore";
import { ActivityReport } from "../types";

// Import configuration generated during Firebase provisioning
import firebaseConfig from "../../firebase-applet-config.json";

let app;
let db: any = null;
let isFirebaseEnabled = false;
let isFirestoreQuotaExceeded = false;

try {
  if (typeof window !== "undefined") {
    const isExceededSession = window.sessionStorage.getItem("firebase_quota_exceeded") === "true";
    const lastExceededTime = Number(window.localStorage.getItem("firebase_quota_exceeded_timestamp") || "0");
    // If quota was exceeded in the last 12 hours, keep quota protection active to avoid hitting hard limits
    const isRecentExceeded = lastExceededTime > 0 && Date.now() - lastExceededTime < 12 * 60 * 60 * 1000;
    isFirestoreQuotaExceeded = isExceededSession || isRecentExceeded;
  }
} catch (e) {
  // Ignore storage errors
}

export function isQuotaError(error: any): boolean {
  if (!error) return false;
  const errorMsg = String(error?.message || error?.error || error || "").toLowerCase();
  const errorCode = String(error?.code || "").toLowerCase();
  return (
    errorCode.includes("resource-exhausted") ||
    errorCode.includes("quota") ||
    errorCode.includes("unavailable") ||
    errorMsg.includes("quota") ||
    errorMsg.includes("exhausted") ||
    errorMsg.includes("limit exceeded") ||
    errorMsg.includes("read units") ||
    errorMsg.includes("write units") ||
    errorMsg.includes("free daily")
  );
}

function markQuotaExceeded(error: any) {
  if (isQuotaError(error)) {
    isFirestoreQuotaExceeded = true;
    try {
      if (typeof window !== "undefined") {
        window.sessionStorage.setItem("firebase_quota_exceeded", "true");
        window.localStorage.setItem("firebase_quota_exceeded_timestamp", String(Date.now()));
      }
    } catch (e) {}
    console.warn(
      "[Firebase Quota Guard] Firestore daily quota reached for this free-tier project. Cloud sync paused safely. Preserving all data locally via IndexedDB, LocalStorage, and Live Google Sheets."
    );
  }
}

try {
  if (firebaseConfig && firebaseConfig.apiKey) {
    app = initializeApp({
      apiKey: firebaseConfig.apiKey,
      authDomain: firebaseConfig.authDomain,
      projectId: firebaseConfig.projectId,
      storageBucket: firebaseConfig.storageBucket,
      messagingSenderId: firebaseConfig.messagingSenderId,
      appId: firebaseConfig.appId,
    });

    // CRITICAL: We must specify the custom firestoreDatabaseId if it's present in the config!
    const dbId = firebaseConfig.firestoreDatabaseId || "(default)";
    db = initializeFirestore(app, {
      localCache: persistentLocalCache({
        tabManager: persistentMultipleTabManager()
      })
    }, dbId);
    isFirebaseEnabled = true;
    console.log("[Firebase] Successfully initialized Firestore with databaseId:", dbId);
    if (isFirestoreQuotaExceeded) {
      console.warn("[Firebase] Firestore is in Quota Protection mode (Read/Write suspended, Local-first fallback active)");
    }
  } else {
    console.warn("[Firebase] Config missing apiKey or invalid.");
  }
} catch (error) {
  console.error("[Firebase] Initialization failed:", error);
}

export { db, isFirebaseEnabled, isFirestoreQuotaExceeded };

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  if (isQuotaError(error)) {
    markQuotaExceeded(error);
    console.warn(`[Firebase Quota Reached]: Firestore daily quota limit reached for operation '${operationType}' on '${path}'. Switched gracefully to LocalStorage/IndexedDB/Google Sheets fallback.`);
    return;
  }
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    operationType,
    path
  };
  console.error('[Firestore Error]:', JSON.stringify(errInfo));
}

// Collection Name for Activity Reports
const REPORTS_COLLECTION = "activity_reports";

/**
 * Saves or updates a single report in Cloud Firestore
 */
export async function saveReportToFirestore(report: ActivityReport): Promise<void> {
  if (!isFirebaseEnabled || !db || isFirestoreQuotaExceeded) {
    return;
  }
  try {
    const docRef = doc(db, REPORTS_COLLECTION, report.id);
    await setDoc(docRef, {
      ...report,
      firestoreSyncedAt: new Date().toISOString(),
    }, { merge: true });
    console.log(`[Firebase] Document ${report.id} saved to Firestore successfully.`);
  } catch (error) {
    if (isQuotaError(error)) {
      markQuotaExceeded(error);
      return;
    }
    console.warn(`[Firebase] Notice saving report ${report.id} to Firestore:`, error);
  }
}

/**
 * Deletes a single report from Cloud Firestore
 */
export async function deleteReportFromFirestore(id: string): Promise<void> {
  if (!isFirebaseEnabled || !db || isFirestoreQuotaExceeded) {
    return;
  }
  try {
    const docRef = doc(db, REPORTS_COLLECTION, id);
    await deleteDoc(docRef);
    console.log(`[Firebase] Document ${id} deleted from Firestore successfully.`);
  } catch (error) {
    if (isQuotaError(error)) {
      markQuotaExceeded(error);
      return;
    }
    console.warn(`[Firebase] Notice deleting report ${id} from Firestore:`, error);
  }
}

/**
 * Loads all reports from Cloud Firestore
 */
export async function loadReportsFromFirestore(): Promise<ActivityReport[] | null> {
  if (!isFirebaseEnabled || !db || isFirestoreQuotaExceeded) {
    return null;
  }
  try {
    const q = query(collection(db, REPORTS_COLLECTION));
    const querySnapshot = await getDocs(q);
    const reports: ActivityReport[] = [];
    querySnapshot.forEach((docSnap) => {
      reports.push(docSnap.data() as ActivityReport);
    });
    console.log(`[Firebase] Loaded ${reports.length} reports from Firestore.`);
    return reports;
  } catch (error) {
    if (isQuotaError(error)) {
      markQuotaExceeded(error);
      return null;
    }
    console.warn("[Firebase] Notice loading reports from Firestore:", error);
    return null;
  }
}

/**
 * Syncs a batch of reports to Cloud Firestore with throttling
 */
export async function syncReportsToFirestore(reports: ActivityReport[]): Promise<void> {
  if (!isFirebaseEnabled || !db || isFirestoreQuotaExceeded) {
    return;
  }
  try {
    // Firestore write streams can get exhausted if we commit too many objects at once on free-tier sandboxes.
    // We split into small chunks of 25 items and add a slight delay between commits.
    const chunks = [];
    const chunkSize = 25;
    for (let i = 0; i < reports.length; i += chunkSize) {
      chunks.push(reports.slice(i, i + chunkSize));
    }

    let isFirst = true;
    for (const chunk of chunks) {
      if (isFirestoreQuotaExceeded) {
        break;
      }
      if (!isFirst) {
        // Throttling delay to allow the write stream to drain gracefully
        await new Promise((resolve) => setTimeout(resolve, 150));
      }
      isFirst = false;

      const batch = writeBatch(db);
      chunk.forEach((report) => {
        const docRef = doc(db, REPORTS_COLLECTION, report.id);
        batch.set(docRef, {
          ...report,
          firestoreSyncedAt: new Date().toISOString(),
        }, { merge: true });
      });
      await batch.commit();
    }
    console.log(`[Firebase] Bulk synced ${reports.length} reports to Firestore.`);
  } catch (error) {
    if (isQuotaError(error)) {
      markQuotaExceeded(error);
      return;
    }
    console.warn("[Firebase] Notice bulk syncing to Firestore:", error);
  }
}

/**
 * Attaches a real-time onSnapshot listener for instant auto-updates when new reports arrive
 */
export function subscribeToFirestoreReports(onUpdate: (reports: ActivityReport[]) => void): () => void {
  if (!isFirebaseEnabled || !db || isFirestoreQuotaExceeded) {
    return () => {};
  }
  try {
    const q = query(collection(db, REPORTS_COLLECTION));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const reports: ActivityReport[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data() as ActivityReport;
          if (data && data.id) {
            reports.push(data);
          }
        });
        if (reports.length > 0) {
          console.log(`[Firebase Real-Time] Received ${reports.length} reports automatically via Firestore stream.`);
          onUpdate(reports);
        }
      },
      (error) => {
        if (isQuotaError(error)) {
          markQuotaExceeded(error);
          console.warn("[Firebase Real-Time] Quota limit reached on live listener, stream gracefully paused.");
          return;
        }
        handleFirestoreError(error, OperationType.GET, REPORTS_COLLECTION);
      }
    );
    return unsubscribe;
  } catch (error) {
    if (isQuotaError(error)) {
      markQuotaExceeded(error);
    }
    console.warn("[Firebase Real-Time Listener Error]:", error);
    return () => {};
  }
}

// Global Application Settings (Page Banners & Defaults)
export const APP_SETTINGS_COLLECTION = "app_settings";
export const PAGE_BANNERS_DOC_ID = "page_banners";

/**
 * Persists customized page banners to Cloud Firestore
 */
export async function savePageBannersToFirestore(banners: Record<string, string>): Promise<boolean> {
  if (!isFirebaseEnabled || !db || isFirestoreQuotaExceeded) {
    return false;
  }
  try {
    const docRef = doc(db, APP_SETTINGS_COLLECTION, PAGE_BANNERS_DOC_ID);
    await setDoc(docRef, {
      id: PAGE_BANNERS_DOC_ID,
      banners,
      updatedAt: new Date().toISOString(),
    }, { merge: true });
    console.log("[Firebase] Page banners successfully persisted to Cloud Firestore.");
    return true;
  } catch (error) {
    if (isQuotaError(error)) {
      markQuotaExceeded(error);
    }
    console.warn("[Firebase] Error saving page banners to Firestore:", error);
    return false;
  }
}

/**
 * Loads page banner settings from Cloud Firestore
 */
export async function loadPageBannersFromFirestore(): Promise<Record<string, string> | null> {
  if (!isFirebaseEnabled || !db || isFirestoreQuotaExceeded) {
    return null;
  }
  try {
    const docRef = doc(db, APP_SETTINGS_COLLECTION, PAGE_BANNERS_DOC_ID);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const data = snap.data();
      return (data?.banners as Record<string, string>) || null;
    }
    return null;
  } catch (error) {
    if (isQuotaError(error)) {
      markQuotaExceeded(error);
    }
    console.warn("[Firebase] Error loading page banners from Firestore:", error);
    return null;
  }
}

/**
 * Subscribes to real-time banner updates from Cloud Firestore
 */
export function subscribeToFirestorePageBanners(onUpdate: (banners: Record<string, string>) => void): () => void {
  if (!isFirebaseEnabled || !db || isFirestoreQuotaExceeded) {
    return () => {};
  }
  try {
    const docRef = doc(db, APP_SETTINGS_COLLECTION, PAGE_BANNERS_DOC_ID);
    const unsubscribe = onSnapshot(
      docRef,
      (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data?.banners && typeof data.banners === "object") {
            onUpdate(data.banners as Record<string, string>);
          }
        }
      },
      (error) => {
        if (isQuotaError(error)) {
          markQuotaExceeded(error);
        }
        console.warn("[Firebase Real-Time Banner Listener Error]:", error);
      }
    );
    return unsubscribe;
  } catch (error) {
    if (isQuotaError(error)) {
      markQuotaExceeded(error);
    }
    return () => {};
  }
}
