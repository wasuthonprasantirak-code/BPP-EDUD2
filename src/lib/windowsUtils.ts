/**
 * Windows Operating System & Cross-Platform Utilities
 * 
 * Provides specialized enhancements for Windows (Windows 10, 11, Server):
 * 1. Safe filename sanitization (stripping illegal Windows filesystem characters: < > : " / \ | ? *)
 * 2. UTF-8 BOM & CRLF line ending formatting for Microsoft Excel on Windows
 * 3. Robust client-side file download handlers
 * 4. High-DPI and ClearType font rendering utilities
 */

/**
 * Windows Operating System & Cross-Platform Utilities
 * 
 * Provides specialized enhancements for:
 * 1. Safe filename sanitization (stripping illegal Windows/mobile filesystem characters: < > : " / \ | ? *)
 * 2. UTF-8 BOM & CRLF line ending formatting for Microsoft Excel on Windows
 * 3. Robust client-side file download & Web Share handlers for iPad, iOS, Android, macOS, and Windows
 * 4. High-DPI and ClearType font rendering utilities
 * 5. Memory-safe adaptive canvas scaling for iPad and smartphones
 */

/**
 * Detects if the current client is running on iOS or iPadOS (including iPad Safari presenting as MacIntel)
 */
export function isIosOrIpad(): boolean {
  if (typeof window === "undefined" || typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  const isIos = /iPad|iPhone|iPod/i.test(ua);
  const isIpadOs = navigator.platform === "MacIntel" && (navigator.maxTouchPoints || 0) > 1;
  return isIos || isIpadOs;
}

/**
 * Detects if the client is running on a mobile smartphone or tablet (iPad, Android tablet, iPhone, etc.)
 */
export function isMobileOrTablet(): boolean {
  if (typeof window === "undefined" || typeof navigator === "undefined") return false;
  if (isIosOrIpad()) return true;
  const ua = navigator.userAgent || "";
  const isMobileUa = /Android|webOS|BlackBerry|IEMobile|Opera Mini|Mobile|Tablet/i.test(ua);
  const isTouchDevice = (navigator.maxTouchPoints || 0) > 1 && window.innerWidth <= 1024;
  return isMobileUa || isTouchDevice;
}

/**
 * Returns a memory-safe canvas rendering scale for html2canvas based on client device.
 * iPad and smartphones have strict GPU/WebKit texture memory limits (16-32MB).
 * Using scale 2.0 on mobile produces ~200 DPI crisp output without triggering WebKit crashes.
 */
export function getAdaptiveCanvasScale(preferredScale: number = 2.5): number {
  if (isMobileOrTablet()) {
    return Math.min(preferredScale, 2.0);
  }
  return preferredScale;
}

/**
 * Sanitizes a filename to ensure 100% compatibility with Windows NTFS/FAT32 and mobile filesystems.
 * Removes forbidden characters: < > : " / \ | ? * and ASCII control characters (0-31),
 * removes trailing spaces and dots which Windows does not allow.
 */
export function sanitizeWindowsFilename(filename: string, fallback: string = "download"): string {
  if (!filename || typeof filename !== "string") {
    return fallback;
  }

  // Replace forbidden Windows characters (< > : " / \ | ? *) with an underscore or clean alternative
  let sanitized = filename
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, "_")
    .replace(/\s+/g, " ")
    .trim();

  // Windows does not allow files ending with a dot or space
  sanitized = sanitized.replace(/[. ]+$/, "");

  // Prevent reserved Windows device names (CON, PRN, AUX, NUL, COM1-9, LPT1-9)
  const reservedNames = /^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])(\..*)?$/i;
  if (reservedNames.test(sanitized)) {
    sanitized = `file_${sanitized}`;
  }

  // Windows MAX_PATH limit protection (keep filename within safe length, e.g. 180 chars)
  if (sanitized.length > 180) {
    const extMatch = sanitized.match(/(\.[a-zA-Z0-9]{1,6})$/);
    const ext = extMatch ? extMatch[1] : "";
    sanitized = sanitized.substring(0, 180 - ext.length) + ext;
  }

  return sanitized || fallback;
}

/**
 * Prepares CSV content formatted specifically for Microsoft Excel on Windows:
 * - Prepends UTF-8 Byte Order Mark (\uFEFF) so Thai and unicode characters display correctly without mojibake.
 * - Standardizes line endings to CRLF (\r\n) as expected by Windows standard applications.
 */
export function createWindowsSafeCsvBlob(csvText: string): Blob {
  // Ensure line breaks are normalized to \r\n (CRLF) for Windows
  const normalizedCsv = csvText.replace(/\r?\n/g, "\r\n");
  
  // Prepend UTF-8 BOM if not already present
  const contentWithBom = normalizedCsv.startsWith("\uFEFF") 
    ? normalizedCsv 
    : "\uFEFF" + normalizedCsv;

  return new Blob([contentWithBom], { type: "text/csv;charset=utf-8;" });
}

