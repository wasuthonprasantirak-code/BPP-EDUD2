/**
 * Field GPS Camera & Automatic Image Compressor Engine
 * Compresses high-res field inspection camera photos (5-10MB -> ~150-300KB)
 * and overlays official Real-Time GPS location metadata watermark stamps.
 */

export interface GpsLocationInfo {
  latitude: number;
  longitude: number;
  accuracy: number; // in meters
  altitude?: number | null;
  timestampStr: string;
}

export interface CompressAndWatermarkOptions {
  schoolName?: string;
  categoryTag?: string; // e.g. "แปลงเกษตรเพื่ออาหารกลางวัน", "อาคารเรียน/ระบบไฟฟ้า"
  inspectorName?: string;
  maxWidth?: number; // default 1280px
  maxHeight?: number; // default 1280px
  quality?: number; // 0.75
  addWatermarkStamp?: boolean;
}

export interface CompressResult {
  dataUrl: string;
  originalSizeKB: number;
  compressedSizeKB: number;
  reductionPercentage: number;
  gpsInfo: GpsLocationInfo | null;
}

/**
 * Fetch real-time GPS coordinates using Web Geolocation API
 */
export async function getCurrentGpsPosition(): Promise<GpsLocationInfo | null> {
  if (typeof window === "undefined" || !navigator.geolocation) {
    return null;
  }

  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude, accuracy, altitude } = pos.coords;
        const now = new Date();
        const dateStr = now.toLocaleDateString("th-TH", {
          year: "numeric",
          month: "short",
          day: "numeric"
        });
        const timeStr = now.toLocaleTimeString("th-TH", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit"
        }) + " น.";

        resolve({
          latitude,
          longitude,
          accuracy: Math.round(accuracy),
          altitude,
          timestampStr: `${dateStr} ${timeStr}`
        });
      },
      (err) => {
        console.warn("GPS Geolocation position error/fallback:", err.message);
        resolve(null);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
  });
}

/**
 * Compress image file/DataURL and draw GPS metadata watermark stamp
 */
