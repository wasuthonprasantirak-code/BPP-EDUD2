import { safeLocalStorage } from "./storage";
import defaultDashboardBanner from "../assets/dashboard-banner.jpg";
import defaultPageBannersJson from "../data/defaultPageBanners.json";
import {
  savePageBannersToFirestore,
  loadPageBannersFromFirestore,
  subscribeToFirestorePageBanners,
} from "./firebase";

export interface PageBannerInfo {
  key: string;
  title: string;
  subtitle?: string;
  category?: string;
}

export const APP_PAGE_DEFINITIONS: PageBannerInfo[] = [
  { key: "dashboard", title: "แผงควบคุมสถิติหลัก", subtitle: "ศูนย์รวมสถิติและผลการดำเนินงาน 53 โรงเรียน ตชด. ภาค 2", category: "หลัก" },
  { key: "executiveStation", title: "สถานีผู้บริหารระดับสูง", subtitle: "สรุปผลเชิงยุทธศาสตร์และตัวชี้วัดระดับบัญชาการ", category: "ผู้บริหาร" },
  { key: "executiveOnePage", title: "สรุปภาพรวมผู้บริหารหน้าเดียว", subtitle: "ศูนย์รวมข้อมูลสรุปผู้บริหารแบบหน้าเดียว กพด.5", category: "ผู้บริหาร" },
  { key: "predictiveTrends", title: "ระบบวิเคราะห์เชิงคาดการณ์ AI (Predictive Trends)", subtitle: "วิเคราะห์แนวโน้มล่วงหน้า เตือนภัยสถานศึกษาที่อาจติดปัญหา และพยากรณ์ความเสี่ยงเชิงระบบ", category: "การวิเคราะห์" },
  { key: "periodicAnalysis", title: "วิเคราะห์รอบระยะเวลา", subtitle: "ระบบวิเคราะห์ข้อมูลรายสัปดาห์ รายเดือน และรายงานสะสม", category: "การวิเคราะห์" },
  { key: "rankingsAndHonor", title: "อันดับความดีและเกียรติคุณ", subtitle: "ทำเนียบเกียรติยศและการจัดอันดับผลงานโรงเรียน ตชด.", category: "การวิเคราะห์" },
  { key: "thailandMap", title: "แผนที่ภูมิสารสนเทศ (GIS)", subtitle: "ติดตามพิกัดและสถานะการดำเนินงาน 53 โรงเรียนบนแผนที่", category: "แผนที่" },
  { key: "schoolDirectory", title: "ทำเนียบ 53 โรงเรียน ตชด.", subtitle: "ฐานข้อมูลผู้บริหาร ครู และข้อมูลพื้นฐานโรงเรียนสังกัด กก.ตชด. 21-24", category: "ข้อมูลโรงเรียน" },
  { key: "multiPhaseTracker", title: "ติดตามความก้าวหน้าโครงการ", subtitle: "ระบบติดตามความก้าวหน้าหลายระยะ (งวด 1 - งวด 3)", category: "ติดตามงาน" },
  { key: "submissionTracker", title: "ระบบติดตามการส่งรายงาน", subtitle: "ตรวจสอบสถานะส่งงานและออกหนังสือราชการติดตามอัตโนมัติ", category: "ติดตามงาน" },
  { key: "photoGallery", title: "คลังภาพกิจกรรมโครงการ", subtitle: "ประมวลภาพกิจกรรมโครงการตามพระราชดำริฯ กพด. ฉบับที่ 5", category: "สื่อมัลติมีเดีย" },
  { key: "videoGallery", title: "คลังคลิปวิดีโอกิจกรรม", subtitle: "ศูนย์รวมสื่อวิดีโอและบันทึกภาพเคลื่อนไหวการเรียนรู้", category: "สื่อมัลติมีเดีย" },
  { key: "geminiAssistant", title: "ผู้ช่วยอัจฉริยะ AI กพด.5", subtitle: "บริการตอบคำถามและวิเคราะห์ข้อมูลด้วย Google Gemini AI", category: "ผู้ช่วย AI" },
  { key: "report2568", title: "รายงานประจำปีงบประมาณ 2568", subtitle: "รายงานสังเคราะห์ผลสัมฤทธิ์โครงการ กพด. ฉบับที่ 5", category: "รายงาน" },
  { key: "reportsDirectory", title: "ทำเนียบแฟ้มรายงานกิจกรรม", subtitle: "ค้นหา คัดกรอง และสืบค้นรายงานกิจกรรมย้อนหลัง", category: "รายงาน" },
  { key: "document", title: "เอกสารรายงานแบบทางการ A4", subtitle: "ดูตัวอย่างและพิมพ์เอกสารรายงานตามแบบฟอร์มมาตรฐาน", category: "รายงาน" },
  { key: "problems", title: "ศูนย์วิเคราะห์ปัญหาและอุปสรรค", subtitle: "จำแนกปัญหา อุปสรรค และข้อเสนอแนะเชิงพัฒนา", category: "การวิเคราะห์" },
  { key: "indicators", title: "ฐานข้อมูลตัวชี้วัด กพด.5", subtitle: "เกณฑ์และตัวชี้วัด 8 เป้าหมายหลักตามพระราชดำริ", category: "คู่มือและเกณฑ์" },
  { key: "kpiConsistencyExplorer", title: "ตรวจสอบความสอดคล้องตัวชี้วัด", subtitle: "เครื่องมือวิเคราะห์ความถูกต้องและสอดคล้องของข้อมูลรายงาน", category: "การวิเคราะห์" },
  { key: "systemUserManual", title: "คู่มือการใช้งานระบบ", subtitle: "คำแนะนำและขั้นตอนการรายงานข้อมูลสำหรับคุณครูและผู้บริหาร", category: "คู่มือและเกณฑ์" },
  { key: "calendarGuide", title: "ปฏิทินปฏิบัติงาน กพด.5", subtitle: "ตารางกำหนดการและช่วงเวลาจัดกิจกรรมสำคัญตลอดปีการศึกษา", category: "คู่มือและเกณฑ์" },
  { key: "dailyRoutine", title: "คู่มือสุขภาวะและกิจวัตรประจำวัน", subtitle: "แนวทางปฏิบัติส่งเสริมโภชนาการและพัฒนาการเด็กในถิ่นทุรกันดาร", category: "คู่มือและเกณฑ์" },
  { key: "plan5Guide", title: "เอกสารแผนพัฒนา กพด. ฉบับที่ 5", subtitle: "กรอบแนวทางพัฒนาเด็กและเยาวชนในถิ่นทุรกันดาร (พ.ศ. 2560–2569)", category: "คู่มือและเกณฑ์" },
];

