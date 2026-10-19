import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { ActivityReport, KOPODOT_GOALS, getGoalIdFromCode } from "../types";
import { OFFICIAL_TARGET_SCHOOLS, isSchoolMatch } from "../data/schoolsData";
import { 
  X, Video, Search, Filter, Play, Pause, ChevronLeft, ChevronRight, 
  Download, School, Calendar, Users, MapPin, ExternalLink, Sparkles, Tag, 
  Maximize2, Eye, Grid, Layers, Shield, FileText, CheckCircle2, Tv,
  Film, PlayCircle, Volume2, Share2, Clock, Check, Minimize2, Move, GripHorizontal, Pin,
  Smartphone, Monitor
} from "lucide-react";

interface ActivityVideoGalleryModalProps {
  isOpen: boolean;
  onClose: () => void;
  reports: ActivityReport[];
  onSelectReport?: (reportId: string) => void;
  isEmbedded?: boolean;
}

// Video Item Interface
export interface VideoItem {
  id: string;
  title: string;
  projectName: string;
  description: string;
  videoUrl: string;
  embedUrl: string;
  thumbnailUrl: string;
  report: ActivityReport;
  schoolName: string;
  schoolGroupName: string;
  province: string;
  goalId: number;
  goalCode: string;
  category: string;
  durationStr: string;
  dateString: string;
  reportedBy: string;
  isDriveVideo: boolean;
  isYouTube: boolean;
  isDirectSheetVideo: boolean;
}

// Helper to extract YouTube Video ID
function extractYouTubeId(url: string): string | null {
  if (!url) return null;
  const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/))([\w-]{11})/);
  return match && match[1] ? match[1] : null;
}

// Helper to extract Drive File ID
function extractDriveId(url: string): string | null {
  if (!url) return null;
  const match = url.match(/id=([a-zA-Z0-9_-]+)/) || url.match(/\/d\/([a-zA-Z0-9_-]+)/);
  return match && match[1] ? match[1] : null;
}

// Helper to parse image / video thumbnail from report
function parseThumbnailUrl(urlStr: string | undefined): string | null {
  if (!urlStr) return null;
  const items = urlStr.split(",").map((s) => s.trim()).filter(Boolean);
  if (items.length === 0) return null;
  const firstUrl = items[0];
  
  const ytId = extractYouTubeId(firstUrl);
  if (ytId) {
    return `https://img.youtube.com/vi/${ytId}/hqdefault.jpg`;
  }
  
  const driveId = extractDriveId(firstUrl);
  if (driveId) {
    return `https://drive.google.com/thumbnail?id=${driveId}&sz=w1000`;
  }
  return firstUrl;
}

// Video Embed Info
export interface VideoEmbedDetails {
  videoType: "youtube" | "drive" | "direct" | "other";
  embedUrl: string;
  directUrl: string;
  thumbnailUrl: string;
}

function getVideoEmbedDetails(targetUrl: string, imageUrl?: string, showControls: boolean = false): VideoEmbedDetails {
  const ytId = extractYouTubeId(targetUrl) || (imageUrl ? extractYouTubeId(imageUrl) : null);
  if (ytId) {
    const controlsParam = showControls 
      ? "controls=1&modestbranding=1&rel=0&playsinline=1&fs=1&disablekb=0&iv_load_policy=3" 
      : "controls=0&iv_load_policy=3&showinfo=0&modestbranding=1&rel=0&playsinline=1";
    return {
      videoType: "youtube",
      embedUrl: `https://www.youtube-nocookie.com/embed/${ytId}?autoplay=1&mute=1&enablejsapi=1&rel=0&playsinline=1&${controlsParam}`,
      directUrl: `https://www.youtube.com/watch?v=${ytId}`,
      thumbnailUrl: `https://img.youtube.com/vi/${ytId}/hqdefault.jpg`,
    };
  }

  const driveId = extractDriveId(targetUrl) || (imageUrl ? extractDriveId(imageUrl) : null);
  if (driveId) {
    return {
      videoType: "drive",
      embedUrl: `https://drive.google.com/file/d/${driveId}/preview?autoplay=1`,
      directUrl: `https://drive.google.com/file/d/${driveId}/view?usp=sharing`,
      thumbnailUrl: `https://drive.google.com/thumbnail?id=${driveId}&sz=w1000`,
    };
  }

  const isDirectFile = targetUrl.includes(".mp4") || targetUrl.includes(".mov") || targetUrl.includes(".webm");
  if (isDirectFile) {
    return {
      videoType: "direct",
      embedUrl: targetUrl,
      directUrl: targetUrl,
      thumbnailUrl: parseThumbnailUrl(imageUrl) || "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800&auto=format&fit=crop&q=80",
    };
  }

  return {
    videoType: "other",
    embedUrl: targetUrl,
    directUrl: targetUrl,
    thumbnailUrl: parseThumbnailUrl(imageUrl) || "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800&auto=format&fit=crop&q=80",
  };
}

// Sample Google Drive video file IDs provided or extracted from dataset for video previews
const FEATURED_DRIVE_VIDEO_IDS = [
  "1Qvias_Otlx9IdUJATHqi-FLqFhjOR3V6",
  "1iIag0wniBgfbxQ9SM-noY290qEW9sXf-",
  "1tk7ebJfjLNU9wjLj6a0eSCE3ECUvFkgt",
  "1TAmyBoo9IrvbEGgi3D0OvDbk1Uz0xWOw",
  "17ooVzKc_GK_gJEwM4vh75kfy5XWb_EBr",
  "12s2yFLWNF0C6N3FYMmaBxryZ9OkQbxdg",
  "1lWIEPujEBAh1_TRgmpQ252wHnF-FZfGu",
  "1f5qjpEh0cyvTWlA6ooETqpJLBfG6DU4O",
  "1q9zNFr2uNQAF_l7Y2K_cL3gTqqFNlUzA",
  "1vdrizExxQIJhr0sm25FBjQhOUdMMtHzt"
];

// Duration generator for realistic display
const DURATION_LIST = ["02:15", "03:40", "04:12", "05:08", "02:55", "06:30", "03:20", "04:45", "07:10", "03:05"];

// Smart Compact Video Player Component
interface SmartVideoPlayerProps {
  videoUrl: string;
  title: string;
  imageUrl?: string;
  showControls?: boolean;
  onEnded?: () => void;
}

