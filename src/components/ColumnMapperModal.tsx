import { useState, useEffect, useMemo } from "react";
import { 
  FileSpreadsheet, 
  ArrowRightLeft, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw, 
  Sparkles, 
  Save, 
  RotateCcw, 
  X, 
  Link, 
  Layers, 
  Table, 
  Check, 
  Info, 
  Zap, 
  CheckSquare, 
  Search, 
  FolderSync,
  ShieldCheck,
  ShieldAlert
} from "lucide-react";
import { ActivityReport } from "../types";
import { DataSchemaGuard, ColumnValidationResult } from "../lib/dataSchemaGuard";

export interface ColumnMappingConfig {
  timestampCol: string;
  dateStrCol: string;
  schoolNameCol: string;
  affiliationCol: string;
  goalCol: string;
  activityNameCol: string;
  detailsCol: string;
  participantsCountCol: string;
  targetGroupCol: string;
  imageUrlCol: string;
  videoUrlCol?: string;
  problemsCol: string;
  reportedByCol: string;
  quantitativeOutcomeCol: string;
  qualitativeOutcomeCol: string;
}

export const DEFAULT_COLUMN_MAPPING: ColumnMappingConfig = {
  timestampCol: "ประทับเวลา",
  dateStrCol: "📅 วันที่",
  schoolNameCol: "🏫 ชื่อโรงเรียน ",
  affiliationCol: "🏢 สังกัด ",
  goalCol: "🎯 เป้าหมายหลัก",
  activityNameCol: "🤼  (หัวข้อกิจกรรม เป้าหมายหลักที่ 1)  เสริมสร้างสุขภาพของเด็กตั้งแต่ในครรภ์มารดา",
  detailsCol: "🏋️‍♀️  รายละเอียดการดำเนินกิจกรรม",
  participantsCountCol: "👮‍♂️ จำนวนผู้เข้าร่วมกิจกรรม",
  targetGroupCol: "🎓 ชั้นเรียนที่เข้าร่วมกิจกรรม",
  imageUrlCol: "🗾อัฟโหลดภาพกิจกรรม",
  videoUrlCol: "📷 อัฟโหลดวีดีโอ (ถ้ามี)",
  problemsCol: "✌ปัญหาอุปสรรค ข้อเสนอแนะและแนวทางแก้ไข",
  reportedByCol: "👮‍♂️ ยศ ชื่อ - สกุล   เบอร์โทรศัพท์  ผู้รายงาน",
  quantitativeOutcomeCol: "ผลสัมฤทธิ์เชิงปริมาณ",
  qualitativeOutcomeCol: "ผลสัมฤทธิ์เชิงคุณภาพ",
};

interface ColumnMapperModalProps {
  isOpen: boolean;
  onClose: () => void;
  csvSampleText?: string;
  onApplyMapping: (mapping: ColumnMappingConfig) => void;
  onForceSync: () => Promise<number>; // returns new count
  isSyncing: boolean;
  lastSyncedTime?: string;
  totalReportsCount: number;
}

