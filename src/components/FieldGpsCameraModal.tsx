import { useState, useRef, useEffect } from "react";
import QRCode from "qrcode";
import { 
  Camera, 
  MapPin, 
  Upload, 
  RefreshCw, 
  CheckCircle2, 
  Sparkles, 
  X, 
  Check, 
  ShieldCheck, 
  Zap, 
  School, 
  Image as ImageIcon,
  Compass,
  Sliders,
  AlertCircle,
  QrCode,
  Share2,
  Copy,
  Smartphone
} from "lucide-react";
import { 
  compressAndWatermarkPhoto, 
  getCurrentGpsPosition, 
  GpsLocationInfo, 
  CompressResult 
} from "../lib/imageCompressor";
import { OFFICIAL_TARGET_SCHOOLS } from "../data/schoolsData";

interface FieldGpsCameraModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPhotoCaptured: (dataUrl: string, gpsInfo: GpsLocationInfo | null, details: string) => void;
  initialSchoolName?: string;
}

const FIELD_CATEGORIES = [
  { id: "agri", name: "🌾 แปลงเกษตรเพื่ออาหารกลางวัน (เกษตร/ปศุสัตว์/ประมง)" },
  { id: "building", name: "🏫 อาคารเรียน/ห้องเรียน/หอพักนักเรียน ตชด." },
  { id: "solar", name: "⚡ ระบบพลังงานแสงอาทิตย์ (Solar Cell) / ไฟฟ้า" },
  { id: "water", name: "💧 ระบบน้ำดื่มสะอาด / ถังน้ำสำรองโรงเรียน" },
  { id: "health", name: "🩺 ห้องพยาบาล / โภชนาการอนามัยแม่และเด็ก" },
  { id: "ict", name: "💻 ห้องปฏิบัติการคอมพิวเตอร์ / การสื่อสารทางไกล" }
];