/**
 * Converts a base64 Data URL to a native binary Blob
 */
function dataUrlToBlob(dataUrl: string): Blob {
  const parts = dataUrl.split(";base64,");
  const contentType = parts[0].replace("data:", "") || "application/octet-stream";
  const raw = window.atob(parts[1] || "");
  const rawLength = raw.length;
  const uInt8Array = new Uint8Array(rawLength);
  for (let i = 0; i < rawLength; ++i) {
    uInt8Array[i] = raw.charCodeAt(i);
  }
  return new Blob([uInt8Array], { type: contentType });
}

/**
 * Helper to determine MIME type from filename extension
 */
function inferMimeType(filename: string, fallbackType?: string): string {
  if (fallbackType && fallbackType !== "application/octet-stream") return fallbackType;
  const lower = filename.toLowerCase();
  if (lower.endsWith(".pdf")) return "application/pdf";
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
  if (lower.endsWith(".zip")) return "application/zip";
  if (lower.endsWith(".csv")) return "text/csv;charset=utf-8;";
  if (lower.endsWith(".doc")) return "application/msword";
  return "application/octet-stream";
}

export interface CrossPlatformDownloadOptions {
  /** If true on mobile/iPad, will try native Web Share API first so user can 'Save to Files' or share */
  preferWebShare?: boolean;
  mimeType?: string;
  title?: string;
}

/**
 * Robust Cross-Platform File Downloader & Exporter
 * 
 * Supports:
 * - iPad & iPadOS (Safari & Chrome): Uses Web Share API or Blob URL with target=_blank
 * - Smartphones (iPhone / Android): Native share sheet ("Save to Files", "AirDrop", LINE, Drive) or direct download
 * - Windows (10/11 Edge, Chrome, Firefox) and macOS desktop
 */
export async function triggerCrossPlatformDownload(
  blobOrDataUrl: Blob | string, 
  filename: string,
  options: CrossPlatformDownloadOptions = {}
): Promise<{ method: "share" | "download"; success: boolean }> {
  const safeName = sanitizeWindowsFilename(filename);
  const mimeType = inferMimeType(safeName, options.mimeType);

  // Normalize input to a Blob
  let blob: Blob;
  if (typeof blobOrDataUrl === "string") {
    if (blobOrDataUrl.startsWith("data:")) {
      blob = dataUrlToBlob(blobOrDataUrl);
    } else {
      // Remote or object URL
      const link = document.createElement("a");
      link.download = safeName;
      link.href = blobOrDataUrl;
      link.style.display = "none";
      document.body.appendChild(link);
      link.click();
      setTimeout(() => {
        if (link.parentNode) link.parentNode.removeChild(link);
      }, 500);
      return { method: "download", success: true };
    }
  } else {
    blob = blobOrDataUrl;
  }

  // Ensure blob has explicit type if missing
  if (!blob.type || blob.type === "application/octet-stream") {
    blob = new Blob([blob], { type: mimeType });
  }

  // If on mobile/tablet (iPad or smartphone), try Web Share API if supported
  const isMobile = isMobileOrTablet();
  const shouldTryShare = options.preferWebShare !== false && isMobile;

  if (shouldTryShare && typeof navigator !== "undefined" && typeof navigator.share === "function" && typeof File !== "undefined") {
    try {
      const file = new File([blob], safeName, { type: mimeType });
      if (typeof navigator.canShare === "function" && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: options.title || safeName,
          text: `เอกสาร ${safeName}`,
        });
        return { method: "share", success: true };
      }
    } catch (shareErr: any) {
      if (shareErr.name === "AbortError") {
        // User deliberately cancelled the share prompt
        return { method: "share", success: true };
      }
      console.warn("Native Web Share failed, falling back to direct download:", shareErr);
    }
  }

  // Fallback / Standard Direct File Download
  try {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.download = safeName;
    link.href = url;
    link.rel = "noopener noreferrer";
    
    // On iOS Safari, target="_blank" ensures the download manager or preview triggers cleanly
    if (isIosOrIpad()) {
      link.target = "_blank";
    }
    
    link.style.display = "none";
    document.body.appendChild(link);
    link.click();

    setTimeout(() => {
      if (link.parentNode) {
        link.parentNode.removeChild(link);
      }
      // Give mobile browser download manager 90 seconds to complete
      setTimeout(() => {
        try {
          URL.revokeObjectURL(url);
        } catch {
          // ignore
        }
      }, 90000);
    }, 1000);

    return { method: "download", success: true };
  } catch (dlErr) {
    console.error("Direct download failed:", dlErr);
    return { method: "download", success: false };
  }
}

/**
 * Backwards compatible alias for triggerWindowsFileDownload
 */
export const triggerWindowsFileDownload = triggerCrossPlatformDownload;

