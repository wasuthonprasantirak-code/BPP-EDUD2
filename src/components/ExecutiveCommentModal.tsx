import React, { useState } from "react";
import { createPortal } from "react-dom";
import { X, Sparkles, Check, MessageSquare, Plus, Trash2, Search, FileText } from "lucide-react";

interface ExecutiveCommentModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentComment: string;
  onSaveComment: (comment: string) => void;
  approverName?: string;
  approverPosition?: string;
}

export const EXECUTIVE_PRESET_COMMENTS = [
  {
    category: "🏆 ด้านผลการปฏิบัติงานตามแผน กพด.",
    presets: [
      "รับทราบ ผลการปฏิบัติงานเป็นไปด้วยความเรียบร้อย",
      "รับทราบ ดำเนินการบรรลุตามเป้าหมายและวัตถุประสงค์ตามแผน กพด.",
      "ผลการดำเนินงานอยู่ในเกณฑ์ดีเยี่ยม ควรนำไปเป็นแบบอย่าง (Best Practice)",
      "รับทราบ ดำเนินการได้ตามขั้นตอนและสรุปรายงานผลสมบูรณ์ครบถ้วน",
    ]
  },
  {
    category: "📚 ด้านวิชาการ การเรียนรู้ และทักษะ",
    presets: [
      "ควรเน้นย้ำทักษะการอ่านออกเขียนได้และคิดคำนวณเพิ่มเติม",
      "ส่งเสริมการใช้สื่อเทคโนโลยีและนวัตกรรมการเรียนรู้อย่างต่อเนื่อง",
      "ควรเพิ่มกิจกรรมฝึกทักษะอาชีพและการพึ่งตนเองของนักเรียน",
      "เน้นการจัดกิจกรรมเชิงปฏิบัติตามหลักปรัชญาของเศรษฐกิจพอเพียง",
    ]
  },
  {
    category: "🥗 ด้านสุขอนามัย โภชนาการ และการส่งเสริมสุขภาพ",
    presets: [
      "กำกับติดตามภาวะโภชนาการและสุขภาพอนามัยของนักเรียนอย่างใกล้ชิด",
      "ส่งเสริมการบริโภคอาหาร 5 หมู่ และการออกกำลังกายสม่ำเสมอ",
      "รักษามาตรฐานสุขอนามัยในการประกอบอาหารกลางวันของนักเรียน",
    ]
  },
  {
    category: "🤝 ด้านชุมชน งบประมาณ และการติดตาม",
    presets: [
      "เห็นควรสนับสนุนงบประมาณและสื่อการสอนอย่างต่อเนื่อง",
      "ส่งเสริมการขยายผลกิจกรรมจากโรงเรียนสู่ชุมชนและผู้ปกครอง",
      "ควรสร้างความร่วมมือกับภาคีเครือข่ายในการพัฒนาโรงเรียน",
      "รับทราบ มอบหมายผู้รับผิดชอบกำกับติดตามและประเมินผลต่อเนื่อง",
    ]
  }
];