export interface BannerPreset {
  id: string;
  name: string;
  description: string;
  url: string;
}

export const MASTER_PRIMARY_BANNER = defaultDashboardBanner || "/dashboard-banner.jpg";

export const PRESET_BANNERS: BannerPreset[] = [
  {
    id: "official-current",
    name: "แบนเนอร์หลักประจำระบบ กพด.5 (มาตรฐาน บก.ตชด. ภาค 2)",
    description: "แบนเนอร์หลักทางการสีม่วง-ทอง สง่างาม คมชัดสูงสุด บันทึกจดจำไว้เป็นภาพหลักของระบบ",
    url: "/dashboard-banner.jpg",
  },
  {
    id: "official-bundled",
    name: "แบนเนอร์สำรองประจำระบบ (ไฟล์ดั้งเดิม)",
    description: "แบนเนอร์ทางการมาตรฐานสำรองของระบบ กพด.5",
    url: "/dashboard-banner.jpg",
  },
];

const STORAGE_KEY_PREFIX = "bpp_page_banner_";
const GLOBAL_STORAGE_KEY = "bpp_global_custom_banner";
const MASTER_BANNER_STORAGE_KEY = "bpp_master_banner";
const BANNER_CHANGE_EVENT = "bpp-page-banner-changed";

// In-memory banner cache
const memoryBanners: Record<string, string> = {};

// Built-in default per-page mapping
const DEFAULT_PAGE_BANNERS: Record<string, string> = {
  ...defaultPageBannersJson,
};

export const BUNDLED_DEFAULT_BANNER: string = defaultDashboardBanner || MASTER_PRIMARY_BANNER;

/**
 * Universal converter to transform any cloud or web link (Google Drive, Dropbox, Imgur, etc.)
 * into a high-resolution, direct embeddable image URL.
 */