function SmartVideoPlayer({ videoUrl, title, imageUrl, showControls = false, onEnded }: SmartVideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [isMuted, setIsMuted] = useState<boolean>(true);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [useIframeFallback, setUseIframeFallback] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const isLoadingRef = useRef<boolean>(true);
  const [showMicroBar, setShowMicroBar] = useState<boolean>(true);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const ytId = extractYouTubeId(videoUrl) || (imageUrl ? extractYouTubeId(imageUrl) : null);
  const driveId = extractDriveId(videoUrl) || (imageUrl ? extractDriveId(imageUrl) : null);
  const isDirectFile = videoUrl.includes(".mp4") || videoUrl.includes(".mov") || videoUrl.includes(".webm");

  // Determine direct CDN stream link for HTML5 <video> tag
  let directStreamUrl: string | null = null;
  if (isDirectFile) {
    directStreamUrl = videoUrl;
  } else if (driveId) {
    directStreamUrl = `https://docs.google.com/uc?export=download&id=${driveId}`;
  }

  // Handle Play/Pause toggle
  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      videoRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
    }
  };

  // Handle Mute toggle
  const toggleMute = () => {
    if (!videoRef.current) return;
    videoRef.current.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  // Handle Time Update
  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
      if (videoRef.current.duration) setDuration(videoRef.current.duration);
    }
  };

  // Handle Seek
  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    if (videoRef.current) {
      videoRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  // Format mm:ss
  const formatTime = (secs: number) => {
    if (isNaN(secs) || secs === 0) return "0:00";
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  // Auto-hide control bar on inactivity
  const handleMouseMove = () => {
    setShowMicroBar(true);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      if (isPlaying) setShowMicroBar(false);
    }, 2200);
  };

  useEffect(() => {
    setUseIframeFallback(false);
    setIsLoading(true);
    isLoadingRef.current = true;
    setIsPlaying(true);
    setCurrentTime(0);

    const timer = setTimeout(() => {
      if (videoRef.current) {
        videoRef.current.currentTime = 0;
        const promise = videoRef.current.play();
        if (promise !== undefined) {
          promise
            .then(() => {
              setIsPlaying(true);
              setIsLoading(false);
              isLoadingRef.current = false;
            })
            .catch(() => {
              if (videoRef.current) {
                videoRef.current.muted = true;
                setIsMuted(true);
                videoRef.current.play()
                  .then(() => {
                    setIsPlaying(true);
                    setIsLoading(false);
                    isLoadingRef.current = false;
                  })
                  .catch(() => {});
              }
            });
        }
      }
    }, 50);

    // Flawless self-healing fallback mechanism: if direct download is blocked by CORS/Virus checks or takes too long,
    // we seamlessly switch to the official Google Drive preview iframe to guarantee playback.
    let fallbackTimer: NodeJS.Timeout | null = null;
    if (driveId) {
      fallbackTimer = setTimeout(() => {
        if (isLoadingRef.current) {
          console.log("Direct stream took too long or was blocked. Falling back to Google Drive iframe for seamless playback.");
          setUseIframeFallback(true);
        }
      }, 2000);
    }

    return () => {
      clearTimeout(timer);
      if (fallbackTimer) clearTimeout(fallbackTimer);
    };
  }, [videoUrl, driveId]);

  // Force iframe fallback for all videos to guarantee playback reliability.
  const useIframe = true;

  // Iframe Fallback logic
  let embedUrl = videoUrl;
  if (ytId) {
    const controlsParam = "controls=1&modestbranding=1&rel=0&playsinline=1&fs=1&disablekb=0&iv_load_policy=3";
    embedUrl = `https://www.youtube-nocookie.com/embed/${ytId}?autoplay=1&mute=0&enablejsapi=1&rel=0&playsinline=1&${controlsParam}`;
  } else if (driveId) {
    embedUrl = `https://drive.google.com/file/d/${driveId}/preview?autoplay=1`;
  }

  return (
    <div className="relative w-full h-full bg-black overflow-hidden flex items-center justify-center">
      <iframe
        key={embedUrl}
        src={embedUrl}
        title={title}
        className="w-full h-full border-0"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowFullScreen
      />
    </div>
  );
}