export async function compressAndWatermarkPhoto(
  source: File | string,
  options: CompressAndWatermarkOptions = {}
): Promise<CompressResult> {
  const {
    schoolName = "รร.ตชด. ภาค 2",
    categoryTag = "ตรวจเยี่ยมภาคสนาม",
    inspectorName = "",
    maxWidth = 1280,
    maxHeight = 1280,
    quality = 0.78,
    addWatermarkStamp = true
  } = options;

  // 1. Get real-time GPS coordinates
  const gpsInfo = await getCurrentGpsPosition();

  // 2. Load image into HTML Image Element
  let dataUrlSource = "";
  let originalSizeKB = 0;

  if (source instanceof File) {
    originalSizeKB = Math.round(source.size / 1024);
    dataUrlSource = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(source);
    });
  } else {
    dataUrlSource = source;
    originalSizeKB = Math.round((dataUrlSource.length * 0.75) / 1024);
  }

  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = dataUrlSource;
  });

  // 3. Calculate canvas dimensions maintaining aspect ratio
  let width = img.width;
  let height = img.height;

  if (width > maxWidth) {
    height = Math.round((height * maxWidth) / width);
    width = maxWidth;
  }
  if (height > maxHeight) {
    width = Math.round((width * maxHeight) / height);
    height = maxHeight;
  }

  // 4. Create HTML5 Canvas & Draw resized image
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");

  if (!ctx) {
    throw new Error("Cannot initialize HTML5 Canvas Context");
  }

  ctx.drawImage(img, 0, 0, width, height);

  // 5. Draw GPS Watermark Stamp on Bottom Bar if requested
  if (addWatermarkStamp) {
    const stampBarHeight = Math.max(60, Math.round(height * 0.12));
    const startY = height - stampBarHeight;

    // Semi-transparent gradient overlay background
    const gradient = ctx.createLinearGradient(0, startY, 0, height);
    gradient.addColorStop(0, "rgba(15, 23, 42, 0.82)"); // Slate-900
    gradient.addColorStop(1, "rgba(2, 6, 23, 0.95)");

    ctx.fillStyle = gradient;
    ctx.fillRect(0, startY, width, stampBarHeight);

    // Left Accent Stripe (Emerald for verified GPS)
    ctx.fillStyle = gpsInfo ? "#10b981" : "#f59e0b";
    ctx.fillRect(0, startY, Math.max(6, Math.round(width * 0.01)), stampBarHeight);

    // Text Formatting
    const fontSizeMain = Math.max(12, Math.round(width * 0.022));
    const fontSizeSub = Math.max(10, Math.round(width * 0.018));
    const paddingLeft = Math.max(16, Math.round(width * 0.025));

    ctx.fillStyle = "#ffffff";
    ctx.font = `bold ${fontSizeMain}px Prompt, Tahoma, sans-serif`;

    // Line 1: School & Category
    const line1 = `📍 ${schoolName} • ${categoryTag}`;
    ctx.fillText(line1, paddingLeft, startY + fontSizeMain + 8);

    // Line 2: GPS Coordinates & Accuracy
    ctx.fillStyle = "#e2e8f0";
    ctx.font = `normal ${fontSizeSub}px Prompt, Tahoma, sans-serif`;

    let line2 = "";
    if (gpsInfo) {
      line2 = `🌐 พิกัด GPS: ${gpsInfo.latitude.toFixed(6)}, ${gpsInfo.longitude.toFixed(6)} (ความแม่นยำ ±${gpsInfo.accuracy}m)`;
    } else {
      line2 = `🌐 พิกัด GPS: ไม่พบสัญญาณพิกัดดาวเทียม (ใช้เวลาเครื่องบันทึก)`;
    }
    ctx.fillText(line2, paddingLeft, startY + fontSizeMain + fontSizeSub + 14);

    // Line 3: Timestamp & Inspector
    const nowStr = gpsInfo?.timestampStr || new Date().toLocaleString("th-TH");
    const line3 = `🕒 เวลาบันทึก: ${nowStr}${inspectorName ? ` • ผู้ตรวจ: ${inspectorName}` : ""}`;
    ctx.fillStyle = "#cbd5e1";
    ctx.font = `normal ${fontSizeSub * 0.9}px Prompt, Tahoma, sans-serif`;
    ctx.fillText(line3, paddingLeft, startY + fontSizeMain + (fontSizeSub * 2) + 18);
  }

  // 6. Export to WebP/JPEG compressed data URL
  const compressedDataUrl = canvas.toDataURL("image/jpeg", quality);
  const compressedSizeKB = Math.round((compressedDataUrl.length * 0.75) / 1024);
  const reductionPercentage = Math.max(0, Math.round(((originalSizeKB - compressedSizeKB) / (originalSizeKB || 1)) * 100));

  return {
    dataUrl: compressedDataUrl,
    originalSizeKB,
    compressedSizeKB,
    reductionPercentage,
    gpsInfo
  };
}

export interface BannerCompressOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  targetSizeKB?: number;
}

/**
 * Clean helper function to compress any image File or Blob to a JPEG/WebP base64 DataURL
 */
export async function compressImageFile(
  file: File | Blob,
  optionsOrMaxWidth: number | BannerCompressOptions = 1920,
  maxHeightParam = 1080,
  qualityParam = 0.85
): Promise<string> {
  const isOptionsObj = typeof optionsOrMaxWidth === "object" && optionsOrMaxWidth !== null;
  const maxWidth = isOptionsObj ? (optionsOrMaxWidth.maxWidth ?? 1920) : (optionsOrMaxWidth as number);
  const maxHeight = isOptionsObj ? (optionsOrMaxWidth.maxHeight ?? 1080) : maxHeightParam;
  const quality = isOptionsObj ? (optionsOrMaxWidth.quality ?? 0.85) : qualityParam;

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }
        if (height > maxHeight) {
          width = Math.round((width * maxHeight) / height);
          height = maxHeight;
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(e.target?.result as string);
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL("image/jpeg", quality);
        resolve(dataUrl);
      };
      img.onerror = () => reject(new Error("Failed to load image for compression"));
      img.src = e.target?.result as string;
    };
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
}

