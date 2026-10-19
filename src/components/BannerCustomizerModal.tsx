import React, { useState, useEffect, useRef } from "react";
import { 
  X, 
  Image as ImageIcon, 
  Link as LinkIcon, 
  Upload, 
  Check, 
  RotateCcw, 
  Sparkles, 
  Layers, 
  CheckCircle2, 
  AlertCircle,
  Eye,
  Sliders,
  Cloud,
  RefreshCw,
  EyeOff,
  ShieldCheck,
  Crown
} from "lucide-react";
import { 
  APP_PAGE_DEFINITIONS, 
  PRESET_BANNERS, 
  getBannerForPage, 
  getDefaultBannerForPage,
  getSafeBannerUrl,
  convertAnyImageUrlToDirectLink,
  setBannerForPage, 
  setBannerForAllPages, 
  setAsMasterSystemBrand,
  isMasterSystemBrand,
  resetBannerForPage, 
  resetAllPageBanners,
  syncBannersWithCloud,
  isPageBannerCustomized,
  isAppPublished,
  setAppPublished,
  subscribeToPublishStatus
} from "../lib/bannerStorage";
import { compressImageFile } from "../lib/imageCompressor";

interface BannerCustomizerModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentPageKey?: string;
  onBannerUpdated?: (pageKey: string, newUrl: string) => void;
}

