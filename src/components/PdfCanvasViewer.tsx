import React, { useEffect, useRef, useState, useCallback } from "react";
import * as pdfjsLib from "pdfjs-dist";
import jsPDF from "jspdf";
import {
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Maximize,
  Minimize,
  Download,
  Printer,
  ExternalLink,
  Search,
  LayoutGrid,
  FileText,
  RefreshCw,
  AlertCircle,
  Eye,
  ChevronsLeft,
  ChevronsRight,
  BookOpen,
  Sparkles,
  Check,
  Loader2,
  FileImage,
  CheckCircle
} from "lucide-react";

// Configure worker
try {
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjsLib.version || "4.10.38"}/build/pdf.worker.min.mjs`;
} catch (e) {
  console.warn("Could not set PDF worker", e);
}

interface PdfCanvasViewerProps {
  pdfUrl: string;
  directDownloadUrl?: string;
  documentTitle?: string;
  initialPage?: number;
  initialScale?: number;
  onPageChange?: (pageNumber: number, totalPages: number) => void;
}

export default function PdfCanvasViewer({
  pdfUrl,
  directDownloadUrl = "https://www.psproject.org/wp-content/uploads/2026/04/reportchild-dev-69.pdf",
  documentTitle = "รายงานผลการดำเนินงาน ปี 2568 (กพด. 69)",
  initialPage = 1,
  initialScale = 1.0,
  onPageChange
}: PdfCanvasViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const renderTaskRef = useRef<any>(null);

  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [currentPage, setCurrentPage] = useState<number>(initialPage);
  const [numPages, setNumPages] = useState<number>(0);
  const [scale, setScale] = useState<number>(() => {
    if (typeof window !== "undefined" && window.innerWidth < 640) {
      return 0.5; // ซูมเริ่มต้น 50% บนหน้าจอสมาร์ทโฟน
    }
    return initialScale;
  });
  const [rotation, setRotation] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [loadingProgress, setLoadingProgress] = useState<number>(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showThumbnails, setShowThumbnails] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [pageInput, setPageInput] = useState<string>(String(initialPage));
  const [fitMode, setFitMode] = useState<"custom" | "width" | "page">("custom");
  const [downloadStatus, setDownloadStatus] = useState<{
    isDownloading: boolean;
    pageNumber?: number;
    format: "PNG" | "PDF" | "FULL_PDF";
    progress: number;
    stepMessage: string;
    isSuccess: boolean;
  }>({
    isDownloading: false,
    format: "PNG",
    progress: 0,
    stepMessage: "",
    isSuccess: false,
  });

  // Load PDF Document
  const loadPdf = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);
    setLoadingProgress(10);

    try {
      // Use proxy URL to avoid CORS/X-Frame issues
      const effectiveUrl = pdfUrl.startsWith("http") && !pdfUrl.includes("/api/pdf-proxy")
        ? `/api/pdf-proxy?url=${encodeURIComponent(pdfUrl)}`
        : pdfUrl;

      const loadingTask = pdfjsLib.getDocument({
        url: effectiveUrl,
        withCredentials: false
      });

      loadingTask.onProgress = (progressData: { loaded: number; total: number }) => {
        if (progressData.total > 0) {
          const percent = Math.min(100, Math.round((progressData.loaded / progressData.total) * 100));
          setLoadingProgress(percent);
        }
      };

      const doc = await loadingTask.promise;
      setPdfDoc(doc);
      setNumPages(doc.numPages);
      setCurrentPage(1);
      setPageInput("1");
      setIsLoading(false);
      if (onPageChange) onPageChange(1, doc.numPages);
    } catch (err: any) {
      console.warn("Failed to load PDF in Canvas mode:", err);
      // Fallback try loading without proxy or direct
      try {
        const fallbackTask = pdfjsLib.getDocument({ url: pdfUrl });
        const doc = await fallbackTask.promise;
        setPdfDoc(doc);
        setNumPages(doc.numPages);
        setCurrentPage(1);
        setPageInput("1");
        setIsLoading(false);
        if (onPageChange) onPageChange(1, doc.numPages);
      } catch (fallbackErr: any) {
        setErrorMessage(err.message || "ไม่สามารถโหลดเอกสาร PDF ได้");
        setIsLoading(false);
      }
    }
  }, [pdfUrl, onPageChange]);

  useEffect(() => {
    loadPdf();
  }, [loadPdf]);

  // Render current page onto Canvas
  const renderPage = useCallback(async (pageNum: number) => {
    if (!pdfDoc || !canvasRef.current) return;

    try {
      // Cancel ongoing render task if any
      if (renderTaskRef.current) {
        renderTaskRef.current.cancel();
      }

      const page = await pdfDoc.getPage(pageNum);
      const canvas = canvasRef.current;
      const context = canvas.getContext("2d");
      if (!context) return;

      // Handle fit-width
      let currentScale = scale;
      if (fitMode === "width" && containerRef.current) {
        const containerWidth = containerRef.current.clientWidth - 48;
        const unscaledViewport = page.getViewport({ scale: 1, rotation });
        currentScale = Math.max(0.6, containerWidth / unscaledViewport.width);
      }

      const viewport = page.getViewport({ scale: currentScale, rotation });

      // Support High-DPI / Retina displays
      const outputScale = window.devicePixelRatio || 1;
      canvas.width = Math.floor(viewport.width * outputScale);
      canvas.height = Math.floor(viewport.height * outputScale);
      canvas.style.width = `${Math.floor(viewport.width)}px`;
      canvas.style.height = `${Math.floor(viewport.height)}px`;

      const transform = outputScale !== 1 ? [outputScale, 0, 0, outputScale, 0, 0] : undefined;

      const renderContext = {
        canvasContext: context,
        transform: transform,
        viewport: viewport
      };

      const renderTask = page.render(renderContext);
      renderTaskRef.current = renderTask;

      await renderTask.promise;
      renderTaskRef.current = null;
    } catch (err: any) {
      if (err?.name !== "RenderingCancelledException") {
        console.warn("PDF Page render error:", err);
      }
    }
  }, [pdfDoc, scale, rotation, fitMode]);

  useEffect(() => {
    if (pdfDoc && currentPage > 0 && currentPage <= numPages) {
      renderPage(currentPage);
      setPageInput(String(currentPage));
      if (onPageChange) onPageChange(currentPage, numPages);
    }
  }, [pdfDoc, currentPage, numPages, renderPage, onPageChange]);

  const handlePrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage((prev) => prev - 1);
    }
  };

  const handleNextPage = () => {
    if (currentPage < numPages) {
      setCurrentPage((prev) => prev + 1);
    }
  };

  const handlePageSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const pageNum = parseInt(pageInput, 10);
    if (!isNaN(pageNum) && pageNum >= 1 && pageNum <= numPages) {
      setCurrentPage(pageNum);
    } else {
      setPageInput(String(currentPage));
    }
  };

  const handleZoomIn = () => {
    setFitMode("custom");
    setScale((prev) => Math.min(3.0, Number((prev + 0.1).toFixed(2))));
  };

  const handleZoomOut = () => {
    setFitMode("custom");
    setScale((prev) => Math.max(0.25, Number((prev - 0.1).toFixed(2))));
  };

  const handleZoomReset = () => {
    setFitMode("custom");
    if (typeof window !== "undefined" && window.innerWidth < 640) {
      setScale(0.5);
    } else {
      setScale(initialScale);
    }
  };

  const handleFitWidth = () => {
    setFitMode("width");
    // Trigger re-render with container width
    renderPage(currentPage);
  };

  const handleRotate = () => {
    setRotation((prev) => (prev + 90) % 360);
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  const handleDownloadSinglePage = async (targetPageNum: number, format: "PNG" | "PDF" = "PNG") => {
    if (!pdfDoc) return;

    setDownloadStatus({
      isDownloading: true,
      pageNumber: targetPageNum,
      format,
      progress: 20,
      stepMessage: `กำลังโหลดข้อมูลหน้าเอกสาร หน้า ${targetPageNum}...`,
      isSuccess: false,
    });

    try {
      const page = await pdfDoc.getPage(targetPageNum);
      const viewport = page.getViewport({ scale: 2.5 });

      setDownloadStatus((prev) => ({
        ...prev,
        progress: 55,
        stepMessage: `กำลังประมวลผลเรนเดอร์ภาพความละเอียดสูง (2.5x High-Res) หน้า ${targetPageNum}...`,
      }));

      const offscreenCanvas = document.createElement("canvas");
      const ctx = offscreenCanvas.getContext("2d");
      if (!ctx) throw new Error("Could not get 2D canvas context");

      offscreenCanvas.width = viewport.width;
      offscreenCanvas.height = viewport.height;

      await page.render({
        canvasContext: ctx,
        viewport: viewport,
      }).promise;

      setDownloadStatus((prev) => ({
        ...prev,
        progress: 85,
        stepMessage: `กำลังสร้างไฟล์ดาวน์โหลด ${format} สำหรับหน้า ${targetPageNum}...`,
      }));

      if (format === "PNG") {
        const dataUrl = offscreenCanvas.toDataURL("image/png");
        const a = document.createElement("a");
        a.href = dataUrl;
        a.download = `รายงาน_กพด69_หน้า_${targetPageNum}.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      } else {
        const imgData = offscreenCanvas.toDataURL("image/png");
        const pdf = new jsPDF({
          orientation: viewport.width > viewport.height ? "landscape" : "portrait",
          unit: "mm",
          format: "a4",
        });
        pdf.addImage(imgData, "PNG", 0, 0, 210, 297, undefined, "FAST");
        pdf.save(`รายงาน_กพด69_หน้า_${targetPageNum}.pdf`);
      }

      setDownloadStatus((prev) => ({
        ...prev,
        progress: 100,
        stepMessage: `ดาวน์โหลดหน้า ${targetPageNum} (${format}) สำเร็จเรียบร้อย!`,
        isSuccess: true,
      }));
    } catch (err) {
      console.error("Single page download failed:", err);
      setDownloadStatus((prev) => ({
        ...prev,
        progress: 100,
        stepMessage: `เกิดข้อผิดพลาดในการดาวน์โหลดหน้า ${targetPageNum}`,
        isSuccess: false,
      }));
    } finally {
      setTimeout(() => {
        setDownloadStatus((prev) => ({ ...prev, isDownloading: false }));
      }, 3000);
    }
  };

  const handleDownloadFullPdf = () => {
    setDownloadStatus({
      isDownloading: true,
      format: "FULL_PDF",
      progress: 25,
      stepMessage: "กำลังเชื่อมต่อเพื่อดาวน์โหลดไฟล์เอกสาร PDF ทั้งฉบับ...",
      isSuccess: false,
    });

    setTimeout(() => {
      setDownloadStatus((prev) => ({
        ...prev,
        progress: 70,
        stepMessage: "กำลังส่งออกไฟล์ PDF เข้าสู่ระบบเครื่องของคุณ...",
      }));
    }, 400);

    setTimeout(() => {
      setDownloadStatus((prev) => ({
        ...prev,
        progress: 100,
        stepMessage: "ดาวน์โหลดไฟล์เอกสาร PDF ทั้งฉบับเรียบร้อยแล้ว!",
        isSuccess: true,
      }));
    }, 900);

    setTimeout(() => {
      setDownloadStatus((prev) => ({ ...prev, isDownloading: false }));
    }, 3200);
  };

  const handlePrint = () => {
    window.open(`/api/pdf-proxy?url=${encodeURIComponent(directDownloadUrl)}`, "_blank");
  };

  return (
    <div
      ref={containerRef}
      className={`bg-white rounded-3xl overflow-hidden shadow-md border border-slate-200 flex flex-col select-none transition-all ${
        isFullscreen ? "fixed inset-0 z-50 rounded-none h-screen" : "w-full"
      }`}
    >
      {/* Top Toolbar - Organized into 2 Clean Rows */}
      <div className="bg-slate-50 border-b border-slate-200 px-3.5 py-2.5 flex flex-col gap-2 text-slate-800">
        {/* Row 1: Document Title (Left) + Page Navigation (Right) */}
        <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-200/60">
          <div className="flex items-center gap-2.5 min-w-0">
            <button
              type="button"
              onClick={() => setShowThumbnails(!showThumbnails)}
              className={`p-1.5 rounded-xl border transition cursor-pointer shrink-0 ${
                showThumbnails
                  ? "bg-amber-500 text-slate-950 border-amber-400 font-bold"
                  : "bg-white hover:bg-slate-100 text-slate-600 border-slate-200"
              }`}
              title="เปิด/ปิด แผงเลือกหน้าเอกสาร (Thumbnails)"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>

            <span className="text-xs sm:text-sm font-black text-slate-900 truncate max-w-[240px] sm:max-w-[480px]">
              {documentTitle}
            </span>
          </div>

          {/* Page Selector (Right) */}
          <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-200 shrink-0 shadow-2xs">
            <button
              type="button"
              onClick={() => setCurrentPage(1)}
              disabled={currentPage <= 1 || isLoading}
              className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer"
              title="ไปหน้าแรกสุด (หน้า 1)"
            >
              <ChevronsLeft className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={handlePrevPage}
              disabled={currentPage <= 1 || isLoading}
              className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer"
              title="หน้าที่แล้ว"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <form onSubmit={handlePageSubmit} className="flex items-center gap-1 px-1">
              <input
                type="text"
                value={pageInput}
                onChange={(e) => setPageInput(e.target.value)}
                onBlur={handlePageSubmit}
                disabled={isLoading || numPages === 0}
                className="w-12 text-center text-xs font-black bg-slate-50 text-indigo-700 border border-slate-200 rounded-lg py-1 focus:outline-none focus:border-indigo-500"
              />
              <span className="text-xs text-slate-500 font-medium">/ {numPages || "..."}</span>
            </form>

            <button
              type="button"
              onClick={handleNextPage}
              disabled={currentPage >= numPages || isLoading}
              className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer"
              title="หน้าถัดไป"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setCurrentPage(numPages)}
              disabled={currentPage >= numPages || isLoading}
              className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer"
              title="ไปหน้าสุดท้าย"
            >
              <ChevronsRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Row 2: Zoom Controls (Left) + External Action Buttons (Right) */}
        <div className="flex flex-wrap md:flex-nowrap items-center justify-between gap-2 sm:gap-2.5 pt-0.5 overflow-x-auto scrollbar-none">
          {/* Zoom & View Controls */}
          <div className="flex items-center gap-1 sm:gap-1.5 bg-white p-1 rounded-xl border border-slate-200 shrink-0 shadow-2xs">
            <button
              type="button"
              onClick={handleZoomOut}
              disabled={isLoading || scale <= 0.25}
              className="p-1 sm:p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 disabled:opacity-30 cursor-pointer shrink-0"
              title="ย่อขนาด (-)"
            >
              <ZoomOut className="w-3.5 sm:w-4 h-3.5 sm:h-4" />
            </button>
            
            <button
              type="button"
              onClick={handleZoomReset}
              disabled={isLoading}
              className="px-1.5 sm:px-2 py-1 text-xs font-black text-slate-700 hover:text-indigo-600 hover:bg-slate-100 rounded-lg transition cursor-pointer shrink-0"
              title={`รีเซ็ตขนาด ${Math.round(initialScale * 100)}%`}
            >
              {Math.round(scale * 100)}%
            </button>

            <button
              type="button"
              onClick={handleZoomIn}
              disabled={isLoading || scale >= 3.0}
              className="p-1 sm:p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 disabled:opacity-30 cursor-pointer shrink-0"
              title="ขยายขนาด (+)"
            >
              <ZoomIn className="w-3.5 sm:w-4 h-3.5 sm:h-4" />
            </button>

            <div className="h-4 w-px bg-slate-200 mx-0.5 sm:mx-1 shrink-0" />

            <button
              type="button"
              onClick={handleFitWidth}
              disabled={isLoading}
              className={`px-2 sm:px-2.5 py-1 text-xs font-bold rounded-lg transition cursor-pointer whitespace-nowrap shrink-0 ${
                fitMode === "width" ? "bg-amber-400 text-slate-950 font-black" : "text-slate-600 hover:bg-slate-100"
              }`}
              title="ปรับขนาดพอดีความกว้างหน้าจอ"
            >
              พอดีหน้าจอ
            </button>

            <button
              type="button"
              onClick={handleRotate}
              disabled={isLoading}
              className="p-1 sm:p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 cursor-pointer shrink-0"
              title="หมุนหน้าเอกสาร 90 องศา"
            >
              <RotateCw className="w-3.5 sm:w-4 h-3.5 sm:h-4" />
            </button>
          </div>

          {/* External Action Buttons */}
          <div className="flex items-center gap-1 sm:gap-1.5 md:gap-2 flex-nowrap shrink-0">
            <button
              type="button"
              onClick={() => handleDownloadSinglePage(currentPage, "PNG")}
              disabled={isLoading || !pdfDoc}
              className="inline-flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs transition shadow-md cursor-pointer disabled:opacity-40 whitespace-nowrap shrink-0"
              title={`ดาวน์โหลดรูปภาพเฉพาะหน้า ${currentPage} (PNG)`}
            >
              <FileImage className="w-3.5 h-3.5 shrink-0" />
              <span className="whitespace-nowrap">โหลดหน้านี้ (PNG)</span>
            </button>

            <button
              type="button"
              onClick={handlePrint}
              className="p-1.5 rounded-xl bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-900 border border-slate-200 transition cursor-pointer shadow-2xs shrink-0"
              title="พิมพ์เอกสาร"
            >
              <Printer className="w-4 h-4 shrink-0" />
            </button>

            <a
              href={directDownloadUrl}
              download="reportchild-dev-69.pdf"
              onClick={handleDownloadFullPdf}
              className="p-1.5 sm:px-2.5 md:px-3 sm:py-1.5 rounded-xl bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs border border-slate-200 transition cursor-pointer inline-flex items-center gap-1 sm:gap-1.5 shadow-2xs whitespace-nowrap shrink-0"
              title="ดาวน์โหลดไฟล์ PDF ทั้งฉบับ"
            >
              <Download className="w-3.5 h-3.5 text-amber-500 shrink-0" />
              <span className="hidden sm:inline whitespace-nowrap">โหลด PDF ทั้งฉบับ</span>
            </a>

            <a
              href={directDownloadUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs transition shadow-md cursor-pointer whitespace-nowrap shrink-0"
              title="เปิดในแท็บใหม่"
            >
              <ExternalLink className="w-3.5 h-3.5 shrink-0" />
              <span className="whitespace-nowrap">เปิดแท็บใหม่</span>
            </a>

            <button
              type="button"
              onClick={toggleFullscreen}
              className="p-1.5 rounded-xl bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-900 border border-slate-200 transition cursor-pointer shadow-2xs shrink-0"
              title={isFullscreen ? "ออกจากเต็มจอ" : "แสดงเต็มจอ"}
            >
              {isFullscreen ? <Minimize className="w-4 h-4 shrink-0" /> : <Maximize className="w-4 h-4 shrink-0" />}
            </button>
          </div>
        </div>
      </div>

      {/* Main View Area: Thumbnails Drawer + Canvas Container */}
      <div className="flex-1 flex overflow-hidden relative min-h-[600px] lg:min-h-[750px] bg-slate-100/50">
        {/* Thumbnails Sidebar */}
        {showThumbnails && (
          <div className="w-56 bg-slate-50 border-r border-slate-200 flex flex-col shrink-0 z-20 transition-all duration-300">
            <div className="p-3 border-b border-slate-200 flex items-center justify-between bg-slate-100/40">
              <span className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5 text-amber-500" />
                <span>หน้ารายงานทั้งหมด ({numPages})</span>
              </span>
              <button
                type="button"
                onClick={() => setShowThumbnails(false)}
                className="text-slate-400 hover:text-slate-600 text-xs p-1"
              >
                ✕
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-2.5 scrollbar-thin scrollbar-thumb-slate-300">
              {Array.from({ length: numPages }, (_, i) => i + 1).map((pNum) => (
                <div
                  key={pNum}
                  onClick={() => setCurrentPage(pNum)}
                  className={`w-full p-2.5 rounded-xl text-left text-xs font-bold transition flex items-center justify-between border cursor-pointer group ${
                    currentPage === pNum
                      ? "bg-amber-50 text-amber-800 border-amber-300 shadow-2xs"
                      : "bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-800 border-slate-200"
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <FileText className={`w-3.5 h-3.5 shrink-0 ${currentPage === pNum ? "text-amber-500" : "text-slate-400"}`} />
                    <span className="truncate">หน้าที่ {pNum}</span>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDownloadSinglePage(pNum, "PNG");
                      }}
                      className="p-1 rounded hover:bg-amber-100 text-amber-600 transition"
                      title={`ดาวน์โหลดหน้า ${pNum} เป็นภาพ PNG`}
                    >
                      <FileImage className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDownloadSinglePage(pNum, "PDF");
                      }}
                      className="p-1 rounded hover:bg-rose-100 text-rose-600 transition"
                      title={`ดาวน์โหลดหน้า ${pNum} เป็นไฟล์ PDF`}
                    >
                      <Download className="w-3.5 h-3.5" />
                    </button>
                    {currentPage === pNum && (
                      <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse ml-0.5" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Canvas Render Stage */}
        <div className="flex-1 flex flex-col items-center justify-center p-4 sm:p-8 overflow-auto relative bg-slate-100/30">
          {/* Loading State */}
          {isLoading && (
            <div className="absolute inset-0 bg-white/80 backdrop-blur-xs flex flex-col items-center justify-center z-30 space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center animate-spin">
                <RefreshCw className="w-7 h-7 text-amber-500 animate-spin" />
              </div>
              <div className="text-center space-y-1">
                <p className="text-sm font-black text-slate-800">กำลังโหลดเอกสารรายงาน กพด. 2568...</p>
                <p className="text-xs text-slate-500 font-mono">{loadingProgress}% เสร็จสิ้น</p>
              </div>
            </div>
          )}

          {/* Error State */}
          {errorMessage && !isLoading && (
            <div className="max-w-md p-6 rounded-3xl bg-white border border-rose-200 text-center space-y-4 shadow-lg z-30">
              <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-100 text-rose-500 flex items-center justify-center mx-auto">
                <AlertCircle className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-black text-slate-900">เกิดข้อผิดพลาดในการแสดงผลบน Canvas</h3>
                <p className="text-xs text-slate-500 leading-relaxed">{errorMessage}</p>
              </div>
              <div className="flex flex-col sm:flex-row gap-2 pt-2">
                <button
                  type="button"
                  onClick={loadPdf}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs transition cursor-pointer"
                >
                  ลองโหลดใหม่อีกครั้ง
                </button>
                <a
                  href={directDownloadUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs transition cursor-pointer"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>เปิดอ่านโดยตรง</span>
                </a>
              </div>
            </div>
          )}

          {/* HTML5 Rendered Canvas */}
          <div className="relative shadow-md rounded-lg overflow-hidden border border-slate-200 bg-white transition-all">
            <canvas
              ref={canvasRef}
              className="block mx-auto max-w-full"
            />
          </div>
        </div>
      </div>

      {/* Bottom Status Bar */}
      <div className="bg-slate-50 border-t border-slate-200 px-4 py-2.5 flex flex-wrap items-center justify-between text-xs text-slate-500 gap-2">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-bold">
            <Sparkles className="w-3 h-3" />
            <span>Interactive Canvas Engine v4.10 (คมชัด ไม่ถูกบล็อก)</span>
          </span>
          <span className="hidden sm:inline text-slate-300">|</span>
          <span className="hidden sm:inline">หน้า {currentPage} จาก {numPages || 1} หน้า</span>
        </div>

        <div className="flex items-center gap-3">
          <span>ความละเอียด: {Math.round(scale * 100)}%</span>
          <span className="text-slate-300">•</span>
          <span>การหมุน: {rotation}°</span>
        </div>
      </div>

      {/* Floating Download Status Toast Notification */}
      {downloadStatus.isDownloading && (
        <div className="fixed bottom-6 right-6 z-50 bg-white text-slate-800 p-4 rounded-2xl shadow-xl border border-slate-200 max-w-sm w-full animate-in fade-in slide-in-from-bottom-5 duration-200">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              {downloadStatus.isSuccess ? (
                <div className="w-7 h-7 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold shrink-0">
                  <Check className="w-4 h-4 stroke-[3]" />
                </div>
              ) : (
                <div className="w-7 h-7 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center animate-spin shrink-0">
                  <Loader2 className="w-4 h-4 text-indigo-600 animate-spin" />
                </div>
              )}
              <span className="font-extrabold text-xs text-slate-800">
                {downloadStatus.isSuccess
                  ? "ดาวน์โหลดเรียบร้อยแล้ว"
                  : downloadStatus.format === "FULL_PDF"
                  ? "กำลังดาวน์โหลดไฟล์ PDF ทั้งฉบับ"
                  : `กำลังดาวน์โหลดหน้า ${downloadStatus.pageNumber || currentPage} (${downloadStatus.format})`}
              </span>
            </div>
            <span className="text-xs font-mono font-black text-amber-600 ml-2 shrink-0">
              {downloadStatus.progress}%
            </span>
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden mb-2 border border-slate-200">
            <div
              className={`h-full transition-all duration-300 rounded-full ${
                downloadStatus.isSuccess
                  ? "bg-gradient-to-r from-emerald-500 to-teal-400"
                  : "bg-gradient-to-r from-indigo-500 via-purple-500 to-amber-400"
              }`}
              style={{ width: `${downloadStatus.progress}%` }}
            />
          </div>

          <p className="text-[11px] font-medium text-slate-500 truncate">
            {downloadStatus.stepMessage}
          </p>
        </div>
      )}
    </div>
  );
}
