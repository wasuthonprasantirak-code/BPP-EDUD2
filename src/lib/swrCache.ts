import { ActivityReport } from "../types";
import { 
  getReportsFromIndexedDB, 
  saveReportsToIndexedDB,
  getSyncMetadata,
  saveSyncMetadata
} from "./indexedDbStorage";

/**
 * Interface สำหรับผลลัพธ์ของ SWR Caching
 */
export interface SWRFetchResult {
  data: ActivityReport[];
  source: "indexeddb" | "network" | "fallback";
  isStale: boolean;
  timestamp: number;
}

/**
 * โหลดข้อมูลแบบ Stale-While-Revalidate (SWR):
 * 1. ดึงข้อมูลจาก IndexedDB (หรือ Local Storage) ทันที (0ms Instant Load)
 * 2. ส่งคำขอ Fetch จาก Network ในเบื้องหลัง (Background Revalidate)
 * 3. เมื่อได้ข้อมูลใหม่ จะเรียก onRevalidate Callback เพื่ออัปเดต UI และบันทึกลง IndexedDB อัตโนมัติ
 */
export async function fetchWithSWR(
  fetchNetworkData: () => Promise<ActivityReport[]>,
  onRevalidate?: (freshData: ActivityReport[], timestamp: number) => void
): Promise<SWRFetchResult> {
  // Step 1: อ่านข้อมูลแคชจาก IndexedDB ทันที
  let cachedReports: ActivityReport[] = [];
  let cacheTimestamp = Date.now();

  try {
    const dbReports = await getReportsFromIndexedDB();
    if (dbReports && dbReports.length > 0) {
      cachedReports = dbReports;
      const meta = await getSyncMetadata();
      if (meta && meta.lastSyncTimestamp) {
        cacheTimestamp = meta.lastSyncTimestamp;
      }
    }
  } catch (err) {
    console.warn("[SWR] Could not read from IndexedDB, falling back to network first:", err);
  }

  // Step 2: จัดการ Background Revalidation
  const revalidatePromise = (async () => {
    try {
      const freshData = await fetchNetworkData();
      if (freshData && freshData.length > 0) {
        const now = Date.now();
        // บันทึกลง IndexedDB ในเบื้องหลัง
        await saveReportsToIndexedDB(freshData);
        await saveSyncMetadata(now, freshData.length, "completed");
        
        // แจ้งเตือน UI ผ่าน Callback
        if (onRevalidate) {
          onRevalidate(freshData, now);
        }
        return freshData;
      }
    } catch (networkErr) {
      console.warn("[SWR] Background revalidation failed, using cached data:", networkErr);
      await saveSyncMetadata(cacheTimestamp, cachedReports.length, "failed");
    }
    return null;
  })();

  // Step 3: หากมีแคช ให้ส่งคืนแคชทันที (Stale)
  if (cachedReports.length > 0) {
    return {
      data: cachedReports,
      source: "indexeddb",
      isStale: true,
      timestamp: cacheTimestamp,
    };
  }

  // หากไม่มีแคชเลย ให้รอ Network Request ครั้งแรก
  const networkData = await revalidatePromise;
  if (networkData && networkData.length > 0) {
    return {
      data: networkData,
      source: "network",
      isStale: false,
      timestamp: Date.now(),
    };
  }

  return {
    data: [],
    source: "fallback",
    isStale: false,
    timestamp: Date.now(),
  };
}