const TARGET_FIELDS: { key: keyof ColumnMappingConfig; label: string; desc: string; required?: boolean }[] = [
  { key: "schoolNameCol", label: "ชื่อโรงเรียนเป้าหมาย", desc: "เช่น รร.ตชด.บ้านโคกแสลง", required: true },
  { key: "activityNameCol", label: "ชื่อกิจกรรม", desc: "ชื่อกิจกรรมพัฒนาตามแผน กพด.5", required: true },
  { key: "goalCol", label: "เป้าหมายหลัก กพด.5", desc: "ด้านที่ 1 ถึง ด้านที่ 8", required: true },
  { key: "dateStrCol", label: "วันที่ดำเนินกิจกรรม", desc: "เช่น 15 พฤษภาคม 2569", required: false },
  { key: "timestampCol", label: "วัน-เวลา บันทึก (Timestamp)", desc: "เช่น 12/05/2026 14:30:00", required: false },
  { key: "affiliationCol", label: "สังกัด กก.ตชด.", desc: "กก.ตชด.21 - กก.ตชด.24", required: false },
  { key: "detailsCol", label: "รายละเอียดการดำเนินงาน", desc: "วิธีดำเนินกิจกรรมและสรุปการจัด", required: false },
  { key: "participantsCountCol", label: "จำนวนผู้เข้าร่วม (คน)", desc: "ตัวเลขจำนวนนักเรียน/ชุมชน", required: false },
  { key: "targetGroupCol", label: "กลุ่มเป้าหมาย / ระดับชั้น", desc: "เช่น นักเรียนชั้น ป.1 - ป.6", required: false },
  { key: "imageUrlCol", label: "ลิงก์รูปภาพกิจกรรม", desc: "ลิงก์ Google Drive หรือ URL ภาพ", required: false },
  { key: "videoUrlCol", label: "ลิงก์คลิปวิดีโอประกอบกิจกรรม", desc: "ลิงก์ Google Drive วิดีโอ หรือ YouTube", required: false },
  { key: "problemsCol", label: "ปัญหา อุปสรรค ข้อเสนอแนะ", desc: "ข้อควรปรับปรุงแก้ไข", required: false },
  { key: "reportedByCol", label: "ชื่อผู้รายงาน / ครูรับผิดชอบ", desc: "ยศ ชื่อ-สกุล ผู้รายงาน", required: false },
  { key: "quantitativeOutcomeCol", label: "ผลเชิงปริมาณ", desc: "สรุปตัวเลขและจำนวนผลลัพธ์", required: false },
  { key: "qualitativeOutcomeCol", label: "ผลเชิงคุณภาพ", desc: "การเปลี่ยนแปลงหรือประโยชน์ที่ได้รับ", required: false },
];

