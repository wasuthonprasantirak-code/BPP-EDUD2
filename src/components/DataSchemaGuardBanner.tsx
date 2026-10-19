import { useState } from "react";
import { 
  ShieldCheck, 
  ShieldAlert, 
  CheckCircle2, 
  AlertTriangle, 
  RefreshCw, 
  Sparkles, 
  ChevronDown, 
  ChevronUp, 
  FileSpreadsheet, 
  Info, 
  SlidersHorizontal,
  Table
} from "lucide-react";
import { FullSchemaGuardReport } from "../lib/dataSchemaGuard";

interface DataSchemaGuardBannerProps {
  guardReport: FullSchemaGuardReport | null;
  onOpenColumnMapper?: () => void;
  onRefreshValidation?: () => void;
  className?: string;
}

export function DataSchemaGuardBanner({
  guardReport,
  onOpenColumnMapper,
  onRefreshValidation,
  className = ""
}: DataSchemaGuardBannerProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!guardReport) return null;

  const { columnValidation, rowValidation, sourceType, timestamp } = guardReport;
  const isAllValid = columnValidation.isValid && rowValidation.invalidRowsCount === 0;

  return (
    <div className={`rounded-2xl border transition-all duration-200 ${
      isAllValid 
        ? "bg-emerald-50/80 border-emerald-200/90 text-emerald-950" 
        : "bg-amber-50/90 border-amber-300 text-amber-950"
    } ${className}`}>
      
      {/* Primary Banner Bar */}
      <div className="p-3.5 sm:p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
            isAllValid ? "bg-emerald-500 text-white" : "bg-amber-500 text-white animate-pulse"
          }`}>
            {isAllValid ? <ShieldCheck className="w-5 h-5" /> : <ShieldAlert className="w-5 h-5" />}
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-extrabold text-xs sm:text-sm">
                {isAllValid ? "ผ่านการตรวจสอบโครงสร้างสเปรดชีต (Schema Guard Passed)" : "เตือนโครงสร้างคอลัมน์/ข้อมูลสเปรดชีตมีข้อสังเกต"}
              </span>
              <span className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border ${
                isAllValid 
                  ? "bg-emerald-100 text-emerald-800 border-emerald-300" 
                  : "bg-amber-100 text-amber-900 border-amber-300"
              }`}>
                {columnValidation.confidenceScore}% Column Match
              </span>
              <span className="text-[10px] text-slate-500 font-medium">
                ตรวจสอบล่าสุด: {timestamp} ({sourceType})
              </span>
            </div>

            <p className="text-[11px] text-slate-600 mt-0.5 font-medium line-clamp-1">
              {isAllValid 
                ? `ตรวจสอบคอลัมน์ตรงกับโครงสร้างมาตรฐาน ${columnValidation.matchedColumnsCount}/${columnValidation.headerCount} คอลัมน์ • ข้อมูล ${rowValidation.totalRows} แถว สมบูรณ์ 100%`
                : `พบข้อสังเกตคอลัมน์/แถวข้อมูล: ${columnValidation.warnings.length} รายการเตือน • ${rowValidation.anomalies.length} จุดที่ควรตรวจสอบ`}
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 shrink-0">
          {onOpenColumnMapper && (
            <button
              type="button"
              onClick={onOpenColumnMapper}
              className="bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 font-bold text-xs px-3 py-1.5 rounded-xl shadow-2xs transition flex items-center gap-1.5 cursor-pointer"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-indigo-600" />
              <span>ปรับแมปปิ้งคอลัมน์</span>
            </button>
          )}

          {onRefreshValidation && (
            <button
              type="button"
              onClick={onRefreshValidation}
              className="p-1.5 hover:bg-black/5 rounded-xl text-slate-600 transition cursor-pointer"
              title="ตรวจสอบโครงสร้างใหม่อีกครั้ง"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          )}

          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1.5 hover:bg-black/5 rounded-xl text-slate-600 transition cursor-pointer flex items-center gap-1 text-xs font-bold"
          >
            <span>{isExpanded ? "ย่อ" : "ดูผลตรวจ"}</span>
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Expanded Details Panel */}
      {isExpanded && (
        <div className="px-4 pb-4 pt-2 border-t border-black/10 space-y-3 animate-in fade-in duration-150 text-xs">
          
          {/* Warnings List */}
          {columnValidation.warnings.length > 0 && (
            <div className="space-y-1.5">
              <h4 className="font-extrabold text-amber-950 flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>คำเตือนการจับคู่นามคอลัมน์สเปรดชีต ({columnValidation.warnings.length}):</span>
              </h4>
              <ul className="space-y-1 pl-5 list-disc text-[11.5px] text-slate-700">
                {columnValidation.warnings.map((warn, i) => (
                  <li key={i} className="leading-relaxed font-medium">{warn}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Row Validation Anomalies */}
          {rowValidation.anomalies.length > 0 && (
            <div className="space-y-1.5 pt-2 border-t border-black/5">
              <h4 className="font-extrabold text-amber-950 flex items-center gap-1.5">
                <Table className="w-4 h-4 text-amber-600 shrink-0" />
                <span>แถวข้อมูลที่มีจุดสังเกต หรือชื่อโรงเรียนไม่ตรงมาตรฐาน ({rowValidation.anomalies.length} จุด):</span>
              </h4>
              <div className="max-h-40 overflow-y-auto space-y-1 bg-white/80 p-2.5 rounded-xl border border-amber-200/80">
                {rowValidation.anomalies.map((anom, i) => (
                  <div key={i} className="flex items-center justify-between gap-2 text-[11px] text-slate-800 border-b border-slate-100 pb-1 last:border-0 last:pb-0">
                    <span className="font-bold text-amber-900 shrink-0">แถวที่ {anom.rowIndex}:</span>
                    <span className="flex-1 truncate">{anom.issue}</span>
                    {anom.schoolName && (
                      <span className="bg-amber-100 text-amber-900 text-[10px] px-2 py-0.5 rounded font-extrabold shrink-0">
                        {anom.schoolName}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* All Passed Confirmation */}
          {isAllValid && (
            <div className="flex items-center gap-2 text-emerald-800 font-bold bg-white/80 p-2.5 rounded-xl border border-emerald-200">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>โครงสร้างสเปรดชีตสมบูรณ์แบบ ไม่พบข้อผิดพลาดของหัวคอลัมน์ หรือชื่อโรงเรียน</span>
            </div>
          )}
        </div>
      )}

    </div>
  );
}