export function convertAnyImageUrlToDirectLink(rawUrl: string | undefined | null): string {
  if (!rawUrl || typeof rawUrl !== "string") return "";
  let url = rawUrl.trim();

  // Strip wrapping quotes, brackets or markdown formatting
  url = url.replace(/^[<"'\(\[]+/, "").replace(/[>"'\)\]]+$/, "").trim();

  // Extract from markdown format [text](https://...)
  const mdMatch = url.match(/\[.*?\]\((https?:\/\/[^\s\)]+)\)/);
  if (mdMatch && mdMatch[1]) {
    url = mdMatch[1].trim();
  }

  if (!url) return "";

  // 1. Google Drive URLs
  // e.g. https://drive.google.com/file/d/1X50-6vH.../view?usp=sharing
  const driveFileMatch = url.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/i);
  if (driveFileMatch && driveFileMatch[1]) {
    return `https://drive.google.com/thumbnail?id=${driveFileMatch[1]}&sz=w2560`;
  }

  // e.g. https://drive.google.com/open?id=1X50-6vH...
  const driveOpenMatch = url.match(/drive\.google\.com\/open\?(?:.*&)?id=([a-zA-Z0-9_-]+)/i);
  if (driveOpenMatch && driveOpenMatch[1]) {
    return `https://drive.google.com/thumbnail?id=${driveOpenMatch[1]}&sz=w2560`;
  }

  // e.g. https://drive.google.com/uc?id=1X50-6vH... or docs.google.com/uc?id=...
  const driveUcMatch = url.match(/(?:drive|docs)\.google\.com\/uc\?(?:.*&)?id=([a-zA-Z0-9_-]+)/i);
  if (driveUcMatch && driveUcMatch[1]) {
    return `https://drive.google.com/thumbnail?id=${driveUcMatch[1]}&sz=w2560`;
  }

  // e.g. https://drive.google.com/thumbnail?id=1X50-6vH... (ensure high-res sz=w2560)
  if (url.includes("drive.google.com/thumbnail")) {
    const thumbIdMatch = url.match(/id=([a-zA-Z0-9_-]+)/i);
    if (thumbIdMatch && thumbIdMatch[1]) {
      return `https://drive.google.com/thumbnail?id=${thumbIdMatch[1]}&sz=w2560`;
    }
  }

  // 2. Dropbox URLs
  if (url.includes("dropbox.com")) {
    if (url.includes("dl=0")) {
      return url.replace("dl=0", "raw=1");
    }
    if (!url.includes("raw=1") && !url.includes("dl=1")) {
      const sep = url.includes("?") ? "&" : "?";
      return `${url}${sep}raw=1`;
    }
  }

  // 3. Imgur single image page -> direct image
  const imgurMatch = url.match(/imgur\.com\/([a-zA-Z0-9]{5,8})$/i);
  if (imgurMatch && imgurMatch[1]) {
    return `https://i.imgur.com/${imgurMatch[1]}.jpg`;
  }

  return url;
}

/**
  * Converts any image URL into a safe, valid direct URL (or bundled default)
  */
export function getSafeBannerUrl(rawUrl: string | undefined | null): string {
  if (!rawUrl || !rawUrl.trim()) return BUNDLED_DEFAULT_BANNER;
  const directUrl = convertAnyImageUrlToDirectLink(rawUrl);
  if (!directUrl) return BUNDLED_DEFAULT_BANNER;

  // Filter out any broken test URLs from previous iterations or old non-bundled paths
  if (
    directUrl.includes("i.postimg.cc/tC0CLmMR/Gemini-Generated-Image-9z7kyk9z7kyk9z7k.jpg") ||
    directUrl.includes("banner_all_1790068354803") ||
    directUrl.includes("banner_dashboard_1790146490723") ||
    directUrl === "/dashboard-banner.jpg"
  ) {
    return BUNDLED_DEFAULT_BANNER;
  }
  return directUrl;
}

/**
 * Helper to get default preset banner for a given page
 */