export function ExecutiveCommentModal({
  isOpen,
  onClose,
  currentComment,
  onSaveComment,
  approverName,
  approverPosition,
}: ExecutiveCommentModalProps) {
  const [commentText, setCommentText] = useState<string>(currentComment || "");
  const [searchQuery, setSearchQuery] = useState<string>("");

  if (!isOpen) return null;

  const handleSelectPreset = (presetText: string) => {
    if (!commentText.trim()) {
      setCommentText(presetText);
    } else if (commentText.includes(presetText)) {
      // Already includes, skip
    } else {
      setCommentText(`${commentText.trim()} ${presetText}`);
    }
  };

  const handleSave = () => {
    onSaveComment(commentText.trim());
    onClose();
  };

  const handleClear = () => {
    setCommentText("");
  };

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-indigo-950 via-slate-900 to-indigo-950 text-white p-4 sm:p-5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-400/30 flex items-center justify-center text-amber-300">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="typo-app-h3 text-white text-base sm:text-lg font-black tracking-tight">
                เลือกข้อคิดเห็นสำเร็จรูปของผู้บริหาร / ผู้ตรวจการศึกษา
              </h3>
              <p className="text-xs text-indigo-200 font-medium">
                {approverName ? `บันทึกความเห็นโดย: ${approverName} (${approverPosition || "ผู้ตรวจ/ผู้บังคับบัญชา"})` : "คลิกเลือกข้อคิดเห็นเพื่อบันทึกลงในเอกสารรายงาน A4"}
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

        {/* Modal Content */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1">
          
          {/* Active Comment Textarea Area */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-extrabold text-slate-800 flex items-center gap-1.5">
                <MessageSquare className="w-4 h-4 text-indigo-600" />
                ข้อคิดเห็นที่จะบันทึกลงในเอกสาร:
              </label>
              {commentText && (
                <button
                  type="button"
                  onClick={handleClear}
                  className="text-xs font-bold text-rose-600 hover:text-rose-800 flex items-center gap-1 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>ล้างข้อความ</span>
                </button>
              )}
            </div>
            
            <textarea
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder="คลิกเลือกข้อคิดเห็นด้านล่าง หรือพิมพ์ข้อคิดเห็นเพิ่มเติมที่นี่..."
              rows={3}
              className="w-full p-3 rounded-xl border border-slate-300 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 text-xs sm:text-sm font-medium text-slate-800 leading-relaxed shadow-inner"
            />
          </div>

          {/* Search Presets Box */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ค้นหาข้อคิดเห็นสำเร็จรูป (เช่น 'อ่านไม่ออก', 'รับทราบ', 'โภชนาการ')..."
              className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-xs font-medium bg-slate-50 focus:bg-white focus:border-indigo-500 transition-all"
            />
          </div>

          {/* Preset Categories & Chips */}
          <div className="space-y-4 pt-1">
            <p className="text-xs font-extrabold text-indigo-950 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              คลิกข้อคิดเห็นสำเร็จรูปที่ต้องการเพื่อใส่ลงในช่องข้อความ:
            </p>

            {EXECUTIVE_PRESET_COMMENTS.map((cat, idx) => {
              const filteredPresets = cat.presets.filter((p) =>
                p.toLowerCase().includes(searchQuery.toLowerCase())
              );

              if (filteredPresets.length === 0) return null;

              return (
                <div key={idx} className="space-y-2 bg-slate-50/80 p-3 rounded-xl border border-slate-200/80">
                  <h4 className="text-xs font-extrabold text-slate-800 flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-indigo-600" />
                    {cat.category}
                  </h4>
                  <div className="flex flex-col gap-1.5">
                    {filteredPresets.map((preset, pIdx) => {
                      const isSelected = commentText.includes(preset);
                      return (
                        <button
                          key={pIdx}
                          type="button"
                          onClick={() => handleSelectPreset(preset)}
                          className={`text-left p-2.5 rounded-xl text-xs font-semibold leading-relaxed transition-all cursor-pointer flex items-start justify-between gap-2 border ${
                            isSelected
                              ? "bg-indigo-50 text-indigo-950 border-indigo-300 shadow-xs"
                              : "bg-white text-slate-700 border-slate-200/90 hover:border-indigo-300 hover:bg-indigo-50/40"
                          }`}
                        >
                          <span>{preset}</span>
                          <span
                            className={`shrink-0 text-[11px] font-extrabold px-2 py-0.5 rounded-md flex items-center gap-1 ${
                              isSelected
                                ? "bg-indigo-600 text-white"
                                : "bg-slate-100 text-slate-600 group-hover:bg-indigo-100"
                            }`}
                          >
                            {isSelected ? (
                              <>
                                <Check className="w-3 h-3" />
                                <span>เลือกแล้ว</span>
                              </>
                            ) : (
                              <>
                                <Plus className="w-3 h-3 text-indigo-600" />
                                <span>เลือก</span>
                              </>
                            )}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

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

          <button
            type="button"
            onClick={handleSave}
            className="px-5 py-2 rounded-xl text-xs sm:text-sm font-extrabold bg-gradient-to-r from-indigo-800 to-indigo-950 text-white hover:from-indigo-900 hover:to-slate-900 shadow-md shadow-indigo-200 flex items-center gap-2 cursor-pointer transition-all"
          >
            <Check className="w-4 h-4" />
            <span>บันทึกข้อคิดเห็นลงเอกสาร</span>
          </button>
        </div>

      </div>
    </div>,
    document.body
  );
}
