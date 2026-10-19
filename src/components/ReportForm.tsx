import { useState, useEffect, FormEvent } from "react";
import { ActivityReport, ReportStatus, KOPODOT_GOALS, GeminiAnalysisResult } from "../types";
import { OFFICIAL_TARGET_SCHOOLS, getPrincipalBySchoolName } from "../data/schoolsData";
import { OFFICIAL_INDICATORS } from "../data/indicatorsData";
import { Sparkles, Save, Check, RefreshCw, AlertCircle, FileText, ChevronRight, X, GraduationCap, Coins, Users, HelpCircle, Image as ImageIcon, Video, WifiOff, Camera, MapPin, CheckSquare } from "lucide-react";
import { SmartFaceImage } from "./SmartFaceImage";
import { FieldGpsCameraModal } from "./FieldGpsCameraModal";

interface ReportFormProps {
  report: ActivityReport | null;
  onSave: (updated: ActivityReport) => void;
  onSaveOfflineDraft?: (draft: ActivityReport) => void;
  onClose: () => void;
  isSchoolLocked?: boolean;
}

export default function ReportForm({ report, onSave, onSaveOfflineDraft, onClose, isSchoolLocked = false }: ReportFormProps) {
  const [formData, setFormData] = useState<ActivityReport | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isDrafting, setIsDrafting] = useState(false);
  const [isSummarizingDetails, setIsSummarizingDetails] = useState(false);
  const [aiResult, setAiResult] = useState<GeminiAnalysisResult | null>(null);
  const [showAiModal, setShowAiModal] = useState(false);
  const [showGpsCameraModal, setShowGpsCameraModal] = useState(false);
  const [showPrePublishModal, setShowPrePublishModal] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  // Sync state with selected report
  useEffect(() => {
    if (report) {
      const mappedPrincipal = getPrincipalBySchoolName(report.schoolName);
      setFormData({
        ...report,
        reportPosition: report.reportPosition || "ครูผู้รับผิดชอบ",
        approverName: (mappedPrincipal && mappedPrincipal !== "ไม่ระบุชื่อครูใหญ่") ? mappedPrincipal : (report.approverName || "ไม่ระบุชื่อครูใหญ่")
      });
      setAiResult(null);
      setApiError(null);
    } else {
      setFormData(null);
    }
  }, [report]);

  if (!formData) return null;

  const handleChange = (field: keyof ActivityReport, value: any) => {
    setFormData((prev) => {
      if (!prev) return null;
      if (field === "goalCode") {
        const normalizedVal = value.replace(/[^\d]/g, "");
        const matchedKpi = OFFICIAL_INDICATORS.find(ind => ind.goalCode.replace(/[^\d]/g, "") === normalizedVal);
        return {
          ...prev,
          goalCode: value,
          kpiCode: matchedKpi ? matchedKpi.code : ""
        };
      }
      if (field === "schoolName") {
        const detectedPrincipal = getPrincipalBySchoolName(value);
        return {
          ...prev,
          schoolName: value,
          approverName: detectedPrincipal || prev.approverName
        };
      }
      return {
        ...prev,
        [field]: value
      };
    });
  };

  const handleLocalSave = (e: FormEvent) => {
    e.preventDefault();
    setShowPrePublishModal(true);
  };

  const confirmPublishSubmit = () => {
    if (!formData) return;
    onSave({
      ...formData,
      lastUpdated: new Date().toISOString()
    });
    setShowPrePublishModal(false);
  };

  // Call Gemini AI on server to analyze and rewrite report in formal bureaucratic style
  const handleAiAnalysis = async () => {
    setIsAnalyzing(true);
    setApiError(null);
    setAiResult(null);

    try {
      const res = await fetch("/api/gemini/analyze-report", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          projectName: formData.projectName,
          activityName: formData.activityName,
          objectives: formData.objectives,
          details: formData.details,
          quantitativeOutcome: formData.quantitativeOutcome,
          qualitativeOutcome: formData.qualitativeOutcome,
          problems: formData.problems,
          suggestions: formData.suggestions
        })
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Failed to analyze report");
      }

      const data: GeminiAnalysisResult = await res.json();
      setAiResult(data);
      setShowAiModal(true);
    } catch (err: any) {
      console.error(err);
      setApiError(err.message || "เกิดข้อผิดพลาดในการเรียกใช้บริการ Gemini AI กรุณาตรวจสอบการตั้งค่าคีย์ API");
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Apply Gemini AI recommendations directly into the active form
  const applyAiRecommendations = () => {
    if (!aiResult) return;

    setFormData((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        goalCode: aiResult.mappedGoalCode, // auto-select the recommended goal
        qualitativeOutcome: aiResult.bureaucraticSummary, // replace/enhance qualitative output with bureaucratic prose
        suggestions: aiResult.suggestions.join("\n") // insert AI strategic ideas
      };
    });

    setShowAiModal(false);
    alert("ปรับใช้วลีหนังสือราชการและเป้าหมาย กพด. จาก Gemini AI เรียบร้อยแล้ว!");
  };

  // Call Gemini AI server to auto-generate form draft details
  const handleSmartDraft = async () => {
    if (!formData.activityName) {
      alert("กรุณากรอกชื่อกิจกรรมย่อยก่อน เพื่อให้ Gemini AI นำไปยกร่างเนื้อหาได้ถูกต้อง");
      return;
    }

    setIsDrafting(true);
    setApiError(null);

    try {
      const res = await fetch("/api/gemini/smart-draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          activityName: formData.activityName,
          projectName: formData.projectName,
          schoolName: formData.schoolName
        })
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Failed to draft report content");
      }

      const draft = await res.json();
      setFormData((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          objectives: draft.objectives || prev.objectives,
          details: draft.details || prev.details,
          quantitativeOutcome: draft.quantitativeOutcome || prev.quantitativeOutcome,
          qualitativeOutcome: draft.qualitativeOutcome || prev.qualitativeOutcome,
          problems: draft.problems || prev.problems,
          suggestions: draft.suggestions || prev.suggestions
        };
      });

      alert("✨ Gemini AI ได้ช่วยยกร่างเนื้อหารายงานครบทุกหัวข้อเรียบร้อยแล้ว!");
    } catch (err: any) {
      console.error("Smart draft error:", err);
      setApiError(err.message || "เกิดข้อผิดพลาดในการยกร่างด้วย Gemini AI");
    } finally {
      setIsDrafting(false);
    }
  };

  // Call Gemini AI to summarize only the details field without distorting facts
  const handleSummarizeDetailsInForm = async () => {
    if (!formData.details || formData.details.trim().length === 0) {
      alert("กรุณากรอกหรือระบุข้อความรายละเอียดกิจกรรมก่อน เพื่อให้ AI นำไปย่อสรุป");
      return;
    }

    setIsSummarizingDetails(true);
    try {
      const res = await fetch("/api/gemini/summarize-activity", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          originalText: formData.details,
          activityName: formData.activityName,
          schoolName: formData.schoolName,
          goalName: formData.goalCode,
          targetLength: "standard"
        })
      });

      if (res.ok) {
        const data = await res.json();
        const resultText = (data.result || data.draft || "").trim();
        if (resultText) {
          setFormData((prev) => prev ? { ...prev, details: resultText } : null);
          return;
        }
      }
    } catch (err: any) {
      console.warn("AI summarize error in form:", err);
    } finally {
      setIsSummarizingDetails(false);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-md overflow-hidden max-w-5xl mx-auto">
      {/* Form Header */}
      <div className="bg-slate-900 px-6 py-4 flex items-center justify-between text-white border-b border-slate-800">
        <div className="flex items-center space-x-2.5 min-w-0 flex-1 mr-2">
          <div className={`p-1.5 rounded-lg shrink-0 ${isSchoolLocked ? "bg-amber-500/20 text-amber-400" : "bg-blue-500/20 text-blue-400"}`}>
            <FileText className="w-5 h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h3 
                className="font-extrabold text-xs sm:text-sm md:text-base tracking-tight whitespace-nowrap overflow-hidden text-ellipsis"
                title={isSchoolLocked ? `จองและบันทึกรายงานเฉพาะโรงเรียน: ${formData.schoolName}` : "แก้ไขฟอร์มกิจกรรม / กรอกรายงานการติดตาม"}
              >
                {isSchoolLocked ? "จองและบันทึกรายงานผลกิจกรรมเฉพาะสถานศึกษา" : "แก้ไขฟอร์มกิจกรรม / กรอกรายงานการติดตาม"}
              </h3>
              {isSchoolLocked && (
                <span className="hidden sm:inline-flex items-center gap-1 bg-amber-400/20 text-amber-300 text-[10px] font-black px-2 py-0.5 rounded-full border border-amber-400/30">
                  <span>🔒 ล็อกเฉพาะโรงเรียนที่เลือก</span>
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-400 font-mono whitespace-nowrap overflow-hidden text-ellipsis flex items-center gap-2">
              <span>รหัสรายงาน: {formData.id}</span>
              {isSchoolLocked && (
                <span className="text-amber-300 font-sans font-bold">| {formData.schoolName}</span>
              )}
            </p>
          </div>
        </div>
        <button 
          onClick={onClose}
          className="text-slate-400 hover:text-white transition p-1.5 hover:bg-slate-800 rounded-lg cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <form onSubmit={handleLocalSave} className="p-6 space-y-6">
        
        {/* API Error warning if Gemini API isn't ready */}
        {apiError && (
          <div className="bg-rose-50 border border-rose-200 text-rose-800 p-4 rounded-lg flex items-start space-x-2.5 text-xs">
            <AlertCircle className="w-5 h-5 text-rose-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">ระบบขัดข้องของ Gemini AI</p>
              <p className="mt-0.5 text-rose-600 leading-relaxed">{apiError}</p>
            </div>
          </div>
        )}

        {/* Gemini AI Floating Quick Assistant Banner */}
        <div className="bg-gradient-to-r from-blue-50/50 via-indigo-50/30 to-white border border-blue-100 p-4 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-start space-x-3">
            <div className="p-2 bg-gradient-to-br from-blue-600 to-indigo-600 text-white rounded-lg flex-shrink-0 shadow-sm">
              <Sparkles className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h4 className="font-extrabold text-slate-950 text-sm tracking-tight">ระบบ Gemini AI ช่วยยกร่างและตรวจทานเรียบเรียงรายงานอัตโนมัติ</h4>
              <p className="text-xs text-slate-500 leading-relaxed font-semibold">
                ระบบปฏิบัติการ AI คอยประมวลผล ตรวจทานความสอดคล้องกับแผน กพด.๕ และช่วยเรียบเรียงข้อความให้เป็นภาษาราชการโดยอัตโนมัติ
              </p>
            </div>
          </div>
        </div>

        {/* Section 1: ข้อมูลทั่วไปโครงการ */}
        <div className="space-y-4">
          <h4 className="font-extrabold text-slate-900 border-b border-slate-100 pb-2 flex items-center space-x-2 text-sm tracking-tight">
            <span className="w-1.5 h-4 bg-blue-600 rounded-full" />
            <span>ส่วนที่ 1: ข้อมูลพื้นฐานโครงการและกิจกรรม</span>
          </h4>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-600 block">ชื่อโครงการหลัก (ตามแผน กพด.)</label>
              <input
                type="text"
                required
                value={formData.projectName}
                onChange={(e) => handleChange("projectName", e.target.value)}
                placeholder="เช่น โครงการส่งเสริมโภชนาการและสุขภาพอนามัยตามพระราชดำริฯ"
                className="w-full text-xs px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none placeholder:text-slate-400 font-medium"
              />
            </div>
            
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-600 block">ชื่อกิจกรรมย่อย (ที่ต้องการรายงาน)</label>
              <input
                type="text"
                required
                value={formData.activityName}
                onChange={(e) => handleChange("activityName", e.target.value)}
                placeholder="เช่น การรณรงค์ปลูกผักสวนครัวเพื่อโภชนาการในโรงเรียน"
                className="w-full text-xs px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none font-bold text-slate-900 placeholder:text-slate-400"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-600 block">เป้าหมายตามแผน กพด. ฉบับที่ 5</label>
              <select
                value={formData.goalCode}
                onChange={(e) => handleChange("goalCode", e.target.value)}
                className="w-full text-xs px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none cursor-pointer font-semibold text-slate-800"
              >
                {KOPODOT_GOALS.map((goal) => (
                  <option key={goal.id} value={goal.code}>
                    {goal.code}: {goal.title}
                  </option>
                ))}
              </select>
            </div>

            {/* Multi-Select Indicators (KPIs) Checkboxes Block */}
            {(() => {
              const matchingIndicators = OFFICIAL_INDICATORS.filter((ind) => {
                const normGoal = formData.goalCode.replace(/[^\d]/g, "");
                const normIndGoal = ind.goalCode.replace(/[^\d]/g, "");
                return normGoal === normIndGoal;
              });

              const selectedKpis = (formData.kpiCode || "")
                .split(",")
                .map((s) => s.trim())
                .filter(Boolean);

              const toggleKpi = (code: string) => {
                let nextList: string[];
                if (selectedKpis.includes(code)) {
                  nextList = selectedKpis.filter((c) => c !== code);
                } else {
                  nextList = [...selectedKpis, code];
                }
                handleChange("kpiCode", nextList.join(", "));
              };

              return (
                <div className="space-y-2 md:col-span-2 bg-slate-50/90 border border-slate-200/90 rounded-2xl p-4 shadow-2xs">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-2.5">
                    <div>
                      <label className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                        <CheckSquare className="w-4 h-4 text-indigo-600" />
                        <span>ดัชนีชี้วัดหลักประเมินผลโครงการ (KPIs) - เลือกแบบหลายตัวเลือก (Multi-Select)</span>
                      </label>
                      <p className="text-[11px] text-slate-500 font-medium">
                        ติ๊กทำเครื่องหมายถูกตัวชี้วัด กพด.๕ ที่สอดคล้องกับกิจกรรมนี้ (เลือกได้มากกว่า 1 ตัวชี้วัด)
                      </p>
                    </div>

                    <div className="flex items-center gap-2 text-[11px] font-bold">
                      <button
                        type="button"
                        onClick={() => {
                          const allCodes = matchingIndicators.map((i) => i.code).join(", ");
                          handleChange("kpiCode", allCodes);
                        }}
                        className="text-indigo-700 hover:text-indigo-900 px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 rounded-lg border border-indigo-200 transition cursor-pointer"
                      >
                        เลือกทั้งหมด ({matchingIndicators.length})
                      </button>
                      <button
                        type="button"
                        onClick={() => handleChange("kpiCode", "")}
                        className="text-slate-600 hover:text-slate-800 px-2.5 py-1 bg-white hover:bg-slate-100 rounded-lg border border-slate-300 transition cursor-pointer"
                      >
                        ล้างตัวเลือก
                      </button>
                    </div>
                  </div>

                  {/* Multi-Select Checkboxes Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-60 overflow-y-auto pr-1 pt-1">
                    {matchingIndicators.map((ind) => {
                      const isChecked = selectedKpis.includes(ind.code);
                      return (
                        <label
                          key={ind.id}
                          className={`flex items-start gap-2.5 p-3 rounded-xl border text-xs cursor-pointer transition ${
                            isChecked
                              ? "bg-indigo-50/90 border-indigo-300 text-indigo-950 font-extrabold shadow-2xs ring-1 ring-indigo-400/30"
                              : "bg-white border-slate-200/90 text-slate-700 hover:bg-slate-100/80 font-medium"
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => toggleKpi(ind.code)}
                            className="mt-0.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4 shrink-0 cursor-pointer"
                          />
                          <div className="space-y-0.5 min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-1">
                              <span className="font-extrabold text-indigo-900 bg-indigo-100/90 px-2 py-0.5 rounded-md text-[10px] inline-block">
                                {ind.code}
                              </span>
                              {ind.collectionFrequency && (
                                <span className="text-[10px] text-slate-500 font-bold">
                                  ความถี่: {ind.collectionFrequency}
                                </span>
                              )}
                            </div>
                            <span className="leading-relaxed block pt-1">
                              {ind.name}
                            </span>
                          </div>
                        </label>
                      );
                    })}
                  </div>

                  {/* Selected Indicators Chips Summary */}
                  {selectedKpis.length > 0 && (
                    <div className="pt-2 border-t border-slate-200 flex items-center gap-1.5 text-xs text-slate-700 font-bold flex-wrap">
                      <span className="text-indigo-800 font-extrabold">เลือกแล้ว ({selectedKpis.length} ตัวชี้วัด):</span>
                      {selectedKpis.map((code) => (
                        <span
                          key={code}
                          className="bg-indigo-600 text-white text-[10px] px-2.5 py-0.5 rounded-full font-bold flex items-center gap-1 shadow-2xs"
                        >
                          <span>{code}</span>
                          <button
                            type="button"
                            onClick={() => toggleKpi(code)}
                            className="hover:bg-indigo-800 rounded-full p-0.5 transition cursor-pointer"
                            title="ยกเลิกตัวชี้วัดนี้"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })()}

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-600 block">งวดงานที่ส่งรายงาน</label>
                <input
                  type="text"
                  value={formData.reportingPeriod}
                  onChange={(e) => handleChange("reportingPeriod", e.target.value)}
                  placeholder="เช่น ไตรมาส 2/2569"
                  className="w-full text-xs px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none placeholder:text-slate-400 font-medium"
                />
              </div>
              
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-600 block">สถานะรายงาน</label>
                <select
                  value={formData.status}
                  onChange={(e) => handleChange("status", e.target.value)}
                  className="w-full text-xs px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none font-extrabold cursor-pointer text-slate-800"
                >
                  {Object.values(ReportStatus).map((st) => (
                    <option key={st} value={st}>{st}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-600 block flex items-center justify-between">
                <span>ชื่อโรงเรียน / สถานศึกษา</span>
                {isSchoolLocked ? (
                  <span className="text-[10px] text-amber-800 bg-amber-100 px-2 py-0.5 rounded-md font-black border border-amber-300 flex items-center gap-1">
                    <span>🔒 ล็อกเฉพาะโรงเรียนที่เลือก</span>
                  </span>
                ) : (
                  <span className="text-[10px] text-blue-600 font-bold">ฐานข้อมูลแผน กพด.๕</span>
                )}
              </label>
              {isSchoolLocked ? (
                <div className="space-y-1">
                  <input
                    type="text"
                    required
                    readOnly
                    value={formData.schoolName}
                    className="w-full text-xs px-3.5 py-2.5 bg-amber-50/80 border-2 border-amber-300 rounded-lg font-black text-amber-950 shadow-2xs select-none cursor-not-allowed"
                  />
                  <p className="text-[10.5px] font-bold text-amber-800 flex items-center gap-1 pt-0.5">
                    <span>📌 ระบบจองและกรอกข้อมูลให้เฉพาะโรงเรียน:</span>
                    <strong className="text-amber-950 font-black underline">{formData.schoolName}</strong>
                  </p>
                </div>
              ) : (
                <>
                  <input
                    type="text"
                    required
                    list="official-schools-list"
                    value={formData.schoolName}
                    onChange={(e) => handleChange("schoolName", e.target.value)}
                    placeholder="พิมพ์เพื่อค้นหาชื่อโรงเรียน ตชด. หรือ ศศช. ตามแผนหลัก"
                    className="w-full text-xs px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none placeholder:text-slate-400 font-bold text-slate-900"
                  />
                  <datalist id="official-schools-list">
                    {OFFICIAL_TARGET_SCHOOLS.map((school) => (
                      <option key={school.id} value={school.name}>
                        {school.province} | {school.groupName}
                      </option>
                    ))}
                  </datalist>
                </>
              )}
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-600 block">สถานที่ทำกิจกรรม</label>
              <input
                type="text"
                value={formData.location}
                onChange={(e) => handleChange("location", e.target.value)}
                placeholder="เช่น ลานกิจกรรมโรงเรียน หรือ หมู่บ้าน ตชด."
                className="w-full text-xs px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none placeholder:text-slate-400 font-medium"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-600 block">วันที่จัดงานกิจกรรม</label>
              <input
                type="text"
                value={formData.dateString}
                onChange={(e) => handleChange("dateString", e.target.value)}
                placeholder="เช่น 15 มีนาคม 2569"
                className="w-full text-xs px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none placeholder:text-slate-400 font-medium"
              />
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-600 block">ลิงก์รูปภาพประกอบกิจกรรม (Google Drive / ลิงก์รูปภาพ)</label>
                <button
                  type="button"
                  onClick={() => setShowGpsCameraModal(true)}
                  className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-extrabold text-[11px] px-2.5 py-1 rounded-lg border border-indigo-200 transition flex items-center gap-1 cursor-pointer"
                >
                  <Camera className="w-3.5 h-3.5 text-indigo-600" />
                  <span>ถ่ายภาพพร้อมพิกัด GPS Real-Time</span>
                </button>
              </div>
              <input
                type="text"
                value={formData.imageUrl || ""}
                onChange={(e) => handleChange("imageUrl", e.target.value)}
                placeholder="https://drive.google.com/file/d/... หรือ URL รูปภาพ"
                className="w-full text-xs px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none placeholder:text-slate-400 font-medium"
              />

              {/* Live Preview with Automatic Face Detection */}
              {formData.imageUrl && formData.imageUrl.trim().length > 10 && (
                <div className="mt-2.5 p-2.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
                  <div className="flex items-center justify-between text-[11px] font-bold text-slate-700">
                    <span className="flex items-center gap-1.5">
                      <ImageIcon className="w-3.5 h-3.5 text-blue-600" />
                      ตัวอย่างการจัดวางภาพพร้อมระบบตรวจจับใบหน้าอัตโนมัติ (Face Focus)
                    </span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 h-28">
                    {formData.imageUrl.split(",").map((urlStr, idx) => {
                      const cleanUrl = urlStr.trim();
                      if (!cleanUrl) return null;
                      return (
                        <div key={idx} className="h-full rounded-lg overflow-hidden border border-slate-200 bg-slate-900 relative">
                          <SmartFaceImage
                            src={cleanUrl}
                            alt={`ตัวอย่างภาพกิจกรรม ${idx + 1}`}
                            showControls={true}
                            defaultPosition="50% 20%"
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-1 md:col-span-2">
              <label className="text-xs font-bold text-red-700 flex items-center gap-1.5">
                <Video className="w-4 h-4 text-red-600" />
                <span>ลิงก์คลิปวิดีโอ/วิดีโอบันทึกกิจกรรม (Google Drive / YouTube / คลิปสาธิต):</span>
              </label>
              <input
                type="text"
                value={formData.videoUrl || ""}
                onChange={(e) => handleChange("videoUrl", e.target.value)}
                placeholder="https://drive.google.com/file/d/... หรือ ลิงก์ไฟล์วิดีโอบันทึกกิจกรรม"
                className="w-full text-xs px-3.5 py-2.5 bg-red-50/50 border border-red-200 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 focus:outline-none placeholder:text-slate-400 font-medium text-slate-800"
              />
            </div>
          </div>
        </div>

        {/* Section 2: ผู้ร่วมงานและกลุ่มเป้าหมาย */}
        <div className="space-y-4">
          <h4 className="font-extrabold text-slate-900 border-b border-slate-100 pb-2 flex items-center space-x-2 text-sm tracking-tight">
            <span className="w-1.5 h-4 bg-blue-600 rounded-full" />
            <span>ส่วนที่ 2: กลุ่มเป้าหมายและผู้ร่วมกิจกรรม</span>
          </h4>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-600 block">จำนวนผู้ร่วมงานทั้งหมด (คน)</label>
              <div className="relative">
                <input
                  type="number"
                  value={formData.participantsCount}
                  onChange={(e) => handleChange("participantsCount", Number(e.target.value))}
                  className="w-full text-xs pl-8 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none font-mono"
                />
                <Users className="w-4 h-4 text-slate-400 absolute left-2.5 top-3" />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-600 block">จำนวนประชาชน (คน)</label>
              <div className="relative">
                <input
                  type="number"
                  value={formData.citizensCount ?? 0}
                  onChange={(e) => handleChange("citizensCount", Number(e.target.value))}
                  className="w-full text-xs pl-8 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none font-mono"
                />
                <Users className="w-4 h-4 text-emerald-600 absolute left-2.5 top-3" />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-600 block">ลักษณะกลุ่มเป้าหมาย</label>
              <input
                type="text"
                value={formData.targetGroup}
                onChange={(e) => handleChange("targetGroup", e.target.value)}
                placeholder="เช่น นักเรียนอนุบาลและผู้ปกครอง"
                className="w-full text-xs px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none placeholder:text-slate-400"
              />
            </div>
          </div>
        </div>

        {/* Section 3: วัตถุประสงค์และรายละเอียดการดำเนินงาน */}
        <div className="space-y-4">
          <h4 className="font-extrabold text-slate-900 border-b border-slate-100 pb-2 flex items-center space-x-2 text-sm tracking-tight">
            <span className="w-1.5 h-4 bg-blue-600 rounded-full" />
            <span>ส่วนที่ 3: แผนงาน วัตถุประสงค์ และวิธีการดำเนินงาน</span>
          </h4>

          <div className="space-y-3">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-600 block">วัตถุประสงค์ของกิจกรรม</label>
              <textarea
                value={formData.objectives}
                onChange={(e) => handleChange("objectives", e.target.value)}
                rows={2}
                placeholder="ระบุจุดประสงค์ของงานเชิงปฏิบัติการ..."
                className="w-full text-xs p-3 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none placeholder:text-slate-400"
              />
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-600 block">รายละเอียดและลำดับขั้นตอนการจัดกิจกรรม (ทีละข้อ)</label>
                <button
                  type="button"
                  onClick={handleSummarizeDetailsInForm}
                  disabled={isSummarizingDetails}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10.5px] font-bold text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200 transition cursor-pointer shadow-2xs"
                  title="ให้ AI ช่วยย่อและสรุปเนื้อหาในช่องนี้ให้กระชับ"
                >
                  <Sparkles className={`w-3 h-3 text-purple-600 ${isSummarizingDetails ? 'animate-spin' : ''}`} />
                  <span>{isSummarizingDetails ? "กำลังย่อสรุป..." : "ย่อสรุปด้วย AI"}</span>
                </button>
              </div>
              <textarea
                value={formData.details}
                onChange={(e) => handleChange("details", e.target.value)}
                rows={4}
                placeholder="เช่น:&#10;1. ปูพื้นดินจัดทำคานเหล็ก&#10;2. อบรมทักษะนักเรียน..."
                className="w-full text-xs p-3 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none placeholder:text-slate-400"
              />
            </div>
          </div>
        </div>

        {/* Section 4: ผลลัพธ์จากการจัดกิจกรรม */}
        <div className="space-y-4">
          <h4 className="font-extrabold text-slate-900 border-b border-slate-100 pb-2 flex items-center space-x-2 text-sm tracking-tight">
            <span className="w-1.5 h-4 bg-blue-600 rounded-full" />
            <span>ส่วนที่ 4: ผลการดำเนินงานเชิงประจักษ์</span>
          </h4>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-600 block">ผลผลิตเชิงปริมาณ (เช่น ตัวเลข พื้นที่ ชิ้นงาน)</label>
              <textarea
                value={formData.quantitativeOutcome}
                onChange={(e) => handleChange("quantitativeOutcome", e.target.value)}
                rows={3}
                placeholder="เช่น มีนักเรียนเข้าร่วมครบ 100% ผลิตผักได้สัปดาห์ละ 15 กก."
                className="w-full text-xs p-3 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none placeholder:text-slate-400"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-600 block">ผลลัพธ์เชิงคุณภาพ (เช่น ทักษะที่ได้ คุณภาพชีวิตที่เปลี่ยนไป)</label>
              <textarea
                value={formData.qualitativeOutcome}
                onChange={(e) => handleChange("qualitativeOutcome", e.target.value)}
                rows={3}
                placeholder="เช่น นักเรียนมีความรู้ความเข้าใจในหลักปรัชญาเศรษฐกิจพอเพียง..."
                className="w-full text-xs p-3 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none placeholder:text-slate-400"
              />
            </div>
          </div>
        </div>

        {/* Section 5: อุปสรรคและข้อเสนอแนะ */}
        <div className="space-y-4">
          <h4 className="font-extrabold text-slate-900 border-b border-slate-100 pb-2 flex items-center space-x-2 text-sm tracking-tight">
            <span className="w-1.5 h-4 bg-blue-600 rounded-full" />
            <span>ส่วนที่ 5: ปัญหาอุปสรรคและแนวทางแก้ไข</span>
          </h4>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-600 block">ปัญหาและอุปสรรคที่พบ</label>
              <textarea
                value={formData.problems}
                onChange={(e) => handleChange("problems", e.target.value)}
                rows={3}
                placeholder="เช่น สภาพอากาศร้อนทำให้อุปกรณ์ชำรุด หรือเด็กสื่อสารภาษาไทยไม่คล่อง"
                className="w-full text-xs p-3 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none placeholder:text-slate-400"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-600 block">แนวทางแก้ไขและข้อเสนอแนะสำหรับการทำงานถัดไป</label>
              <textarea
                value={formData.suggestions}
                onChange={(e) => handleChange("suggestions", e.target.value)}
                rows={3}
                placeholder="เช่น เชิญครูผู้ช่วยชาติพันธุ์มาช่วยแปลสรุป หรือใช้วัสดุกันความชื้นจัดสร้างตู้เก็บ"
                className="w-full text-xs p-3 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none placeholder:text-slate-400"
              />
            </div>
          </div>
        </div>

        {/* Section 6: ข้อมูลผู้รายงานผลและผู้อนุมัติ */}
        <div className="space-y-4">
          <h4 className="font-extrabold text-slate-900 border-b border-slate-100 pb-2 flex items-center space-x-2 text-sm tracking-tight">
            <span className="w-1.5 h-4 bg-blue-600 rounded-full" />
            <span>ส่วนที่ 6: การยืนยันตัวตนและการตรวจสอบรายงาน</span>
          </h4>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-600 block">ชื่อผู้บันทึกรายงาน</label>
              <input
                type="text"
                required
                value={formData.reportedBy}
                onChange={(e) => handleChange("reportedBy", e.target.value)}
                placeholder="เช่น ร.ต.อ. ประสิทธิ์ ใจดี"
                className="w-full text-xs px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none placeholder:text-slate-400"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-600 block">ตำแหน่งผู้บันทึก</label>
              <input
                type="text"
                required
                value={formData.reportPosition}
                onChange={(e) => handleChange("reportPosition", e.target.value)}
                placeholder="เช่น ครูผู้รับผิดชอบ"
                className="w-full text-xs px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none placeholder:text-slate-400"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-600 block">ชื่อผู้ตรวจสอบ/ผู้อนุมัติ (ครูใหญ่)</label>
              <input
                type="text"
                value={formData.approverName || ""}
                onChange={(e) => handleChange("approverName", e.target.value)}
                placeholder="เช่น พ.ต.ท.หญิง สมใจ รักเรียน"
                className="w-full text-xs px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none placeholder:text-slate-400"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-600 block">ตำแหน่งผู้อนุมัติ</label>
              <input
                type="text"
                value={formData.approverPosition !== undefined ? formData.approverPosition : "ครูใหญ่"}
                onChange={(e) => handleChange("approverPosition", e.target.value)}
                placeholder="ครูใหญ่"
                className="w-full text-xs px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none placeholder:text-slate-400"
              />
            </div>
          </div>
        </div>

        {/* Footer actions */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-6 border-t border-slate-100">
          {onSaveOfflineDraft && formData && (
            <button
              type="button"
              onClick={() => {
                onSaveOfflineDraft({
                  ...formData,
                  lastUpdated: new Date().toISOString()
                });
                onClose();
              }}
              className="bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300 font-extrabold text-xs px-4 py-2.5 rounded-lg transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
              title="บันทึกเก็บไว้ในเครื่องภาคสนาม เพื่อซิงก์ขึ้น Google Sheets อัตโนมัติเมื่อมีสัญญาณ"
            >
              <WifiOff className="w-4 h-4 text-amber-700 shrink-0" />
              <span>บันทึกแบบร่างออฟไลน์ภาคสนาม</span>
            </button>
          )}

          <div className="flex items-center gap-2.5 ml-auto">
            <button
              type="button"
              onClick={onClose}
              className="text-xs text-slate-700 bg-slate-100 hover:bg-slate-200 font-extrabold px-5 py-2.5 rounded-lg transition cursor-pointer"
            >
              ยกเลิก
            </button>
            
            <button
              type="submit"
              className="bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs px-6 py-2.5 rounded-lg shadow-sm hover:shadow transition flex items-center space-x-1.5 cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>บันทึกแบบฟอร์มรายงาน</span>
            </button>
          </div>
        </div>
      </form>

      {/* Gemini AI Interactive Feedback Modal */}
      {showAiModal && aiResult && (
        <div className="fixed inset-0 bg-slate-950/60 flex items-center justify-center p-4 z-50 overflow-y-auto backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[85vh] overflow-hidden flex flex-col shadow-2xl border border-blue-100 animate-scaleUp">
            
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-blue-700 to-indigo-800 text-white p-5 flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <Sparkles className="w-5 h-5 text-amber-300 fill-amber-300 animate-pulse" />
                <div>
                  <h3 className="font-extrabold text-sm md:text-base tracking-tight">ข้อแนะนำสรุปกิจกรรมด้วยระบบ Gemini AI</h3>
                  <p className="text-[10px] text-blue-100 font-mono">ระดับความสอดคล้องกับแผน กพด.: {aiResult.confidenceScore}%</p>
                </div>
              </div>
              <button 
                onClick={() => setShowAiModal(false)}
                className="text-white/80 hover:text-white transition p-1.5 hover:bg-white/10 rounded-full cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Scroll Content */}
            <div className="p-6 overflow-y-auto space-y-5 flex-grow text-xs leading-relaxed">
              
              {/* Category Advice */}
              <div className="bg-blue-50/55 border border-blue-100 p-4 rounded-xl space-y-2">
                <span className="bg-blue-600 text-white font-extrabold px-2.5 py-1 rounded-full text-[9px] uppercase tracking-wider">
                  เป้าหมาย กพด. ที่วิเคราะห์พบสอดคล้องที่สุด
                </span>
                <p className="font-extrabold text-slate-900 text-sm tracking-tight pt-1">
                  {aiResult.mappedGoalCode}: {KOPODOT_GOALS.find(g => aiResult.mappedGoalCode.includes(g.code))?.title || ""}
                </p>
                <p className="text-slate-600 font-medium leading-normal">
                  {aiResult.goalExplanation}
                </p>
              </div>

              {/* Bureaucratic Polish Summary */}
              <div className="space-y-1.5">
                <h4 className="font-bold text-slate-800 flex items-center space-x-1.5">
                  <span className="w-1.5 h-3.5 bg-blue-600 rounded-sm" />
                  <span>เรียบเรียงเป็นภาษาราชการ (Bureaucratic/Official Prose)</span>
                </h4>
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl font-mono text-slate-700 select-all max-h-[180px] overflow-y-auto leading-relaxed whitespace-pre-wrap">
                  {aiResult.bureaucraticSummary}
                </div>
                <span className="text-[10px] text-slate-400 block italic">💡 คุณสามารถนำประโยคหนังสือราชการเชิงประจักษ์ข้างต้น ไปคัดลอกใส่เล่มรายงานอย่างเป็นทางการได้</span>
              </div>

              {/* Strengths & suggestions */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <h5 className="font-bold text-emerald-800 flex items-center space-x-1">🟢 จุดเด่นจุดแข็งของรายงาน:</h5>
                  <ul className="list-disc pl-4 space-y-1 text-slate-600 font-medium">
                    {aiResult.strengths.map((str, i) => (
                      <li key={i}>{str}</li>
                    ))}
                  </ul>
                </div>
                
                <div className="space-y-1.5">
                  <h5 className="font-bold text-blue-800 flex items-center space-x-1">🔵 ข้อเสนอแนะเชิงกลยุทธ์เสริม:</h5>
                  <ul className="list-disc pl-4 space-y-1 text-slate-600 font-medium">
                    {aiResult.suggestions.map((sug, i) => (
                      <li key={i}>{sug}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end space-x-2">
              <button
                type="button"
                onClick={() => setShowAiModal(false)}
                className="text-xs text-slate-600 bg-slate-200 hover:bg-slate-300 font-bold px-4 py-2 rounded-lg transition"
              >
                ละทิ้ง
              </button>
              <button
                type="button"
                onClick={applyAiRecommendations}
                className="bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs px-5 py-2.5 rounded-lg shadow transition flex items-center space-x-1.5 cursor-pointer"
              >
                <Check className="w-4 h-4" />
                <span>ยอมรับและนำข้อความแทนที่ลงฟอร์ม</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Pre-Publish Quality Checkpoint Modal */}
      {showPrePublishModal && (
        <div className="fixed inset-0 bg-slate-950/70 flex items-center justify-center p-4 z-50 overflow-y-auto backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200/90 overflow-hidden flex flex-col animate-scaleUp">
            
            {/* Modal Header */}
            <div className="bg-slate-900 text-white p-5 flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <FileText className="w-5 h-5 text-indigo-400" />
                <div>
                  <h3 className="font-black text-sm sm:text-base tracking-tight typo-app-h2 text-white">บอร์ดประเมินและตรวจสอบคุณภาพรายงานก่อนนำส่ง</h3>
                  <p className="text-[10px] text-slate-400 font-mono">รหัสรายงาน: {formData.id}</p>
                </div>
              </div>
              <button 
                type="button"
                onClick={() => setShowPrePublishModal(false)}
                className="text-slate-400 hover:text-white transition p-1.5 hover:bg-slate-800 rounded-full cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-5 sm:p-6 space-y-5">
              {/* Score Dashboard Card */}
              {(() => {
                const check1 = formData.projectName.length > 3 && formData.activityName.length > 3;
                const check2 = formData.schoolName !== "" && formData.goalCode !== "";
                const check3 = !!(formData.objectives && formData.objectives.length >= 15 && formData.details && formData.details.length >= 15);
                const check4 = formData.participantsCount > 0 && !!(formData.quantitativeOutcome && formData.quantitativeOutcome.length >= 10 && formData.qualitativeOutcome && formData.qualitativeOutcome.length >= 10);
                const check5 = formData.reportedBy !== "" && formData.approverName !== "";
                
                const passedCount = (check1 ? 1 : 0) + (check2 ? 1 : 0) + (check3 ? 1 : 0) + (check4 ? 1 : 0) + (check5 ? 1 : 0);
                const score = passedCount * 20;

                return (
                  <>
                    <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 flex items-center justify-between gap-4">
                      <div className="space-y-1">
                        <p className="typo-app-subtext text-[10.5px] uppercase tracking-wider text-slate-500 font-black">คะแนนดัชนีความสมบูรณ์เชิงวิชาการ</p>
                        <h4 className="text-2xl sm:text-3xl font-black text-indigo-950 tracking-tight">
                          {score}% <span className="text-xs sm:text-sm text-slate-500 font-medium">({passedCount} / 5 ข้อผ่านเกณฑ์)</span>
                        </h4>
                      </div>
                      <div className="relative w-14 h-14 sm:w-16 sm:h-16 shrink-0 flex items-center justify-center rounded-full bg-indigo-50 border border-indigo-100 shadow-2xs">
                        <span className="text-indigo-700 font-black text-base sm:text-lg">{score}%</span>
                      </div>
                    </div>

                    {/* Checkpoints list */}
                    <div className="space-y-3">
                      <h4 className="typo-app-chart-title text-slate-800 text-xs sm:text-sm font-extrabold flex items-center gap-1.5 pb-1 border-b border-slate-100">
                        <span>รายการตรวจสอบความพร้อมของเนื้อหา (Verification Checklists)</span>
                      </h4>

                      <div className="space-y-2.5">
                        {/* Check 1 */}
                        <div className="flex items-start gap-2.5 text-xs">
                          <div className={`mt-0.5 shrink-0 w-5 h-5 rounded-full flex items-center justify-center ${check1 ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
                            {check1 ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : <AlertCircle className="w-3.5 h-3.5" />}
                          </div>
                          <div className="min-w-0">
                            <p className="font-bold text-slate-800">โครงสร้างชื่องานและแผนโครงการ</p>
                            <p className="text-[10.5px] text-slate-500 font-medium">{check1 ? "สมบูรณ์ - กรอกรายละเอียดโครงการหลักและชื่อกิจกรรมถูกต้อง" : "ควรตรวจสอบ - ชื่องานหรือโครงการหลักสั้นเกินไป"}</p>
                          </div>
                        </div>

                        {/* Check 2 */}
                        <div className="flex items-start gap-2.5 text-xs">
                          <div className={`mt-0.5 shrink-0 w-5 h-5 rounded-full flex items-center justify-center ${check2 ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
                            {check2 ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : <AlertCircle className="w-3.5 h-3.5" />}
                          </div>
                          <div className="min-w-0">
                            <p className="font-bold text-slate-800">การจับคู่เป้าหมาย กพด. และสังกัดโรงเรียน</p>
                            <p className="text-[10.5px] text-slate-500 font-medium">{check2 ? "สมบูรณ์ - มีการระบุโรงเรียน ตชด. ปลายทางและด้านเป้าหมายชัดเจน" : "ควรระบุ - โปรดตรวจสอบข้อมูลสังกัดโรงเรียนและด้านเป้าหมาย กพด."}</p>
                          </div>
                        </div>

                        {/* Check 3 */}
                        <div className="flex items-start gap-2.5 text-xs">
                          <div className={`mt-0.5 shrink-0 w-5 h-5 rounded-full flex items-center justify-center ${check3 ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
                            {check3 ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : <AlertCircle className="w-3.5 h-3.5" />}
                          </div>
                          <div className="min-w-0">
                            <p className="font-bold text-slate-800">ความละเอียดเชิงวิชาการ (วัตถุประสงค์และขั้นตอน)</p>
                            <p className="text-[10.5px] text-slate-500 font-medium">{check3 ? "สมบูรณ์ - มีคำอธิบายวัตถุประสงค์และขั้นตอนงานความยาวผ่านเกณฑ์" : "ควรตรวจสอบ - ข้อมูลวัตถุประสงค์และวิธีการดำเนินงานสั้นเกินเกณฑ์มาตรฐาน"}</p>
                          </div>
                        </div>

                        {/* Check 4 */}
                        <div className="flex items-start gap-2.5 text-xs">
                          <div className={`mt-0.5 shrink-0 w-5 h-5 rounded-full flex items-center justify-center ${check4 ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
                            {check4 ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : <AlertCircle className="w-3.5 h-3.5" />}
                          </div>
                          <div className="min-w-0">
                            <p className="font-bold text-slate-800">ผลสัมฤทธิ์ตัวชี้วัด (เชิงปริมาณ เชิงคุณภาพ และกลุ่มเป้าหมาย)</p>
                            <p className="text-[10.5px] text-slate-500 font-medium">{check4 ? "สมบูรณ์ - มีตัวเลขระบุผู้เข้าร่วมและมีรายละเอียดอธิบายผลสัมฤทธิ์ครบถ้วน" : "ควรตรวจสอบ - ผลลัพธ์เชิงคุณภาพและปริมาณสั้นเกินไป หรือจำนวนผู้เข้าร่วมเป็น 0"}</p>
                          </div>
                        </div>

                        {/* Check 5 */}
                        <div className="flex items-start gap-2.5 text-xs">
                          <div className={`mt-0.5 shrink-0 w-5 h-5 rounded-full flex items-center justify-center ${check5 ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
                            {check5 ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : <AlertCircle className="w-3.5 h-3.5" />}
                          </div>
                          <div className="min-w-0">
                            <p className="font-bold text-slate-800">การเซ็นลงนามกำกับดูแลแบบทางการ</p>
                            <p className="text-[10.5px] text-slate-500 font-medium">{check5 ? "สมบูรณ์ - มีชื่อครูผู้รายงานผลและผู้บังคับบัญชา (ครูใหญ่) รับรองครบถ้วน" : "ควรตรวจสอบ - ข้อมูลชื่อครูผู้รายงานหรือผู้อนุมัติโครงการยังไม่ได้กรอก"}</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Summary Warning */}
                    <div className="p-3.5 bg-slate-50 border border-slate-200/90 rounded-xl text-[11px] text-slate-600 font-medium leading-relaxed">
                      {score === 100 ? (
                        <p className="text-emerald-800 font-extrabold flex items-center gap-1">
                          🎉 รายงานผ่านการตรวจสอบคุณภาพ 100% ครบถ้วนตามระเบียบ กพด. ฉบับที่ ๕ เรียบร้อยแล้ว!
                        </p>
                      ) : (
                        <p className="text-amber-800 font-bold flex items-center gap-1">
                          ⚠️ ข้อมูลบางส่วนอาจยังกรอกไม่ครบตามเป้าหมายของดัชนีชี้วัด แต่คุณยังสามารถกดยืนยันเพื่อบันทึกงานไว้ก่อนได้
                        </p>
                      )}
                    </div>
                  </>
                );
              })()}
            </div>

            {/* Modal Actions */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-2 text-xs">
              <button
                type="button"
                onClick={() => setShowPrePublishModal(false)}
                className="text-xs text-slate-600 bg-slate-200 hover:bg-slate-300 font-bold px-4 py-2 rounded-xl transition cursor-pointer active:scale-95"
              >
                ย้อนกลับไปแก้ไขเพิ่ม
              </button>
              <button
                type="button"
                onClick={confirmPublishSubmit}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold px-5 py-2 rounded-xl shadow-md transition flex items-center space-x-1 cursor-pointer active:scale-95 h-9"
              >
                <Check className="w-4 h-4 stroke-[3]" />
                <span>ยืนยันบันทึกข้อมูลรายงาน</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Field GPS Mobile Camera Modal */}
      <FieldGpsCameraModal
        isOpen={showGpsCameraModal}
        onClose={() => setShowGpsCameraModal(false)}
        initialSchoolName={formData.schoolName}
        onPhotoCaptured={(dataUrl, gps, details) => {
          const currentUrls = formData.imageUrl ? formData.imageUrl.trim() : "";
          const newUrls = currentUrls ? `${dataUrl}, ${currentUrls}` : dataUrl;
          handleChange("imageUrl", newUrls);
        }}
      />
    </div>
  );
}