export function getDefaultBannerForPage(pageKey: string): string {
  const configured = DEFAULT_PAGE_BANNERS[pageKey];
  if (
    configured && 
    !configured.includes("i.postimg.cc/tC0CLmMR/Gemini-Generated-Image-9z7kyk9z7kyk9z7k.jpg") &&
    !configured.includes("banner_all_1790068354803") &&
    configured !== "/dashboard-banner.jpg"
  ) {
    return configured;
  }
  return BUNDLED_DEFAULT_BANNER;
}

/**
 * Handle image load failure gracefully without deleting user customizations
 */
export function recordBannerLoadFailure(pageKey: string): void {
  console.warn(`[BannerStorage] Image load failure detected for page: ${pageKey}`);
}

/**
 * Get active banner URL for a specific page key with multi-tier fallback
 */
export function getBannerForPage(pageKey: string): string {
  // 1. Check in-memory cache
  if (memoryBanners[pageKey]) {
    const cached = memoryBanners[pageKey];
    if (!cached.includes("i.postimg.cc/tC0CLmMR/Gemini-Generated-Image-9z7kyk9z7kyk9z7k.jpg")) {
      return getSafeBannerUrl(cached);
    }
    delete memoryBanners[pageKey];
  }

  try {
    // 2. Check page-specific override in localStorage
    const specific = safeLocalStorage.getItem(`${STORAGE_KEY_PREFIX}${pageKey}`);
    if (specific && specific.trim()) {
      const clean = getSafeBannerUrl(specific.trim());
      if (clean && !clean.includes("i.postimg.cc/tC0CLmMR/Gemini-Generated-Image-9z7kyk9z7kyk9z7k.jpg")) {
        memoryBanners[pageKey] = clean;
        return clean;
      }
      safeLocalStorage.removeItem(`${STORAGE_KEY_PREFIX}${pageKey}`);
    }
    // 3. Check global override if set
    const globalCustom = safeLocalStorage.getItem(GLOBAL_STORAGE_KEY);
    if (globalCustom && globalCustom.trim()) {
      const cleanGlobal = getSafeBannerUrl(globalCustom.trim());
      if (cleanGlobal && !cleanGlobal.includes("i.postimg.cc/tC0CLmMR/Gemini-Generated-Image-9z7kyk9z7kyk9z7k.jpg")) {
        return cleanGlobal;
      }
      safeLocalStorage.removeItem(GLOBAL_STORAGE_KEY);
    }
  } catch (err) {
    console.warn(`[BannerStorage] Error retrieving banner for ${pageKey}:`, err);
  }

  // 4. Fallback to default configured banner for this specific page
  return getDefaultBannerForPage(pageKey);
}

/**
 * Check if a page has a custom banner explicitly set
 */
export function isPageBannerCustomized(pageKey: string): boolean {
  try {
    const specific = safeLocalStorage.getItem(`${STORAGE_KEY_PREFIX}${pageKey}`);
    return !!(specific && specific.trim());
  } catch {
    return false;
  }
}

/**
 * Get all current banners as a dictionary
 */
export function getAllCurrentBanners(): Record<string, string> {
  const result: Record<string, string> = {};
  APP_PAGE_DEFINITIONS.forEach((page) => {
    result[page.key] = getBannerForPage(page.key);
  });
  return result;
}

/**
 * Set custom banner URL for a specific page (Syncs locally, Server API, and Cloud Firestore)
 */
export async function setBannerForPage(pageKey: string, bannerUrl: string): Promise<string> {
  let cleanUrl = convertAnyImageUrlToDirectLink(bannerUrl.trim()) || bannerUrl.trim();
  memoryBanners[pageKey] = cleanUrl;
  DEFAULT_PAGE_BANNERS[pageKey] = cleanUrl;

  try {
    safeLocalStorage.setItem(`${STORAGE_KEY_PREFIX}${pageKey}`, cleanUrl);
    window.dispatchEvent(new CustomEvent(BANNER_CHANGE_EVENT, { detail: { pageKey, bannerUrl: cleanUrl } }));
  } catch (err) {
    console.error(`[BannerStorage] Failed to save banner locally for ${pageKey}:`, err);
  }

  // Sync to Server API and capture server-saved file URL if base64 upload
  try {
    const res = await fetch("/api/page-banners", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pageKey, bannerUrl: cleanUrl }),
    });
    if (res.ok) {
      const data = await res.json();
      if (data && data.banners && data.banners[pageKey]) {
        cleanUrl = data.banners[pageKey];
        memoryBanners[pageKey] = cleanUrl;
        DEFAULT_PAGE_BANNERS[pageKey] = cleanUrl;
        safeLocalStorage.setItem(`${STORAGE_KEY_PREFIX}${pageKey}`, cleanUrl);
        window.dispatchEvent(new CustomEvent(BANNER_CHANGE_EVENT, { detail: { pageKey, bannerUrl: cleanUrl } }));
      }
    }
  } catch (e) {
    console.warn("[BannerStorage] Server sync notice:", e);
  }

  // Sync to Cloud Firestore
  try {
    const allBanners = getAllCurrentBanners();
    allBanners[pageKey] = cleanUrl;
    await savePageBannersToFirestore(allBanners);
  } catch (e) {
    console.warn("[BannerStorage] Firestore sync notice:", e);
  }

  return cleanUrl;
}

