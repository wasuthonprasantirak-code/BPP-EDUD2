import React, { useState, useMemo, useEffect } from "react";
import { Sparkles, ArrowRight, X, Search, School, Calendar, MapPin, Users, Image as ImageIcon, Maximize2, ExternalLink, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { ActivityReport, KOPODOT_GOALS, getGoalIdFromCode } from "../types";
import { isSchoolMatch } from "../data/schoolsData";
import { getGoalFallbackImage } from "../data/fallbackImages";

export interface HighlightItem {
  id: string;
  schoolName: string;
  title: string;
  description: string;
  imageUrl: string;
  allImages: string[];
  category: string;
  goalCode: string;
  dateString?: string;
  location?: string;
  participantsCount?: number;
  reportId: string;
  reportedBy?: string;
  quantitativeOutcome?: string;
}

interface ActivityHighlightsProps {
  reports?: ActivityReport[];
  onSelectReport?: (reportId: string) => void;
}

// Clean school name helper
const getCleanSchoolName = (schoolName?: string): string => {
  if (!schoolName) return "รร.ตชด.";
  let clean = schoolName.trim();
  if (clean.startsWith("โรงเรียนตำรวจตระเวนชายแดน")) {
    clean = clean.replace("โรงเรียนตำรวจตระเวนชายแดน", "รร.ตชด.");
  } else if (clean.startsWith("โรงเรียน")) {
    clean = clean.replace("โรงเรียน", "รร.");
  } else if (!clean.startsWith("รร.ตชด.") && !clean.startsWith("ศกร.ตชด.")) {
    clean = `รร.ตชด.${clean}`;
  }
  return clean;
};

// Parse and convert Google Drive links to viewable image URLs with CDN size optimization
const getValidImages = (imageUrl?: string, maxPx: number = 800): string[] => {
  if (!imageUrl) return [];
  const items = imageUrl
    .split(/[\n,;]+|\s+(?=https?:\/\/)/)
    .map((url) => url.trim())
    .filter((url) => url && url.startsWith("http"));

  return items.map((url) => {
    if (url.includes("drive.google.com") || url.includes("lh3.googleusercontent.com")) {
      const match = url.match(/id=([a-zA-Z0-9-_]+)/) || url.match(/\/d\/([a-zA-Z0-9-_]+)/);
      if (match && match[1]) {
        return `https://lh3.googleusercontent.com/d/${match[1]}=w${maxPx}`;
      }
    }
    return url;
  });
};

// Fallback handler if Google Drive URL fails to render directly
const handleImageError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
  const imgEl = e.currentTarget;
  const src = imgEl.src;
  const match = src.match(/lh3\.googleusercontent\.com\/d\/([a-zA-Z0-9-_]+)/) || src.match(/id=([a-zA-Z0-9-_]+)/);
  if (match && match[1] && !imgEl.dataset.fallbackTried) {
    imgEl.dataset.fallbackTried = "true";
    imgEl.src = `https://drive.google.com/thumbnail?id=${match[1]}&sz=w800`;
  } else {
    const goalId = getGoalIdFromCode(imgEl.dataset.goalCode);
    imgEl.src = getGoalFallbackImage(goalId);
  }
};