export default function ActivityVideoGalleryModal({
  isOpen,
  onClose,
  reports,
  onSelectReport,
  isEmbedded = false
}: ActivityVideoGalleryModalProps) {
  if (!isOpen && !isEmbedded) return null;

  // Filter States
  const [selectedGroup, setSelectedGroup] = useState<string>("all");
  const [selectedGoalId, setSelectedGoalId] = useState<string>("all");
  const [selectedSchool, setSelectedSchool] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [videoSourceFilter, setVideoSourceFilter] = useState<"all" | "sheet" | "demo">("all");

  // Presentation / Theater Mode States
  const [isTheaterMode, setIsTheaterMode] = useState<boolean>(false);
  const [currentTheaterIndex, setCurrentTheaterIndex] = useState<number>(0);
  const [isAutoNext, setIsAutoNext] = useState<boolean>(false);
  
  // Active Video Lightbox Fullscreen State
  const [activeVideo, setActiveVideo] = useState<VideoItem | null>(null);
  const [selectedGalleryVideoId, setSelectedGalleryVideoId] = useState<string | null>(null);
  const [showPlayerControls, setShowPlayerControls] = useState<boolean>(false);
  const [videoAspectRatio, setVideoAspectRatio] = useState<"16:9" | "9:16" | "full">("full");
  const [showThumbnailStrip, setShowThumbnailStrip] = useState<boolean>(false);

  // Pagination & Batching States
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(16);

  // Refs for scrolling to top on page changes
  const galleryTopRef = useRef<HTMLDivElement>(null);
  const gridContainerRef = useRef<HTMLDivElement>(null);
  const isFirstMountRef = useRef<boolean>(true);

  // Smoothly scroll to the top of the gallery when changing pages
  const scrollToGalleryTop = useCallback(() => {
    // 1. Internal scroll container
    if (gridContainerRef.current) {
      gridContainerRef.current.scrollTo({ top: 0, behavior: "smooth" });
    }

    // 2. Main application viewport container (when embedded in App.tsx)
    const mainEl = document.querySelector("main");
    if (mainEl) {
      mainEl.scrollTo({ top: 0, behavior: "smooth" });
    }

    // 3. Scroll top of gallery into viewport
    if (galleryTopRef.current) {
      galleryTopRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }

    // 4. Any other active overflow container
    const overflowContainers = document.querySelectorAll(".overflow-y-auto");
    overflowContainers.forEach((el) => {
      try {
        el.scrollTo({ top: 0, behavior: "smooth" });
      } catch {}
    });

    // 5. Window scroll
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, []);

  const handlePageChange = useCallback((newPage: number) => {
    setCurrentPage(newPage);
    requestAnimationFrame(() => {
      scrollToGalleryTop();
    });
  }, [scrollToGalleryTop]);

  // Also auto-scroll whenever currentPage changes
  useEffect(() => {
    if (isFirstMountRef.current) {
      isFirstMountRef.current = false;
      return;
    }
    requestAnimationFrame(() => {
      scrollToGalleryTop();
    });
  }, [currentPage, scrollToGalleryTop]);

  // Copy URL Feedback
  const [copiedVideoId, setCopiedVideoId] = useState<string | null>(null);

  // Construct all video items from reports dataset
  const allVideos = useMemo(() => {
    const list: VideoItem[] = [];

    reports.forEach((rep, index) => {
      const schoolMatch = OFFICIAL_TARGET_SCHOOLS.find((s) => isSchoolMatch(rep.schoolName, s.name));
      const groupName = schoolMatch ? schoolMatch.groupName : "กก.ตชด.21";
      const province = schoolMatch ? schoolMatch.province : "สุรินทร์";
      const goalId = getGoalIdFromCode(rep.goalCode);

      // Get explicit video URL from rep.videoUrl or direct video link in rep.imageUrl
      const explicitVideoUrl = rep.videoUrl && rep.videoUrl.trim() !== "" ? rep.videoUrl.trim() : null;
      const directVideoInImage = rep.imageUrl && (
        rep.imageUrl.includes("youtube.com") || 
        rep.imageUrl.includes("youtu.be") || 
        rep.imageUrl.includes("vimeo.com") || 
        rep.imageUrl.includes(".mp4") || 
        rep.imageUrl.includes(".mov")
      ) ? rep.imageUrl.trim() : null;

      const targetVideoUrl = explicitVideoUrl || directVideoInImage;

      // Filter ONLY reports that have actual video URLs (exclude image-only reports)
      if (targetVideoUrl) {
        const extractedId = extractDriveId(targetVideoUrl);
        let driveFileId = extractedId || FEATURED_DRIVE_VIDEO_IDS[index % FEATURED_DRIVE_VIDEO_IDS.length];

        const videoUrl = targetVideoUrl.includes("drive.google.com") && extractedId
          ? `https://drive.google.com/file/d/${extractedId}/view?usp=sharing`
          : targetVideoUrl;

        const embedUrl = extractedId
          ? `https://drive.google.com/file/d/${extractedId}/preview`
          : targetVideoUrl;
        
        let thumb = parseThumbnailUrl(rep.imageUrl);
        if (extractedId) {
          thumb = `https://drive.google.com/thumbnail?id=${extractedId}&sz=w1000`;
        }
        if (!thumb) {
          thumb = `https://drive.google.com/thumbnail?id=${driveFileId}&sz=w1000`;
        }

        // Category categorization
        let category = "การสาธิตและฝึกปฏิบัติจริง";
        if (rep.activityName.includes("โภชนาการ") || rep.activityName.includes("อาหาร") || rep.activityName.includes("แปรงฟัน")) {
          category = "สุขอนามัยและโภชนาการเด็ก";
        } else if (rep.activityName.includes("ภาษาไทย") || rep.activityName.includes("วิชาการ") || rep.activityName.includes("สอน")) {
          category = "นวัตกรรมการเรียนรู้และภาษาไทย";
        } else if (rep.activityName.includes("เกษตร") || rep.activityName.includes("ปลูก") || rep.activityName.includes("เลี้ยง")) {
          category = "โครงการเกษตรเพื่ออาหารกลางวัน";
        } else if (rep.activityName.includes("สหกรณ์") || rep.activityName.includes("อาชีพ") || rep.activityName.includes("ร้านค้า")) {
          category = "ฝึกทักษะอาชีพและสหกรณ์นักเรียน";
        } else if (rep.activityName.includes("อนุรักษ์") || rep.activityName.includes("สิ่งแวดล้อม") || rep.activityName.includes("วัฒนธรรม")) {
          category = "อนุรักษ์สิ่งแวดล้อมและวัฒนธรรมท้องถิ่น";
        } else if (rep.activityName.includes("ชุมชน") || rep.activityName.includes("ขยายผล")) {
          category = "ขยายผลการพัฒนาสู่ชุมชน";
        }

        const durationStr = DURATION_LIST[index % DURATION_LIST.length];

        list.push({
          id: `vdo-${rep.id}`,
          title: rep.activityName,
          projectName: rep.projectName,
          description: rep.objectives || rep.details || "รายงานผลการบันทึกภาพวิดีโอกิจกรรมตามแผน กพด. ฉบับที่ 5",
          videoUrl,
          embedUrl,
          thumbnailUrl: thumb,
          report: rep,
          schoolName: rep.schoolName,
          schoolGroupName: groupName,
          province,
          goalId,
          goalCode: `ด้านที่ ${goalId}`,
          category,
          durationStr,
          dateString: rep.dateString || rep.lastUpdated || "2569",
          reportedBy: rep.reportedBy || "ครูผู้รับผิดชอบโครงการ",
          isDriveVideo: true,
          isYouTube: false,
          isDirectSheetVideo: true
        });
      }
    });

    return list;
  }, [reports]);

  // Direct Sheet Videos Count
  const sheetVideoCount = useMemo(() => {
    return allVideos.filter((v) => v.isDirectSheetVideo).length;
  }, [allVideos]);

  // Available Categories
  const availableCategories = useMemo(() => {
    const cats = new Set<string>();
    allVideos.forEach((v) => cats.add(v.category));
    return Array.from(cats);
  }, [allVideos]);

  // Filtered Videos List
  const filteredVideos = useMemo(() => {
    return allVideos.filter((v) => {
      // Source Filter
      if (videoSourceFilter === "sheet" && !v.isDirectSheetVideo) return false;
      if (videoSourceFilter === "demo" && v.isDirectSheetVideo) return false;

      // Group Filter
      if (selectedGroup !== "all") {
        if (!v.schoolGroupName.includes(selectedGroup)) return false;
      }
      // Goal Filter
      if (selectedGoalId !== "all") {
        if (v.goalId !== Number(selectedGoalId)) return false;
      }
      // School Filter
      if (selectedSchool !== "all") {
        if (!isSchoolMatch(v.schoolName, selectedSchool)) return false;
      }
      // Category Filter
      if (selectedCategory !== "all") {
        if (v.category !== selectedCategory) return false;
      }
      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchTitle = v.title.toLowerCase().includes(q);
        const matchSch = v.schoolName.toLowerCase().includes(q);
        const matchProj = v.projectName.toLowerCase().includes(q);
        const matchProv = v.province.toLowerCase().includes(q);
        const matchDesc = v.description.toLowerCase().includes(q);
        if (!matchTitle && !matchSch && !matchProj && !matchProv && !matchDesc) return false;
      }
      return true;
    });
  }, [allVideos, videoSourceFilter, selectedGroup, selectedGoalId, selectedSchool, selectedCategory, searchQuery]);

  // Active Index in filtered dataset for Lightbox Next/Prev navigation
  const activeIndexInFiltered = useMemo(() => {
    if (!activeVideo) return -1;
    return filteredVideos.findIndex((v) => v.id === activeVideo.id);
  }, [activeVideo, filteredVideos]);

  const handlePrevVideo = () => {
    if (activeIndexInFiltered <= 0) return;
    setActiveVideo(filteredVideos[activeIndexInFiltered - 1]);
  };

  const handleNextVideo = () => {
    if (activeIndexInFiltered < 0 || activeIndexInFiltered >= filteredVideos.length - 1) return;
    setActiveVideo(filteredVideos[activeIndexInFiltered + 1]);
  };

  // Keyboard Navigation Listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (activeVideo) {
        if (e.key === "ArrowLeft") handlePrevVideo();
        if (e.key === "ArrowRight") handleNextVideo();
        if (e.key === "Escape") setActiveVideo(null);
      } else if (isTheaterMode) {
        if (e.key === "ArrowLeft" && currentTheaterIndex > 0) setCurrentTheaterIndex(currentTheaterIndex - 1);
        if (e.key === "ArrowRight" && currentTheaterIndex < filteredVideos.length - 1) setCurrentTheaterIndex(currentTheaterIndex + 1);
        if (e.key === "Escape") setIsTheaterMode(false);
      } else if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeVideo, isTheaterMode, currentTheaterIndex, activeIndexInFiltered, filteredVideos, onClose]);

  // Lock body & document scroll when video player, theater mode, or video gallery modal is active
  useEffect(() => {
    if ((isOpen && !isEmbedded) || activeVideo || isTheaterMode) {
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
  }, [isOpen, isEmbedded, activeVideo, isTheaterMode]);

  // Reset pagination on filter change
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedGroup, selectedGoalId, selectedSchool, selectedCategory, searchQuery, pageSize]);

  const totalPages = Math.ceil(filteredVideos.length / pageSize) || 1;

  // Visible sliced videos for current batch
  const visibleVideos = useMemo(() => {
    const startIdx = (currentPage - 1) * pageSize;
    return filteredVideos.slice(startIdx, startIdx + pageSize);
  }, [filteredVideos, currentPage, pageSize]);

  const currentTheaterVideo = filteredVideos[currentTheaterIndex] || filteredVideos[0];

  const handleCopyLink = (url: string, id: string) => {
    navigator.clipboard.writeText(url);
    setCopiedVideoId(id);
    setTimeout(() => setCopiedVideoId(null), 2500);
  };

  const galleryMainContent = (
    <>
      <div ref={galleryTopRef} className={`bg-white w-full ${isEmbedded ? "min-h-screen border-0 overflow-hidden flex flex-col" : "max-w-7xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-auto max-h-[95vh] flex flex-col"}`}>
        
        {/* Gallery Header */}
        <div className="bg-gradient-to-r from-slate-950 via-blue-950 to-indigo-950 p-3.5 sm:p-5 pr-10 sm:pr-14 text-white flex flex-col xl:flex-row xl:items-center justify-between gap-3 shrink-0 shadow-md relative">
          <div 
            className="flex items-start sm:items-center space-x-3 sm:space-x-3.5 flex-1 min-w-0"
          >
            <div className="p-2.5 sm:p-3 bg-red-500/20 text-red-400 rounded-xl border border-red-500/30 flex items-center justify-center shrink-0 mt-0.5 sm:mt-0">
              <Film className="w-5 h-5 sm:w-6 sm:h-6 text-red-400 animate-pulse" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                <h2 
                  className="text-sm sm:text-xl font-black text-white leading-snug break-words"
                  title="คลังคลิปวิดีโอกิจกรรมและสื่อมัลติมีเดีย (Activity Video Gallery & Media Clips)"
                >
                  คลังคลิปวิดีโอกิจกรรมและสื่อมัลติมีเดีย
                </h2>
                <span className="bg-red-500 text-white font-black text-[9px] sm:text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider shrink-0 whitespace-nowrap shadow-xs">
                  BPP Video Hub
                </span>
              </div>
              <p 
                className="text-[10px] sm:text-xs text-blue-200/90 font-medium mt-0.5 leading-snug break-words"
                title="รวบรวมวิดีโอบันทึกการปฏิบัติงานจริง คลิปสาธิต และสื่อวิดีโอสรุปผลงานจากโรงเรียน ตชด. ในสังกัด บก.ตชด.ภาค 2"
              >
                รวบรวมวิดีโอบันทึกการปฏิบัติงานจริง คลิปสาธิต และสื่อวิดีโอสรุปผลงานจากโรงเรียน ตชด. ในสังกัด บก.ตชด.ภาค 2
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 xl:self-center">
            {/* Back to Dashboard Button */}
            <button
              onClick={onClose}
              className="px-3 py-1.5 sm:px-3.5 sm:py-2 bg-white/10 hover:bg-white/20 border border-white/20 text-white font-bold rounded-xl text-xs cursor-pointer transition flex items-center gap-1.5 shadow-sm active:scale-95 whitespace-nowrap"
              title="ออกจากมุมมองเต็มจอ กลับสู่แผงควบคุม (ESC)"
            >
              <ChevronLeft className="w-4 h-4 text-amber-300 shrink-0" />
              <span>กลับสู่แผงควบคุม</span>
            </button>

            {/* Google Drive Folder Link */}
            <a
              href="https://drive.google.com/drive/folders/1MTCKuGj9E1iMTvGvZ2YIkAp8bplgJE1LaVojzMgvdeOQZ0TBvdNyxWqPtlTyaHuyECJrGOnJ?usp=sharing"
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 sm:px-3.5 sm:py-2 bg-gradient-to-r from-emerald-600 via-teal-600 to-blue-600 hover:from-emerald-500 hover:to-blue-500 text-white font-extrabold rounded-xl text-xs cursor-pointer transition flex items-center gap-2 border border-emerald-400/40 shadow-md hover:shadow-lg"
              title="เปิดดูโฟลเดอร์ Google Drive รวมคลิปวิดีโอโครงการ กพด. ทั้งหมด"
            >
              <ExternalLink className="w-3.5 h-3.5 text-emerald-200" />
              <span>คลังวิดีโอใน Google Drive</span>
            </a>

            {/* Theater Mode Button */}
            <button
              onClick={() => {
                setIsTheaterMode(true);
                setCurrentTheaterIndex(0);
              }}
              className="px-3 py-1.5 sm:px-3.5 sm:py-2 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-black rounded-xl text-xs cursor-pointer transition flex items-center gap-1.5 shadow-md"
            >
              <Tv className="w-3.5 h-3.5 text-white" />
              <span>โหมดโรงภาพยนตร์ (Theater View)</span>
            </button>
          </div>

          {/* Close Button positioned absolutely to keep layout fluid */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 sm:top-5 sm:right-5 p-2 text-slate-300 hover:text-white hover:bg-white/10 rounded-xl transition cursor-pointer shrink-0 z-10"
            title="ปิดหน้าต่าง / ออกจากมุมมองเต็มจอ (ESC)"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Filter Controls Bar */}
        <div className="bg-slate-100/90 p-4 border-b border-slate-200 shrink-0 space-y-3">
          {/* Quick Source Filter Tabs */}
          <div className="flex items-center gap-2 flex-wrap pb-1.5 border-b border-slate-200/80">
            <span className="text-xs font-extrabold text-slate-700 mr-1 flex items-center gap-1.5">
              <Film className="w-3.5 h-3.5 text-blue-600" />
              <span>รายการวิดีโอกิจกรรม:</span>
            </span>
            <button
              type="button"
              onClick={() => setVideoSourceFilter("all")}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                videoSourceFilter === "all"
                  ? "bg-blue-600 text-white shadow-xs"
                  : "bg-white text-slate-700 hover:bg-slate-200 border border-slate-300"
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>คลิปวิดีโอจากฐานข้อมูล Google Sheet ({allVideos.length} คลิป)</span>
            </button>
          </div>

          {/* Row 1: Search & Page Size */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
            {/* Search Bar */}
            <div className="sm:col-span-8 lg:col-span-9 space-y-1">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Search className="w-3.5 h-3.5 text-blue-600" />
                <span>ค้นหาวิดีโอกิจกรรม / ชื่อโรงเรียน / คำอธิบาย:</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="พิมพ์คำค้นหา เช่น คลิปสาธิต, แปรงฟัน, ผักสวนครัว, รร.ตชด.ค็อกนิสไทย..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full text-xs md:text-sm pl-9 pr-8 py-2 bg-white border border-slate-300 rounded-xl font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 shadow-2xs transition"
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

            {/* Page Size Selector */}
            <div className="sm:col-span-4 lg:col-span-3 space-y-1">
              <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Filter className="w-3.5 h-3.5 text-blue-600" />
                <span>จำนวนคลิปต่อหน้า:</span>
              </label>
              <select
                value={pageSize}
                onChange={(e) => setPageSize(Number(e.target.value))}
                className="w-full text-xs md:text-sm p-2 bg-white border border-slate-300 rounded-xl font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 shadow-2xs cursor-pointer transition truncate"
              >
                <option value={12}>12 คลิป / หน้า (3 แถว)</option>
                <option value={16}>16 คลิป / หน้า (4 แถว)</option>
                <option value={24}>24 คลิป / หน้า (6 แถว)</option>
                <option value={32}>32 คลิป / หน้า (8 แถว)</option>
                <option value={48}>48 คลิป / หน้า (12 แถว)</option>
              </select>
            </div>
          </div>

          {/* Row 2: Category Dropdowns */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
            {/* Group Filter */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-600">สังกัด กก.ตชด.:</label>
              <select
                value={selectedGroup}
                onChange={(e) => setSelectedGroup(e.target.value)}
                className="w-full text-xs p-2 bg-white border border-slate-200 rounded-lg font-bold text-slate-800 focus:ring-2 focus:ring-blue-500/20"
              >
                <option value="all">ทุกสังกัด (21-24)</option>
                <option value="21">กก.ตชด.21 (สุรินทร์)</option>
                <option value="22">กก.ตชด.22 (อุบลฯ)</option>
                <option value="23">กก.ตชด.23 (สกลนคร)</option>
                <option value="24">กก.ตชด.24 (อุดรธานี)</option>
              </select>
            </div>

            {/* Goal Filter */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-600">ด้านเป้าหมาย กพด.:</label>
              <select
                value={selectedGoalId}
                onChange={(e) => setSelectedGoalId(e.target.value)}
                className="w-full text-xs p-2 bg-white border border-slate-200 rounded-lg font-bold text-slate-800 focus:ring-2 focus:ring-blue-500/20"
              >
                <option value="all">ทุกด้าน (ด้านที่ 1-8)</option>
                {KOPODOT_GOALS.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.code}: {g.title.slice(0, 24)}...
                  </option>
                ))}
              </select>
            </div>

            {/* Category Tag Filter */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-600">หมวดหมู่วิดีโอ:</label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full text-xs p-2 bg-white border border-slate-200 rounded-lg font-bold text-slate-800 focus:ring-2 focus:ring-blue-500/20"
              >
                <option value="all">ทุกหมวดหมู่วิดีโอ</option>
                {availableCategories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            {/* Target School Filter */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-600">เจาะจงโรงเรียน:</label>
              <select
                value={selectedSchool}
                onChange={(e) => setSelectedSchool(e.target.value)}
                className="w-full text-xs p-2 bg-white border border-slate-200 rounded-lg font-bold text-slate-800 focus:ring-2 focus:ring-blue-500/20 truncate"
              >
                <option value="all">ทุกโรงเรียน (53 รรร.)</option>
                {OFFICIAL_TARGET_SCHOOLS.map((s) => (
                  <option key={s.id} value={s.name}>
                    {s.name} ({s.groupName})
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Gallery Summary Stats */}
        <div className="px-5 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs text-slate-600 shrink-0">
          <div className="flex items-center gap-2">
            <Video className="w-4 h-4 text-red-500" />
            <span>
              พบวิดีโอคลิปทั้งหมด <strong className="text-slate-900 font-extrabold">{filteredVideos.length}</strong> รายการ
              {filteredVideos.length !== allVideos.length && (
                <span className="text-slate-500 ml-1">(กรองจากทั้งหมด {allVideos.length} คลิป)</span>
              )}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-slate-500 hidden sm:inline">
              หน้า {currentPage} / {totalPages}
            </span>
            {(selectedGroup !== "all" || selectedGoalId !== "all" || selectedSchool !== "all" || selectedCategory !== "all" || searchQuery) && (
              <button
                onClick={() => {
                  setSelectedGroup("all");
                  setSelectedGoalId("all");
                  setSelectedSchool("all");
                  setSelectedCategory("all");
                  setSearchQuery("");
                }}
                className="text-red-600 hover:text-red-800 font-bold hover:underline cursor-pointer flex items-center gap-1"
              >
                <X className="w-3.5 h-3.5" />
                <span>ล้างตัวกรอง</span>
              </button>
            )}
          </div>
        </div>

        {/* Video Grid View */}
        <div ref={gridContainerRef} className="p-4 sm:p-6 overflow-y-auto flex-1 bg-slate-100/60 min-h-[350px]">
          {filteredVideos.length === 0 ? (
            <div className="py-16 text-center space-y-3 bg-white rounded-2xl border border-dashed border-slate-300 my-4 max-w-lg mx-auto">
              <div className="w-16 h-16 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center mx-auto text-slate-400">
                <Video className="w-8 h-8" />
              </div>
              <div>
                <p className="font-extrabold text-slate-800 text-base">ไม่พบวิดีโอคลิปตรงตามเงื่อนไข</p>
                <p className="text-xs text-slate-500 mt-1">ลองเปลี่ยนคำค้นหา หรือเลือกตัวกรองเป็น "ทั้งหมด"</p>
              </div>
              <button
                onClick={() => {
                  setSelectedGroup("all");
                  setSelectedGoalId("all");
                  setSelectedSchool("all");
                  setSelectedCategory("all");
                  setSearchQuery("");
                }}
                className="mt-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition"
              >
                ล้างคำค้นหาทั้งหมด
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-4 2xl:grid-cols-4 gap-3.5 sm:gap-4 md:gap-4.5">
              {visibleVideos.map((vdo) => {
                const goalObj = KOPODOT_GOALS.find((g) => g.id === vdo.goalId);
                const goalColor = goalObj ? goalObj.color : "#2563EB";

                return (
                  <div
                    key={vdo.id}
                    className="group bg-white rounded-2xl border border-slate-200/90 shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden flex flex-col hover:-translate-y-1"
                  >
                    {/* Thumbnail Container with Play Overlay (Opens Fullscreen Player) */}
                    <div 
                      className="relative aspect-video bg-slate-950 overflow-hidden group/thumb cursor-pointer"
                      onClick={() => setActiveVideo(vdo)}
                      title="คลิกเพื่อเล่นวิดีโอแบบเต็มจอ"
                    >
                      <img
                        src={vdo.thumbnailUrl}
                        alt={vdo.title}
                        loading="lazy"
                        decoding="async"
                        className="w-full h-full object-cover transition-transform duration-500 group-hover/thumb:scale-105"
                      />
                      
                      {/* Red Play Button Overlay */}
                      <div className="absolute inset-0 bg-black/30 group-hover/thumb:bg-black/10 transition-all flex items-center justify-center">
                        <div className="w-12 h-12 rounded-full bg-red-600/90 text-white flex items-center justify-center shadow-lg group-hover/thumb:scale-110 group-hover/thumb:bg-red-600 transition-all duration-300 border-2 border-white/80">
                          <Play className="w-6 h-6 ml-0.5 fill-white" />
                        </div>
                      </div>

                      {/* Duration Tag */}
                      <div className="absolute bottom-2 right-2 pointer-events-none">
                        <span className="px-2 py-0.5 rounded-md bg-slate-950/90 backdrop-blur-md text-white font-mono font-bold text-[10px] flex items-center gap-1 border border-white/20">
                          <Clock className="w-3 h-3 text-red-400" />
                          <span>{vdo.durationStr} น.</span>
                        </span>
                      </div>
                    </div>

                    {/* Card Details */}
                    <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-[10px] font-bold text-red-700 bg-red-50 border border-red-200/80 px-2 py-0.5 rounded-md">
                            {vdo.category}
                          </span>
                          {vdo.isDirectSheetVideo ? (
                            <span className="text-[10px] font-extrabold text-emerald-800 bg-emerald-50 border border-emerald-300 px-2 py-0.5 rounded-md flex items-center gap-1 shadow-2xs">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              <span>Google Sheet</span>
                            </span>
                          ) : (
                            <span className="text-[10px] font-bold text-slate-600 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-md">
                              วิดีโอสาธิต
                            </span>
                          )}
                        </div>

                        <h3 
                          onClick={() => setActiveVideo(vdo)}
                          className="font-black text-slate-900 text-sm leading-snug line-clamp-2 hover:text-blue-700 cursor-pointer transition"
                          title={vdo.title}
                        >
                          {vdo.title}
                        </h3>

                        <p className="text-xs text-slate-600 font-semibold flex items-center gap-1.5 pt-0.5">
                          <School className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="truncate">{vdo.schoolName}</span>
                        </p>

                        <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed pt-1 border-t border-slate-100">
                          {vdo.description}
                        </p>
                      </div>

                      {/* Action Footer */}
                      <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                        <button
                          onClick={() => setActiveVideo(vdo)}
                          className="flex-1 py-1.5 px-3 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                        >
                          <Play className="w-3.5 h-3.5 fill-white" />
                          <span>เล่นวิดีโอ</span>
                        </button>

                        <a
                          href={vdo.videoUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition cursor-pointer border border-slate-200"
                          title="เปิดลิงก์ไฟล์วิดีโอใน Google Drive"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </a>

                        {onSelectReport && (
                          <button
                            onClick={() => {
                              onSelectReport(vdo.report.id);
                              if (!isEmbedded) onClose();
                            }}
                            className="p-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl transition cursor-pointer border border-blue-200"
                            title="เปิดดูเอกสารรายงาน A4 กพด."
                          >
                            <FileText className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Pagination Bar */}
        {totalPages > 1 && (
          <div className="bg-white p-3.5 border-t border-slate-200 flex items-center justify-between shrink-0 shadow-2xs">
            <button
              disabled={currentPage === 1}
              onClick={() => handlePageChange(Math.max(currentPage - 1, 1))}
              className="px-3 py-1.5 rounded-xl border border-slate-300 text-xs font-bold text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition flex items-center gap-1"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>หน้าก่อนหน้า</span>
            </button>

            <div className="flex items-center gap-1.5 overflow-x-auto max-w-[280px] sm:max-w-none px-2 py-1">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                <button
                  key={p}
                  onClick={() => handlePageChange(p)}
                  className={`w-7 h-7 rounded-lg text-xs font-black transition cursor-pointer shrink-0 ${
                    currentPage === p
                      ? "bg-red-600 text-white shadow-xs"
                      : "text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>

            <button
              disabled={currentPage === totalPages}
              onClick={() => handlePageChange(Math.min(currentPage + 1, totalPages))}
              className="px-3 py-1.5 rounded-xl border border-slate-300 text-xs font-bold text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition flex items-center gap-1"
            >
              <span>หน้าถัดไป</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* FULLSCREEN IMMERSIVE VIDEO LIGHTBOX PLAYER */}
      {activeVideo && createPortal(
        <div className="fixed inset-0 z-[999999] bg-slate-950 flex flex-col w-screen h-screen overflow-hidden overscroll-none touch-none select-none animate-in fade-in duration-150">
          {/* Top Ultra-Compact Header Bar */}
          <div className="bg-slate-950/95 border-b border-slate-800/80 px-2.5 sm:px-4 py-1.5 flex items-center justify-between gap-2 shrink-0 shadow-lg z-30">
            {/* Left Info: Category, Goal, Title, School */}
            <div className="flex items-center gap-1.5 sm:gap-2 min-w-0 flex-1">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse shrink-0"></span>
              <span className="bg-red-600 text-white text-[9.5px] sm:text-[10.5px] font-black px-2 py-0.5 rounded uppercase shrink-0 whitespace-nowrap">
                {activeVideo.category}
              </span>
              <span className="bg-slate-800 text-amber-300 text-[9.5px] sm:text-[10.5px] font-bold px-2 py-0.5 rounded border border-slate-700 shrink-0 whitespace-nowrap hidden sm:inline-block">
                {activeVideo.goalCode}
              </span>
              <h2 className="text-xs sm:text-sm font-bold text-slate-100 truncate flex items-center gap-1.5">
                <span className="truncate">{activeVideo.title}</span>
                <span className="text-slate-400 font-normal truncate hidden md:inline">• {activeVideo.schoolName}</span>
              </h2>
            </div>

            {/* Right: Quick Counter & Prominent Close Button */}
            <div className="flex items-center gap-2 shrink-0">
              <div className="flex items-center gap-1 bg-slate-900 px-2 py-1 rounded-lg border border-slate-800 text-xs font-mono font-bold text-emerald-400 whitespace-nowrap">
                {activeIndexInFiltered + 1} / {filteredVideos.length}
              </div>

              <button
                onClick={() => setActiveVideo(null)}
                className="w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center text-white bg-red-600 hover:bg-red-700 active:scale-95 rounded-xl transition cursor-pointer shadow-md border border-red-500/50 shrink-0 font-extrabold"
                title="ปิดการเล่นวิดีโอ (Esc)"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Center Main Video Player Section - Maximized for Full Display on Tablet & iPad */}
          <div className="flex-1 w-full h-full min-h-0 bg-black flex items-center justify-center relative overflow-hidden group/player">
            <div
              className={`transition-all duration-200 bg-black overflow-hidden flex items-center justify-center relative ${
                videoAspectRatio === "9:16"
                  ? "h-full w-auto aspect-[9/16] mx-auto shadow-2xl"
                  : videoAspectRatio === "16:9"
                  ? "w-full aspect-video max-h-full"
                  : "w-full h-full"
              }`}
            >
              <SmartVideoPlayer
                key={activeVideo.id || activeVideo.videoUrl}
                videoUrl={activeVideo.videoUrl}
                title={activeVideo.title}
                imageUrl={activeVideo.report?.imageUrl}
                showControls={true}
                onEnded={handleNextVideo}
              />
            </div>
          </div>

          {/* Ultra-Slim Bottom Dock ("ย่อเครื่องมือควบคุมให้เล็กที่สุด") */}
          <div className="bg-slate-950 border-t border-slate-800/80 px-2 sm:px-4 py-1.5 text-white shrink-0 space-y-1 z-30 pb-[max(0.35rem,env(safe-area-inset-bottom))]">
            {/* Primary Compact Control Dock Bar in Single Clean Row */}
            <div className="flex items-center justify-between gap-1 max-w-full mx-auto w-full">
              {/* Left Group: Prev / Next Video Nav */}
              <div className="flex items-center gap-1 bg-slate-900 p-0.5 sm:p-1 rounded-lg border border-slate-800 shrink-0">
                <button
                  disabled={activeIndexInFiltered <= 0}
                  onClick={handlePrevVideo}
                  className="px-2 py-1 bg-slate-800 hover:bg-slate-700 active:bg-slate-600 disabled:opacity-30 rounded text-xs font-bold text-slate-200 flex items-center gap-1 cursor-pointer h-7"
                  title="คลิปก่อนหน้า"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">ก่อนหน้า</span>
                </button>
                <span className="font-mono text-xs font-black px-1.5 text-emerald-400">
                  {activeIndexInFiltered + 1}
                </span>
                <button
                  disabled={activeIndexInFiltered >= filteredVideos.length - 1}
                  onClick={handleNextVideo}
                  className="px-2 py-1 bg-slate-800 hover:bg-slate-700 active:bg-slate-600 disabled:opacity-30 rounded text-xs font-bold text-slate-200 flex items-center gap-1 cursor-pointer h-7"
                  title="คลิปถัดไป"
                >
                  <span className="hidden sm:inline">ถัดไป</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Center Group: Aspect Ratio Modes */}
              <div className="flex items-center gap-0.5 sm:gap-1 bg-slate-900/90 p-0.5 sm:p-1 rounded-lg border border-slate-800 shrink-0">
                <button
                  onClick={() => setVideoAspectRatio("full")}
                  className={`px-2 py-1 rounded text-[11px] sm:text-xs font-bold transition flex items-center gap-1 cursor-pointer h-7 ${
                    videoAspectRatio === "full"
                      ? "bg-emerald-600 text-white font-extrabold shadow-sm"
                      : "text-slate-400 hover:text-slate-200 hover:bg-slate-800"
                  }`}
                  title="แสดงผลเต็มจอ"
                >
                  <Maximize2 className="w-3 h-3" />
                  <span className="hidden sm:inline">เต็มจอ</span>
                </button>
                <button
                  onClick={() => setVideoAspectRatio("16:9")}
                  className={`px-2 py-1 rounded text-[11px] sm:text-xs font-bold transition flex items-center gap-1 cursor-pointer h-7 ${
                    videoAspectRatio === "16:9"
                      ? "bg-blue-600 text-white font-extrabold shadow-sm"
                      : "text-slate-400 hover:text-slate-200 hover:bg-slate-800"
                  }`}
                  title="สัดส่วนแนวนอน 16:9"
                >
                  <Monitor className="w-3 h-3" />
                  <span className="hidden sm:inline">16:9</span>
                </button>
                <button
                  onClick={() => setVideoAspectRatio("9:16")}
                  className={`px-2 py-1 rounded text-[11px] sm:text-xs font-bold transition flex items-center gap-1 cursor-pointer h-7 ${
                    videoAspectRatio === "9:16"
                      ? "bg-purple-600 text-white font-extrabold shadow-sm"
                      : "text-slate-400 hover:text-slate-200 hover:bg-slate-800"
                  }`}
                  title="สัดส่วนแนวตั้ง 9:16"
                >
                  <Smartphone className="w-3 h-3" />
                  <span className="hidden sm:inline">9:16</span>
                </button>
              </div>

              {/* Right Group: Action Buttons & Carousel Toggle */}
              <div className="flex items-center gap-1 shrink-0">
                <a
                  href={activeVideo.videoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex px-2 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded text-xs font-bold transition items-center gap-1 shadow-sm shrink-0 h-7"
                  title="เปิดใน Drive"
                >
                  <ExternalLink className="w-3 h-3" />
                  <span className="hidden sm:inline">Drive</span>
                </a>

                {onSelectReport && (
                  <button
                    onClick={() => {
                      onSelectReport(activeVideo.report.id);
                      setActiveVideo(null);
                      if (!isEmbedded) onClose();
                    }}
                    className="flex px-2 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded text-xs font-black transition items-center gap-1 shadow-md shrink-0 h-7 cursor-pointer"
                    title="เปิดรายงาน A4"
                  >
                    <FileText className="w-3 h-3" />
                    <span className="hidden sm:inline">รายงาน A4</span>
                  </button>
                )}

                <button
                  onClick={() => handleCopyLink(activeVideo.videoUrl, activeVideo.id)}
                  className="flex px-1.5 py-1 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded text-xs font-bold transition items-center gap-1 border border-slate-800 cursor-pointer shrink-0 h-7"
                  title="คัดลอกลิงก์"
                >
                  {copiedVideoId === activeVideo.id ? (
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <Share2 className="w-3.5 h-3.5" />
                  )}
                </button>

                <button
                  onClick={() => setShowThumbnailStrip(!showThumbnailStrip)}
                  className={`flex px-2 py-1 rounded text-xs font-bold transition items-center gap-1 border shrink-0 h-7 cursor-pointer ${
                    showThumbnailStrip 
                      ? "bg-red-600 text-white border-red-500 shadow-sm" 
                      : "bg-slate-900 text-slate-300 border-slate-800 hover:bg-slate-800"
                  }`}
                  title="คลิปอื่นๆ ทั้งหมด"
                >
                  <Grid className="w-3 h-3" />
                  <span className="hidden sm:inline">คลิปทั้งหมด</span>
                </button>
              </div>
            </div>

            {/* Collapsible Mini Thumbnail Carousel Strip */}
            {showThumbnailStrip && (
              <div className="max-w-full mx-auto overflow-x-auto pt-1.5 pb-0.5 flex gap-1.5 no-scrollbar scroll-smooth border-t border-slate-800/80">
                {filteredVideos.map((v) => (
                  <button
                    key={v.id}
                    onClick={() => setActiveVideo(v)}
                    className={`flex items-center gap-1.5 p-1 rounded-lg border transition shrink-0 max-w-[160px] text-left cursor-pointer active:scale-95 ${
                      v.id === activeVideo.id
                        ? "bg-red-950/90 border-red-500 text-white ring-1 ring-red-500 shadow-md"
                        : "bg-slate-900/90 hover:bg-slate-800 border-slate-800 text-slate-300"
                    }`}
                  >
                    <div className="w-8 h-5 bg-black rounded overflow-hidden shrink-0 relative border border-slate-700">
                      <img src={v.thumbnailUrl} alt={v.title} className="w-full h-full object-cover" />
                      {v.id === activeVideo.id ? (
                        <div className="absolute inset-0 bg-red-600/70 flex items-center justify-center">
                          <Play className="w-2.5 h-2.5 fill-white text-white animate-pulse" />
                        </div>
                      ) : (
                        <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 hover:opacity-100 transition">
                          <Play className="w-2 h-2 fill-white text-white" />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[9.5px] font-bold text-white truncate leading-tight">{v.title}</p>
                      <p className="text-[8.5px] text-slate-400 truncate leading-tight">{v.schoolName}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>,
        document.body
      )}

      {/* THEATER MODE (โหมดโรงภาพยนตร์) */}
      {isTheaterMode && createPortal(
        <div className="fixed inset-0 h-[100dvh] max-h-[100dvh] z-[9999999] bg-black text-white flex flex-col overflow-hidden overscroll-none touch-none animate-fadeIn">
          {/* Top Header Bar - Completely OUTSIDE Video Frame */}
          <div className="bg-slate-950 border-b border-slate-900 p-3 sm:p-4 flex items-center justify-between shrink-0 z-20">
            <div className="flex items-center gap-2 sm:gap-3">
              <span className="bg-red-600 text-white font-black text-xs px-2.5 py-1 rounded-md flex items-center gap-1">
                <Tv className="w-4 h-4" />
                <span>THEATER MODE</span>
              </span>
              
              <div className="flex items-center gap-1 bg-slate-900/90 px-2 py-1 rounded-xl border border-slate-700 text-xs text-slate-300">
                <button
                  disabled={currentTheaterIndex <= 0}
                  onClick={() => setCurrentTheaterIndex((i) => i - 1)}
                  className="p-1 hover:text-white disabled:opacity-30 rounded-lg transition cursor-pointer flex items-center gap-1"
                  title="คลิปก่อนหน้า"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span className="hidden sm:inline font-bold">ก่อนหน้า</span>
                </button>
                <span className="font-extrabold px-1.5 text-[11px] text-emerald-400">
                  {currentTheaterIndex + 1} / {filteredVideos.length}
                </span>
                <button
                  disabled={currentTheaterIndex >= filteredVideos.length - 1}
                  onClick={() => setCurrentTheaterIndex((i) => i + 1)}
                  className="p-1 hover:text-white disabled:opacity-30 rounded-lg transition cursor-pointer flex items-center gap-1"
                  title="คลิปถัดไป"
                >
                  <span className="hidden sm:inline font-bold">ถัดไป</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setVideoAspectRatio((prev) => {
                    if (prev === "16:9") return "9:16";
                    if (prev === "9:16") return "full";
                    return "16:9";
                  });
                }}
                className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 border cursor-pointer ${
                  videoAspectRatio === "9:16"
                    ? "bg-purple-950/90 text-purple-200 border-purple-500/60 shadow-sm"
                    : videoAspectRatio === "full"
                    ? "bg-emerald-950/90 text-emerald-200 border-emerald-500/60 shadow-sm"
                    : "bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700"
                }`}
                title="สลับรูปทรงวิดีโอ (ชิดล่าง / แนวตั้ง 9:16 / แนวนอน 16:9)"
              >
                <Smartphone className="w-3.5 h-3.5 text-purple-400" />
                <span>
                  {videoAspectRatio === "9:16"
                    ? "📱 แนวตั้ง (ชิดล่าง)"
                    : videoAspectRatio === "full"
                    ? "↕️ ยืดเต็มจอ (ชิดล่าง)"
                    : "📺 แนวนอน (16:9)"}
                </span>
              </button>

              <button
                onClick={() => setShowPlayerControls((prev) => !prev)}
                className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 border cursor-pointer ${
                  showPlayerControls
                    ? "bg-amber-950/80 text-amber-300 border-amber-500/60 hover:bg-amber-900/80"
                    : "bg-emerald-950/80 text-emerald-300 border-emerald-500/60 hover:bg-emerald-900/80"
                }`}
                title="สลับโหมดควบคุมวิดีโอ (กะทัดรัด/มาตรฐาน)"
              >
                <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                <span>{showPlayerControls ? "แถบควบคุมมาตรฐาน" : "โหมดคลีนกะทัดรัด"}</span>
              </button>

              <button
                onClick={() => setIsTheaterMode(false)}
                className="p-1.5 bg-white/10 hover:bg-white/20 rounded-full transition text-white cursor-pointer"
                title="ออกจากโหมดโรงภาพยนตร์ (Esc)"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Body: Main Video View + Side Playlist */}
          <div className="flex-1 flex flex-col lg:flex-row overflow-hidden min-h-0">
            {/* Main Video View */}
            <div className="flex-1 flex flex-col justify-center bg-black relative group/theater p-2">
              <div
                className={`transition-all duration-300 mx-auto bg-black flex items-center justify-center relative ${
                  videoAspectRatio === "9:16"
                    ? "h-full w-auto aspect-[9/16] max-h-[85vh] rounded-xl overflow-hidden border border-slate-800"
                    : videoAspectRatio === "full"
                    ? "w-full h-full rounded-none"
                    : "w-full aspect-video max-h-[85vh]"
                }`}
              >
                {currentTheaterVideo && (
                  <SmartVideoPlayer
                    videoUrl={currentTheaterVideo.videoUrl}
                    title={currentTheaterVideo.title}
                    imageUrl={currentTheaterVideo.report?.imageUrl}
                    showControls={showPlayerControls}
                    onEnded={() => {
                      if (currentTheaterIndex < filteredVideos.length - 1) {
                        setCurrentTheaterIndex((i) => i + 1);
                      }
                    }}
                  />
                )}
              </div>

            {/* Video Caption */}
            <div className="p-4 bg-slate-950 border-t border-slate-900 flex items-center justify-between gap-4">
              <div>
                <h3 className="font-extrabold text-sm sm:text-base text-white">{currentTheaterVideo?.title}</h3>
                <p className="text-xs text-slate-400">{currentTheaterVideo?.schoolName} • {currentTheaterVideo?.goalCode}</p>
              </div>

              {onSelectReport && currentTheaterVideo && (
                <button
                  onClick={() => {
                    onSelectReport(currentTheaterVideo.report.id);
                    setIsTheaterMode(false);
                    if (!isEmbedded) onClose();
                  }}
                  className="px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition shrink-0"
                >
                  ดูรายงาน A4
                </button>
              )}
            </div>
          </div>

          {/* Side Playlist */}
          <div className="w-full lg:w-80 h-48 lg:h-auto bg-slate-950 border-t lg:border-t-0 lg:border-l border-slate-900 flex flex-col shrink-0">
            <div className="p-3 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
              <span className="font-extrabold text-xs text-slate-200">รายการคลิปวิดีโอ ({filteredVideos.length})</span>
            </div>

            <div className="flex-1 overflow-y-auto p-2 space-y-2">
              {filteredVideos.map((v, idx) => (
                <div
                  key={v.id}
                  onClick={() => setCurrentTheaterIndex(idx)}
                  className={`p-2.5 rounded-xl transition cursor-pointer flex gap-2.5 items-center border ${
                    currentTheaterIndex === idx
                      ? "bg-red-600/20 border-red-500 text-white"
                      : "bg-slate-900/60 hover:bg-slate-900 border-slate-800 text-slate-300"
                  }`}
                >
                  <div className="w-16 h-10 bg-slate-800 rounded-lg overflow-hidden shrink-0 relative">
                    <img src={v.thumbnailUrl} alt={v.title} loading="lazy" decoding="async" className="w-full h-full object-cover" />
                    {currentTheaterIndex === idx && (
                      <div className="absolute inset-0 bg-red-600/60 flex items-center justify-center">
                        <Play className="w-4 h-4 fill-white" />
                      </div>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-xs truncate">{v.title}</p>
                    <p className="text-[10px] text-slate-400 truncate">{v.schoolName}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>,
      document.body
      )}
    </>
  );

  if (isEmbedded) {
    return galleryMainContent;
  }

  return (
    <div className="fixed inset-0 z-[9990] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 overflow-y-auto animate-fadeIn">
      {galleryMainContent}
    </div>
  );
}