/**
 * Set banner URL for ALL pages across the entire application
 */
export async function setBannerForAllPages(bannerUrl: string): Promise<string> {
  let cleanUrl = convertAnyImageUrlToDirectLink(bannerUrl.trim()) || bannerUrl.trim();
  APP_PAGE_DEFINITIONS.forEach((page) => {
    memoryBanners[page.key] = cleanUrl;
    DEFAULT_PAGE_BANNERS[page.key] = cleanUrl;
  });

  try {
    safeLocalStorage.setItem(GLOBAL_STORAGE_KEY, cleanUrl);
    APP_PAGE_DEFINITIONS.forEach((page) => {
      safeLocalStorage.setItem(`${STORAGE_KEY_PREFIX}${page.key}`, cleanUrl);
    });
    window.dispatchEvent(new CustomEvent(BANNER_CHANGE_EVENT, { detail: { pageKey: "all", bannerUrl: cleanUrl } }));
  } catch (err) {
    console.error("[BannerStorage] Failed to set banner for all pages:", err);
  }

  // Sync to Server API
  try {
    const res = await fetch("/api/page-banners", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pageKey: "all", bannerUrl: cleanUrl }),
    });
    if (res.ok) {
      const data = await res.json();
      if (data && data.banners) {
        if (data.banners.dashboard) {
          cleanUrl = data.banners.dashboard;
        }
        for (const [k, v] of Object.entries(data.banners)) {
          if (typeof v === "string" && v.trim()) {
            memoryBanners[k] = v.trim();
            DEFAULT_PAGE_BANNERS[k] = v.trim();
            safeLocalStorage.setItem(`${STORAGE_KEY_PREFIX}${k}`, v.trim());
          }
        }
        window.dispatchEvent(new CustomEvent(BANNER_CHANGE_EVENT, { detail: { pageKey: "all", bannerUrl: cleanUrl } }));
      }
    }
  } catch (e) {
    console.warn("[BannerStorage] Server bulk sync notice:", e);
  }

  // Sync to Cloud Firestore
  try {
    const allBanners = getAllCurrentBanners();
    APP_PAGE_DEFINITIONS.forEach((page) => {
      allBanners[page.key] = cleanUrl;
    });
    await savePageBannersToFirestore(allBanners);
  } catch (e) {
    console.warn("[BannerStorage] Firestore bulk sync notice:", e);
  }

  return cleanUrl;
}

/**
 * Set banner as the primary master system brand (Main Dashboard & Master Brand)
 */
export async function setAsMasterSystemBrand(bannerUrl: string): Promise<string> {
  const cleanUrl = convertAnyImageUrlToDirectLink(bannerUrl.trim()) || bannerUrl.trim();
  
  // 1. Set for dashboard (main page)
  await setBannerForPage("dashboard", cleanUrl);

  // 2. Set for all pages as unified brand
  await setBannerForAllPages(cleanUrl);

  // 3. Store in master banner key
  try {
    safeLocalStorage.setItem(MASTER_BANNER_STORAGE_KEY, cleanUrl);
    safeLocalStorage.setItem("bpp_system_brand_banner", cleanUrl);
  } catch (e) {}

  return cleanUrl;
}

/**
 * Check if a URL matches the primary master system brand
 */
export function isMasterSystemBrand(url: string | undefined | null): boolean {
  if (!url) return false;
  const master = getBannerForPage("dashboard");
  return url === master || url === BUNDLED_DEFAULT_BANNER || url === MASTER_PRIMARY_BANNER;
}

