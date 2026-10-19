import React, { useRef, useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { X, Edit3, Upload, Trash2, Check, RefreshCw, Sliders, ShieldCheck, Sparkles, Image as ImageIcon, Eye } from "lucide-react";

interface DigitalSignatureModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  signatoryName: string;
  signatoryPosition: string;
  existingSignatureUrl?: string;
  onSaveSignature: (signatureDataUrl: string | "") => void;
}

export function DigitalSignatureModal({
  isOpen,
  onClose,
  title,
  signatoryName,
  signatoryPosition,
  existingSignatureUrl,
  onSaveSignature,
}: DigitalSignatureModalProps) {
  const [activeTab, setActiveTab] = useState<"draw" | "upload">("draw");
  
  // Canvas Draw State
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);
  const [penColor, setPenColor] = useState("#1e3a8a"); // Navy Blue default
  const [penWidth, setPenWidth] = useState(3.5);
  
  // Upload & Auto Background Removal State
  const [rawUploadedImage, setRawUploadedImage] = useState<string | null>(null);
  const [processedSignatureUrl, setProcessedSignatureUrl] = useState<string | null>(null);
  const [bgThreshold, setBgThreshold] = useState<number>(200); // 150 - 245
  const [contrastBoost, setContrastBoost] = useState<number>(1.3); // 1.0 - 2.5
  const [isProcessing, setIsProcessing] = useState(false);

  // Initialize Canvas for Drawing
  const initCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    
    // Clear canvas with transparent background
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawn(false);
  }, []);

  useEffect(() => {
    if (isOpen && activeTab === "draw") {
      setTimeout(() => {
        initCanvas();
      }, 50);
    }
  }, [isOpen, activeTab, initCanvas]);

  if (!isOpen) return null;

  // Handle Drawing Start
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;
    
    const x = (clientX - rect.left) * (canvas.width / rect.width);
    const y = (clientY - rect.top) * (canvas.height / rect.height);

    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.strokeStyle = penColor;
    ctx.lineWidth = penWidth;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    setIsDrawing(true);
    setHasDrawn(true);
  };

  // Handle Drawing Move
  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;

    const x = (clientX - rect.left) * (canvas.width / rect.width);
    const y = (clientY - rect.top) * (canvas.height / rect.height);

    ctx.lineTo(x, y);
    ctx.stroke();
  };

  // Handle Drawing End
  const stopDrawing = () => {
    setIsDrawing(false);
  };

  // Image Upload Handler
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      setRawUploadedImage(dataUrl);
      processImageBackground(dataUrl, bgThreshold, contrastBoost);
    };
    reader.readAsDataURL(file);
  };

  // Auto Background Removal Algorithm using Offscreen Canvas Pixel Processing
  const processImageBackground = (imageDataUrl: string, threshold: number, contrast: number) => {
    setIsProcessing(true);
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        setIsProcessing(false);
        return;
      }

      // Constrain size while preserving detail
      const maxDim = 800;
      let width = img.width;
      let height = img.height;
      if (width > maxDim || height > maxDim) {
        if (width > height) {
          height = Math.round((height * maxDim) / width);
          width = maxDim;
        } else {
          width = Math.round((width * maxDim) / height);
          height = maxDim;
        }
      }

      canvas.width = width;
      canvas.height = height;

      ctx.drawImage(img, 0, 0, width, height);
      const imgData = ctx.getImageData(0, 0, width, height);
      const data = imgData.data;

      // Process pixels: turn white / light paper pixels transparent
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];

        // Luminance calculation
        const brightness = 0.299 * r + 0.587 * g + 0.114 * b;

        if (brightness >= threshold || (r > threshold && g > threshold && b > threshold)) {
          // Transparent background pixel
          data[i + 3] = 0;
        } else {
          // Keep signature stroke and enhance contrast / darken ink
          const factor = contrast;
          data[i] = Math.max(0, Math.min(255, (r - 128) * factor + 128 - 20));
          data[i + 1] = Math.max(0, Math.min(255, (g - 128) * factor + 128 - 20));
          data[i + 2] = Math.max(0, Math.min(255, (b - 128) * factor + 128 - 20));
          data[i + 3] = 255; // Fully opaque signature line
        }
      }

      ctx.putImageData(imgData, 0, 0);
      const transparentPng = canvas.toDataURL("image/png");
      setProcessedSignatureUrl(transparentPng);
      setIsProcessing(false);
    };
    img.onerror = () => {
      setIsProcessing(false);
    };
    img.src = imageDataUrl;
  };

  // Trigger re-processing when sliders change
  const handleThresholdChange = (val: number) => {
    setBgThreshold(val);
    if (rawUploadedImage) {
      processImageBackground(rawUploadedImage, val, contrastBoost);
    }
  };

  const handleContrastChange = (val: number) => {
    setContrastBoost(val);
    if (rawUploadedImage) {
      processImageBackground(rawUploadedImage, bgThreshold, val);
    }
  };

  // Save Signature Action
  const handleSave = () => {
    if (activeTab === "draw") {
      const canvas = canvasRef.current;
      if (!canvas || !hasDrawn) return;
      const signaturePng = canvas.toDataURL("image/png");
      onSaveSignature(signaturePng);
    } else {
      if (!processedSignatureUrl) return;
      onSaveSignature(processedSignatureUrl);
    }
    onClose();
  };

  // Remove Signature Action
  const handleRemove = () => {
    if (confirm("คุณต้องการลบลายเซ็นนี้ออกจากเอกสารใช่หรือไม่?")) {
      onSaveSignature("");
      onClose();
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-xl overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-4 sm:p-5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-300">
              <Edit3 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="typo-app-h3 text-white text-base sm:text-lg font-black tracking-tight">{title}</h3>
              <p className="text-xs text-indigo-200 font-medium">
                {signatoryName ? `${signatoryName} (${signatoryPosition || "ผู้รับผิดชอบ"})` : "ลายเซ็นดิจิทัลสำหรับลงนามเอกสาร"}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selector Navigation */}
        <div className="flex border-b border-slate-200 bg-slate-50/80 p-1.5 gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab("draw")}
            className={`flex-1 py-2 px-3 rounded-xl text-xs sm:text-sm font-extrabold flex items-center justify-center gap-2 transition-all cursor-pointer ${
              activeTab === "draw"
                ? "bg-white text-indigo-950 shadow-xs border border-slate-200/90"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            }`}
          >
            <Edit3 className="w-4 h-4 text-indigo-600" />
            <span>วาดลายเซ็น (E-Signature)</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("upload")}
            className={`flex-1 py-2 px-3 rounded-xl text-xs sm:text-sm font-extrabold flex items-center justify-center gap-2 transition-all cursor-pointer ${
              activeTab === "upload"
                ? "bg-white text-indigo-950 shadow-xs border border-slate-200/90"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            }`}
          >
            <Upload className="w-4 h-4 text-emerald-600" />
            <span>อัปโหลดรูป (ลบพื้นหลังอัจฉริยะ)</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1">
          
          {/* TAB 1: DRAW CANVAS */}
          {activeTab === "draw" && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                  วาดลายเซ็นลงในกรอบด้านล่าง (รองรับทั้งเมาส์และหน้าจอสัมผัส)
                </span>
                <button
                  type="button"
                  onClick={initCanvas}
                  className="text-xs font-bold text-slate-600 hover:text-rose-600 flex items-center gap-1 hover:bg-rose-50 px-2 py-1 rounded-lg transition-colors cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>ล้างกระดาน</span>
                </button>
              </div>

              {/* Drawing Controls: Colors & Pen Thickness */}
              <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 p-2.5 rounded-xl border border-slate-200/80">
                {/* Color Selector */}
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-500">สีปากกา:</span>
                  <div className="flex items-center gap-1.5">
                    {[
                      { name: "น้ำเงินเข้ม", color: "#1e3a8a" },
                      { name: "ดำ", color: "#0f172a" },
                      { name: "ฟ้าสด", color: "#2563eb" },
                    ].map((c) => (
                      <button
                        key={c.color}
                        type="button"
                        onClick={() => setPenColor(c.color)}
                        className={`w-6 h-6 rounded-full border-2 transition-transform cursor-pointer ${
                          penColor === c.color ? "scale-110 border-indigo-600 shadow-xs" : "border-white"
                        }`}
                        style={{ backgroundColor: c.color }}
                        title={c.name}
                      />
                    ))}
                  </div>
                </div>

                {/* Pen Thickness Selector */}
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-500">ขนาดหัวเส้น:</span>
                  <div className="flex items-center gap-1">
                    {[
                      { label: "เล็ก", val: 2 },
                      { label: "กลาง", val: 3.5 },
                      { label: "หนา", val: 5 },
                    ].map((w) => (
                      <button
                        key={w.val}
                        type="button"
                        onClick={() => setPenWidth(w.val)}
                        className={`px-2 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                          penWidth === w.val
                            ? "bg-indigo-600 text-white shadow-2xs"
                            : "bg-white text-slate-600 hover:bg-slate-200"
                        }`}
                      >
                        {w.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Interactive HTML5 Signature Canvas */}
              <div className="relative border-2 border-dashed border-slate-300 rounded-2xl bg-white overflow-hidden shadow-inner touch-none">
                <canvas
                  ref={canvasRef}
                  width={500}
                  height={220}
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={stopDrawing}
                  onMouseLeave={stopDrawing}
                  onTouchStart={startDrawing}
                  onTouchMove={draw}
                  onTouchEnd={stopDrawing}
                  className="w-full h-[180px] sm:h-[200px] cursor-crosshair bg-transparent"
                />
                
                {/* Guidelines Line */}
                <div className="absolute left-8 right-8 bottom-8 border-b border-indigo-100 pointer-events-none flex justify-between text-[10px] font-bold text-slate-300">
                  <span>เส้นฐานวางลายเซ็น</span>
                  <span>(Signature Base)</span>
                </div>

                {!hasDrawn && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400 pointer-events-none p-4 text-center">
                    <Edit3 className="w-8 h-8 opacity-40 mb-1.5 text-indigo-400" />
                    <p className="text-xs font-extrabold text-slate-500">เซ็นลายเซ็นตรงนี้ด้วยนิ้วมือหรือเมาส์</p>
                    <p className="text-[11px] text-slate-400">ระบบจะสร้างลายเซ็นโปร่งใส PNG เพื่อใส่ในเอกสารทันที</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: UPLOAD & AUTO BACKGROUND REMOVAL */}
          {activeTab === "upload" && (
            <div className="space-y-4">
              {/* File Upload Box */}
              {!rawUploadedImage ? (
                <label className="border-2 border-dashed border-indigo-200 hover:border-indigo-500 bg-indigo-50/40 hover:bg-indigo-50 rounded-2xl p-6 sm:p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-all">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-100 text-indigo-700 flex items-center justify-center mb-3 shadow-2xs">
                    <Upload className="w-6 h-6" />
                  </div>
                  <p className="text-xs sm:text-sm font-extrabold text-slate-800 mb-1">
                    คลิกเพื่อเลือกไฟล์รูปภาพลายเซ็น (PNG, JPG, WEBP)
                  </p>
                  <p className="text-xs text-indigo-600 font-semibold mb-2">
                    ✨ ระบบจะลบพื้นหลังกระดาษสีขาวให้อัตโนมัติ ปรับลายเซ็นให้ใสและคมชัด
                  </p>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-white text-indigo-900 border border-indigo-200 text-xs font-bold shadow-2xs">
                    <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                    เลือกไฟล์รูปภาพ
                  </span>
                  <input
                    type="file"
                    accept="image/png, image/jpeg, image/jpg, image/webp"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                </label>
              ) : (
                <div className="space-y-4">
                  {/* Re-upload button */}
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-emerald-600" />
                      ผลการลบพื้นหลังและปรับความคมชัดของลายเซ็น
                    </span>
                    <label className="text-xs font-bold text-indigo-700 hover:text-indigo-900 hover:bg-indigo-50 px-2.5 py-1 rounded-lg transition-colors cursor-pointer flex items-center gap-1 border border-indigo-200">
                      <Upload className="w-3.5 h-3.5" />
                      <span>เปลี่ยนรูปใหม่</span>
                      <input
                        type="file"
                        accept="image/png, image/jpeg, image/jpg, image/webp"
                        onChange={handleImageUpload}
                        className="hidden"
                      />
                    </label>
                  </div>

                  {/* Comparison View (Original vs Transparent) */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Original Image */}
                    <div className="bg-slate-100 rounded-xl p-2.5 border border-slate-200 flex flex-col items-center">
                      <span className="text-[11px] font-bold text-slate-500 mb-1.5 flex items-center gap-1">
                        <ImageIcon className="w-3.5 h-3.5" />
                        ต้นฉบับ
                      </span>
                      <div className="w-full h-32 bg-white rounded-lg flex items-center justify-center p-2 border border-slate-200 overflow-hidden">
                        <img src={rawUploadedImage} alt="Original Signature" className="max-h-full max-w-full object-contain" />
                      </div>
                    </div>

                    {/* Processed Transparent Signature */}
                    <div className="bg-slate-100 rounded-xl p-2.5 border border-slate-200 flex flex-col items-center">
                      <span className="text-[11px] font-bold text-emerald-700 mb-1.5 flex items-center gap-1">
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        ลายเซ็นลบพื้นหลังแล้ว (โปร่งใส)
                      </span>
                      <div 
                        className="w-full h-32 rounded-lg flex items-center justify-center p-2 border border-emerald-300/80 overflow-hidden relative shadow-inner"
                        style={{
                          backgroundImage: "linear-gradient(45deg, #e2e8f0 25%, transparent 25%), linear-gradient(-45deg, #e2e8f0 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #e2e8f0 75%), linear-gradient(-45deg, transparent 75%, #e2e8f0 75%)",
                          backgroundSize: "16px 16px",
                          backgroundPosition: "0 0, 0 8px, 8px -8px, -8px 0px",
                          backgroundColor: "#f8fafc"
                        }}
                      >
                        {isProcessing ? (
                          <div className="flex flex-col items-center gap-1 text-xs text-emerald-700 font-bold">
                            <RefreshCw className="w-5 h-5 animate-spin" />
                            <span>กำลังลบพื้นหลัง...</span>
                          </div>
                        ) : processedSignatureUrl ? (
                          <img src={processedSignatureUrl} alt="Processed Transparent Signature" className="max-h-full max-w-full object-contain drop-shadow-xs" />
                        ) : (
                          <span className="text-xs text-slate-400">ไม่มีข้อมูล</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Auto Background Removal Adjustment Sliders */}
                  <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/90 space-y-3">
                    <div className="flex items-center justify-between text-xs font-extrabold text-slate-800">
                      <span className="flex items-center gap-1.5">
                        <Sliders className="w-4 h-4 text-indigo-600" />
                        ปรับความเนียนการลบพื้นหลัง (Background Removal Sensitivity)
                      </span>
                      <span className="text-indigo-700 font-mono bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-200">{bgThreshold}</span>
                    </div>

                    {/* Sensitivity Slider */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-[11px] text-slate-500 font-medium">
                        <span>ลบเฉพาะขาวบริสุทธิ์</span>
                        <span>ลบกระดาษเงา/สีอ่อน</span>
                      </div>
                      <input
                        type="range"
                        min="150"
                        max="245"
                        step="1"
                        value={bgThreshold}
                        onChange={(e) => handleThresholdChange(Number(e.target.value))}
                        className="w-full accent-indigo-600 cursor-pointer h-2 bg-slate-200 rounded-lg"
                      />
                    </div>

                    {/* Ink Contrast Slider */}
                    <div className="space-y-1 pt-1">
                      <div className="flex justify-between text-[11px] text-slate-500 font-medium">
                        <span>ความเข้มเส้นหมึก:</span>
                        <span className="text-indigo-700 font-mono">{contrastBoost.toFixed(1)}x</span>
                      </div>
                      <input
                        type="range"
                        min="1.0"
                        max="2.5"
                        step="0.1"
                        value={contrastBoost}
                        onChange={(e) => handleContrastChange(Number(e.target.value))}
                        className="w-full accent-indigo-600 cursor-pointer h-2 bg-slate-200 rounded-lg"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Existing Signature Preview & Management */}
          {existingSignatureUrl && (
            <div className="bg-indigo-50/70 border border-indigo-200 rounded-xl p-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-16 h-10 bg-white rounded-lg border border-indigo-200 flex items-center justify-center p-1 overflow-hidden">
                  <img src={existingSignatureUrl} alt="Existing Signature" className="max-h-full max-w-full object-contain" />
                </div>
                <div>
                  <p className="text-xs font-extrabold text-indigo-950">มีลายเซ็นที่บันทึกไว้อยู่แล้ว</p>
                  <p className="text-[11px] text-indigo-700">สามารถวาดใหม่ อัปโหลดรูปภาพ หรือลบออกได้</p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleRemove}
                className="px-2.5 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-extrabold flex items-center gap-1 transition-colors cursor-pointer shrink-0"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>ลบลายเซ็นออก</span>
              </button>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="bg-slate-50 border-t border-slate-200 p-3.5 sm:p-4 flex items-center justify-between shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs sm:text-sm font-bold text-slate-600 hover:bg-slate-200 transition-colors cursor-pointer"
          >
            ยกเลิก
          </button>

          <div className="flex items-center gap-2">
            {existingSignatureUrl && (
              <button
                type="button"
                onClick={handleRemove}
                className="px-3 py-2 rounded-xl text-xs sm:text-sm font-bold text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
              >
                ลบลายเซ็น
              </button>
            )}

            <button
              type="button"
              onClick={handleSave}
              disabled={activeTab === "draw" ? !hasDrawn : !processedSignatureUrl}
              className={`px-5 py-2 rounded-xl text-xs sm:text-sm font-extrabold flex items-center gap-2 shadow-xs transition-all cursor-pointer ${
                (activeTab === "draw" ? hasDrawn : processedSignatureUrl)
                  ? "bg-gradient-to-r from-indigo-700 to-blue-700 text-white hover:from-indigo-800 hover:to-blue-800 shadow-indigo-200"
                  : "bg-slate-200 text-slate-400 cursor-not-allowed"
              }`}
            >
              <Check className="w-4 h-4" />
              <span>บันทึกลายเซ็นลงเอกสาร</span>
            </button>
          </div>
        </div>

      </div>
    </div>,
    document.body
  );
}
