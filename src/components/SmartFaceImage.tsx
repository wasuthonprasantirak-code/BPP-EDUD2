import React, { useState, useEffect, useRef } from "react";
import { UserCheck, Sparkles, Focus } from "lucide-react";

interface SmartFaceImageProps {
  src: string;
  alt: string;
  className?: string;
  style?: React.CSSProperties;
  onError?: (e: React.SyntheticEvent<HTMLImageElement, Event>) => void;
  showControls?: boolean;
  defaultPosition?: string; // e.g. "50% 20%"
  fallbackSrc?: string;
}

export const SmartFaceImage: React.FC<SmartFaceImageProps> = ({
  src,
  alt,
  className = "",
  style = {},
  onError,
  showControls = false,
  defaultPosition = "50% 20%",
  fallbackSrc,
}) => {
  const [currentSrc, setCurrentSrc] = useState<string>(src);
  const [hasError, setHasError] = useState<boolean>(false);
  const [retryStage, setRetryStage] = useState<number>(0);
  const [objectPosition, setObjectPosition] = useState<string>(defaultPosition);
  const [faceCount, setFaceCount] = useState<number | null>(null);
  const [isDetecting, setIsDetecting] = useState<boolean>(true);
  const [manualPos, setManualPos] = useState<string | null>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    setCurrentSrc(src);
    setHasError(false);
    setRetryStage(0);
    setIsDetecting(true);
    setFaceCount(null);
    setManualPos(null);
  }, [src]);

  const handleImgError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    setIsDetecting(false);

    // Stage 1: Try Google Drive alternative thumbnail format
    if (retryStage === 0 && currentSrc) {
      if (currentSrc.includes("lh3.googleusercontent.com/d/")) {
        const match = currentSrc.match(/lh3\.googleusercontent\.com\/d\/([a-zA-Z0-9-_]+)/);
        if (match && match[1]) {
          setRetryStage(1);
          setCurrentSrc(`https://drive.google.com/thumbnail?id=${match[1]}&sz=w1000`);
          return;
        }
      } else if (currentSrc.includes("drive.google.com/thumbnail")) {
        const match = currentSrc.match(/id=([a-zA-Z0-9-_]+)/);
        if (match && match[1]) {
          setRetryStage(1);
          setCurrentSrc(`https://lh3.googleusercontent.com/d/${match[1]}`);
          return;
        }
      }
    }

    // Stage 2: Fall back to provided category fallback image URL
    if (retryStage < 2 && fallbackSrc && currentSrc !== fallbackSrc) {
      setRetryStage(2);
      setCurrentSrc(fallbackSrc);
      return;
    }

    setHasError(true);
    if (onError) onError(e);
  };

  const handleImageLoad = () => {
    if (!imgRef.current) return;
    const img = imgRef.current;

    // Use non-blocking deferred schedule (requestIdleCallback or setTimeout) to keep main thread fluid on iPads
    const runDetection = async () => {
      if (!imgRef.current) return;

      // 1. Try Native Browser FaceDetector API
      if ("FaceDetector" in window) {
        try {
          const faceDetector = new (window as any).FaceDetector({
            fastMode: true,
            maxFaces: 10,
          });
          const faces = await faceDetector.detect(img);
          if (faces && faces.length > 0) {
            let totalX = 0;
            let totalY = 0;
            faces.forEach((f: any) => {
              const bbox = f.boundingBox;
              totalX += bbox.x + bbox.width / 2;
              totalY += bbox.y + bbox.height * 0.35;
            });

            const avgX = Math.min(
              90,
              Math.max(10, (totalX / faces.length / (img.naturalWidth || 1)) * 100)
            );
            const avgY = Math.min(
              80,
              Math.max(10, (totalY / faces.length / (img.naturalHeight || 1)) * 100)
            );

            const detectedPos = `${avgX.toFixed(1)}% ${avgY.toFixed(1)}%`;
            setObjectPosition(detectedPos);
            setFaceCount(faces.length);
            setIsDetecting(false);
            return;
          }
        } catch (err) {
          // Fallback to canvas skin tone detection
        }
      }

      // 2. Canvas-based Face & Head Region Detection
      try {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        if (ctx && img.naturalWidth > 0 && img.naturalHeight > 0) {
          const sampleW = 80; // Reduced sample size for lightning-fast analysis on mobile/iPad
          const sampleH = Math.round((img.naturalHeight / img.naturalWidth) * 80);
          canvas.width = sampleW;
          canvas.height = sampleH;

          ctx.drawImage(img, 0, 0, sampleW, sampleH);
          const imgData = ctx.getImageData(0, 0, sampleW, sampleH);
          const pixels = imgData.data;

          let totalSkinX = 0;
          let totalSkinY = 0;
          let skinPixelsCount = 0;

          const maxScanY = Math.floor(sampleH * 0.65);

          for (let y = 0; y < maxScanY; y++) {
            for (let x = 0; x < sampleW; x++) {
              const idx = (y * sampleW + x) * 4;
              const r = pixels[idx];
              const g = pixels[idx + 1];
              const b = pixels[idx + 2];

              const isSkin =
                r > 60 &&
                g > 35 &&
                b > 20 &&
                r > g &&
                r > b &&
                Math.abs(r - g) > 12 &&
                r - Math.min(g, b) > 15;

              if (isSkin) {
                const weight = 1 + (1 - y / maxScanY) * 0.5;
                totalSkinX += x * weight;
                totalSkinY += y * weight;
                skinPixelsCount += weight;
              }
            }
          }

          if (skinPixelsCount > sampleW * 1.5) {
            const skinCenterX = (totalSkinX / skinPixelsCount / sampleW) * 100;
            const skinCenterY = (totalSkinY / skinPixelsCount / sampleH) * 100;

            const posX = Math.min(80, Math.max(20, skinCenterX));
            const posY = Math.min(50, Math.max(12, skinCenterY));

            setObjectPosition(`${posX.toFixed(1)}% ${posY.toFixed(1)}%`);
            setFaceCount(1);
            setIsDetecting(false);
            canvas.width = 1;
            canvas.height = 1;
            return;
          }
          canvas.width = 1;
          canvas.height = 1;
        }
      } catch (e) {
        // Security or CORS error fallback
      }

      setObjectPosition(defaultPosition);
      setFaceCount(null);
      setIsDetecting(false);
    };

    if ("requestIdleCallback" in window) {
      (window as any).requestIdleCallback(() => runDetection(), { timeout: 1000 });
    } else {
      setTimeout(runDetection, 60);
    }
  };

  const finalPos = manualPos || objectPosition;

  return (
    <div className="relative w-full h-full overflow-hidden group select-none bg-slate-800">
      {!hasError ? (
        <img
          ref={imgRef}
          src={currentSrc}
          alt={alt}
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
          onLoad={handleImageLoad}
          onError={handleImgError}
          className={`w-full h-full object-cover transition-all duration-300 ${className}`}
          style={{
            ...style,
            objectPosition: finalPos,
          }}
        />
      ) : (
        <div className="w-full h-full bg-gradient-to-br from-indigo-950 via-slate-900 to-indigo-900 flex flex-col items-center justify-center p-4 text-center select-none relative overflow-hidden">
          <div className="p-3 bg-indigo-800/40 text-amber-300 rounded-full mb-2 border border-amber-400/30 shadow-inner">
            <Sparkles className="w-6 h-6 text-amber-300" />
          </div>
          <p className="text-xs font-black text-amber-300 line-clamp-2 px-2 leading-tight">
            {alt || "ภาพกิจกรรม กพด."}
          </p>
          <span className="text-[10px] text-indigo-200/80 font-semibold mt-1 bg-indigo-900/80 px-2 py-0.5 rounded-md border border-indigo-700/50">
            สื่อภาพกิจกรรม ตชด.
          </span>
        </div>
      )}

      {/* Face Detection Indicator Badge */}
      <div className="absolute top-1.5 left-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none flex items-center gap-1 bg-slate-900/80 backdrop-blur-xs text-white text-[11px] font-medium px-2 py-0.5 rounded-full shadow-xs">
        {isDetecting ? (
          <>
            <Sparkles className="w-3 h-3 text-amber-400 animate-spin" />
            <span>กำลังสแกนใบหน้า...</span>
          </>
        ) : faceCount !== null && faceCount > 0 ? (
          <>
            <UserCheck className="w-3 h-3 text-emerald-400" />
            <span>ตรวจพบใบหน้า ({faceCount}) • ปรับตำแหน่งอัตโนมัติ</span>
          </>
        ) : (
          <>
            <Focus className="w-3 h-3 text-sky-400" />
            <span>เน้นตำแหน่งส่วนบน (Auto-Face Focus)</span>
          </>
        )}
      </div>

      {/* Manual Focal Point Quick Controls (When Enabled or Hovered) */}
      {showControls && (
        <div className="absolute bottom-1.5 right-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center gap-1 bg-slate-900/85 backdrop-blur-xs text-white p-1 rounded-lg text-[10px] font-sans shadow-md">
          <button
            type="button"
            onClick={() => setManualPos("50% 15%")}
            className={`px-1.5 py-0.5 rounded ${finalPos === "50% 15%" ? "bg-amber-500 font-bold" : "hover:bg-slate-700"}`}
            title="เน้นส่วนบนสุด (ใบหน้า)"
          >
            หน้า (บน)
          </button>
          <button
            type="button"
            onClick={() => setManualPos("50% 35%")}
            className={`px-1.5 py-0.5 rounded ${finalPos === "50% 35%" ? "bg-amber-500 font-bold" : "hover:bg-slate-700"}`}
            title="เน้นกลางบน (ครึ่งตัว)"
          >
            ครึ่งตัว
          </button>
          <button
            type="button"
            onClick={() => setManualPos("50% 50%")}
            className={`px-1.5 py-0.5 rounded ${finalPos === "50% 50%" ? "bg-amber-500 font-bold" : "hover:bg-slate-700"}`}
            title="กึ่งกลางภาพ"
          >
            กึ่งกลาง
          </button>
        </div>
      )}
    </div>
  );
};