export const BannerCustomizerModal: React.FC<BannerCustomizerModalProps> = ({
  isOpen,
  onClose,
  currentPageKey = "dashboard",
  onBannerUpdated,
}) => {
  const [selectedPageKey, setSelectedPageKey] = useState<string>(currentPageKey);
  const [applyMode, setApplyMode] = useState<"single" | "all">("single");
  const [activeTab, setActiveTab] = useState<"url" | "upload" | "presets">("url");
  
  // Input states
  const [imageUrlInput, setImageUrlInput] = useState<string>("");
  const [previewUrl, setPreviewUrl] = useState<string>("");
  const [previewError, setPreviewError] = useState<boolean>(false);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [successMessage, setSuccessMessage] = useState<string>("" );
  const [isPublished, setIsPublished] = useState<boolean>(() => isAppPublished());

  const isCurrentPreviewMasterBrand = isMasterSystemBrand(previewUrl);

  useEffect(() => {
    setIsPublished(isAppPublished());
    return subscribeToPublishStatus((pub) => setIsPublished(pub));
  }, []);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync selected page when modal opens or currentPageKey changes
  useEffect(() => {
    if (isOpen) {
      setSelectedPageKey(currentPageKey);
      const currentBanner = getBannerForPage(currentPageKey);
      setPreviewUrl(currentBanner);
      setImageUrlInput(currentBanner.startsWith("http") ? currentBanner : "");
      setPreviewError(false);
      setSuccessMessage("");
    }
  }, [isOpen, currentPageKey]);

  // When selected page changes within modal, load that page's banner for preview
  const handlePageSelectChange = (key: string) => {
    setSelectedPageKey(key);
    const currentBanner = getBannerForPage(key);
    setPreviewUrl(currentBanner);
    setImageUrlInput(currentBanner.startsWith("http") ? currentBanner : "");
    setPreviewError(false);
    setSuccessMessage("");
  };

  // Live URL input update
  const handleUrlInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setImageUrlInput(val);
    if (val.trim()) {
      const converted = convertAnyImageUrlToDirectLink(val.trim());
      setPreviewUrl(converted || val.trim());
      setPreviewError(false);
    }
  };

  // Preset selection
  const handleSelectPreset = (presetUrl: string) => {
    const converted = convertAnyImageUrlToDirectLink(presetUrl) || presetUrl;
    setPreviewUrl(converted);
    setImageUrlInput(presetUrl.startsWith("http") ? presetUrl : "");
    setPreviewError(false);
  };

  // File upload handling
  const handleFileUpload = async (file: File) => {
    if (!file) return;
    try {
      setIsUploading(true);
      setPreviewError(false);
      const compressedDataUrl = await compressImageFile(file, {
        maxWidth: 1920,
        maxHeight: 1080,
        quality: 0.85,
        targetSizeKB: 350
      });
      setPreviewUrl(compressedDataUrl);
      setImageUrlInput("");
      setSuccessMessage("อัปโหลดและประมวลผลภาพสำเร็จ พร้อมบันทึก");
      setTimeout(() => setSuccessMessage(""), 3000);
    } catch (err) {
      console.error("File upload error:", err);
      alert("เกิดข้อผิดพลาดในการอ่านไฟล์ภาพ กรุณาลองใหม่อีกครั้ง");
    } finally {
      setIsUploading(false);
    }
  };

  const handleCloudSync = async () => {
    try {
      setIsSyncing(true);
      await syncBannersWithCloud();
      const currentBanner = getBannerForPage(selectedPageKey);
      setPreviewUrl(currentBanner);
      setImageUrlInput(currentBanner.startsWith("http") ? currentBanner : "");
      setSuccessMessage("ซิงค์การตั้งค่าแบนเนอร์จากเซิร์ฟเวอร์และคลาวด์สำเร็จ");
      setTimeout(() => setSuccessMessage(""), 3000);
    } catch (e) {
      console.warn("Cloud sync warning:", e);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleSave = async () => {
    if (!previewUrl || previewError) {
      alert("กรุณาระบุภาพแบนเนอร์ที่ถูกต้องก่อนบันทึก");
      return;
    }

    try {
      setIsSaving(true);
      let savedUrl = previewUrl;
      if (applyMode === "all") {
        savedUrl = await setBannerForAllPages(previewUrl);
        setSuccessMessage("บันทึกและตั้งเป็นแบนเนอร์สำหรับทุกหน้าเรียบร้อยแล้ว (อัปเดตและเผยแพร่ทันที)");
        if (onBannerUpdated) onBannerUpdated("all", savedUrl);
      } else {
        savedUrl = await setBannerForPage(selectedPageKey, previewUrl);
        const pageInfo = APP_PAGE_DEFINITIONS.find((p) => p.key === selectedPageKey);
        setSuccessMessage(`บันทึกและตั้งเป็นแบนเนอร์ของ "${pageInfo?.title || selectedPageKey}" เรียบร้อยแล้ว (อัปเดตและเผยแพร่ทันที)`);
        if (onBannerUpdated) onBannerUpdated(selectedPageKey, savedUrl);
      }

      setTimeout(() => {
        onClose();
      }, 1200);
    } catch (e) {
      console.error("Save banner error:", e);
      alert("เกิดข้อผิดพลาดในการบันทึกภาพแบนเนอร์ กรุณาลองใหม่อีกครั้ง");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSetAsSystemMainBrand = async () => {
    if (!previewUrl || previewError) {
      alert("กรุณาระบุภาพแบนเนอร์ที่ถูกต้องก่อนบันทึก");
      return;
    }

    try {
      setIsSaving(true);
      const savedUrl = await setAsMasterSystemBrand(previewUrl);
      setSelectedPageKey("dashboard");
      setSuccessMessage("⭐ บันทึกและตั้งค่าเป็นแบรนด์หน้าหลักของระบบเรียบร้อยแล้ว (อัปเดตและเผยแพร่ทันที)");
      if (onBannerUpdated) {
        onBannerUpdated("dashboard", savedUrl);
        onBannerUpdated("all", savedUrl);
      }

      setTimeout(() => {
        onClose();
      }, 1200);
    } catch (e) {
      console.error("Set master brand error:", e);
      alert("เกิดข้อผิดพลาดในการตั้งค่าแบรนด์หน้าหลัก กรุณาลองใหม่อีกครั้ง");
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetCurrent = async () => {
    if (applyMode === "all") {
      if (window.confirm("คุณต้องการรีเซ็ตแบนเนอร์ของทุกหน้ากลับเป็นค่าเริ่มต้นมาตรฐาน ใช่หรือไม่?")) {
        await resetAllPageBanners();
        const def = getBannerForPage("dashboard");
        setPreviewUrl(def);
        setImageUrlInput("");
        setSuccessMessage("รีเซ็ตแบนเนอร์ทุกหน้าเป็นค่าเริ่มต้นมาตรฐานแล้ว");
        if (onBannerUpdated) onBannerUpdated("all", def);
      }
    } else {
      await resetBannerForPage(selectedPageKey);
      const def = getBannerForPage(selectedPageKey);
      setPreviewUrl(def);
      setImageUrlInput("");
      setSuccessMessage("รีเซ็ตเป็นค่าเริ่มต้นมาตรฐานของหน้านี้แล้ว");
      if (onBannerUpdated) onBannerUpdated(selectedPageKey, def);
    }
    setTimeout(() => setSuccessMessage(""), 2500);
  };

  if (!isOpen) return null;

  const currentPageDef = APP_PAGE_DEFINITIONS.find((p) => p.key === selectedPageKey);
  const defaultForSelected = getDefaultBannerForPage(selectedPageKey);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/70 backdrop-blur-xs overflow-y-auto animate-fadeIn">
      <div 
        id="banner-customizer-modal"
        className="relative w-full max-w-3xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-auto animate-scaleUp"
      >
        {/* Header Bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-purple-50/70 via-white to-indigo-50/50">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-purple-100/80 text-purple-700 border border-purple-200 shadow-2xs">
              <ImageIcon className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
                <span>จัดการแบนเนอร์ประจำหน้า</span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 text-2xs font-bold">
                  <Cloud className="w-3 h-3" />
                  <span>บันทึกถาวร & เผยแพร่</span>
                </span>
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                กำหนดภาพแบนเนอร์เป็นค่าเริ่มต้นประจำหน้า และแสดงผลอัตโนมัติเมื่อทำการเผยแพร่
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={handleCloudSync}
              disabled={isSyncing}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors"
              title="ซิงค์ค่าล่าสุดจากคลาวด์"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? "animate-spin text-purple-600" : ""}`} />
              <span className="hidden sm:inline">ซิงค์คลาวด์</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
              title="ปิดหน้าต่าง"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
          
          {/* Target Page Selector & Scope */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-purple-600" />
                <span>เลือกหน้าที่ต้องการปรับเปลี่ยนแบนเนอร์:</span>
              </label>
              <select
                value={selectedPageKey}
                onChange={(e) => handlePageSelectChange(e.target.value)}
                disabled={applyMode === "all"}
                className="w-full text-sm font-bold text-slate-800 bg-white border border-slate-300 rounded-xl px-3 py-2 focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600 outline-none disabled:bg-slate-100 disabled:text-slate-400"
              >
                {APP_PAGE_DEFINITIONS.map((page) => (
                  <option key={page.key} value={page.key}>
                    {page.title} {isPageBannerCustomized(page.key) ? "★ (กำหนดเอง)" : ""}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-indigo-600" />
                <span>ขอบเขตการนำไปใช้:</span>
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setApplyMode("single")}
                  className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all text-center ${
                    applyMode === "single"
                      ? "bg-purple-600 text-white border-purple-600 shadow-xs"
                      : "bg-white text-slate-600 border-slate-300 hover:bg-slate-100"
                  }`}
                >
                  เฉพาะหน้านี้
                </button>
                <button
                  type="button"
                  onClick={() => setApplyMode("all")}
                  className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all text-center ${
                    applyMode === "all"
                      ? "bg-indigo-600 text-white border-indigo-600 shadow-xs"
                      : "bg-white text-slate-600 border-slate-300 hover:bg-slate-100"
                  }`}
                >
                  ใช้กับทุกหน้า
                </button>
              </div>
            </div>
          </div>

          {/* Banner Live Preview */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-slate-700">
              <span className="flex items-center gap-1.5">
                <Eye className="w-3.5 h-3.5 text-purple-600" />
                <span>ตัวอย่างการแสดงผลจริง (3:1 Panoramic Ratio):</span>
              </span>
              <span className="text-slate-400 font-normal">
                {applyMode === "all" ? "ทุกหน้าในระบบ" : currentPageDef?.title}
              </span>
            </div>

            <div className="relative w-full aspect-[3/1] bg-slate-900 rounded-2xl overflow-hidden border border-slate-300 shadow-inner flex items-center justify-center group">
              {previewUrl && !previewError ? (
                <>
                  <img
                    src={getSafeBannerUrl(previewUrl)}
                    alt="ตัวอย่างแบนเนอร์"
                    className="w-full h-full object-cover object-center block"
                    referrerPolicy="no-referrer"
                    onError={() => setPreviewError(true)}
                  />

                  {/* Top-Left Active Brand Indicator */}
                  {isCurrentPreviewMasterBrand && (
                    <div className="absolute top-2.5 left-2.5 z-10 flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-900/85 backdrop-blur-md border border-amber-400/60 text-amber-300 font-black text-2xs sm:text-xs shadow-lg">
                      <Crown className="w-3.5 h-3.5 text-amber-400 fill-amber-400/30 shrink-0" />
                      <span>แบรนด์หน้าหลักของระบบ (Main System Brand)</span>
                    </div>
                  )}

                  {/* Top-Right Direct Action Button */}
                  <div className="absolute top-2.5 right-2.5 z-10">
                    <button
                      type="button"
                      onClick={handleSetAsSystemMainBrand}
                      disabled={isSaving}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 via-amber-600 to-amber-700 hover:from-amber-600 hover:to-amber-800 text-white font-extrabold text-2xs sm:text-xs shadow-lg shadow-amber-500/30 border border-amber-300/40 backdrop-blur-xs transition-all active:scale-95 cursor-pointer"
                      title="ตั้งค่าภาพนี้เป็นแบรนด์หน้าหลักของระบบทันที"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-amber-100 animate-pulse" />
                      <span>ตั้งค่าเป็นแบรนด์หน้าหลัก</span>
                    </button>
                  </div>
                </>
              ) : (
                <div className="p-4 text-center text-slate-400 space-y-1">
                  <AlertCircle className="w-8 h-8 mx-auto text-amber-400" />
                  <p className="text-xs font-bold text-slate-300">ไม่สามารถโหลดภาพได้ กรุณาตรวจสอบลิงก์ URL หรือเลือกไฟล์ใหม่</p>
                </div>
              )}
            </div>

            {/* Main Brand Action Strip */}
            {previewUrl && !previewError && (
              <div className="p-3 sm:p-3.5 bg-gradient-to-r from-amber-50/90 via-purple-50/50 to-indigo-50/80 border border-amber-200/90 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3 shadow-2xs">
                <div className="flex items-center gap-2.5 text-xs w-full sm:w-auto">
                  <div className="p-2 rounded-xl bg-amber-500 text-white shadow-2xs shrink-0">
                    <Crown className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-extrabold text-slate-900">แบรนด์หน้าหลักประจำระบบ</span>
                      {isCurrentPreviewMasterBrand && (
                        <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px] font-bold">ใช้งานอยู่</span>
                      )}
                    </div>
                    <p className="text-2xs text-slate-600">
                      กำหนดภาพนี้เป็นแบรนด์และแบนเนอร์ทางการของระบบ กพด.5 (หน้าแรก & บันทึกถาวร)
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleSetAsSystemMainBrand}
                  disabled={isSaving}
                  className="w-full sm:w-auto px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 via-amber-600 to-amber-700 hover:from-amber-600 hover:to-amber-800 text-white font-extrabold text-xs shadow-md shadow-amber-500/25 border border-amber-400/40 transition-all flex items-center justify-center gap-1.5 shrink-0 cursor-pointer active:scale-95"
                >
                  <Crown className="w-3.5 h-3.5" />
                  <span>ตั้งเป็นแบรนด์หน้าหลักของระบบ</span>
                </button>
              </div>
            )}
          </div>

          {/* Tab Navigation for Input Method */}
          <div className="flex items-center gap-2 border-b border-slate-200">
            <button
              type="button"
              onClick={() => setActiveTab("url")}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-bold border-b-2 transition-all ${
                activeTab === "url"
                  ? "border-purple-600 text-purple-700 bg-purple-50/50"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              <LinkIcon className="w-4 h-4" />
              <span>ใส่ลิงก์ URL รูปภาพ</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("upload")}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-bold border-b-2 transition-all ${
                activeTab === "upload"
                  ? "border-purple-600 text-purple-700 bg-purple-50/50"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              <Upload className="w-4 h-4" />
              <span>อัปโหลดจากอุปกรณ์</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("presets")}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-bold border-b-2 transition-all ${
                activeTab === "presets"
                  ? "border-purple-600 text-purple-700 bg-purple-50/50"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              <Sparkles className="w-4 h-4" />
              <span>คลังภาพสำเร็จรูป</span>
            </button>
          </div>

          {/* Tab 1: URL Input */}
          {activeTab === "url" && (
            <div className="space-y-3 pt-1">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  วางลิงก์รูปภาพแบนเนอร์ (Direct Image URL เช่น PostImage, Cloud Storage, Google Drive):
                </label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={imageUrlInput}
                    onChange={handleUrlInputChange}
                    placeholder="https://i.postimg.cc/..."
                    className="flex-1 text-sm font-medium bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-slate-800 focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600 outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (imageUrlInput.trim()) {
                        const converted = convertAnyImageUrlToDirectLink(imageUrlInput.trim());
                        setPreviewUrl(converted || imageUrlInput.trim());
                        setPreviewError(false);
                      }
                    }}
                    className="px-4 py-2.5 rounded-xl bg-purple-100 text-purple-800 text-xs font-bold hover:bg-purple-200 transition-colors"
                  >
                    โหลดดูตัวอย่าง
                  </button>
                </div>
                {imageUrlInput.includes("drive.google.com") && (
                  <p className="text-[11px] text-emerald-600 font-semibold mt-1 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                    <span>ตรวจพบลิงก์ Google Drive: ระบบแปลงเป็นลิงก์ภาพความละเอียดสูงให้อัตโนมัติ</span>
                  </p>
                )}
                <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                  * รองรับทุกลิงก์ภาพ: Google Drive, Dropbox, PostImages, Imgur หรือ Direct URL แนะนำสัดส่วนพาโนรามา 3:1 เพื่อความสวยงามสูงสุด
                </p>
              </div>
            </div>
          )}

          {/* Tab 2: File Upload */}
          {activeTab === "upload" && (
            <div className="space-y-3 pt-1">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png, image/jpeg, image/webp"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    handleFileUpload(e.target.files[0]);
                  }
                }}
              />
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-300 hover:border-purple-500 bg-slate-50/60 hover:bg-purple-50/30 rounded-2xl p-6 text-center cursor-pointer transition-all space-y-2"
              >
                <Upload className="w-8 h-8 mx-auto text-purple-600" />
                <div>
                  <p className="text-sm font-bold text-slate-800">
                    คลิกเพื่อเลือกไฟล์รูปภาพ หรือลากไฟล์มาวางที่นี่
                  </p>
                  <p className="text-xs text-slate-500">
                    รองรับ JPG, PNG, WEBP (ระบบจะปรับขนาดและบันทึกสู่คลาวด์โดยอัตโนมัติ)
                  </p>
                </div>
                {isUploading && (
                  <p className="text-xs font-bold text-purple-600 animate-pulse">
                    กำลังประมวลผลรูปภาพ...
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Tab 3: Presets Gallery */}
          {activeTab === "presets" && (
            <div className="space-y-4 pt-1">
              {/* Default Preset for Selected Page */}
              <div className="p-3.5 rounded-2xl bg-purple-50/70 border border-purple-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-20 aspect-[3/1] rounded-lg overflow-hidden border border-purple-300 shrink-0 bg-slate-100">
                    <img src={getSafeBannerUrl(defaultForSelected)} alt="ค่าเริ่มต้น" className="w-full h-full object-cover" />
                  </div>
                  <div>
                    <p className="text-xs font-extrabold text-purple-950">ค่าเริ่มต้นมาตรฐานประจำหน้านี้</p>
                    <p className="text-2xs text-purple-700">ภาพที่ระบบกำหนดไว้ให้เป็นค่ามาตรฐานสำหรับหน้านี้</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleSelectPreset(defaultForSelected)}
                  className="px-3 py-1.5 rounded-xl bg-purple-600 text-white text-xs font-bold hover:bg-purple-700 transition-colors shadow-2xs cursor-pointer"
                >
                  เลือกภาพนี้
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {PRESET_BANNERS.map((preset) => (
                  <div
                    key={preset.id}
                    onClick={() => handleSelectPreset(preset.url)}
                    className={`group relative rounded-2xl overflow-hidden border-2 cursor-pointer transition-all ${
                      previewUrl === preset.url
                        ? "border-purple-600 shadow-md ring-2 ring-purple-500/20"
                        : "border-slate-200 hover:border-purple-400 shadow-2xs"
                    }`}
                  >
                    <div className="relative aspect-[3/1] bg-slate-100 overflow-hidden">
                      <img
                        src={getSafeBannerUrl(preset.url)}
                        alt={preset.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        referrerPolicy="no-referrer"
                      />
                      {previewUrl === preset.url && (
                        <div className="absolute top-1.5 right-1.5 p-1 rounded-full bg-purple-600 text-white shadow-xs">
                          <Check className="w-3 h-3" />
                        </div>
                      )}
                    </div>
                    <div className="p-2.5 bg-white">
                      <p className="text-xs font-bold text-slate-800 line-clamp-1">{preset.name}</p>
                      <p className="text-2xs text-slate-500 line-clamp-1">{preset.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Publish Mode & Visibility Lock Control */}
          <div className="p-3.5 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200/90 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
            <div className="flex items-start sm:items-center gap-2.5">
              <div className={`p-2 rounded-xl shrink-0 ${isPublished ? "bg-amber-600 text-white" : "bg-white text-slate-500 border border-slate-200"}`}>
                {isPublished ? <EyeOff className="w-4 h-4" /> : <ShieldCheck className="w-4 h-4 text-indigo-600" />}
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-black text-slate-900">โหมดเผยแพร่ระบบ (ซ่อนปุ่มเปลี่ยนแบนเนอร์)</span>
                  <span className={`px-2 py-0.5 rounded-md text-2xs font-extrabold ${isPublished ? "bg-amber-600 text-white shadow-2xs" : "bg-slate-200 text-slate-700"}`}>
                    {isPublished ? "ซ่อนปุ่มอยู่ (โหมดเผยแพร่)" : "แสดงปุ่มปกติ (โหมดแก้ไข)"}
                  </span>
                </div>
                <p className="text-2xs text-slate-600 mt-0.5 leading-relaxed">
                  เมื่อเผยแพร่ระบบจริง (บนลิงก์แชร์ ais-pre หรือ Production) ระบบจะซ่อนปุ่มเปลี่ยนแบนเนอร์อัตโนมัติ เพื่อป้องกันผู้ใช้งานทั่วไปแก้ไข
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                const next = !isPublished;
                setIsPublished(next);
                setAppPublished(next);
              }}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer shadow-2xs ${
                isPublished 
                  ? "bg-amber-600 hover:bg-amber-700 text-white border border-amber-700" 
                  : "bg-white hover:bg-slate-100 text-slate-700 border border-slate-300"
              }`}
            >
              {isPublished ? "คลิกเพื่อปลดล็อก (แสดงปุ่ม)" : "คลิกเพื่อล็อกและซ่อนปุ่ม"}
            </button>
          </div>

          {/* Feedback message */}
          {successMessage && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold animate-fadeIn">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50/80">
          <button
            type="button"
            onClick={handleResetCurrent}
            className="flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-slate-600 hover:text-rose-600 hover:bg-rose-50 border border-slate-200 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>คืนค่าเริ่มต้นมาตรฐาน</span>
          </button>

          <div className="flex flex-wrap items-center justify-end gap-2">
            <button
              type="button"
              onClick={handleSetAsSystemMainBrand}
              disabled={!previewUrl || previewError || isSaving}
              className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-bold text-xs sm:text-sm shadow-sm transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
              title="ตั้งค่าภาพนี้เป็นแบรนด์หน้าหลักของระบบทันที"
            >
              <Crown className="w-4 h-4 text-amber-100" />
              <span>ตั้งเป็นแบรนด์หน้าหลัก</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-200/70 transition-colors"
            >
              ยกเลิก
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={!previewUrl || previewError || isSaving}
              className="flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-700 to-indigo-700 hover:from-purple-800 hover:to-indigo-800 text-white text-xs sm:text-sm font-bold shadow-md shadow-purple-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {isSaving ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>กำลังบันทึกและซิงค์คลาวด์...</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>{applyMode === "all" ? "บันทึกใช้กับทุกหน้า & เผยแพร่" : "บันทึกเฉพาะหน้านี้ & เผยแพร่"}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