/**
 * Reset banner for a specific page to standard default
 */
export async function resetBannerForPage(pageKey: string): Promise<void> {
  const defaultUrl = getDefaultBannerForPage(pageKey);
  delete memoryBanners[pageKey];

  try {
    safeLocalStorage.removeItem(`${STORAGE_KEY_PREFIX}${pageKey}`);
    window.dispatchEvent(new CustomEvent(BANNER_CHANGE_EVENT, { detail: { pageKey, bannerUrl: defaultUrl } }));
  } catch (err) {
    console.error(`[BannerStorage] Failed to reset banner for ${pageKey}:`, err);
  }

  // Sync reset to Server API and Cloud Firestore
  try {
    fetch("/api/page-banners", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pageKey, bannerUrl: defaultUrl }),
    }).catch(() => {});
  } catch (e) {}

  try {
    const allBanners = getAllCurrentBanners();
    allBanners[pageKey] = defaultUrl;
    await savePageBannersToFirestore(allBanners);
  } catch (e) {}
}

/**
 * Reset all banners for all pages to standard default
 */
export async function resetAllPageBanners(): Promise<void> {
  try {
    safeLocalStorage.removeItem(GLOBAL_STORAGE_KEY);
    APP_PAGE_DEFINITIONS.forEach((page) => {
      safeLocalStorage.removeItem(`${STORAGE_KEY_PREFIX}${page.key}`);
      delete memoryBanners[page.key];
    });
    window.dispatchEvent(new CustomEvent(BANNER_CHANGE_EVENT, { detail: { pageKey: "all", bannerUrl: defaultDashboardBanner } }));
  } catch (err) {
    console.error("[BannerStorage] Failed to reset all banners:", err);
  }

  // Reset in Firestore
  try {
    const defaultDict: Record<string, string> = {};
    APP_PAGE_DEFINITIONS.forEach((p) => {
      defaultDict[p.key] = getDefaultBannerForPage(p.key);
    });
    await savePageBannersToFirestore(defaultDict);
  } catch (e) {}
}

/**
 * Synchronize banners from Server API and Firestore (Called on mount or manual refresh)
 */
export async function syncBannersWithCloud(): Promise<boolean> {
  let updated = false;

  // 1. Fetch from Server API (/api/page-banners)
  try {
    const res = await fetch("/api/page-banners");
    if (res.ok) {
      const data = await res.json();
      if (data && data.banners && typeof data.banners === "object") {
        for (const [key, val] of Object.entries(data.banners)) {
          if (typeof val === "string" && val.trim()) {
            const safeVal = getSafeBannerUrl(val.trim());
            memoryBanners[key] = safeVal;
            safeLocalStorage.setItem(`${STORAGE_KEY_PREFIX}${key}`, safeVal);
            updated = true;
          }
        }
      }
    }
  } catch (err) {
    console.warn("[BannerStorage] Server banners fetch skipped:", err);
  }

  // 2. Fetch from Firestore (app_settings/page_banners)
  try {
    const firestoreBanners = await loadPageBannersFromFirestore();
    if (firestoreBanners && typeof firestoreBanners === "object") {
      for (const [key, val] of Object.entries(firestoreBanners)) {
        if (typeof val === "string" && val.trim()) {
          const safeVal = getSafeBannerUrl(val.trim());
          memoryBanners[key] = safeVal;
          safeLocalStorage.setItem(`${STORAGE_KEY_PREFIX}${key}`, safeVal);
          updated = true;
        }
      }
    }
  } catch (err) {
    console.warn("[BannerStorage] Firestore banners fetch skipped:", err);
  }

  if (updated) {
    window.dispatchEvent(new CustomEvent(BANNER_CHANGE_EVENT, { detail: { pageKey: "all", bannerUrl: "" } }));
  }
  return updated;
}

/**
 * Initialize banner synchronization on App mount
 */
