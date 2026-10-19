import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { 
  X, QrCode, ExternalLink, Download, Copy, Check, Smartphone
} from "lucide-react";
import QRCode from "qrcode";

interface ReportQrCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  reportUrl?: string;
  badgeLabel?: string;
}

export const OFFICIAL_REPORT_FORM_URL = "https://linktr.ee/BPPSchoolCoachDivision2";

export const ReportQrCodeModal: React.FC<ReportQrCodeModalProps> = ({
  isOpen,
  onClose,
  reportUrl = OFFICIAL_REPORT_FORM_URL,
  badgeLabel = "Linktree บก.ตชด.ภาค 2"
}) => {
  const [copied, setCopied] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string>("/images/qr-report-form.png");

  useEffect(() => {
    if (!reportUrl) return;
    
    // Dynamically generate crisp, scannable QR Code matching the official format
    const qrOptions: QRCode.QRCodeToDataURLOptions = {
      width: 500,
      margin: 1,
      color: {
        dark: "#000000",
        light: "#ffffff",
      },
      errorCorrectionLevel: "M",
    };

    if (reportUrl === OFFICIAL_REPORT_FORM_URL) {
      qrOptions.maskPattern = 1;
      qrOptions.version = 3;
    }

    QRCode.toDataURL(reportUrl, qrOptions)
      .then((url) => setQrDataUrl(url))
      .catch((err) => {
        console.error("Error generating QR code:", err);
        // Keep fallback image
      });
  }, [reportUrl]);

  if (!isOpen) return null;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(reportUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handleDownloadQr = () => {
    const link = document.createElement("a");
    link.href = qrDataUrl;
    link.download = "QR-Code-สแกนเพื่อรายงาน-รร.ตชด.png";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const modalContent = (
    <div 
      id="report-qrcode-modal-backdrop"
      className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn no-print overflow-y-auto"
      onClick={onClose}
    >
      <div 
        id="report-qrcode-modal-content"
        className="relative w-full max-w-[440px] min-w-[320px] bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-200/80 my-auto animate-scaleIn flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header: Pantone Emerald Green (#00875a) */}
        <div className="bg-[#00875a] px-5 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-xs flex items-center justify-center text-white shrink-0 shadow-inner">
              <QrCode className="w-5 h-5 text-white" />
            </div>
            <div className="min-w-0 space-y-0.5">
              <h3 className="text-base sm:text-lg font-black text-white tracking-tight leading-snug whitespace-nowrap">
                สแกน QR Code เพื่อรายงาน
              </h3>
              <p className="text-xs text-emerald-100 font-normal leading-normal whitespace-nowrap truncate">
                ระบบบันทึกรายงานผลการจัดการเรียนรู้ รร.ตชด.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-white/80 hover:text-white hover:bg-white/15 transition cursor-pointer shrink-0 ml-2"
            title="ปิดหน้าต่าง"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-5 flex flex-col items-center gap-3.5 bg-white">
          {/* Centered QR Code Card with Mint Border */}
          <div className="w-full max-w-[320px] rounded-2xl border-2 border-emerald-200/90 bg-white p-3.5 flex flex-col items-center gap-2.5 shadow-xs">
            {/* QR Code Container - Perfectly Square */}
            <div className="w-48 h-48 sm:w-52 sm:h-52 aspect-square bg-[#f8fafc] rounded-xl p-2.5 flex items-center justify-center border border-slate-100 shadow-inner">
              <img 
                src={qrDataUrl} 
                alt="QR Code สำหรับสแกนเขียนรายงาน"
                className="w-full h-full object-contain rounded-lg mix-blend-multiply"
              />
            </div>

            {/* Instruction Pill */}
            <div className="inline-flex items-center justify-center gap-1.5 px-3 py-1 rounded-full bg-[#ecfdf5] border border-emerald-300/80 text-[#059669] text-xs font-bold shadow-2xs whitespace-nowrap">
              <Smartphone className="w-3.5 h-3.5 text-[#059669] shrink-0" />
              <span>สแกนด้วยกล้องมือถือ หรือ แอป LINE</span>
            </div>
          </div>

          {/* Form Link Section */}
          <div className="w-full rounded-2xl border border-slate-200/90 bg-[#f8fafc] p-3 sm:p-3.5 flex flex-col gap-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-bold text-slate-700 whitespace-nowrap">
                ลิงก์ฟอร์มบันทึกรายงาน:
              </span>
              <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-[#047857] text-[11px] font-bold whitespace-nowrap">
                {badgeLabel}
              </span>
            </div>

            <div className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-white border border-slate-200/90 shadow-2xs">
              <span className="text-xs text-slate-600 font-medium truncate flex-1 select-all font-mono">
                {reportUrl}
              </span>
              <button
                onClick={handleCopyLink}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold text-slate-700 hover:bg-slate-100 transition cursor-pointer shrink-0"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="text-emerald-700">คัดลอกแล้ว</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-slate-500" />
                    <span>คัดลอก</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="w-full grid grid-cols-2 gap-2.5 pt-0.5">
            <button
              onClick={handleDownloadQr}
              className="inline-flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-bold bg-[#f1f5f9] hover:bg-slate-200 text-slate-700 border border-slate-200/80 transition cursor-pointer active:scale-95 shadow-2xs whitespace-nowrap"
              title="ดาวน์โหลดภาพ QR Code (PNG)"
            >
              <Download className="w-3.5 h-3.5 text-slate-600 shrink-0" />
              <span>ดาวน์โหลด QR</span>
            </button>

            <a
              href={reportUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-bold bg-[#00875a] hover:bg-[#00734c] text-white transition cursor-pointer active:scale-95 shadow-sm whitespace-nowrap"
            >
              <ExternalLink className="w-3.5 h-3.5 shrink-0" />
              <span>เปิดฟอร์มรายงาน</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );

  if (typeof document === "undefined") {
    return null;
  }

  return createPortal(modalContent, document.body);
};