export function ColumnMapperModal({
  isOpen,
  onClose,
  csvSampleText = "",
  onApplyMapping,
  onForceSync,
  isSyncing,
  lastSyncedTime,
  totalReportsCount,
}: ColumnMapperModalProps) {
  const [detectedHeaders, setDetectedHeaders] = useState<string[]>([]);
  const [mappingConfig, setMappingConfig] = useState<ColumnMappingConfig>(() => {
    const saved = localStorage.getItem("kopodot_column_mapping_schema");
    if (saved) {
      try {
        return { ...DEFAULT_COLUMN_MAPPING, ...JSON.parse(saved) };
      } catch (e) {
        // fallback
      }
    }
    return DEFAULT_COLUMN_MAPPING;
  });

  const [sampleRows, setSampleRows] = useState<string[][]>([]);
  const [syncToast, setSyncToast] = useState<{ message: string; type: "success" | "info" } | null>(null);

  // Parse sample headers from CSV text or fallback headers
  useEffect(() => {
    if (!csvSampleText.trim()) {
      // Default standard fallback headers matching Google Form 60-column layout
      setDetectedHeaders([
        "ประทับเวลา",
        "ที่อยู่อีเมล",
        "📅 วันที่",
        "⏰เวลา",
        "🏢 สังกัด ",
        "🏫 ชื่อโรงเรียน ",
        "🎓 ชั้นเรียนที่เข้าร่วมกิจกรรม",
        "🎯 เป้าหมายหลัก",
        "คอลัมน์ 8",
        "🤼  (หัวข้อกิจกรรม เป้าหมายหลักที่ 1)  เสริมสร้างสุขภาพของเด็กตั้งแต่ในครรภ์มารดา",
        "🤼  (หัวข้อกิจกรรม เป้าหมายหลักที่ 2)  เพิ่มโอกาสทางการศึกษา",
        "🤼  (หัวข้อกิจกรรม เป้าหมายหลักที่ 3)  เสริมสร้างศักยภาพของเด็กและเยาวชนทางวิชาการและจริยธรรม",
        "🤼  (หัวข้อกิจกรรม เป้าหมายหลักที่ 4)  เสริมสร้างศักยภาพของเด็กและเยาวชนทางการอาชีพ",
        "🤼  (หัวข้อกิจกรรม เป้าหมายหลักที่ 5)  ปลูกฝังจิตสำนึกและพัฒนาศักยภาพของเด็กและเยาวชนในการอนุรักษ์ทรัพยากรธรรมชาติและสิ่งแวดล้อม",
        "🤼  (หัวข้อกิจกรรม เป้าหมายหลักที่ 6) เสริมสร้างศักยภาพของเด็กและเยาวชนในการอนุรักษ์และสืบทอดวัฒนธรรมและภูมิปัญญาท้องถิ่น",
        "🤼  (หัวข้อกิจกรรม เป้าหมายหลักที่ 7)  ขยายการพัฒนาจากโรงเรียนสู่ชุมชน",
        "🤼  (หัวข้อกิจกรรม เป้าหมายหลักที่ 8)  พัฒนาสถานศึกษาเป็นศูนย์บริการความรู้",
        "🏋️‍♀️  รายละเอียดการดำเนินกิจกรรม",
        "👮‍♂️ จำนวนผู้เข้าร่วมกิจกรรม",
        "🗾อัฟโหลดภาพกิจกรรม",
        "📷 อัฟโหลดวีดีโอ (ถ้ามี)",
        "✌ปัญหาอุปสรรค ข้อเสนอแนะและแนวทางแก้ไข",
        "👮‍♂️ ยศ ชื่อ - สกุล   เบอร์โทรศัพท์  ผู้รายงาน",
        "เป้าหมายหลักที่ 1 เป้าหมายย่อยที่",
        "เป้าหมายหลักที่ 2 เป้าหมายย่อยที่",
        "เป้าหมายหลักที่ 3 เป้าหมายย่อยที่",
        "เป้าหมายหลักที่ 4 เป้าหมายย่อยที่",
        "เป้าหมายหลักที่ 5 เป้าหมายย่อยที่",
        "เป้าหมายหลักที่ 6 เป้าหมายย่อยที่",
        "เป้าหมายหลักที่ 7 เป้าหมายย่อยที่",
        "เป้าหมายหลักที่ 8 เป้าหมายย่อยที่",
        "ตัวชี้วัด (เป้าหมาย ที่ 1)",
        "ตัวชี้วัด (เป้าหมายที่ 2)",
        "ตัวชี้วัด (เป้าหมายที่ 3)",
        "ตัวชี้วัด (เป้าหมาย 4)",
        "ตัวชี้วัด (เป้าหมายที่ 5)",
        "ตัวชี้วัด (เป้าหมายที่ 6)",
        "ตัวชี้วัด (เป้าหมายที่ 7)",
        "ตัววชี้วัด (เป้าหมาย 8)",
        "☎️ เบอร์โทรศัพท์"
      ]);
      return;
    }

    // Parse first line of CSV
    const lines = csvSampleText.split(/\r?\n/).filter(l => l.trim().length > 0);
    if (lines.length > 0) {
      const headerLine = lines[0];
      // simple CSV split
      const headers = headerLine.split(",").map(h => h.replace(/^"|"$/g, "").trim());
      setDetectedHeaders(headers);

      // parse 2 sample rows
      const samples: string[][] = [];
      for (let i = 1; i < Math.min(lines.length, 4); i++) {
        const row = lines[i].split(",").map(c => c.replace(/^"|"$/g, "").trim());
        samples.push(row);
      }
      setSampleRows(samples);
    }
  }, [csvSampleText]);

  // Auto match headers using fuzzy search
  const handleAutoMatch = () => {
    if (detectedHeaders.length === 0) return;

    const newConfig: ColumnMappingConfig = { ...mappingConfig };

    TARGET_FIELDS.forEach((tf) => {
      const fieldKey = tf.key;
      const fieldLabel = tf.label.toLowerCase();

      // Find closest header with precision emoji & keyword matching
      const match = detectedHeaders.find((h) => {
        const hLower = h.toLowerCase().trim();
        if (fieldKey === "schoolNameCol") {
          return hLower.includes("ชื่อโรงเรียน") || hLower.includes("โรงเรียน") || hLower.includes("ชื่อรร") || hLower.includes("🏫");
        }
        if (fieldKey === "activityNameCol") {
          return hLower.includes("หัวข้อกิจกรรม") || hLower.includes("ชื่อกิจกรรม") || (hLower.includes("กิจกรรม") && !hLower.includes("ผู้เข้าร่วม") && !hLower.includes("ภาพ")) || hLower.includes("🤼");
        }
        if (fieldKey === "goalCol") {
          return (hLower.includes("เป้าหมายหลัก") || hLower.includes("🎯") || hLower.includes("เป้าหมาย")) && !hLower.includes("เป้าหมายย่อย") && !hLower.includes("ตัวชี้วัด");
        }
        if (fieldKey === "dateStrCol") {
          return (hLower.includes("วันที่") || hLower.includes("date") || hLower.includes("📅")) && !hLower.includes("เวลา");
        }
        if (fieldKey === "timestampCol") {
          return hLower.includes("ประทับเวลา") || hLower.includes("timestamp");
        }
        if (fieldKey === "affiliationCol") {
          return hLower.includes("สังกัด") || hLower.includes("กก.ตชด") || hLower.includes("🏢");
        }
        if (fieldKey === "detailsCol") {
          return hLower.includes("รายละเอียดการดำเนิน") || hLower.includes("รายละเอียด") || hLower.includes("สรุปการจัด") || hLower.includes("🏋️");
        }
        if (fieldKey === "participantsCountCol") {
          return hLower.includes("จำนวนผู้เข้าร่วม") || hLower.includes("ผู้เข้าร่วม") || hLower.includes("👮‍♂️ จำนวน");
        }
        if (fieldKey === "targetGroupCol") {
          return hLower.includes("ชั้นเรียนที่เข้าร่วม") || hLower.includes("กลุ่มเป้าหมาย") || hLower.includes("ระดับชั้น") || hLower.includes("🎓");
        }
        if (fieldKey === "imageUrlCol") {
          return hLower.includes("อัฟโหลดภาพ") || hLower.includes("รูปภาพ") || hLower.includes("ภาพกิจกรรม") || hLower.includes("🗾");
        }
        if (fieldKey === "videoUrlCol") {
          return hLower.includes("อัฟโหลดวีดีโอ") || hLower.includes("วิดีโอ") || hLower.includes("video") || hLower.includes("คลิป") || hLower.includes("📷");
        }
        if (fieldKey === "problemsCol") {
          return hLower.includes("ปัญหาอุปสรรค") || hLower.includes("ปัญหา") || hLower.includes("อุปสรรค") || hLower.includes("✌");
        }
        if (fieldKey === "reportedByCol") {
          return (hLower.includes("ผู้รายงาน") || hLower.includes("ชื่อ - สกุล") || hLower.includes("ชื่อ-สกุล") || hLower.includes("👮‍♂️ ยศ")) && !hLower.includes("อีเมล");
        }
        return false;
      });

      if (match) {
        newConfig[fieldKey] = match;
      }
    });

    setMappingConfig(newConfig);
    setSyncToast({ message: "จับคู่คอลัมน์ให้อัตโนมัติเรียบร้อยแล้ว!", type: "info" });
    setTimeout(() => setSyncToast(null), 3000);
  };

  // Identify new or unmapped headers
  const mappedHeadersSet = useMemo(() => {
    return new Set(Object.values(mappingConfig));
  }, [mappingConfig]);

  const columnGuardResult = useMemo(() => {
    return DataSchemaGuard.validateHeaders(detectedHeaders);
  }, [detectedHeaders]);

  const unmappedDetectedHeaders = useMemo(() => {
    return detectedHeaders.filter(h => !mappedHeadersSet.has(h));
  }, [detectedHeaders, mappedHeadersSet]);

  const handleSaveAndApply = () => {
    localStorage.setItem("kopodot_column_mapping_schema", JSON.stringify(mappingConfig));
    onApplyMapping(mappingConfig);
    setSyncToast({ message: "บันทึกการแมปคอลัมน์เรียบร้อยแล้ว!", type: "success" });
    setTimeout(() => {
      setSyncToast(null);
      onClose();
    }, 1000);
  };

  const handleResetDefault = () => {
    setMappingConfig(DEFAULT_COLUMN_MAPPING);
    localStorage.removeItem("kopodot_column_mapping_schema");
  };

  const handleForceSyncClick = async () => {
    try {
      const addedCount = await onForceSync();
      if (addedCount > 0) {
        setSyncToast({ message: `ซิงก์ข้อมูลสำเร็จ! นำเข้าข้อมูลใหม่เพิ่ม +${addedCount} รายงาน`, type: "success" });
      } else {
        setSyncToast({ message: "ซิงก์ข้อมูลสำเร็จ! ข้อมูลในระบบเป็นปัจจุบันอยู่แล้ว", type: "info" });
      }
    } catch (err) {
      setSyncToast({ message: "เกิดข้อผิดพลาดในการเชื่อมต่อซิงก์ข้อมูล Google Sheet", type: "info" });
    }
    setTimeout(() => setSyncToast(null), 4000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 no-print animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden">

        {/* Modal Header */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-950 text-white px-6 py-5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3 min-w-0 flex-1 mr-2">
            <div className="w-11 h-11 rounded-2xl bg-amber-400/20 border border-amber-400/40 flex items-center justify-center text-amber-300 shrink-0">
              <ArrowRightLeft className="w-6 h-6" />
            </div>
            <div className="min-w-0 flex-1">
              <h2 
                className="font-extrabold text-xs sm:text-sm md:text-base lg:text-lg xl:text-xl text-white tracking-tight flex items-center gap-2 whitespace-nowrap overflow-hidden text-ellipsis"
                title="แมปคอลัมน์ Google Sheet แบบยืดหยุ่น (Dynamic Column Mapper)"
              >
                <span className="whitespace-nowrap overflow-hidden text-ellipsis">แมปคอลัมน์ Google Sheet แบบยืดหยุ่น (Dynamic Column Mapper)</span>
                <span className="bg-emerald-500/20 text-emerald-300 text-[10px] sm:text-xs px-2.5 py-0.5 rounded-full border border-emerald-400/30 font-bold shrink-0 hidden sm:inline-block">
                  Live Sync
                </span>
              </h2>
              <p 
                className="text-[11px] sm:text-xs text-slate-300 mt-0.5 font-medium whitespace-nowrap overflow-hidden text-ellipsis"
                title="รองรับการแก้ไขชื่อหัวข้อใน Google Sheet โดยไม่ทำให้โครงสร้างข้อมูล กพด.5 เสียหาย"
              >
                รองรับการแก้ไขชื่อหัวข้อใน Google Sheet โดยไม่ทำให้โครงสร้างข้อมูล กพด.5 เสียหาย
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white/80 hover:text-white flex items-center justify-center transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Sync Status Banner */}
        <div className="bg-slate-100/90 px-6 py-3 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-emerald-50 text-emerald-800 border border-emerald-200/80 px-3 py-1.5 rounded-xl text-xs font-bold">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
              </span>
              <span>สถานะ: เชื่อมต่อ Google Sheet เรียบร้อย</span>
            </div>

            <div className="text-xs font-semibold text-slate-600">
              ซิงก์ล่าสุด: <span className="font-bold text-slate-800">{lastSyncedTime || "เมื่อสักครู่"}</span>
            </div>
            <div className="text-xs font-semibold text-slate-600">
              ข้อมูลปัจจุบัน: <span className="font-bold text-indigo-700">{totalReportsCount} รายงาน</span>
            </div>
          </div>

          <button
            onClick={handleForceSyncClick}
            disabled={isSyncing}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs px-3.5 py-1.5 rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-amber-300 ${isSyncing ? "animate-spin" : ""}`} />
            <span>ดึงข้อมูลล่าสุดทันที (Force Refresh)</span>
          </button>
        </div>

        {/* Toast Alert Notice */}
        {syncToast && (
          <div className={`mx-6 mt-4 p-3.5 rounded-2xl text-xs font-extrabold flex items-center gap-2 animate-in fade-in ${
            syncToast.type === "success" ? "bg-emerald-50 border border-emerald-300 text-emerald-900" : "bg-blue-50 border border-blue-300 text-blue-900"
          }`}>
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
            <span>{syncToast.message}</span>
          </div>
        )}

        {/* Main Content Area */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">

          {/* Data Schema Guard Status Card */}
          <div className={`p-4 rounded-2xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${
            columnGuardResult.isValid 
              ? "bg-emerald-50/90 border-emerald-200 text-emerald-950" 
              : "bg-amber-50/90 border-amber-300 text-amber-950"
          }`}>
            <div className="flex items-start gap-3 min-w-0">
              {columnGuardResult.isValid ? (
                <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              )}
              <div className="space-y-1 text-xs">
                <div className="font-extrabold flex items-center gap-2">
                  <span>
                    {columnGuardResult.isValid 
                      ? "Schema Guard: คอลัมน์สเปรดชีตตรงตามมาตรฐานระบบ 100%" 
                      : "Schema Guard: ตรวจพบหัวคอลัมน์แตกต่างจากค่าเริ่มต้น"}
                  </span>
                  <span className="bg-white/80 border text-[10px] px-2 py-0.5 rounded-full font-extrabold">
                    {columnGuardResult.confidenceScore}% Confidence
                  </span>
                </div>
                <p className="text-slate-600 font-medium">
                  พบคอลัมน์สเปรดชีตทั้งหมด {columnGuardResult.headerCount} คอลัมน์ • แมปปิ้งตรงฟิลด์ระบบ {columnGuardResult.matchedColumnsCount} คอลัมน์
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleAutoMatch}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs px-4 py-2 rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer shrink-0 w-full sm:w-auto justify-center"
            >
              <Zap className="w-4 h-4 text-amber-300" />
              <span>จับคู่คอลัมน์อัตโนมัติ (Smart Auto-Match)</span>
            </button>
          </div>

          {/* New Unmapped Column Warning Banner if detected */}
          {unmappedDetectedHeaders.length > 0 && (
            <div className="bg-amber-50/90 border border-amber-300/80 rounded-2xl p-4 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="space-y-1.5 text-xs">
                <div className="font-extrabold text-amber-950 flex items-center gap-2">
                  <span>ตรวจพบคอลัมน์ใหม่ใน Google Sheet ({unmappedDetectedHeaders.length} คอลัมน์):</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {unmappedDetectedHeaders.map((h, i) => (
                    <span key={i} className="bg-amber-200/80 text-amber-900 font-bold px-2 py-0.5 rounded-md text-[11px]">
                      {h}
                    </span>
                  ))}
                </div>
                <p className="text-[11px] text-amber-800 font-medium">
                  คุณสามารถแมปคอลัมน์ใหม่เหล่านี้เข้ากับฟีลด์ของ กพด.5 ด้านล่างได้ตามต้องการ
                </p>
              </div>
            </div>
          )}

          {/* Quick Action Toolbar */}
          <div className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-2xl p-3.5">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-500" />
              <span className="text-xs font-extrabold text-slate-800">
                ตรวจพบหัวข้อคอลัมน์จาก Sheet ทั้งหมด {detectedHeaders.length} คอลัมน์
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleAutoMatch}
                className="bg-amber-400/20 hover:bg-amber-400/30 text-amber-900 border border-amber-400/50 font-bold text-xs px-3 py-1.5 rounded-xl transition flex items-center gap-1.5 cursor-pointer"
              >
                <Zap className="w-3.5 h-3.5 text-amber-600" />
                <span>วิเคราะห์จับคู่คอลัมน์อัตโนมัติ (Auto Match)</span>
              </button>

              <button
                type="button"
                onClick={handleResetDefault}
                className="bg-white hover:bg-slate-100 text-slate-600 border border-slate-300 font-medium text-xs px-3 py-1.5 rounded-xl transition flex items-center gap-1.5 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>คืนค่าเริ่มต้น</span>
              </button>
            </div>
          </div>

          {/* Mapping Table Grid */}
          <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-xs bg-white">
            <div className="bg-slate-100/90 px-4 py-3 border-b border-slate-200 grid grid-cols-1 md:grid-cols-12 gap-2 text-xs font-black text-slate-700 uppercase tracking-wider">
              <div className="md:col-span-5">ฟีลด์เป้าหมายของ กพด.5 (Target Field)</div>
              <div className="md:col-span-1 text-center hidden md:block">→</div>
              <div className="md:col-span-6">หัวข้อคอลัมน์ใน Google Sheet (Source Column)</div>
            </div>

            <div className="divide-y divide-slate-150">
              {TARGET_FIELDS.map((tf) => {
                const currentMapped = mappingConfig[tf.key] || "";
                const isMapped = Boolean(currentMapped);

                return (
                  <div key={tf.key} className="p-3 sm:p-4 grid grid-cols-1 md:grid-cols-12 gap-3 items-center hover:bg-slate-50/80 transition">
                    
                    {/* Target Field Label & Description */}
                    <div className="md:col-span-5 space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-xs text-slate-900">{tf.label}</span>
                        {tf.required && (
                          <span className="bg-rose-100 text-rose-700 text-[10px] px-1.5 py-0.2 rounded font-bold">จำเป็น</span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 font-medium">{tf.desc}</p>
                    </div>

                    {/* Arrow Indicator */}
                    <div className="md:col-span-1 text-center text-slate-400 hidden md:block">
                      <ArrowRightLeft className="w-4 h-4 mx-auto text-indigo-500" />
                    </div>

                    {/* Dropdown Selector for Source Header */}
                    <div className="md:col-span-6">
                      <select
                        value={currentMapped}
                        onChange={(e) => {
                          setMappingConfig({
                            ...mappingConfig,
                            [tf.key]: e.target.value
                          });
                        }}
                        className={`w-full text-xs font-bold rounded-xl px-3 py-2 border transition focus:ring-2 focus:ring-blue-500/20 ${
                          isMapped 
                            ? "bg-blue-50/60 border-blue-300 text-blue-950" 
                            : "bg-white border-slate-300 text-slate-500"
                        }`}
                      >
                        <option value="">-- ไม่ได้แมปคอลัมน์ --</option>
                        {detectedHeaders.map((header, idx) => (
                          <option key={idx} value={header}>
                            [{idx + 1}] {header}
                          </option>
                        ))}
                      </select>
                    </div>

                  </div>
                );
              })}
            </div>
          </div>

          {/* Sample Row Preview Table */}
          {sampleRows.length > 0 && (
            <div className="border border-slate-200 rounded-2xl p-4 bg-slate-50/50 space-y-3">
              <h4 className="text-xs font-black text-slate-800 flex items-center gap-2">
                <Table className="w-4 h-4 text-indigo-600" />
                <span>ตัวอย่างการแสดงผลข้อมูลเมื่อใช้แมปปิ้งนี้ (Sample Live Data Preview)</span>
              </h4>
              <div className="overflow-x-auto border border-slate-200 rounded-xl bg-white">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                    <tr>
                      <th className="p-2 border-r border-slate-200">โรงเรียน</th>
                      <th className="p-2 border-r border-slate-200">กิจกรรม</th>
                      <th className="p-2 border-r border-slate-200">เป้าหมาย</th>
                      <th className="p-2">รายละเอียด</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-150 text-[11px] text-slate-700">
                    {sampleRows.map((row, idx) => {
                      const getVal = (colName: string) => {
                        const colIdx = detectedHeaders.indexOf(colName);
                        return colIdx >= 0 ? row[colIdx] || "-" : "-";
                      };

                      return (
                        <tr key={idx} className="hover:bg-slate-50">
                          <td className="p-2 font-bold text-slate-900 border-r border-slate-200">
                            {getVal(mappingConfig.schoolNameCol)}
                          </td>
                          <td className="p-2 border-r border-slate-200">
                            {getVal(mappingConfig.activityNameCol)}
                          </td>
                          <td className="p-2 border-r border-slate-200 font-bold text-indigo-800">
                            {getVal(mappingConfig.goalCol)}
                          </td>
                          <td className="p-2 truncate max-w-xs">
                            {getVal(mappingConfig.detailsCol)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="bg-slate-100 px-6 py-4 border-t border-slate-200 flex items-center justify-between shrink-0">
          <div className="text-xs font-semibold text-slate-500">
            * การบันทึกแมปปิ้งจะถูกจดจำไว้ใช้งานกับ Google Sheet ของระบบถาวร
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-700 text-xs font-bold hover:bg-slate-50 transition cursor-pointer"
            >
              ยกเลิก
            </button>

            <button
              onClick={handleSaveAndApply}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 text-white text-xs font-extrabold shadow-md hover:shadow-lg transition flex items-center gap-2 cursor-pointer"
            >
              <Save className="w-4 h-4 text-amber-300" />
              <span>บันทึกโครงสร้างแมปปิ้งและประมวลผล</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}

export default ColumnMapperModal;