export function initBannerSynchronization(): () => void {
  // Ensure master primary banner is remembered in client storage
  try {
    safeLocalStorage.setItem(MASTER_BANNER_STORAGE_KEY, MASTER_PRIMARY_BANNER);
    const existingGlobal = safeLocalStorage.getItem(GLOBAL_STORAGE_KEY);
    if (!existingGlobal || existingGlobal.includes("banner_all_") || existingGlobal.includes("1790068354803")) {
      safeLocalStorage.setItem(GLOBAL_STORAGE_KEY, MASTER_PRIMARY_BANNER);
    }
  } catch (e) {}

  // Initial pull from Server and Cloud
  syncBannersWithCloud().catch(() => {});

  // Subscribe to real-time changes from Firestore
  const unsubscribe = subscribeToFirestorePageBanners((cloudBanners) => {
    if (cloudBanners && typeof cloudBanners === "object") {
      let changed = false;
      for (const [key, val] of Object.entries(cloudBanners)) {
        if (typeof val === "string" && val.trim()) {
          const safeVal = getSafeBannerUrl(val.trim());
          if (memoryBanners[key] !== safeVal) {
            memoryBanners[key] = safeVal;
            safeLocalStorage.setItem(`${STORAGE_KEY_PREFIX}${key}`, safeVal);
            changed = true;
          }
        }
      }
      if (changed) {
        window.dispatchEvent(new CustomEvent(BANNER_CHANGE_EVENT, { detail: { pageKey: "all", bannerUrl: "" } }));
      }
    }
  });

  return unsubscribe;
}

/**
 * Helper to subscribe to banner change events
 */
export function subscribeToBannerChanges(callback: (pageKey: string, newUrl: string) => void): () => void {
  const handler = (event: Event) => {
    const customEvt = event as CustomEvent;
    if (customEvt.detail) {
      callback(customEvt.detail.pageKey, customEvt.detail.bannerUrl);
    }
  };
  window.addEventListener(BANNER_CHANGE_EVENT, handler);
  return () => window.removeEventListener(BANNER_CHANGE_EVENT, handler);
}

const PUBLISH_STATUS_CHANGE_EVENT = "bpp-publish-status-changed";

/**
 * Detects whether the application is running in a published / shared / production state
 * or has been locked for public viewing so end-users cannot change banners.
 */
export function isAppPublished(): boolean {
  if (typeof window === "undefined") return false;

  // 1. Explicit query parameter override (e.g. ?published=true, ?mode=published, ?hideBannerEdit=true)
  try {
    const searchParams = new URLSearchParams(window.location.search);
    if (
      searchParams.get("published") === "true" || 
      searchParams.get("mode") === "published" || 
      searchParams.get("hideBannerEdit") === "true"
    ) {
      return true;
    }
    // If explicitly in edit mode (e.g. ?edit=true or ?admin=true), allow override for admins
    if (searchParams.get("edit") === "true" || searchParams.get("admin") === "true") {
      return false;
    }
  } catch (e) {}

  // 2. LocalStorage manual lock/publish flag
  try {
    const manualLock = safeLocalStorage.getItem("bpp_is_published");
    if (manualLock === "true") {
      return true;
    }
  } catch (e) {}

  // 3. AI Studio Shared URL detection (ais-pre- prefix)
  try {
    const hostname = window.location.hostname;
    if (hostname.includes("ais-pre-")) {
      return true;
    }
    // 4. Production build running on live Cloud Run or custom production domain (not local / not ais-dev-)
    if (import.meta.env.PROD && !hostname.includes("ais-dev-") && hostname !== "localhost" && hostname !== "127.0.0.1") {
      return true;
    }
  } catch (e) {}

  return false;
}

export function setAppPublished(published: boolean): void {
  safeLocalStorage.setItem("bpp_is_published", published ? "true" : "false");
  if (typeof document !== "undefined") {
    document.body.classList.toggle("is-published", published);
    document.documentElement.setAttribute("data-published", String(published));
  }
  window.dispatchEvent(new CustomEvent(PUBLISH_STATUS_CHANGE_EVENT, { detail: { published } }));
}

export function subscribeToPublishStatus(callback: (published: boolean) => void): () => void {
  const handler = (e: Event) => {
    const customEvt = e as CustomEvent;
    callback(customEvt.detail?.published ?? isAppPublished());
  };
  window.addEventListener(PUBLISH_STATUS_CHANGE_EVENT, handler);
  return () => window.removeEventListener(PUBLISH_STATUS_CHANGE_EVENT, handler);
}

