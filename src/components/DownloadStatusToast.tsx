import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Download, CheckCircle2, AlertCircle, Loader2, Smartphone, Tablet, FileText, FileImage, Archive, Check, Sparkles, FolderDown, X } from "lucide-react";

export interface DownloadNotificationState {
  isOpen: boolean;
  type: "PDF" | "PNG" | "ZIP" | "WORD" | "PRINT";
  fileName?: string;
  status: "preparing" | "downloading" | "success" | "error";
  progress?: number;
  message?: string;
  itemCount?: number;
}

interface DownloadStatusNotificationProps {
  state: DownloadNotificationState;
  onClose?: () => void;
}

export const DownloadStatusNotification: React.FC<DownloadStatusNotificationProps> = ({
  state,
  onClose,
}) => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || !state.isOpen) return null;

  const isMobileOrTablet = typeof navigator !== "undefined" && (
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Tablet/i.test(navigator.userAgent) ||
    (typeof window !== "undefined" && (window.innerWidth <= 1024 || (navigator.maxTouchPoints && navigator.maxTouchPoints > 0)))
  );

  const getTypeIcon = () => {
    switch (state.type) {
      case "PDF":
        return <FileText className="w-5 h-5 text-rose-400" />;
      case "PNG":
        return <FileImage className="w-5 h-5 text-emerald-400" />;
      case "ZIP":
        return <Archive className="w-5 h-5 text-amber-400" />;
      case "WORD":
        return <FileText className="w-5 h-5 text-blue-400" />;
      default:
        return <Download className="w-5 h-5 text-indigo-400" />;
    }
  };

  const getStatusBadge = () => {
    switch (state.status) {
      case "preparing":
      case "downloading":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-500/20 text-blue-300 border border-blue-400/30">
            <Loader2 className="w-3 h-3 animate-spin text-blue-400" />
            <span>กำลังดาวน์โหลด</span>
          </span>
        );
      case "success":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>ดาวน์โหลดสำเร็จ</span>
          </span>
        );
      case "error":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-500/20 text-rose-300 border border-rose-400/30">
            <AlertCircle className="w-3.5 h-3.5 text-rose-400" />
            <span>เกิดข้อผิดพลาด</span>
          </span>
        );
    }
  };

  return createPortal(
    <div className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-[9999] max-w-sm sm:max-w-md w-[calc(100vw-2rem)] animate-in fade-in slide-in-from-bottom-5 duration-300 pointer-events-auto">
      <div className="bg-slate-900/95 text-white border border-slate-700/80 backdrop-blur-md rounded-2xl shadow-2xl overflow-hidden p-4 sm:p-4.5 space-y-3">
        {/* Top bar */}
        <div className="flex items-start justify-between gap-2.5">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-white/10 border border-white/15 flex items-center justify-center shrink-0">
              {getTypeIcon()}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-black text-white tracking-tight">
                  ส่งออกไฟล์ {state.type}
                </span>
                {getStatusBadge()}
              </div>
              <p className="text-[11px] text-slate-300 truncate font-mono mt-0.5" title={state.fileName}>
                {state.fileName || "กำลังส่งออกเอกสาร..."}
              </p>
            </div>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition cursor-pointer"
              title="ปิดการแจ้งเตือน"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Progress Bar if downloading */}
        {(state.status === "preparing" || state.status === "downloading") && (
          <div className="space-y-1.5">
            <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden border border-slate-700">
              <div
                className="bg-gradient-to-r from-blue-500 to-indigo-400 h-full transition-all duration-300 ease-out"
                style={{ width: `${Math.max(15, state.progress || 35)}%` }}
              />
            </div>
            <div className="flex justify-between text-[10px] text-slate-400 font-medium">
              <span>{state.message || "กำลังประมวลผลไฟล์ความละเอียดสูง..."}</span>
              {state.progress !== undefined && <span>{state.progress}%</span>}
            </div>
          </div>
        )}

        {/* Success Tips for Mobile/Tablet */}
        {state.status === "success" && (
          <div className="bg-emerald-950/40 border border-emerald-500/30 rounded-xl p-2.5 space-y-1.5">
            <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-300">
              <Check className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{state.message || "ระบบเริ่มการดาวน์โหลดไฟล์ลงเครื่องของคุณแล้ว"}</span>
            </div>
            
            {isMobileOrTablet ? (
              <div className="flex items-start gap-2 pt-1 border-t border-emerald-500/20 text-[11px] text-emerald-200/90 leading-tight">
                <FolderDown className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                <span>
                  <strong>คำแนะนำสำหรับสมาร์ทโฟน/แท็บเล็ต:</strong> ไฟล์ถูกบันทึกลงในแอป <strong>"ไฟล์" (Files / Downloads)</strong> ของอุปกรณ์ สามารถเปิดดูหรือแชร์ผ่าน LINE / เมลได้ทันที
                </span>
              </div>
            ) : (
              <p className="text-[11px] text-emerald-200/80 leading-tight">
                ไฟล์ถูกบันทึกไว้ในโฟลเดอร์ <strong>Downloads</strong> ของคอมพิวเตอร์ของคุณเรียบร้อยแล้ว
              </p>
            )}
          </div>
        )}

        {/* Error message */}
        {state.status === "error" && (
          <div className="bg-rose-950/40 border border-rose-500/30 rounded-xl p-2.5 text-[11px] text-rose-200">
            {state.message || "เกิดข้อผิดพลาดในการดาวน์โหลด กรุณาลองใหม่อีกครั้ง"}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
};
