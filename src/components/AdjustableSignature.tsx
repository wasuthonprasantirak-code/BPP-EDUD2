import React, { useState, useEffect, useRef } from "react";
import { Edit3, Move, ZoomIn, ZoomOut, RotateCcw, X, Check, Trash2 } from "lucide-react";

interface AdjustableSignatureProps {
  signatureUrl: string;
  alt: string;
  onOpenModal: () => void;
  onClear?: () => void;
  roleLabel?: string;
  initialTransform?: { x: number; y: number; scale: number };
  onTransformChange?: (transform: { x: number; y: number; scale: number }) => void;
  isExporting?: boolean;
}

export function AdjustableSignature({
  signatureUrl,
  alt,
  onOpenModal,
  onClear,
  roleLabel = "ลายเซ็น",
  initialTransform = { x: 0, y: 0, scale: 1 },
  onTransformChange,
  isExporting = false,
}: AdjustableSignatureProps) {
  const [transform, setTransform] = useState(initialTransform);
  const [isEditing, setIsEditing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0, initX: 0, initY: 0 });

  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (initialTransform) {
      setTransform(initialTransform);
    }
  }, [initialTransform?.x, initialTransform?.y, initialTransform?.scale]);

  // Handle Dragging Window Listeners
  useEffect(() => {
    if (!isDragging) return;

    const handlePointerMove = (e: MouseEvent | TouchEvent) => {
      const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
      const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;

      const dx = clientX - dragStart.x;
      const dy = clientY - dragStart.y;

      const updated = {
        ...transform,
        x: Math.round(dragStart.initX + dx),
        y: Math.round(dragStart.initY + dy),
      };

      setTransform(updated);
      if (onTransformChange) {
        onTransformChange(updated);
      }
    };

    const handlePointerUp = () => {
      setIsDragging(false);
    };

    window.addEventListener("mousemove", handlePointerMove);
    window.addEventListener("mouseup", handlePointerUp);
    window.addEventListener("touchmove", handlePointerMove);
    window.addEventListener("touchend", handlePointerUp);

    return () => {
      window.removeEventListener("mousemove", handlePointerMove);
      window.removeEventListener("mouseup", handlePointerUp);
      window.removeEventListener("touchmove", handlePointerMove);
      window.removeEventListener("touchend", handlePointerUp);
    };
  }, [isDragging, dragStart, transform, onTransformChange]);

  const startDrag = (e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation();
    setIsEditing(true);
    setIsDragging(true);

    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;

    setDragStart({
      x: clientX,
      y: clientY,
      initX: transform.x,
      initY: transform.y,
    });
  };

  const handleZoom = (delta: number) => {
    setTransform((prev) => {
      const nextScale = Math.min(2.5, Math.max(0.4, Number((prev.scale + delta).toFixed(2))));
      const updated = { ...prev, scale: nextScale };
      if (onTransformChange) onTransformChange(updated);
      return updated;
    });
  };

  const handleReset = () => {
    const defaultPos = { x: 0, y: 0, scale: 1 };
    setTransform(defaultPos);
    if (onTransformChange) onTransformChange(defaultPos);
  };

  if (!signatureUrl) {
    if (isExporting) {
      return null;
    }
    return (
      <div data-html2canvas-ignore="true" className="flex items-center gap-1.5 print:hidden">
        <div
          className="flex-1 min-w-[100px] max-w-[150px] h-8 flex items-center justify-center cursor-pointer hover:bg-slate-100/80 rounded transition-colors border border-dashed border-slate-300/60"
          onClick={onOpenModal}
          title="คลิกเพื่อเซ็นชื่อ"
        >
          <span className="text-[10px] text-slate-400 font-medium">คลิกเพื่อเซ็นชื่อ</span>
        </div>
        <button
          type="button"
          onClick={onOpenModal}
          className="text-[10px] font-extrabold text-indigo-700 hover:text-indigo-900 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 px-1.5 py-0.5 rounded-md flex items-center gap-1 transition cursor-pointer shrink-0"
        >
          <Edit3 className="w-3 h-3 text-indigo-600" />
          <span>เซ็นชื่อ</span>
        </button>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={`relative flex items-center justify-center min-w-[110px] max-w-[160px] min-h-[36px] group ${
        isEditing ? "z-[60]" : "z-[40]"
      }`}
    >
      {/* Floating Control Bar Overlay (Matches user screenshot) */}
      {isEditing && (
        <div
          data-html2canvas-ignore="true"
          className="absolute -top-10 left-1/2 -translate-x-1/2 z-30 flex items-center gap-1 bg-slate-900/90 text-white px-2 py-1 rounded-xl shadow-xl backdrop-blur-xs text-[11px] font-bold whitespace-nowrap animate-fadeIn border border-slate-700 select-none print:hidden"
        >
          {/* Drag Handle Indicator */}
          <div
            onMouseDown={startDrag}
            onTouchStart={startDrag}
            className="flex items-center gap-1 px-1.5 py-0.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white cursor-grab active:cursor-grabbing"
            title="คลิกลากเพื่อย้ายตำแหน่ง"
          >
            <Move className="w-3 h-3" />
            <span>ลากวาง</span>
          </div>

          <div className="w-[1px] h-3 bg-slate-700 my-auto"></div>

          {/* Zoom In */}
          <button
            type="button"
            onClick={() => handleZoom(0.1)}
            className="p-1 hover:bg-slate-700 rounded-md transition-colors text-slate-200 hover:text-white cursor-pointer"
            title="ขยายขนาด (+10%)"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>

          {/* Zoom Out */}
          <button
            type="button"
            onClick={() => handleZoom(-0.1)}
            className="p-1 hover:bg-slate-700 rounded-md transition-colors text-slate-200 hover:text-white cursor-pointer"
            title="ย่อขนาด (-10%)"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>

          {/* Reset Position */}
          <button
            type="button"
            onClick={handleReset}
            className="p-1 hover:bg-slate-700 rounded-md transition-colors text-slate-200 hover:text-white cursor-pointer"
            title="คืนค่าตำแหน่งเดิม"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>

          {/* Edit / Change Signature */}
          <button
            type="button"
            onClick={onOpenModal}
            className="p-1 hover:bg-indigo-600 rounded-md transition-colors text-indigo-300 hover:text-white cursor-pointer"
            title="แก้ไขลายเซ็น"
          >
            <Edit3 className="w-3.5 h-3.5" />
          </button>

          {/* Delete / Clear Signature */}
          {onClear && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                if (confirm("คุณต้องการลบลายเซ็นนี้ออกจากเอกสารใช่หรือไม่?")) {
                  onClear();
                }
              }}
              className="p-1 hover:bg-rose-600 rounded-md transition-colors text-rose-300 hover:text-white cursor-pointer"
              title="ลบลายเซ็นออก"
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-400" />
            </button>
          )}

          <div className="w-[1px] h-3 bg-slate-700 my-auto"></div>

          {/* Close Toolbar */}
          <button
            type="button"
            onClick={() => setIsEditing(false)}
            className="p-1 hover:bg-rose-600 rounded-md transition-colors text-slate-400 hover:text-white cursor-pointer"
            title="ปิดเครื่องมือปรับตำแหน่ง"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Signature Frame / Container */}
      <div
        className={`relative flex items-center justify-center p-0.5 rounded transition-all select-none ${
          isExporting
            ? ""
            : isEditing
              ? "ring-2 ring-indigo-500/80 bg-indigo-50/20 shadow-xs cursor-grab active:cursor-grabbing"
              : "hover:ring-1 hover:ring-slate-300 hover:bg-slate-50/60 cursor-pointer"
        }`}
        onClick={() => setIsEditing(true)}
        onMouseDown={startDrag}
        onTouchStart={startDrag}
        title="คลิกลากเพื่อจัดวางตำแหน่งลายเซ็นอิสระ"
      >
        <img
          src={signatureUrl}
          alt={alt}
          loading="eager"
          draggable={false}
          className="object-contain pointer-events-none"
          style={{
            position: "relative",
            left: `${transform.x}px`,
            top: `${transform.y}px`,
            width: `${140 * transform.scale}px`,
            height: `${36 * transform.scale}px`,
            display: "block",
          }}
        />

        {/* Drag Tooltip Instruction Badge (Shown on edit or hover) */}
        {isEditing && (
          <div
            data-html2canvas-ignore="true"
            className="absolute -bottom-6 left-1/2 -translate-x-1/2 z-20 pointer-events-none text-[9.5px] font-medium text-slate-600 bg-white/90 border border-slate-200 px-1.5 py-0.2 rounded-md shadow-2xs whitespace-nowrap print:hidden"
          >
            คลิกลากเพื่อจัดวางตำแหน่ง
          </div>
        )}
      </div>

      {/* Edit Button (Visible when not actively editing) */}
      {!isEditing && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setIsEditing(true);
          }}
          data-html2canvas-ignore="true"
          className="print:hidden ml-1 text-[10px] font-extrabold text-indigo-700 hover:text-indigo-900 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 px-1.5 py-0.5 rounded-md flex items-center gap-1 transition cursor-pointer shrink-0 opacity-0 group-hover:opacity-100"
          title="ปรับตำแหน่งหรือแก้ไขลายเซ็น"
        >
          <Edit3 className="w-3 h-3 text-indigo-600" />
          <span>ปรับ</span>
        </button>
      )}
    </div>
  );
}
