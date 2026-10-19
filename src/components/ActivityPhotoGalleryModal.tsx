import { useState, useMemo, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { ActivityReport, KOPODOT_GOALS, getGoalIdFromCode } from "../types";
import { OFFICIAL_TARGET_SCHOOLS, isSchoolMatch } from "../data/schoolsData";
import { 
  X, Image as ImageIcon, Search, Filter, Play, Pause, ChevronLeft, ChevronRight, 
  School, Calendar, Users, Eye, Layers, FileText, Tv, BookOpen,
  GraduationCap, User, Sparkles, MapPin, CheckCircle2, Maximize2
} from "lucide-react";

import { SmartFaceImage } from "./SmartFaceImage";
import { getGoalFallbackImage } from "../data/fallbackImages";

interface ActivityPhotoGalleryModalProps {
  isOpen: boolean;
  onClose: () => void;
  reports: ActivityReport[];
  onSelectReport?: (reportId: string) => void;
  isEmbedded?: boolean;
}

// Extract image URLs helper with CDN size optimization
function parseImageUrls(urlStr: string | undefined, maxPx: number = 1000): string[] {
  if (!urlStr) return [];
  const items = urlStr.split(/[\n,;]+|\s+(?=https?:\/\/)/).map((s) => s.trim()).filter(Boolean);
  return items.map((url) => {
    const driveMatch = url.match(/id=([a-zA-Z0-9_-]+)/) || url.match(/\/d\/([a-zA-Z0-9_-]+)/);
    if (driveMatch && driveMatch[1]) {
      return `https://lh3.googleusercontent.com/d/${driveMatch[1]}=w${maxPx}`;
    }
    if (url.includes("lh3.googleusercontent.com/d/") && !url.includes("=w") && !url.includes("=s")) {
      return `${url}=w${maxPx}`;
    }
    return url;
  });
}

// Album Item interface
export interface AlbumItem {
  id: string;
  report: ActivityReport;
  schoolName: string;
  schoolGroupName: string;
  province: string;
  goalId: number;
  activityName: string;
  gradeLevel: string;
  dateString: string;
  reportedBy: string;
  tag: string;
  photos: { url: string; fallbackUrl: string }[];
  coverUrl: string;
  coverFallbackUrl: string;
  photoCount: number;
}

export default function ActivityPhotoGalleryModal({
  isOpen,
  onClose,
  reports,
  onSelectReport,
  isEmbedded = false
}: ActivityPhotoGalleryModalProps) {
  // Filter States
  const [selectedGroup, setSelectedGroup] = useState<string>("all");
  const [selectedGoalId, setSelectedGoalId] = useState<string>("all");
  const [selectedGrade, setSelectedGrade] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedTag, setSelectedTag] = useState<string>("all");

  // Presentation Mode States
  const [isPresentationMode, setIsPresentationMode] = useState<boolean>(false);
  const [currentSlideIndex, setCurrentSlideIndex] = useState<number>(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState<boolean>(false);

  // In-Album Detail Viewer Modal State
  const [selectedAlbum, setSelectedAlbum] = useState<AlbumItem | null>(null);
  const [activePhotoIndex, setActivePhotoIndex] = useState<number>(0);

  useEffect(() => {
    if ((isOpen && !isEmbedded) || selectedAlbum || isPresentationMode) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isOpen, isEmbedded, selectedAlbum, isPresentationMode]);

  if (!isOpen && !isEmbedded) return null;

  // Pagination & Batching States
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(16);

  // Process and group reports into Albums
  const allAlbums = useMemo(() => {
    const list: AlbumItem[] = [];

    reports.forEach((rep, repIdx) => {
      const rawUrls = parseImageUrls(rep.imageUrl);
      const schoolMatch = OFFICIAL_TARGET_SCHOOLS.find((s) => isSchoolMatch(rep.schoolName, s.name));
      const groupName = schoolMatch ? schoolMatch.groupName : "กก.ตชด.21";
      const province = schoolMatch ? schoolMatch.province : "สุรินทร์";
      const goalId = getGoalIdFromCode(rep.goalCode);

      // Category tags logic
      let tag = "กิจกรรมทั่วไป";
      if (rep.activityName.includes("อาหาร") || rep.activityName.includes("เกษตร") || rep.activityName.includes("แปรงฟัน") || rep.activityName.includes("โภชนาการ")) tag = "สุขอนามัยและโภชนาการ";
      else if (rep.activityName.includes("สอน") || rep.activityName.includes("คณิต") || rep.activityName.includes("ภาษาไทย") || rep.activityName.includes("อ่าน")) tag = "พัฒนาการเรียนรู้";
      else if (rep.activityName.includes("สหกรณ์") || rep.activityName.includes("อาชีพ") || rep.activityName.includes("ร้านค้า")) tag = "ทักษะอาชีพและสหกรณ์";
      else if (rep.activityName.includes("อนุรักษ์") || rep.activityName.includes("ปลูกป่า") || rep.activityName.includes("สิ่งแวดล้อม")) tag = "สิ่งแวดล้อม";
      else if (rep.activityName.includes("ชุมชน") || rep.activityName.includes("บริการ") || rep.activityName.includes("จิตอาสา")) tag = "บริการชุมชน";

      const photos: { url: string; fallbackUrl: string }[] = [];
      if (rawUrls.length > 0) {
        rawUrls.forEach((u, i) => {
          photos.push({
            url: u,
            fallbackUrl: getGoalFallbackImage(goalId, repIdx + i)
          });
        });
      } else {
        const fallback = getGoalFallbackImage(goalId, repIdx);
        photos.push({
          url: fallback,
          fallbackUrl: fallback
        });
      }

      list.push({
        id: rep.id,
        report: rep,
        schoolName: rep.schoolName,
        schoolGroupName: groupName,
        province,
        goalId,
        activityName: rep.activityName || "กิจกรรมพัฒนาเด็กและเยาวชน (กพด.)",
        gradeLevel: rep.gradeLevel || "ทุกระดับชั้น",
        dateString: rep.dateString || "ตามแผนงาน",
        reportedBy: rep.reportedBy || "ครูผู้รับผิดชอบ",
        tag,
        photos,
        coverUrl: photos[0].url,
        coverFallbackUrl: photos[0].fallbackUrl,
        photoCount: rawUrls.length > 0 ? rawUrls.length : 1
      });
    });

    return list;
  }, [reports]);

  // Unique Grade Levels for filter dropdown / pills
  const availableGradeLevels = useMemo(() => {
    const grades = new Set<string>();
    allAlbums.forEach((a) => {
      if (a.gradeLevel && a.gradeLevel.trim()) {
        grades.add(a.gradeLevel.trim());
      }
    });
    return Array.from(grades);
  }, [allAlbums]);

  // Filtered Albums List
  const filteredAlbums = useMemo(() => {
    return allAlbums.filter((album) => {
      // Group Filter
      if (selectedGroup !== "all") {
        if (!album.schoolGroupName.includes(selectedGroup)) return false;
      }
      // Goal Filter
      if (selectedGoalId !== "all") {
        if (album.goalId !== Number(selectedGoalId)) return false;
      }
      // Grade Level Filter
      if (selectedGrade !== "all") {
        const ag = album.gradeLevel.toLowerCase();
        const sg = selectedGrade.toLowerCase();
        if (sg === "อนุบาล" && !(ag.includes("อ.") || ag.includes("ปฐมวัย") || ag.includes("อนุบาล"))) return false;
        if (sg === "ประถม" && !(ag.includes("ป.") || ag.includes("ประถม"))) return false;
        if (sg === "มัธยม" && !(ag.includes("ม.") || ag.includes("มัธยม"))) return false;
        if (sg !== "อนุบาล" && sg !== "ประถม" && sg !== "มัธยม" && !ag.includes(sg)) return false;
      }
      // Tag Filter
      if (selectedTag !== "all") {
        if (album.tag !== selectedTag) return false;
      }
      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchAct = album.activityName.toLowerCase().includes(q);
        const matchSch = album.schoolName.toLowerCase().includes(q);
        const matchProj = album.report.projectName.toLowerCase().includes(q);
        const matchProv = album.province.toLowerCase().includes(q);
        const matchRep = album.reportedBy.toLowerCase().includes(q);
        const matchGrade = album.gradeLevel.toLowerCase().includes(q);
        if (!matchAct && !matchSch && !matchProj && !matchProv && !matchRep && !matchGrade) return false;
      }
      return true;
    });
  }, [allAlbums, selectedGroup, selectedGoalId, selectedGrade, selectedTag, searchQuery]);

  // Open Album Detail Viewer
  const handleOpenAlbum = (album: AlbumItem) => {
    setSelectedAlbum(album);
    setActivePhotoIndex(0);
  };

  // In-Album Navigation
  const handlePrevPhoto = useCallback(() => {
    if (!selectedAlbum) return;
    setActivePhotoIndex((prev) => (prev - 1 + selectedAlbum.photos.length) % selectedAlbum.photos.length);
  }, [selectedAlbum]);

  const handleNextPhoto = useCallback(() => {
    if (!selectedAlbum) return;
    setActivePhotoIndex((prev) => (prev + 1) % selectedAlbum.photos.length);
  }, [selectedAlbum]);

  // Keyboard Navigation Listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (selectedAlbum) {
        if (e.key === "ArrowLeft") handlePrevPhoto();
        if (e.key === "ArrowRight") handleNextPhoto();
        if (e.key === "Escape") setSelectedAlbum(null);
      } else if (isPresentationMode) {
        if (e.key === "Escape") setIsPresentationMode(false);
      } else if (e.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedAlbum, isPresentationMode, handlePrevPhoto, handleNextPhoto, onClose]);

  // Lock body & document scroll when photo gallery, album popup, or presentation mode is active
  useEffect(() => {
    if ((isOpen && !isEmbedded) || selectedAlbum || isPresentationMode) {
      const originalBodyOverflow = document.body.style.overflow;
      const originalDocOverflow = document.documentElement.style.overflow;
      const originalTouchAction = document.body.style.touchAction;

      document.body.style.overflow = "hidden";
      document.documentElement.style.overflow = "hidden";
      document.body.style.touchAction = "none";

      return () => {
        document.body.style.overflow = originalBodyOverflow;
        document.documentElement.style.overflow = originalDocOverflow;
        document.body.style.touchAction = originalTouchAction;
      };
    }
  }, [isOpen, isEmbedded, selectedAlbum, isPresentationMode]);

  // Reset pagination on filter change
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedGroup, selectedGoalId, selectedGrade, selectedTag, searchQuery, pageSize]);

  const totalPages = Math.ceil(filteredAlbums.length / pageSize) || 1;

  // Visible Albums for current page
  const visibleAlbums = useMemo(() => {
    const startIdx = (currentPage - 1) * pageSize;
    return filteredAlbums.slice(startIdx, startIdx + pageSize);
  }, [filteredAlbums, currentPage, pageSize]);

  // Slideshow Autoplay Timer
  useEffect(() => {
    let timer: any;
    if (isPresentationMode && isAutoPlaying && filteredAlbums.length > 0) {
      timer = setInterval(() => {
        setCurrentSlideIndex((prev) => (prev + 1) % filteredAlbums.length);
      }, 4000);
    }
    return () => clearInterval(timer);
  }, [isPresentationMode, isAutoPlaying, filteredAlbums.length]);

  const currentSlide = filteredAlbums[currentSlideIndex] || filteredAlbums[0];

  const galleryMainContent = (
    <>
      <div className={`bg-white w-full ${isEmbedded ? "min-h-screen border-0 overflow-hidden flex flex-col" : "max-w-7xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-auto max-h-[95vh] flex flex-col"}`}>
        
        {/* Gallery Header */}
        <div className="bg-gradient-to-r from-indigo-950 via-slate-900 to-indigo-900 p-3.5 sm:p-5 text-white shrink-0 shadow-md relative">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pr-10 sm:pr-14">
            {/* Title Section */}
            <div className="flex items-start sm:items-center space-x-3 sm:space-x-3.5 min-w-0 flex-1">
              <div className="p-2.5 sm:p-3 bg-amber-400/20 text-amber-300 rounded-xl border border-amber-400/30 shrink-0 mt-0.5 sm:mt-0">
                <ImageIcon className="w-5 h-5 sm:w-6 sm:h-6 text-amber-300" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                  <h2 
                    className="text-sm sm:text-xl font-black text-white leading-snug break-words"
                    title="คลังอัลบั้มภาพรายงานผลการปฏิบัติงาน (School Report Album Hub)"
                  >
                    คลังอัลบั้มภาพรายงานผลการปฏิบัติงาน
                  </h2>
                  <span className="bg-amber-400 text-slate-950 font-black text-[9px] sm:text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider shrink-0 whitespace-nowrap">
                    BPP Report Albums
                  </span>
                </div>
                <p 
                  className="text-[10px] sm:text-xs text-indigo-200/90 font-medium mt-0.5 leading-snug break-words sm:whitespace-nowrap sm:overflow-hidden sm:text-ellipsis"
                >
                  จัดกลุ่มอัลบั้มภาพตามรายงานผลการปฏิบัติงาน โรงเรียน วันที่จัดกิจกรรม และระดับชั้นเรียน
                </p>
              </div>
            </div>

            {/* Actions Section */}
            <div className="flex items-center gap-2 self-stretch sm:self-center shrink-0">
              {/* Back to Dashboard Button */}
              <button
                onClick={onClose}
                className="px-3 py-1.5 sm:px-3.5 sm:py-2 bg-white/10 hover:bg-white/20 border border-white/20 text-white font-bold rounded-xl text-xs cursor-pointer transition flex items-center justify-center gap-1.5 shadow-sm active:scale-95 whitespace-nowrap"
                title="ออกจากมุมมองเต็มจอ กลับสู่แผงควบคุม (ESC)"
              >
                <ChevronLeft className="w-4 h-4 text-amber-300 shrink-0" />
                <span>กลับสู่แผงควบคุม</span>
              </button>

              {/* Presentation Mode Button */}
              <button
                onClick={() => {
                  setIsPresentationMode(true);
                  setCurrentSlideIndex(0);
                  setIsAutoPlaying(true);
                }}
                className="w-full sm:w-auto px-3.5 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black rounded-xl text-xs cursor-pointer transition flex items-center justify-center gap-1.5 shadow-md active:scale-95 whitespace-nowrap"
              >
                <Tv className="w-4 h-4 text-slate-950 shrink-0" />
                <span>โหมดนำเสนอสไลด์โชว์</span>
              </button>
            </div>
          </div>

          {/* Close Button Top Right */}
          <button
            onClick={onClose}
            className="absolute top-3 right-3 sm:top-4 sm:right-4 p-1.5 sm:p-2 text-indigo-200 hover:text-white hover:bg-white/10 rounded-xl transition cursor-pointer"
            aria-label="Close Modal"
            title="ปิด / ออกจากหน้าอัลบั้ม (ESC)"
          >
            <X className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>
        </div>

        {/* Filter Controls Bar */}
        <div className="bg-slate-100/90 p-3.5 sm:p-4 border-b border-slate-200 shrink-0 space-y-3">
          {/* Search Bar & Page Size */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
            <div className="sm:col-span-8 lg:col-span-9 space-y-1">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Search className="w-3.5 h-3.5 text-indigo-600" />
                <span>ค้นหาตามชื่อโรงเรียน / วิชาที่สอน / ชื่อกิจกรรม / ครูผู้รายงาน:</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="พิมพ์คำค้นหา เช่น รร.ตชด.บ้านซำปะโต, คณิตศาสตร์, เกษตรเพื่ออาหารกลางวัน..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full text-xs md:text-sm pl-9 pr-8 py-2 bg-white border border-slate-300 rounded-xl font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 shadow-2xs transition"
                />
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 p-0.5 rounded-full hover:bg-slate-100"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Page Size Batch Selector */}
            <div className="sm:col-span-4 lg:col-span-3 space-y-1">
              <label className="text-xs font-bold text-indigo-950 flex items-center gap-1.5">
                <Filter className="w-3.5 h-3.5 text-indigo-600" />
                <span>แสดงผลทีละชุด:</span>
              </label>
              <select
                value={pageSize}
                onChange={(e) => setPageSize(Number(e.target.value))}
                className="w-full text-xs md:text-sm p-2 bg-indigo-50/80 border border-indigo-200 rounded-xl font-bold text-indigo-950 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 shadow-2xs cursor-pointer transition truncate"
              >
                <option value={12}>12 อัลบั้ม / ชุด</option>
                <option value={16}>16 อัลบั้ม / ชุด</option>
                <option value={24}>24 อัลบั้ม / ชุด</option>
                <option value={48}>48 อัลบั้ม / ชุด</option>
              </select>
            </div>
          </div>

          {/* Filter Selectors Row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* 1. Grade Level Quick Filter Bar */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                <GraduationCap className="w-3.5 h-3.5 text-indigo-600" />
                <span>ระดับชั้นเรียน:</span>
              </label>
              <select
                value={selectedGrade}
                onChange={(e) => setSelectedGrade(e.target.value)}
                className="w-full text-xs md:text-sm p-2 bg-white border border-slate-300 rounded-xl font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 shadow-2xs cursor-pointer transition truncate"
              >
                <option value="all">ทุกระดับชั้นเรียน (อ.1 - ม.3)</option>
                <option value="อนุบาล">ปฐมวัย / อ.3</option>
                <option value="ประถม">ประถมศึกษา (ป.1 - ป.6)</option>
                <option value="มัธยม">มัธยมศึกษา (ม.1 - ม.3)</option>
                {availableGradeLevels.map((g) => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </select>
            </div>

            {/* 2. Group Filter */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 block">สังกัด กก.ตชด.:</label>
              <select
                value={selectedGroup}
                onChange={(e) => setSelectedGroup(e.target.value)}
                className="w-full text-xs md:text-sm p-2 bg-white border border-slate-300 rounded-xl font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 shadow-2xs cursor-pointer transition truncate"
              >
                <option value="all">ทุกสังกัด กก.ตชด. (21-24)</option>
                <option value="21">กก.ตชด.21 (สุรินทร์/ศรีสะเกษ)</option>
                <option value="22">กก.ตชด.22 (อุบลราชธานี/ยโสธร/อำนาจเจริญ)</option>
                <option value="23">กก.ตชด.23 (สกลนคร/นครพนม/มุกดาหาร)</option>
                <option value="24">กก.ตชด.24 (อุดรธานี/เลย/หนองคาย/บึงกาฬ)</option>
              </select>
            </div>

            {/* 3. Goal Filter */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 block">เป้าหมาย กพด. (8 ด้าน):</label>
              <select
                value={selectedGoalId}
                onChange={(e) => setSelectedGoalId(e.target.value)}
                className="w-full text-xs md:text-sm p-2 bg-white border border-slate-300 rounded-xl font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 shadow-2xs cursor-pointer transition truncate"
              >
                <option value="all">ทุกเป้าหมายหลัก (ด้านที่ 1-8)</option>
                {KOPODOT_GOALS.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.code}: {g.title}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Quick Stats & Active Filters */}
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs pt-1.5 border-t border-slate-200/80">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="font-bold text-slate-600">
                พบอัลบั้มรายงานผลทั้งสิ้น <span className="text-indigo-900 font-black">{filteredAlbums.length}</span> อัลบั้ม
              </span>
              {filteredAlbums.length > 0 && (
                <span className="text-[11px] font-extrabold text-slate-500 bg-slate-200/80 px-2.5 py-0.5 rounded-md">
                  อัลบั้มชุดที่ {((currentPage - 1) * pageSize) + 1} - {Math.min(currentPage * pageSize, filteredAlbums.length)} (หน้า {currentPage}/{totalPages})
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              {(selectedGroup !== "all" || selectedGoalId !== "all" || selectedGrade !== "all" || selectedTag !== "all" || searchQuery) && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedGroup("all");
                    setSelectedGoalId("all");
                    setSelectedGrade("all");
                    setSelectedTag("all");
                    setSearchQuery("");
                  }}
                  className="text-indigo-700 hover:underline font-extrabold text-[11px] cursor-pointer mr-2"
                >
                  ล้างตัวกรองทั้งหมด
                </button>
              )}

              {/* Top Pagination Buttons */}
              {totalPages > 1 && (
                <div className="flex items-center gap-1.5 bg-white border border-slate-300 rounded-lg p-1">
                  <button
                    type="button"
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    className="p-1 rounded hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-transparent transition cursor-pointer"
                    title="ชุดก่อนหน้า"
                  >
                    <ChevronLeft className="w-4 h-4 text-slate-700" />
                  </button>
                  <span className="text-[11px] font-black text-indigo-950 px-1">
                    {currentPage} / {totalPages}
                  </span>
                  <button
                    type="button"
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    className="p-1 rounded hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-transparent transition cursor-pointer"
                    title="ชุดถัดไป"
                  >
                    <ChevronRight className="w-4 h-4 text-slate-700" />
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Report Album Grid Content Area */}
        <div className="p-4 sm:p-5 overflow-y-auto flex-1 bg-slate-50/70 space-y-5">
          {visibleAlbums.length > 0 ? (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5">
                {visibleAlbums.map((album) => {
                  const goalObj = KOPODOT_GOALS.find((g) => g.id === album.goalId) || KOPODOT_GOALS[0];

                  return (
                    <div
                      key={album.id}
                      onClick={() => handleOpenAlbum(album)}
                      className="group bg-white rounded-2xl border border-slate-200/90 overflow-hidden shadow-2xs hover:shadow-xl transition-all duration-200 cursor-pointer flex flex-col transform hover:-translate-y-1"
                    >
                      {/* Album Cover Container */}
                      <div className="relative aspect-[4/3] w-full bg-slate-900 overflow-hidden">
                        <SmartFaceImage
                          src={album.coverUrl}
                          fallbackSrc={album.coverFallbackUrl}
                          alt={album.activityName}
                          showControls={false}
                          defaultPosition="50% 20%"
                          className="group-hover:scale-105 transition duration-300"
                        />
                        
                        {/* Top Badges */}
                        <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between gap-1">
                          <span
                            className="px-2.5 py-0.5 rounded-lg text-[10px] font-black text-white shadow-md backdrop-blur-xs"
                            style={{ backgroundColor: goalObj.color }}
                          >
                            {goalObj.code}
                          </span>

                          <span className="px-2.5 py-1 rounded-lg text-[10px] font-black bg-slate-900/85 backdrop-blur-md text-amber-300 border border-slate-700/80 shadow-md flex items-center gap-1">
                            <ImageIcon className="w-3 h-3 text-amber-300" />
                            <span>{album.photoCount} รูปภาพ</span>
                          </span>
                        </div>

                        {/* Grade Level Overlay Tag (Bottom Left) */}
                        <div className="absolute bottom-2.5 left-2.5">
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-indigo-950/80 text-indigo-100 border border-indigo-400/40 backdrop-blur-xs shadow-xs flex items-center gap-1">
                            <GraduationCap className="w-3 h-3 text-amber-300" />
                            <span>{album.gradeLevel}</span>
                          </span>
                        </div>

                        {/* Hover Overlay Button */}
                        <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                          <span className="px-3.5 py-2 bg-white/95 text-slate-900 font-black text-xs rounded-xl shadow-lg flex items-center gap-1.5 transform group-hover:scale-105 transition">
                            <Eye className="w-4 h-4 text-indigo-600" />
                            <span>เปิดอัลบั้มเจาะลึก</span>
                          </span>
                        </div>
                      </div>

                      {/* Album Meta Details */}
                      <div className="p-3.5 sm:p-4 flex-1 flex flex-col justify-between space-y-2.5">
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-1 text-xs font-extrabold text-indigo-950">
                            <School className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                            <span className="truncate">{album.schoolName}</span>
                          </div>

                          <h4 className="text-xs sm:text-sm font-bold text-slate-900 line-clamp-2 leading-snug">
                            {album.activityName}
                          </h4>
                        </div>

                        <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500 font-semibold gap-1">
                          <span className="flex items-center gap-1 truncate">
                            <Calendar className="w-3 h-3 text-slate-400 shrink-0" />
                            <span className="truncate">{album.dateString}</span>
                          </span>

                          <span className="flex items-center gap-1 text-slate-700 font-extrabold shrink-0 bg-slate-100 px-1.5 py-0.5 rounded">
                            <User className="w-3 h-3 text-indigo-600 shrink-0" />
                            <span className="truncate max-w-[90px]">{album.reportedBy}</span>
                          </span>
                        </div>
                      </div>

                    </div>
                  );
                })}
              </div>

              {/* Bottom Batch Pagination Bar */}
              {totalPages > 1 && (
                <div className="p-4 bg-white rounded-2xl border border-slate-200 flex flex-wrap items-center justify-between gap-3 shadow-2xs">
                  <span className="text-xs font-bold text-slate-600">
                    แสดงชุดอัลบั้มที่ <span className="font-extrabold text-indigo-950">{((currentPage - 1) * pageSize) + 1}</span> ถึง <span className="font-extrabold text-indigo-950">{Math.min(currentPage * pageSize, filteredAlbums.length)}</span> จากทั้งหมด <span className="font-black text-indigo-900">{filteredAlbums.length}</span> รายการ
                  </span>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={currentPage === 1}
                      onClick={() => {
                        setCurrentPage((p) => Math.max(1, p - 1));
                        const container = document.querySelector('.overflow-y-auto');
                        if (container) container.scrollTo({ top: 0, behavior: 'smooth' });
                        const mainEl = document.querySelector('main');
                        if (mainEl) mainEl.scrollTo({ top: 0, behavior: 'smooth' });
                        if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                      className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 disabled:opacity-40 text-slate-800 font-extrabold text-xs rounded-lg transition flex items-center gap-1 cursor-pointer"
                    >
                      <ChevronLeft className="w-4 h-4" />
                      <span>ชุดก่อนหน้า</span>
                    </button>

                    <div className="flex items-center gap-1 px-2">
                      {Array.from({ length: Math.min(5, totalPages) }, (_, idx) => {
                        let pageNum = currentPage;
                        if (totalPages <= 5) {
                          pageNum = idx + 1;
                        } else if (currentPage <= 3) {
                          pageNum = idx + 1;
                        } else if (currentPage >= totalPages - 2) {
                          pageNum = totalPages - 4 + idx;
                        } else {
                          pageNum = currentPage - 2 + idx;
                        }

                        return (
                          <button
                            key={pageNum}
                            type="button"
                            onClick={() => {
                              setCurrentPage(pageNum);
                              const container = document.querySelector('.overflow-y-auto');
                              if (container) container.scrollTo({ top: 0, behavior: 'smooth' });
                              const mainEl = document.querySelector('main');
                              if (mainEl) mainEl.scrollTo({ top: 0, behavior: 'smooth' });
                              if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' });
                            }}
                            className={`w-8 h-8 rounded-lg text-xs font-black transition ${
                              currentPage === pageNum
                                ? "bg-indigo-900 text-amber-300 shadow-xs"
                                : "bg-slate-100 hover:bg-slate-200 text-slate-700"
                            }`}
                          >
                            {pageNum}
                          </button>
                        );
                      })}
                    </div>

                    <button
                      type="button"
                      disabled={currentPage === totalPages}
                      onClick={() => {
                        setCurrentPage((p) => Math.min(totalPages, p + 1));
                        const container = document.querySelector('.overflow-y-auto');
                        if (container) container.scrollTo({ top: 0, behavior: 'smooth' });
                        const mainEl = document.querySelector('main');
                        if (mainEl) mainEl.scrollTo({ top: 0, behavior: 'smooth' });
                        if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                      className="px-3.5 py-1.5 bg-indigo-900 hover:bg-indigo-800 disabled:opacity-40 text-white font-extrabold text-xs rounded-lg transition flex items-center gap-1 cursor-pointer shadow-xs"
                    >
                      <span>ชุดถัดไป</span>
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="p-12 text-center text-slate-400 my-10 bg-white rounded-2xl border border-slate-200/80 shadow-2xs">
              <ImageIcon className="w-12 h-12 mx-auto mb-3 text-slate-300" />
              <p className="font-extrabold text-slate-700 text-sm">ไม่พบอัลบั้มภาพกิจกรรมตามตัวกรองที่เลือก</p>
              <p className="text-xs text-slate-500 mt-1">ลองค้นหาตามชื่อวิชา/กิจกรรม ระดับชั้น หรือเปลี่ยนสังกัด กก.ตชด.</p>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="bg-slate-100 p-3.5 sm:p-4 border-t border-slate-200 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-600">
            <Sparkles className="w-4 h-4 text-amber-500 shrink-0" />
            <span className="hidden sm:inline">พร้อมใช้งานสำหรับนำเสนอผู้บังคับบัญชา ตชด. และคณะผู้ตรวจเยี่ยมงาน กพด.</span>
            <span className="sm:hidden text-[11px]">คลังอัลบั้มภาพกิจกรรม รร.ตชด.</span>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-xl text-xs cursor-pointer transition"
          >
            ปิดคลังภาพ
          </button>
        </div>

      </div>

      {/* 🔍 In-Album Detail Viewer Modal & Interactive Carousel Slider */}
      {selectedAlbum && createPortal(
        <div className="fixed inset-0 z-[999999] bg-slate-950/92 backdrop-blur-md flex items-center justify-center p-1 sm:p-3 md:p-5 overflow-hidden select-none">
          <div className="bg-slate-900 text-white w-full max-w-5xl md:max-w-6xl rounded-2xl shadow-2xl border border-slate-800 overflow-hidden my-auto flex flex-col h-[96dvh] sm:h-[94dvh] md:h-[92dvh] max-h-[98dvh] animate-in fade-in zoom-in-95 duration-200">
            
            {/* Modal Header */}
            <div className="p-3.5 sm:p-4 bg-slate-950/90 border-b border-slate-800 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2 flex-wrap min-w-0 pr-2">
                <span className="px-2.5 py-1 rounded-lg text-xs font-black bg-indigo-600 text-white shadow-xs shrink-0">
                  {selectedAlbum.schoolName}
                </span>

                <span className="text-xs text-amber-300 font-extrabold flex items-center gap-1 shrink-0">
                  <GraduationCap className="w-3.5 h-3.5 text-amber-400" />
                  <span>ระดับชั้น {selectedAlbum.gradeLevel}</span>
                </span>

                <span className="text-xs text-slate-400 font-medium hidden sm:inline shrink-0">
                  ({selectedAlbum.schoolGroupName} จ.{selectedAlbum.province})
                </span>

                <span className="text-[11px] font-black bg-slate-800 text-amber-300 px-2.5 py-0.5 rounded-md border border-slate-700 shadow-xs shrink-0">
                  ภาพที่ {activePhotoIndex + 1} จาก {selectedAlbum.photos.length}
                </span>
              </div>

              <button
                type="button"
                onClick={() => setSelectedAlbum(null)}
                className="p-1.5 text-slate-400 hover:text-white rounded-xl transition cursor-pointer bg-slate-800/60 hover:bg-slate-800"
                title="ปิดอัลบั้ม (ESC)"
              >
                <X className="w-5 h-5 sm:w-6 sm:h-6" />
              </button>
            </div>

            {/* 🎠 Interactive Carousel Slider Main Display */}
            <div className="p-2 sm:p-4 bg-black flex justify-center items-center h-[42vh] sm:h-[50vh] min-h-[280px] overflow-hidden relative group shrink-0">
              {/* Left Arrow Nav Button */}
              {selectedAlbum.photos.length > 1 && (
                <button
                  type="button"
                  onClick={handlePrevPhoto}
                  className="absolute left-3 top-1/2 -translate-y-1/2 p-3 bg-slate-900/85 hover:bg-amber-500 hover:text-slate-950 text-white rounded-full transition shadow-2xl border border-slate-700 z-10 cursor-pointer active:scale-95"
                  title="ภาพก่อนหน้า (ลูกศรซ้าย ←)"
                >
                  <ChevronLeft className="w-6 h-6 sm:w-7 sm:h-7" />
                </button>
              )}

              {/* Main Photo Image */}
              <img
                src={selectedAlbum.photos[activePhotoIndex].url}
                alt={`${selectedAlbum.activityName} - ภาพที่ ${activePhotoIndex + 1}`}
                referrerPolicy="no-referrer"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  const fb = selectedAlbum.photos[activePhotoIndex].fallbackUrl;
                  if (target.src !== fb) {
                    target.src = fb;
                  }
                }}
                className="max-h-full w-auto max-w-full object-contain rounded-xl shadow-2xl transition duration-300"
              />

              {/* Right Arrow Nav Button */}
              {selectedAlbum.photos.length > 1 && (
                <button
                  type="button"
                  onClick={handleNextPhoto}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-3 bg-slate-900/85 hover:bg-amber-500 hover:text-slate-950 text-white rounded-full transition shadow-2xl border border-slate-700 z-10 cursor-pointer active:scale-95"
                  title="ภาพถัดไป (ลูกศรขวา →)"
                >
                  <ChevronRight className="w-6 h-6 sm:w-7 sm:h-7" />
                </button>
              )}

              {/* Counter Overlay Badge */}
              <div className="absolute bottom-3 right-3 bg-slate-950/80 backdrop-blur-md text-white font-extrabold text-[11px] px-3 py-1 rounded-full border border-slate-700 shadow-md">
                {activePhotoIndex + 1} / {selectedAlbum.photos.length}
              </div>
            </div>

            {/* 🎞️ Thumbnail Strip Bar */}
            {selectedAlbum.photos.length > 1 && (
              <div className="bg-slate-950 p-2 border-t border-b border-slate-800 shrink-0 overflow-x-auto flex items-center gap-2 scrollbar-thin">
                {selectedAlbum.photos.map((pt, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setActivePhotoIndex(idx)}
                    className={`relative w-14 h-12 sm:w-16 sm:h-14 rounded-lg overflow-hidden shrink-0 border-2 transition cursor-pointer ${
                      activePhotoIndex === idx
                        ? "border-amber-400 ring-2 ring-amber-400/50 opacity-100 scale-105"
                        : "border-slate-800 opacity-60 hover:opacity-100"
                    }`}
                  >
                    <img
                      src={pt.url}
                      alt={`Thumbnail ${idx + 1}`}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.src = pt.fallbackUrl;
                      }}
                    />
                  </button>
                ))}
              </div>
            )}

            {/* In-Album Report Detailed Metadata Section */}
            <div className="p-4 sm:p-5 bg-slate-900 space-y-3 overflow-y-auto flex-1 border-t border-slate-800">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                <div className="space-y-1 min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-amber-400 flex items-center gap-1">
                      <BookOpen className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      <span>วิชา / ชื่อกิจกรรม:</span>
                    </span>
                    <span className="text-xs font-extrabold text-slate-300">
                      {selectedAlbum.report.projectName || "แผนงานพัฒนาเด็กและเยาวชน (กพด.)"}
                    </span>
                  </div>
                  <h3 className="text-sm sm:text-base font-extrabold text-white leading-snug">
                    {selectedAlbum.activityName}
                  </h3>
                </div>

                {onSelectReport && (
                  <button
                    type="button"
                    onClick={() => {
                      onSelectReport(selectedAlbum.report.id);
                      setSelectedAlbum(null);
                      onClose();
                    }}
                    className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-xs rounded-xl cursor-pointer transition shrink-0 flex items-center justify-center gap-1.5 shadow-md self-start"
                  >
                    <FileText className="w-4 h-4 text-amber-300" />
                    <span>เปิดพิมพ์เอกสาร A4</span>
                  </button>
                )}
              </div>

              {/* Grid Metadata Items */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 bg-slate-950/70 p-3 rounded-xl border border-slate-800 text-xs font-semibold">
                <div>
                  <span className="text-slate-400 text-[10px] block font-bold">วันที่รายงานกิจกรรม:</span>
                  <span className="text-amber-300 font-bold">{selectedAlbum.dateString}</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] block font-bold">ครูผู้บันทึกรายงาน:</span>
                  <span className="text-slate-200 font-bold">{selectedAlbum.reportedBy}</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] block font-bold">ระดับชั้นที่จัดกิจกรรม:</span>
                  <span className="text-slate-200 font-bold">{selectedAlbum.gradeLevel}</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] block font-bold">จำนวนผู้เข้าร่วม:</span>
                  <span className="text-slate-200 font-bold">{selectedAlbum.report.participantsCount || 50} คน</span>
                </div>
              </div>

              {/* Quantitative Outcome & Objectives */}
              {selectedAlbum.report.quantitativeOutcome && (
                <div className="text-xs text-slate-300 leading-relaxed bg-slate-800/60 p-3 rounded-xl border border-slate-700/60">
                  <span className="font-bold text-amber-300 block mb-1">รายละเอียดผลลัพธ์การจัดกิจกรรม:</span>
                  <p>{selectedAlbum.report.quantitativeOutcome}</p>
                </div>
              )}
            </div>

          </div>
        </div>,
        document.body
      )}

      {/* Fullscreen VIP Presentation Mode */}
      {isPresentationMode && currentSlide && createPortal(
        <div className="fixed inset-0 z-[100000] bg-black text-white flex flex-col justify-between p-4 sm:p-6 select-none">
          
          {/* Top Control Header */}
          <div className="flex items-center justify-between border-b border-slate-800 pb-3.5 z-10">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-400 text-slate-950 rounded-lg font-black text-xs">
                ตชด. VIP PRESENTATION
              </div>
              <h2 className="text-sm md:text-base font-extrabold text-slate-200 hidden sm:block">
                นำเสนอสรุปผลกิจกรรมการดำเนินงานตามแผน กพด.
              </h2>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsAutoPlaying(!isAutoPlaying)}
                className={`px-3 py-1.5 rounded-lg text-xs font-extrabold flex items-center gap-1.5 transition ${
                  isAutoPlaying ? "bg-amber-400 text-slate-950" : "bg-slate-800 text-slate-300"
                }`}
              >
                {isAutoPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                <span>{isAutoPlaying ? "พักสไลด์โชว์" : "เล่นสไลด์อัตโนมัติ"}</span>
              </button>

              <button
                type="button"
                onClick={() => setIsPresentationMode(false)}
                className="p-2 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Center Image Slide Container */}
          <div className="flex-1 relative my-4 flex items-center justify-center overflow-hidden">
            <img
              src={currentSlide.coverUrl}
              alt={currentSlide.activityName}
              referrerPolicy="no-referrer"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                const fb = currentSlide.coverFallbackUrl || getGoalFallbackImage(currentSlide.goalId);
                if (target.src !== fb) {
                  target.src = fb;
                }
              }}
              className="max-h-[70vh] w-auto max-w-full object-contain rounded-2xl shadow-2xl border border-slate-800"
            />

            {/* Left Nav Button */}
            <button
              type="button"
              onClick={() => setCurrentSlideIndex((prev) => (prev - 1 + filteredAlbums.length) % filteredAlbums.length)}
              className="absolute left-2 p-3 bg-slate-900/80 hover:bg-amber-500 hover:text-slate-950 text-white rounded-full transition shadow-lg"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>

            {/* Right Nav Button */}
            <button
              type="button"
              onClick={() => setCurrentSlideIndex((prev) => (prev + 1) % filteredAlbums.length)}
              className="absolute right-2 p-3 bg-slate-900/80 hover:bg-amber-500 hover:text-slate-950 text-white rounded-full transition shadow-lg"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          </div>

          {/* Bottom Presentation Info Card */}
          <div className="bg-slate-900/90 backdrop-blur-md p-4 rounded-2xl border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-xs">
                <span className="px-2 py-0.5 rounded bg-indigo-600 font-extrabold text-white">
                  {currentSlide.schoolName}
                </span>
                <span className="text-amber-400 font-bold">
                  ระดับชั้น {currentSlide.gradeLevel} ({currentSlide.schoolGroupName})
                </span>
              </div>
              <h3 className="text-base font-extrabold text-white">
                {currentSlide.activityName}
              </h3>
            </div>

            <div className="flex items-center gap-4 text-xs font-bold text-slate-400 shrink-0">
              <span>{currentSlideIndex + 1} / {filteredAlbums.length}</span>
              <span>{currentSlide.dateString}</span>
            </div>
          </div>

        </div>,
        document.body
      )}
    </>
  );

  if (isEmbedded) {
    return <div className="w-full select-text">{galleryMainContent}</div>;
  }

  return (
    <div className="fixed inset-0 z-[9990] bg-slate-950/85 backdrop-blur-xs flex items-center justify-center p-2 md:p-4 overflow-y-auto no-print">
      {galleryMainContent}
    </div>
  );
}