export function FieldGpsCameraModal({
  isOpen,
  onClose,
  onPhotoCaptured,
  initialSchoolName = "รร.ตชด.บ้านห้วยพูล"
}: FieldGpsCameraModalProps) {
  const [selectedSchool, setSelectedSchool] = useState<string>(initialSchoolName);
  const [selectedCategory, setSelectedCategory] = useState<string>(FIELD_CATEGORIES[0].name);
  const [inspectorName, setInspectorName] = useState<string>("เจ้าหน้าที่ตรวจเยี่ยมภาคสนาม");
  const [photoNote, setPhotoNote] = useState<string>("");

  const [gpsLocation, setGpsLocation] = useState<GpsLocationInfo | null>(null);
  const [isFetchingGps, setIsFetchingGps] = useState<boolean>(false);

  const [activeMode, setActiveMode] = useState<"camera" | "qrcode">("camera");
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>("");
  const [isCopiedQr, setIsCopiedQr] = useState<boolean>(false);

  const [isCompressing, setIsCompressing] = useState<boolean>(false);
  const [compressResult, setCompressResult] = useState<CompressResult | null>(null);

  // Live Camera Stream State
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
  const [stream, setStream] = useState<MediaStream | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetchRealtimeGps();
      generateMobileQrCode();
    } else {
      stopCameraStream();
      setCompressResult(null);
    }
  }, [isOpen, selectedSchool]);

  const generateMobileQrCode = async () => {
    try {
      const shareUrl = typeof window !== "undefined" 
        ? `${window.location.origin}?school=${encodeURIComponent(selectedSchool)}&action=quick_upload` 
        : "https://bpp-kopodot5.org/mobile-upload";
      const qrUrl = await QRCode.toDataURL(shareUrl, {
        width: 320,
        margin: 2,
        color: { dark: "#0f172a", light: "#ffffff" }
      });
      setQrCodeDataUrl(qrUrl);
    } catch (e) {
      console.warn("Failed to generate QR Code", e);
    }
  };

  const fetchRealtimeGps = async () => {
    setIsFetchingGps(true);
    const loc = await getCurrentGpsPosition();
    setGpsLocation(loc);
    setIsFetchingGps(false);
  };

  const startCameraStream = async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        alert("เบราว์เซอร์นี้ไม่รองรับการเปิดกล้องโดยตรง กรุณาใช้วิธีอัปโหลดไฟล์รูปภาพ");
        return;
      }
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 1920 }, height: { ideal: 1080 } },
        audio: false
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
      setIsCameraActive(true);
    } catch (err) {
      alert("ไม่สามารถเข้าถึงกล้องถ่ายภาพได้ กรุณาตรวจสอบสิทธิ์การใช้งานกล้องในเบราว์เซอร์");
      setIsCameraActive(false);
    }
  };

  const stopCameraStream = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
    setIsCameraActive(false);
  };

  const handleCaptureFromVideo = async () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const rawDataUrl = canvas.toDataURL("image/jpeg", 0.9);

    stopCameraStream();
    await processAndCompressPhoto(rawDataUrl);
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    await processAndCompressPhoto(file);
  };

  const processAndCompressPhoto = async (source: File | string) => {
    setIsCompressing(true);
    try {
      const res = await compressAndWatermarkPhoto(source, {
        schoolName: selectedSchool,
        categoryTag: selectedCategory,
        inspectorName,
        maxWidth: 1280,
        quality: 0.78,
        addWatermarkStamp: true
      });
      setCompressResult(res);
      if (res.gpsInfo) {
        setGpsLocation(res.gpsInfo);
      }
    } catch (err) {
      alert("เกิดข้อผิดพลาดในการบีบอัดรูปภาพ");
    } finally {
      setIsCompressing(false);
    }
  };

  const handleConfirmAttachPhoto = () => {
    if (!compressResult) return;
    const detailsText = `${selectedCategory} • ${selectedSchool}${photoNote ? ` (${photoNote})` : ""}`;
    onPhotoCaptured(compressResult.dataUrl, compressResult.gpsInfo, detailsText);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 no-print animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-950 text-white px-6 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-300 shrink-0">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm sm:text-base text-white tracking-tight flex items-center gap-2">
                <span>ถ่ายภาพสภาพจริงพร้อมพิกัด GPS Real-Time</span>
                <span className="bg-emerald-500/20 text-emerald-300 text-[10px] px-2 py-0.5 rounded-full border border-emerald-400/30 font-bold hidden sm:inline-block">
                  Auto Compressor
                </span>
              </h3>
              <p className="text-[11px] text-slate-300 font-medium mt-0.5">
                บันทึกภาพแปลงเกษตร, อาคารเรียน, ระบบโซลาร์เซลล์ พร้อมแสตมป์พิกัดและบีบอัดไฟล์อัตโนมัติ
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Live GPS Bar */}
        <div className="bg-slate-100 px-6 py-2.5 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2 shrink-0 text-xs font-bold text-slate-700">
          <div className="flex items-center gap-2">
            <MapPin className={`w-4 h-4 ${gpsLocation ? "text-emerald-600" : "text-amber-600 animate-bounce"}`} />
            <span>
              {gpsLocation 
                ? `GPS: ${gpsLocation.latitude.toFixed(6)}, ${gpsLocation.longitude.toFixed(6)} (±${gpsLocation.accuracy}m)` 
                : "กำลังค้นหาสัญญาณดาวเทียม GPS Real-Time..."}
            </span>
          </div>

          <button
            type="button"
            onClick={fetchRealtimeGps}
            disabled={isFetchingGps}
            className="text-indigo-700 hover:text-indigo-900 text-[11px] font-bold flex items-center gap-1 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isFetchingGps ? "animate-spin" : ""}`} />
            <span>อัปเดตพิกัด</span>
          </button>
        </div>

        {/* Mode Selector Tabs */}
        <div className="bg-slate-200/80 p-1.5 border-b border-slate-200 flex items-center justify-center gap-2">
          <button
            type="button"
            onClick={() => setActiveMode("camera")}
            className={`px-4 py-2 rounded-xl text-xs font-black transition flex items-center gap-1.5 cursor-pointer ${
              activeMode === "camera"
                ? "bg-white text-indigo-950 shadow-2xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Camera className="w-4 h-4 text-indigo-600" />
            <span>เปิดกล้องถ่ายภาพบนอุปกรณ์นี้</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveMode("qrcode")}
            className={`px-4 py-2 rounded-xl text-xs font-black transition flex items-center gap-1.5 cursor-pointer ${
              activeMode === "qrcode"
                ? "bg-indigo-600 text-white shadow-2xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <QrCode className="w-4 h-4 text-amber-300" />
            <span>สแกน QR Code ส่งผ่านมือถือด่วน</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5 flex-1">

          {/* Form Options */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="space-y-1">
              <label className="font-extrabold text-slate-800 flex items-center gap-1">
                <School className="w-3.5 h-3.5 text-indigo-600" />
                <span>เลือกโรงเรียน ตชด. เป้าหมาย:</span>
              </label>
              <select
                value={selectedSchool}
                onChange={(e) => setSelectedSchool(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-800 font-bold focus:bg-white focus:ring-2 focus:ring-indigo-500"
              >
                {OFFICIAL_TARGET_SCHOOLS.map((s) => (
                  <option key={s.id} value={s.name}>
                    {s.name} ({s.province})
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="font-extrabold text-slate-800 flex items-center gap-1">
                <Sliders className="w-3.5 h-3.5 text-indigo-600" />
                <span>หมวดหมู่งานตรวจเยี่ยม:</span>
              </label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-800 font-bold focus:bg-white focus:ring-2 focus:ring-indigo-500"
              >
                {FIELD_CATEGORIES.map((cat) => (
                  <option key={cat.id} value={cat.name}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* QR Code Mobile Quick Upload Portal */}
          {activeMode === "qrcode" && !compressResult && (
            <div className="bg-gradient-to-br from-indigo-900 via-slate-900 to-indigo-950 rounded-2xl p-6 text-white text-center space-y-4 shadow-xl border border-indigo-500/30">
              <div className="inline-flex items-center gap-2 bg-indigo-500/20 text-indigo-200 border border-indigo-400/30 text-xs font-black px-3 py-1 rounded-full">
                <Smartphone className="w-3.5 h-3.5 text-amber-300" />
                <span>Mobile Quick-Upload QR Portal</span>
              </div>

              <div>
                <h4 className="font-black text-base sm:text-lg text-white">
                  สแกนคิวอาร์โค้ดส่งภาพกิจกรรมผ่านมือถือทันที
                </h4>
                <p className="text-xs text-indigo-200/80 mt-1 max-w-md mx-auto">
                  ให้ครู ตชด., คณะครู หรือผู้ปกครอง ใช้กล้องมือถือสแกน QR Code นี้ เพื่อเปิดหน้ากล้องถ่ายภาพพร้อมพิกัด GPS บนสมาร์ทโฟนได้โดยตรง
                </p>
              </div>

              {/* QR Code Image Container */}
              <div className="bg-white p-4 rounded-2xl shadow-2xl border-2 border-indigo-400/40 w-52 h-52 mx-auto flex items-center justify-center">
                {qrCodeDataUrl ? (
                  <img
                    src={qrCodeDataUrl}
                    alt="Mobile Quick Upload QR Code"
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <RefreshCw className="w-8 h-8 text-indigo-600 animate-spin" />
                )}
              </div>

              <div className="text-xs font-bold text-slate-300">
                เป้าหมาย: <span className="text-amber-300 font-extrabold">{selectedSchool}</span>
              </div>

              {/* Copy & Share Action Buttons */}
              <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    const shareUrl = `${window.location.origin}?school=${encodeURIComponent(selectedSchool)}&action=quick_upload`;
                    navigator.clipboard.writeText(shareUrl);
                    setIsCopiedQr(true);
                    setTimeout(() => setIsCopiedQr(false), 2000);
                  }}
                  className="bg-white/10 hover:bg-white/20 text-white border border-white/20 font-bold text-xs px-4 py-2 rounded-xl transition flex items-center gap-1.5 cursor-pointer"
                >
                  {isCopiedQr ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-amber-300" />}
                  <span>{isCopiedQr ? "คัดลอกลิงก์แล้ว!" : "คัดลอกลิงก์ส่งมือถือ"}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveMode("camera")}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs px-5 py-2 rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow-md"
                >
                  <Camera className="w-4 h-4" />
                  <span>สลับไปใช้กล้องบนอุปกรณ์นี้</span>
                </button>
              </div>
            </div>
          )}

          {/* Camera Capture Stage */}
          {activeMode === "camera" && !compressResult && (
            <div className="space-y-4">
              {isCameraActive ? (
                <div className="relative rounded-2xl overflow-hidden bg-black aspect-video flex items-center justify-center border-2 border-indigo-500">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-3">
                    <button
                      type="button"
                      onClick={handleCaptureFromVideo}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold px-6 py-2.5 rounded-full shadow-lg flex items-center gap-2 cursor-pointer transition text-xs sm:text-sm"
                    >
                      <Camera className="w-4 h-4" />
                      <span>กดถ่ายภาพภาพสภาพจริง</span>
                    </button>

                    <button
                      type="button"
                      onClick={stopCameraStream}
                      className="bg-slate-800/80 hover:bg-slate-900 text-white p-2.5 rounded-full cursor-pointer transition"
                      title="ปิดกล้อง"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="border-2 border-dashed border-slate-300 rounded-2xl p-6 text-center bg-slate-50/70 space-y-4">
                  <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto border border-indigo-100">
                    <Camera className="w-6 h-6" />
                  </div>

                  <div>
                    <h4 className="font-extrabold text-slate-800 text-xs sm:text-sm">
                      เปิดกล้องถ่ายภาพ หรือ อัปโหลดรูปภาพสภาพจริง
                    </h4>
                    <p className="text-[11px] text-slate-500 mt-1">
                      ระบบจะทำการประมวลผลใส่แสตมป์พิกัด GPS และบีบอัดไฟล์ภาพจาก 5-10MB เหลือ ~200KB อัตโนมัติ
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                    <button
                      type="button"
                      onClick={startCameraStream}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs px-5 py-2.5 rounded-xl shadow-xs transition flex items-center gap-2 cursor-pointer"
                    >
                      <Camera className="w-4 h-4 text-amber-300" />
                      <span>เปิดกล้องถ่ายภาพ (Device Camera)</span>
                    </button>

                    <label className="bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 font-extrabold text-xs px-5 py-2.5 rounded-xl shadow-2xs transition flex items-center gap-2 cursor-pointer">
                      <Upload className="w-4 h-4 text-emerald-600" />
                      <span>เลือกไฟล์ภาพจากเครื่อง</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleFileChange}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Compress Progress Indicator */}
          {isCompressing && (
            <div className="p-8 text-center bg-indigo-50/80 border border-indigo-200 rounded-2xl space-y-3">
              <RefreshCw className="w-8 h-8 text-indigo-600 animate-spin mx-auto" />
              <div className="font-extrabold text-xs text-indigo-950">
                กำลังบันทึกพิกัด GPS Real-Time และบีบอัดไฟล์รูปภาพอัตโนมัติ...
              </div>
            </div>
          )}

          {/* Compressed Photo Preview with GPS Stamp */}
          {compressResult && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div className="flex items-center justify-between">
                <h4 className="font-extrabold text-xs sm:text-sm text-slate-900 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>พรีวิวภาพถ่ายสภาพจริงพร้อมแสตมป์ตราพิกัด GPS</span>
                </h4>

                <button
                  type="button"
                  onClick={() => setCompressResult(null)}
                  className="text-xs font-bold text-indigo-600 hover:text-indigo-800 underline cursor-pointer"
                >
                  ถ่ายใหม่
                </button>
              </div>

              {/* Compressed Image Box */}
              <div className="relative rounded-2xl overflow-hidden border border-slate-300 shadow-md bg-slate-900">
                <img
                  src={compressResult.dataUrl}
                  alt="Field Inspection Preview"
                  className="w-full h-auto max-h-[380px] object-contain mx-auto"
                />
              </div>

              {/* Compression Stats Badge */}
              <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-3.5 flex flex-wrap items-center justify-between gap-3 text-xs font-extrabold text-emerald-950">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>บีบอัดภาพสำเร็จ: {compressResult.originalSizeKB} KB ➔ {compressResult.compressedSizeKB} KB</span>
                </div>
                <span className="bg-emerald-600 text-white px-2.5 py-0.5 rounded-full text-[10px]">
                  ประหยัดพื้นที่ {compressResult.reductionPercentage}%
                </span>
              </div>

              <div className="space-y-1 text-xs">
                <label className="font-extrabold text-slate-800">คำอธิบายเพิ่มเติมประกอบภาพถ่าย:</label>
                <input
                  type="text"
                  value={photoNote}
                  onChange={(e) => setPhotoNote(e.target.value)}
                  placeholder="เช่น ตรวจสภาพระบบโซลาร์เซลล์ขนาด 3KW ทำงานปกติ"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-800 font-bold focus:bg-white focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="bg-slate-100 px-6 py-4 border-t border-slate-200 flex items-center justify-between shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-white hover:bg-slate-200 text-slate-700 border border-slate-300 text-xs font-bold transition cursor-pointer"
          >
            ยกเลิก
          </button>

          {compressResult && (
            <button
              type="button"
              onClick={handleConfirmAttachPhoto}
              className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold shadow-sm transition flex items-center gap-2 cursor-pointer"
            >
              <Check className="w-4 h-4 text-amber-300" />
              <span>แนบภาพถ่ายพร้อมพิกัด GPS นี้ในรายงาน</span>
            </button>
          )}
        </div>

      </div>
    </div>
  );
}