export default function ActivityHighlights({ reports = [], onSelectReport }: ActivityHighlightsProps) {
  const [showFullGallery, setShowFullGallery] = useState(false);
  const [activeGoalFilter, setActiveGoalFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedHighlightItem, setSelectedHighlightItem] = useState<HighlightItem | null>(null);

  // Lock body scrolling when modal is open
  useEffect(() => {
    if (showFullGallery || selectedHighlightItem) {
      const originalStyle = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = originalStyle;
      };
    }
  }, [showFullGallery, selectedHighlightItem]);
  const [activeImageIndex, setActiveImageIndex] = useState<number>(0);

  // Extract highlight items strictly from real report dataset
  const allHighlightItems = useMemo(() => {
    const items: HighlightItem[] = [];

    reports.forEach((r, index) => {
      if (!r.imageUrl || r.imageUrl.trim() === "") return;

      const validImgs = getValidImages(r.imageUrl);
      if (validImgs.length === 0) return;

      const rawTitle = (r.activityName || r.projectName || "กิจกรรมพัฒนาเด็กและเยาวชน").replace(/,\s*$/, "").trim();
      const rawDesc = (r.details && r.details !== "-" 
        ? r.details 
        : r.quantitativeOutcome || r.objectives || "การดำเนินกิจกรรมพัฒนาเด็กและเยาวชนในถิ่นทุรกันดารตามแผน กพด.").trim();
      const description = rawDesc.replace(/\n+/g, " ").trim();
      const schoolName = getCleanSchoolName(r.schoolName);
      const category = r.goalCode ? `${r.goalCode}` : "ด้านที่ 1";

      items.push({
        id: `report-hl-${r.id || index}`,
        schoolName,
        title: rawTitle,
        description,
        imageUrl: validImgs[0],
        allImages: validImgs,
        category,
        goalCode: r.goalCode || "ด้านที่ 1",
        dateString: r.dateString,
        location: r.location,
        participantsCount: r.participantsCount,
        reportId: r.id,
        reportedBy: r.reportedBy,
        quantitativeOutcome: r.quantitativeOutcome
      });
    });

    return items;
  }, [reports]);

  // Main 6 cards for the front section (latest reports with real uploaded images)
  const display6Items = useMemo(() => {
    return allHighlightItems.slice(0, 6);
  }, [allHighlightItems]);

  // Filtered gallery items for modal
  const filteredGalleryItems = useMemo(() => {
    return allHighlightItems.filter((item) => {
      const matchGoal = activeGoalFilter === "all" || item.goalCode.includes(activeGoalFilter) || item.category.includes(activeGoalFilter);
      const query = searchQuery.toLowerCase().trim();
      const queryNorm = query.replace(/[^a-z0-9ก-๙]/g, '').replace('ชำปะโต', 'ซำปะโต');
      const schoolNameNorm = item.schoolName.toLowerCase().replace(/[^a-z0-9ก-๙]/g, '').replace('ชำปะโต', 'ซำปะโต');
      const schoolNameCore = schoolNameNorm.replace(/รรตชด|โรงเรียนตำรวจตระเวนชายแดน|ศกรตชด|ศศช/g, '');

      const matchSchoolName =
        item.schoolName.toLowerCase().includes(query) ||
        isSchoolMatch(query, item.schoolName) ||
        (queryNorm.length >= 2 && (
          schoolNameNorm.includes(queryNorm) ||
          schoolNameCore.includes(queryNorm) ||
          queryNorm.includes(schoolNameCore)
        ));

      const matchDate = (item.dateString || "").toLowerCase().includes(query);

      const matchQuery = 
        !query || 
        item.title.toLowerCase().includes(query) || 
        item.description.toLowerCase().includes(query) ||
        matchSchoolName ||
        matchDate;

      return matchGoal && matchQuery;
    });
  }, [allHighlightItems, activeGoalFilter, searchQuery]);

  const openLightbox = (item: HighlightItem) => {
    setSelectedHighlightItem(item);
    setActiveImageIndex(0);
  };

  return (
    <>
      {/* Main Section */}
      <div className="bg-pink-50/60 border border-pink-100 rounded-3xl p-4 sm:p-5 md:p-6 space-y-4 md:space-y-5 shadow-2xs">
        {/* Header Row */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-pink-100/90 text-pink-600 rounded-xl shadow-2xs shrink-0 flex items-center justify-center">
              <Sparkles className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <h2 
                className="text-xs sm:text-sm md:text-base lg:text-lg font-extrabold text-pink-950 tracking-tight flex items-center gap-2 whitespace-nowrap overflow-hidden text-ellipsis"
                title={`ภาพไฮไลท์จากรายงานล่าสุด (${allHighlightItems.length} รายงานมีภาพ)`}
              >
                <span className="whitespace-nowrap overflow-hidden text-ellipsis">ภาพไฮไลท์จากรายงานล่าสุด</span>
                <span className="text-xs font-normal text-pink-600 bg-pink-100 px-2.5 py-0.5 rounded-full whitespace-nowrap shrink-0 hidden sm:inline-block">
                  ({allHighlightItems.length} รายงานมีภาพ)
                </span>
              </h2>
            </div>
          </div>

          <button
            onClick={() => setShowFullGallery(true)}
            className="inline-flex items-center gap-1.5 bg-white text-pink-600 hover:text-pink-700 font-bold text-xs sm:text-sm px-4 py-2 rounded-full border border-pink-200/90 shadow-2xs hover:shadow-xs transition-all cursor-pointer select-none"
          >
            <span>ดูแกลเลอรีภาพทั้งหมด</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {/* 6 Cards Grid (Latest Reports) */}
        {display6Items.length === 0 ? (
          <div className="bg-white/80 rounded-2xl p-8 text-center text-slate-500 text-xs flex flex-col items-center justify-center gap-2">
            <Loader2 className="w-5 h-5 animate-spin text-pink-600 mx-auto" />
            <span>กำลังโหลดข้อมูลภาพรายงานล่าสุด...</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5">
            {display6Items.map((item) => (
              <div
                key={item.id}
                onClick={() => openLightbox(item)}
                className="bg-white rounded-2xl border border-slate-100/90 shadow-2xs hover:shadow-md transition-all duration-300 overflow-hidden flex flex-col group cursor-pointer"
              >
                {/* Image Area */}
                <div className="relative aspect-[4/3] sm:h-60 w-full overflow-hidden bg-slate-100">
                  <img
                    src={item.imageUrl}
                    alt={item.title}
                    style={{ objectPosition: "center 22%" }}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    loading="lazy"
                    onError={handleImageError}
                  />

                  {/* Image count badge if > 1 */}
                  {item.allImages.length > 1 && (
                    <div className="absolute top-2.5 right-2.5 bg-slate-900/80 backdrop-blur-xs text-white font-extrabold text-[10px] px-2 py-0.5 rounded-full shadow-md">
                      📷 {item.allImages.length} ภาพ
                    </div>
                  )}

                  {/* Badge Overlay at Bottom-Left of Image */}
                  <div className="absolute bottom-3 left-3 bg-pink-600 text-white font-extrabold text-[11px] px-3 py-1 rounded-full shadow-md tracking-tight max-w-[85%] truncate">
                    {item.schoolName}
                  </div>
                </div>

                {/* Text Area */}
                <div className="p-4 flex-1 flex flex-col justify-between space-y-2">
                  <div className="space-y-1.5">
                    <h3 className="font-bold text-slate-900 text-sm sm:text-base leading-snug group-hover:text-pink-600 transition-colors line-clamp-2">
                      {item.title}
                    </h3>
                    <p className="text-xs text-slate-500 leading-relaxed line-clamp-2">
                      {item.description}
                    </p>
                  </div>

                  <div className="pt-2 flex items-center justify-between text-[11px] text-slate-400 border-t border-slate-100">
                    <span>{item.dateString || "รายงานล่าสุด"}</span>
                    <span className="text-pink-600 font-bold flex items-center gap-0.5">
                      ขยายภาพ <Maximize2 className="w-3 h-3" />
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Full Gallery Modal ("ดูแกลเลอรีภาพทั้งหมด") */}
      {showFullGallery && (
        <div 
          className="fixed inset-0 z-[9990] bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-hidden animate-fadeIn"
          onClick={() => setShowFullGallery(false)}
        >
          <div 
            className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-5xl max-h-[88vh] sm:max-h-[85vh] flex flex-col overflow-hidden my-auto animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-pink-50 via-white to-pink-50/50 p-4 sm:p-6 border-b border-pink-100 flex items-center justify-between gap-4 shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-pink-600 text-white rounded-2xl shadow-sm shrink-0">
                  <ImageIcon className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
                    คลังภาพถ่ายจริงจากรายงาน กพด.
                  </h3>
                  <p className="text-xs text-slate-500">
                    ภาพถ่ายการปฏิบัติงานจริงจากโรงเรียน ตชด. ที่ได้รับการรายงานเข้ามา ({allHighlightItems.length} กิจกรรม)
                  </p>
                </div>
              </div>

              <button
                onClick={() => setShowFullGallery(false)}
                className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors cursor-pointer"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Modal Filters & Controls Bar */}
            <div className="p-4 bg-slate-50 border-b border-slate-200 space-y-3 shrink-0">
              <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
                
                {/* Search input */}
                <div className="relative w-full sm:w-72">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="ค้นหาชื่อกิจกรรม หรือ ชื่อโรงเรียน..."
                    className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-pink-500 focus:border-pink-500 outline-none"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery("")}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Counter */}
                <div className="text-xs font-bold text-slate-600 bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-2xs">
                  แสดง {filteredGalleryItems.length} จาก {allHighlightItems.length} รายการ
                </div>
              </div>

              {/* Goal Category Pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-xs">
                <button
                  onClick={() => setActiveGoalFilter("all")}
                  className={`px-3 py-1.5 rounded-full font-bold whitespace-nowrap transition-all cursor-pointer ${
                    activeGoalFilter === "all"
                      ? "bg-pink-600 text-white shadow-xs"
                      : "bg-white text-slate-600 hover:bg-slate-200 border border-slate-200"
                  }`}
                >
                  ทั้งหมด
                </button>
                {KOPODOT_GOALS.map((g) => (
                  <button
                    key={g.id}
                    onClick={() => setActiveGoalFilter(`ด้านที่ ${g.id}`)}
                    className={`px-3 py-1.5 rounded-full font-bold whitespace-nowrap transition-all cursor-pointer ${
                      activeGoalFilter === `ด้านที่ ${g.id}`
                        ? "bg-pink-600 text-white shadow-xs"
                        : "bg-white text-slate-600 hover:bg-slate-200 border border-slate-200"
                    }`}
                  >
                    ด้านที่ {g.id}
                  </button>
                ))}
              </div>
            </div>

            {/* Gallery Grid Container */}
            <div className="p-4 sm:p-6 overflow-y-auto flex-1 bg-slate-50/50">
              {filteredGalleryItems.length === 0 ? (
                <div className="text-center py-12 space-y-3">
                  <ImageIcon className="w-12 h-12 text-slate-300 mx-auto" />
                  <p className="text-sm font-bold text-slate-600">ไม่พบภาพกิจกรรมที่ค้นหา</p>
                  <p className="text-xs text-slate-400">ลองเปลี่ยนคำค้นหาหรือเลือกหมวดหมู่อื่น</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-4">
                  {filteredGalleryItems.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => openLightbox(item)}
                      className="bg-white rounded-2xl border border-slate-200 shadow-2xs hover:shadow-md transition-all duration-300 overflow-hidden flex flex-col group cursor-pointer"
                    >
                      <div className="relative aspect-[4/3] sm:h-60 w-full overflow-hidden bg-slate-100">
                        <img
                          src={item.imageUrl}
                          alt={item.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          loading="lazy"
                          onError={handleImageError}
                        />
                        {item.allImages.length > 1 && (
                          <div className="absolute top-2.5 right-2.5 bg-slate-900/80 backdrop-blur-xs text-white font-extrabold text-[10px] px-2 py-0.5 rounded-full shadow-md">
                            📷 {item.allImages.length} ภาพ
                          </div>
                        )}
                        <div className="absolute bottom-2.5 left-2.5 bg-pink-600 text-white font-extrabold text-[10px] px-2.5 py-0.5 rounded-full shadow-md max-w-[85%] truncate">
                          {item.schoolName}
                        </div>
                      </div>

                      <div className="p-3.5 space-y-1.5 flex-1 flex flex-col justify-between">
                        <div>
                          <h4 className="font-bold text-slate-900 text-xs sm:text-sm line-clamp-2 group-hover:text-pink-600 transition-colors">
                            {item.title}
                          </h4>
                          <p className="text-[11px] text-slate-500 line-clamp-2 mt-1">
                            {item.description}
                          </p>
                        </div>
                        <div className="pt-2 flex items-center justify-between text-[10px] text-slate-400 border-t border-slate-100">
                          <span>{item.category}</span>
                          <span className="text-pink-600 font-bold flex items-center gap-0.5">
                            ขยายภาพ <Maximize2 className="w-3 h-3" />
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-white border-t border-slate-200 flex justify-end shrink-0">
              <button
                onClick={() => setShowFullGallery(false)}
                className="px-5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors cursor-pointer"
              >
                ปิดหน้าต่าง
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Item Detail Lightbox Modal */}
      {selectedHighlightItem && (
        <div 
          className="fixed inset-0 z-[99999] bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 overflow-hidden animate-fadeIn"
          onClick={() => setSelectedHighlightItem(null)}
        >
          <div 
            className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-3xl overflow-hidden my-auto max-h-[88vh] sm:max-h-[85vh] flex flex-col animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="p-4 sm:p-5 bg-slate-900 text-white flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <School className="w-5 h-5 text-pink-400" />
                <span className="font-extrabold text-sm sm:text-base">{selectedHighlightItem.schoolName}</span>
                <span className="text-xs bg-pink-600/80 px-2 py-0.5 rounded-full text-white font-semibold">
                  {selectedHighlightItem.reportId}
                </span>
              </div>
              <button
                onClick={() => setSelectedHighlightItem(null)}
                className="p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-full transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Image Preview Stage with navigation if multiple images */}
            <div className="relative bg-black w-full max-h-[440px] flex items-center justify-center overflow-hidden group">
              <img
                src={selectedHighlightItem.allImages[activeImageIndex] || selectedHighlightItem.imageUrl}
                alt={selectedHighlightItem.title}
                className="max-h-[440px] w-full object-contain"
                onError={handleImageError}
              />

              {/* Prev/Next arrows if multiple images */}
              {selectedHighlightItem.allImages.length > 1 && (
                <>
                  <button
                    onClick={() => setActiveImageIndex((prev) => (prev > 0 ? prev - 1 : selectedHighlightItem.allImages.length - 1))}
                    className="absolute left-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/60 hover:bg-black/80 text-white transition-all cursor-pointer opacity-80 group-hover:opacity-100"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => setActiveImageIndex((prev) => (prev < selectedHighlightItem.allImages.length - 1 ? prev + 1 : 0))}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/60 hover:bg-black/80 text-white transition-all cursor-pointer opacity-80 group-hover:opacity-100"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                  <div className="absolute bottom-3 right-3 bg-black/70 text-white font-extrabold text-xs px-3 py-1 rounded-full">
                    {activeImageIndex + 1} / {selectedHighlightItem.allImages.length}
                  </div>
                </>
              )}
            </div>

            {/* Thumbnail Strip if multiple images */}
            {selectedHighlightItem.allImages.length > 1 && (
              <div className="bg-slate-900 p-2 flex items-center gap-2 overflow-x-auto justify-center">
                {selectedHighlightItem.allImages.map((imgUrl, idx) => (
                  <button
                    key={idx}
                    onClick={() => setActiveImageIndex(idx)}
                    className={`relative w-12 h-10 rounded-lg overflow-hidden border-2 transition-all cursor-pointer shrink-0 ${
                      activeImageIndex === idx ? "border-pink-500 scale-105" : "border-transparent opacity-60 hover:opacity-100"
                    }`}
                  >
                    <img src={imgUrl} alt="" className="w-full h-full object-cover" onError={handleImageError} />
                  </button>
                ))}
              </div>
            )}

            {/* Body Info */}
            <div className="p-5 space-y-4">
              <div className="space-y-1">
                <span className="inline-block px-2.5 py-1 bg-pink-100 text-pink-700 font-extrabold text-xs rounded-lg">
                  {selectedHighlightItem.category}
                </span>
                <h3 className="text-base sm:text-lg font-extrabold text-slate-900 leading-snug">
                  {selectedHighlightItem.title}
                </h3>
              </div>

              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                {selectedHighlightItem.description}
              </p>

              {/* Meta details */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-slate-500 pt-1">
                {selectedHighlightItem.dateString && (
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-4 h-4 text-pink-500 shrink-0" />
                    <span>{selectedHighlightItem.dateString}</span>
                  </div>
                )}
                {selectedHighlightItem.location && (
                  <div className="flex items-center gap-1.5 truncate">
                    <MapPin className="w-4 h-4 text-pink-500 shrink-0" />
                    <span className="truncate">{selectedHighlightItem.location}</span>
                  </div>
                )}
                {selectedHighlightItem.participantsCount ? (
                  <div className="flex items-center gap-1.5">
                    <Users className="w-4 h-4 text-pink-500 shrink-0" />
                    <span>{selectedHighlightItem.participantsCount} คน</span>
                  </div>
                ) : null}
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-3">
                {selectedHighlightItem.reportId && onSelectReport ? (
                  <button
                    onClick={() => {
                      const repId = selectedHighlightItem.reportId!;
                      setSelectedHighlightItem(null);
                      setShowFullGallery(false);
                      onSelectReport(repId);
                    }}
                    className="inline-flex items-center gap-2 bg-pink-600 hover:bg-pink-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-xs transition-colors cursor-pointer"
                  >
                    <span>ดูฉบับเต็มรายงานนี้ ({selectedHighlightItem.reportId})</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </button>
                ) : (
                  <span className="text-xs text-slate-400 italic">รายงานการปฏิบัติงาน กพด.</span>
                )}

                <button
                  onClick={() => setSelectedHighlightItem(null)}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors cursor-pointer"
                >
                  ปิด
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
