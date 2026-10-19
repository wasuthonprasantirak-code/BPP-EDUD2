import React, { useState, useEffect } from "react";
import { 
  ImageIcon, 
  Sparkles, 
  Settings, 
  Maximize2, 
  CheckCircle2, 
  Layers,
  Edit3
} from "lucide-react";
import { 
  getBannerForPage, 
  getDefaultBannerForPage,
  getSafeBannerUrl,
  BUNDLED_DEFAULT_BANNER,
  recordBannerLoadFailure,
  subscribeToBannerChanges, 
  APP_PAGE_DEFINITIONS,
  isPageBannerCustomized,
  isAppPublished,
  subscribeToPublishStatus
} from "../lib/bannerStorage";

export interface UniversalPageBannerProps {
  pageKey: string;
  title?: string;
  subtitle?: string;
  badge?: string;
  onOpenCustomizer?: (pageKey: string) => void;
  className?: string;
  children?: React.ReactNode;
  showInfoOverlay?: boolean;
}

export const UniversalPageBanner: React.FC<UniversalPageBannerProps> = ({
  pageKey,
  title,
  subtitle,
  badge,
  onOpenCustomizer,
  className = "",
  children,
  showInfoOverlay = false,
}) => {
  const [bannerUrl, setBannerUrl] = useState<string>(() => getBannerForPage(pageKey));
  const [imageLoadError, setImageLoadError] = useState<boolean>(false);
  const [isPublished, setIsPublished] = useState<boolean>(() => isAppPublished());

  useEffect(() => {
    setIsPublished(isAppPublished());
    const unsubPublish = subscribeToPublishStatus((pub) => {
      setIsPublished(pub);
    });
    return () => unsubPublish();
  }, []);

  // Subscribe to live banner changes
  useEffect(() => {
    setBannerUrl(getBannerForPage(pageKey));
    setImageLoadError(false);

    const unsubscribe = subscribeToBannerChanges((changedKey, newUrl) => {
      if (changedKey === pageKey || changedKey === "all") {
        setBannerUrl(newUrl || getBannerForPage(pageKey));
        setImageLoadError(false);
      }
    });

    return () => unsubscribe();
  }, [pageKey]);

  const pageDef = APP_PAGE_DEFINITIONS.find((p) => p.key === pageKey);
  const displayTitle = title || pageDef?.title || "โครงการพระราชดำริ กพด. ฉบับที่ 5";
  const displaySubtitle = subtitle || pageDef?.subtitle;
  const isCustomized = isPageBannerCustomized(pageKey);

  return (
    <div 
      id={`page-banner-${pageKey}`}
      className={`group relative w-full overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-xs hover:shadow-sm transition-all duration-300 ${className}`}
    >
      {/* Top Accent Gradient Line */}
      <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-amber-400 via-purple-600 to-indigo-700 z-20" />

      {/* Floating Action / Edit Button (ซ่อนอัตโนมัติเมื่ออยู่ในโหมดเผยแพร่เพื่อป้องกันผู้ใช้แก้ไข) */}
      {onOpenCustomizer && !isPublished && (
        <div className="banner-customizer-btn-container absolute top-3.5 right-3.5 z-30 opacity-90 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity duration-200">
          <button
            type="button"
            onClick={() => onOpenCustomizer(pageKey)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900/80 hover:bg-slate-900 text-white text-xs font-bold backdrop-blur-md shadow-md border border-white/20 transition-all active:scale-95 cursor-pointer"
            title="ปรับเปลี่ยนแบนเนอร์ของหน้านี้"
          >
            <ImageIcon className="w-3.5 h-3.5 text-amber-400" />
            <span>เปลี่ยนแบนเนอร์</span>
            {isCustomized && (
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
            )}
          </button>
        </div>
      )}

      {/* Banner Panoramic Image Container (3:1 Aspect Ratio) */}
      {!imageLoadError ? (
        <div className="relative w-full aspect-[3/1] bg-slate-50 flex items-center justify-center overflow-hidden">
          <img
            src={getSafeBannerUrl(bannerUrl) || BUNDLED_DEFAULT_BANNER}
            alt={`${displayTitle} - ระบบรายงานกิจกรรม กพด. ฉบับที่ 5 กองบังคับการตำรวจตระเวนชายแดน ภาค 2`}
            className="w-full h-full object-cover object-center block"
            referrerPolicy="no-referrer"
            onError={(e) => {
              const currentSrc = (e.currentTarget as HTMLImageElement).src;
              // If Drive thumbnail failed, try Google User Content CDN
              if (currentSrc.includes("drive.google.com/thumbnail")) {
                const match = currentSrc.match(/id=([a-zA-Z0-9_-]+)/);
                if (match && match[1]) {
                  (e.currentTarget as HTMLImageElement).src = `https://lh3.googleusercontent.com/d/${match[1]}`;
                  return;
                }
              }
              // If lh3 failed, try drive thumbnail with standard resolution
              if (currentSrc.includes("lh3.googleusercontent.com/d/")) {
                const match = currentSrc.match(/lh3\.googleusercontent\.com\/d\/([a-zA-Z0-9_-]+)/);
                if (match && match[1]) {
                  (e.currentTarget as HTMLImageElement).src = `https://drive.google.com/thumbnail?id=${match[1]}&sz=w1600`;
                  return;
                }
              }

              if (bannerUrl !== BUNDLED_DEFAULT_BANNER) {
                // Fallback to bundled default banner
                recordBannerLoadFailure(pageKey);
                setBannerUrl(BUNDLED_DEFAULT_BANNER);
              } else {
                setImageLoadError(true);
              }
            }}
          />

          {/* Optional Overlay Title for specific views if desired */}
          {showInfoOverlay && (
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-slate-950/20 to-transparent flex items-end p-6 sm:p-8 text-white z-10 pointer-events-none">
              <div className="space-y-1 max-w-3xl">
                {badge && (
                  <span className="inline-block px-2.5 py-0.5 rounded-full bg-amber-400/90 text-slate-950 text-2xs font-extrabold shadow-xs">
                    {badge}
                  </span>
                )}
                <h2 className="text-xl sm:text-2xl lg:text-3xl font-black tracking-tight text-white drop-shadow-sm">
                  {displayTitle}
                </h2>
                {displaySubtitle && (
                  <p 
                    style={{ fontSize: "9px", width: "653px" }}
                    className="text-[9px] text-slate-200 font-medium line-clamp-2 max-w-full"
                  >
                    {displaySubtitle}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      ) : (
        /* Graceful High-Fidelity Fallback Surface */
        <div className="relative w-full aspect-[3/1] bg-gradient-to-r from-purple-900 via-indigo-950 to-slate-900 p-6 sm:p-8 flex flex-col justify-center text-white">
          <div className="max-w-2xl space-y-2 relative z-10">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/30 text-xs font-bold">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>{badge || "โครงการตามพระราชดำริ กพด. ฉบับที่ 5"}</span>
            </span>
            <h2 className="text-xl sm:text-2xl lg:text-3xl font-black text-white">
              {displayTitle}
            </h2>
            {displaySubtitle && (
              <p 
                style={{ fontSize: "9px", width: "653px" }}
                className="text-[9px] text-purple-200/90 leading-relaxed font-normal max-w-full"
              >
                {displaySubtitle}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Children elements if provided */}
      {children}
    </div>
  );
};
