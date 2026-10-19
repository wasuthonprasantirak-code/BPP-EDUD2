import { useState, useEffect } from "react";
import { sanitizeWindowsFilename, triggerWindowsFileDownload } from "../lib/windowsUtils";
import { 
  Wifi, 
  WifiOff, 
  CloudUpload, 
  CheckCircle2, 
  Clock, 
  Trash2, 
  Edit, 
  RefreshCw, 
  Sparkles, 
  AlertCircle, 
  FileText, 
  Send, 
  X, 
  Download, 
  ShieldAlert, 
  MapPin, 
  School, 
  Radio, 
  Check, 
  Layers, 
  Database,
  Upload,
  HardDrive
} from "lucide-react";
import { ActivityReport, ReportStatus } from "../types";
import { safeLocalStorage } from "../lib/storage";
import { indexedDbEngine } from "../lib/indexedDbStorage";

export interface OfflineDraftReport extends ActivityReport {
  isOfflineDraft?: boolean;
  offlineCreatedTime?: string;
  syncStatus?: "pending" | "syncing" | "synced" | "failed";
  syncErrorMessage?: string;
}

interface OfflineSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  isOnline: boolean;
  offlineDrafts: OfflineDraftReport[];
  onDeleteDraft: (draftId: string) => void;
  onSyncDraftsNow: () => Promise<number>;
  onSelectDraftToEdit?: (draft: ActivityReport) => void;
  onToggleSimulateOffline?: () => void;
  isSimulatedOffline?: boolean;
}

export function OfflineSyncModal({
  isOpen,
  onClose,
  isOnline,
  offlineDrafts,
  onDeleteDraft,
  onSyncDraftsNow,
  onSelectDraftToEdit,
  onToggleSimulateOffline,
  isSimulatedOffline = false
}: OfflineSyncModalProps) {
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncToast, setSyncToast] = useState<{ message: string; type: "success" | "error" | "info" } | null>(null);
  const [storageEstimate, setStorageEstimate] = useState<{ usedMB: string; quotaMB: string; percentage: number }>({
    usedMB: "0.8",
    quotaMB: "1024",
    percentage: 1
  });

  const effectiveOnline = isOnline && !isSimulatedOffline;

  useEffect(() => {
    if (isOpen) {
      indexedDbEngine.getStorageEstimate().then((res) => {
        setStorageEstimate(res);
      });
    }
  }, [isOpen]);

  const handleSyncAllClick = async () => {
    if (!effectiveOnline) {
      setSyncToast({ message: "ระบบอยู่ในโหมดออฟไลน์ ไม่สามารถเชื่อมต่อส่งข้อมูลเข้า Google Sheets ได้ในขณะนี้", type: "error" });
      setTimeout(() => setSyncToast(null), 4000);
      return;
    }

    if (offlineDrafts.length === 0) {
      setSyncToast({ message: "ไม่มีแบบร่างออฟไลน์ที่รอการซิงก์", type: "info" });
      setTimeout(() => setSyncToast(null), 3000);
      return;
    }

    setIsSyncing(true);
    try {
      const count = await onSyncDraftsNow();
      setSyncToast({ message: `ส่งข้อมูลแบบร่างขึ้นระบบเรียบร้อยแล้ว +${count} รายงาน!`, type: "success" });
    } catch (err) {
      setSyncToast({ message: "เกิดข้อผิดพลาดระหว่างส่งแบบร่างออฟไลน์ขึ้น Google Sheets", type: "error" });
    } finally {
      setIsSyncing(false);
      setTimeout(() => setSyncToast(null), 4000);
    }
  };

  const handleExportBackupJson = () => {
    try {
      const jsonStr = JSON.stringify(offlineDrafts, null, 2);
      const blob = new Blob([jsonStr], { type: "application/json;charset=utf-8;" });
      const fileName = sanitizeWindowsFilename(`kopodot_offline_backup_${new Date().toISOString().slice(0, 10)}.json`);
      triggerWindowsFileDownload(blob, fileName);
      setSyncToast({ message: "ส่งออกไฟล์สำรองข้อมูลออฟไลน์ (.json) สำเร็จแล้ว", type: "success" });
      setTimeout(() => setSyncToast(null), 3000);
    } catch (e) {
      setSyncToast({ message: "ไม่สามารถส่งออกไฟล์สำรองได้", type: "error" });
      setTimeout(() => setSyncToast(null), 3000);
    }
  };

  const handleImportBackupJson = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const imported = JSON.parse(content);
        if (Array.isArray(imported)) {
          alert(`นำเข้าข้อมูลไฟล์สำรองออฟไลน์สำเร็จ ${imported.length} รายการ!`);
        } else {
          alert("รูปแบบไฟล์สำรองไม่ถูกต้อง");
        }
      } catch (err) {
        alert("ไม่สามารถอ่านไฟล์สำรองได้ รูปแบบ JSON ไม่ถูกต้อง");
      }
    };
    reader.readAsText(file);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 no-print animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-950 text-white px-6 py-5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3 min-w-0 flex-1 mr-2">
            <div className={`w-11 h-11 rounded-2xl border flex items-center justify-center shrink-0 ${
              effectiveOnline 
                ? "bg-emerald-500/20 border-emerald-400/40 text-emerald-300" 
                : "bg-amber-500/20 border-amber-400/40 text-amber-300 animate-pulse"
            }`}>
              {effectiveOnline ? <Wifi className="w-6 h-6" /> : <WifiOff className="w-6 h-6" />}
            </div>
            <div className="min-w-0 flex-1">
              <h2 
                className="font-extrabold text-xs sm:text-sm md:text-base lg:text-lg xl:text-xl text-white tracking-tight flex items-center gap-2 whitespace-nowrap overflow-hidden text-ellipsis"
                title="ระบบบันทึกและซิงก์ข้อมูลออฟไลน์ภาคสนาม"
              >
                <span className="whitespace-nowrap overflow-hidden text-ellipsis">ระบบบันทึกและซิงก์ข้อมูลออฟไลน์ภาคสนาม</span>
                <span className={`text-[10px] sm:text-xs px-2.5 py-0.5 rounded-full border font-bold shrink-0 hidden sm:inline-block ${
                  effectiveOnline
                    ? "bg-emerald-500/20 text-emerald-300 border-emerald-400/30"
                    : "bg-amber-500/20 text-amber-300 border-amber-400/30"
                }`}>
                  {effectiveOnline ? "Online (พร้อมซิงก์)" : "Offline (โหมดไร้สัญญาณ)"}
                </span>
              </h2>
              <p 
                className="text-[11px] sm:text-xs text-slate-300 mt-0.5 font-medium whitespace-nowrap overflow-hidden text-ellipsis"
                title="รองรับการทำงานในพื้นที่โรงเรียน ตชด. ชายแดน ไม่มีเน็ต/ไม่มีไฟ บันทึกร่างและซิงก์ให้อัตโนมัติเมื่อมีสัญญาณ"
              >
                รองรับการทำงานในพื้นที่โรงเรียน ตชด. ชายแดน ไม่มีเน็ต/ไม่มีไฟ บันทึกร่างและซิงก์ให้อัตโนมัติเมื่อมีสัญญาณ
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

        {/* Live Network & Draft Status Banner */}
        <div className="bg-slate-100/90 px-6 py-3 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className={`flex items-center gap-2 border px-3 py-1.5 rounded-xl text-xs font-bold ${
              effectiveOnline
                ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                : "bg-amber-50 text-amber-900 border-amber-300"
            }`}>
              <span className="relative flex h-2.5 w-2.5">
                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${effectiveOnline ? "bg-emerald-400" : "bg-amber-400"}`}></span>
                <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${effectiveOnline ? "bg-emerald-500" : "bg-amber-500"}`}></span>
              </span>
              <span>
                {effectiveOnline 
                  ? "สัญญาณอินเทอร์เน็ตปกติ - พร้อมส่งแบบร่างขึ้น Google Sheets" 
                  : "กำลังทำงานในโหมดออฟไลน์ - ข้อมูลจะถูกเก็บไว้ในเครื่องอย่างปลอดภัย"}
              </span>
            </div>

            <div className="text-xs font-bold text-slate-700">
              แบบร่างค้างซิงก์: <span className="text-indigo-700 font-extrabold text-sm">{offlineDrafts.length} รายการ</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onToggleSimulateOffline && (
              <button
                type="button"
                onClick={onToggleSimulateOffline}
                className={`text-xs font-bold px-3 py-1.5 rounded-xl border transition flex items-center gap-1.5 cursor-pointer ${
                  isSimulatedOffline
                    ? "bg-amber-100 text-amber-900 border-amber-300 hover:bg-amber-200"
                    : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50"
                }`}
                title="จำลองสถานการณ์ขาดสัญญาณอินเทอร์เน็ตเพื่อทดสอบระบบ"
              >
                <Radio className={`w-3.5 h-3.5 ${isSimulatedOffline ? "text-amber-600 animate-spin" : "text-slate-500"}`} />
                <span>{isSimulatedOffline ? "ปิดทดสอบออฟไลน์" : "ทดสอบโหมดออฟไลน์"}</span>
              </button>
            )}

            <button
              onClick={handleSyncAllClick}
              disabled={isSyncing || offlineDrafts.length === 0 || !effectiveOnline}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs px-4 py-1.5 rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <CloudUpload className={`w-4 h-4 text-amber-300 ${isSyncing ? "animate-bounce" : ""}`} />
              <span>{isSyncing ? "กำลังซิงก์ขึ้น Google Sheet..." : "ซิงก์แบบร่างทั้งหมดตอนนี้"}</span>
            </button>
          </div>
        </div>

        {/* Sync Toast Alert Notice */}
        {syncToast && (
          <div className={`mx-6 mt-4 p-3.5 rounded-2xl text-xs font-extrabold flex items-center gap-2 animate-in fade-in ${
            syncToast.type === "success" 
              ? "bg-emerald-50 border border-emerald-300 text-emerald-900" 
              : syncToast.type === "error"
                ? "bg-rose-50 border border-rose-300 text-rose-900"
                : "bg-blue-50 border border-blue-300 text-blue-900"
          }`}>
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{syncToast.message}</span>
          </div>
        )}

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5">

          {/* Info Card explaining Offline PWA capability */}
          <div className="bg-gradient-to-r from-blue-50 via-indigo-50 to-sky-50 border border-indigo-100 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3.5 min-w-0">
              <Database className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
              <div className="space-y-1 text-xs">
                <h4 className="font-extrabold text-indigo-950 flex items-center gap-2">
                  <span>สถาปัตยกรรม Offline-First Data Caching & IndexedDB Engine</span>
                  <span className="bg-indigo-100 text-indigo-800 text-[10px] px-2 py-0.5 rounded-full font-extrabold">IndexedDB Ready</span>
                </h4>
                <p className="text-slate-600 leading-relaxed font-medium">
                  ระบบถูกออกแบบให้บันทึกรายงานผล กพด.5 ลงในฐานข้อมูลของอุปกรณ์ (IndexedDB Database) อัตโนมัติแม้ในพื้นที่ป่าเขาชายแดน ครู ตชด. สามารถกรอกข้อมูล แนบรูปภาพความละเอียดสูง และเปิดดูรายงานย้อนหลังได้ทุกเมื่อ
                </p>
              </div>
            </div>

            {/* Storage Usage Status Badge */}
            <div className="bg-white/90 border border-indigo-200/90 rounded-xl p-3 shrink-0 text-right space-y-1 w-full sm:w-auto">
              <div className="flex items-center gap-1.5 justify-end text-xs font-bold text-slate-700">
                <HardDrive className="w-3.5 h-3.5 text-indigo-600" />
                <span>พื้นที่ IndexedDB:</span>
                <span className="text-indigo-900 font-extrabold">{storageEstimate.usedMB} MB</span>
              </div>
              <div className="w-full sm:w-36 bg-slate-100 rounded-full h-1.5 overflow-hidden border border-slate-200">
                <div 
                  className="bg-indigo-600 h-full rounded-full" 
                  style={{ width: `${Math.max(2, storageEstimate.percentage)}%` }}
                />
              </div>
              <p className="text-[10px] text-slate-400 font-medium">
                โควต้าคงเหลือ ~{storageEstimate.quotaMB} MB
              </p>
            </div>
          </div>

          {/* Offline Backup Export & Import Action Buttons */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 font-bold text-slate-800">
              <ShieldAlert className="w-4 h-4 text-amber-600" />
              <span>เครื่องมือสำรองข้อมูลภาคสนาม (.json):</span>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={handleExportBackupJson}
                className="bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 font-bold px-3 py-1.5 rounded-xl transition flex items-center gap-1.5 cursor-pointer text-xs"
                title="ดาวน์โหลดแบบร่างทั้งหมดเก็บไว้เป็นไฟล์ (.json)"
              >
                <Download className="w-3.5 h-3.5 text-indigo-600" />
                <span>ส่งออกไฟล์สำรอง (.json)</span>
              </button>

              <label className="bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 font-bold px-3 py-1.5 rounded-xl transition flex items-center gap-1.5 cursor-pointer text-xs">
                <Upload className="w-3.5 h-3.5 text-emerald-600" />
                <span>นำเข้าไฟล์สำรอง</span>
                <input 
                  type="file" 
                  accept=".json" 
                  onChange={handleImportBackupJson} 
                  className="hidden" 
                />
              </label>
            </div>
          </div>

          {/* Offline Draft List */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-extrabold text-sm text-slate-800 flex items-center gap-2">
                <FileText className="w-4 h-4 text-indigo-600" />
                <span>รายการแบบร่างที่บันทึกไว้ในโหมดออฟไลน์ ({offlineDrafts.length})</span>
              </h3>
            </div>

            {offlineDrafts.length === 0 ? (
              <div className="text-center py-10 px-4 border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50/50 space-y-3">
                <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
                <div>
                  <h4 className="text-xs font-black text-slate-700">ไม่มีแบบร่างค้างซิงก์</h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    รายงานทั้งหมดถูกซิงก์ขึ้น Google Sheets / ฐานข้อมูลกลางเรียบร้อยแล้ว
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-2.5">
                {offlineDrafts.map((draft) => (
                  <div key={draft.id} className="bg-white border border-slate-200/90 hover:border-indigo-300 rounded-2xl p-4 shadow-2xs hover:shadow-md transition space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="bg-amber-100 text-amber-900 font-extrabold text-[10px] px-2 py-0.5 rounded-full border border-amber-300 flex items-center gap-1">
                            <Clock className="w-3 h-3 text-amber-600" />
                            <span>แบบร่างออฟไลน์</span>
                          </span>
                          <span className="bg-indigo-50 text-indigo-800 font-bold text-[10px] px-2 py-0.5 rounded-full border border-indigo-200">
                            {draft.goalCode}
                          </span>
                          <span className="text-[11px] text-slate-400 font-medium">
                            {draft.offlineCreatedTime || draft.dateString || "ล่าสุด"}
                          </span>
                        </div>

                        <h4 className="font-extrabold text-xs sm:text-sm text-slate-900 truncate">
                          {draft.activityName || "กิจกรรมไม่ระบุชื่อ"}
                        </h4>

                        <p className="text-xs text-slate-600 font-medium flex items-center gap-1.5">
                          <School className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>{draft.schoolName}</span>
                          <span className="text-slate-300">•</span>
                          <span>{draft.participantsCount} ผู้เข้าร่วม</span>
                        </p>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {onSelectDraftToEdit && (
                          <button
                            onClick={() => {
                              onSelectDraftToEdit(draft);
                              onClose();
                            }}
                            className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-xl transition cursor-pointer border border-transparent hover:border-indigo-200"
                            title="แก้ไขแบบร่าง"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                        )}

                        <button
                          onClick={() => onDeleteDraft(draft.id)}
                          className="p-2 text-rose-600 hover:bg-rose-50 rounded-xl transition cursor-pointer border border-transparent hover:border-rose-200"
                          title="ลบแบบร่างนี้"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <p className="text-[11px] text-slate-600 line-clamp-2 bg-slate-50 p-2.5 rounded-xl border border-slate-150">
                      {draft.details || draft.qualitativeOutcome || "ไม่มีรายละเอียดสรุปเพิ่มเติม"}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

        {/* Footer */}
        <div className="bg-slate-100 px-6 py-4 border-t border-slate-200 flex items-center justify-between shrink-0">
          <div className="text-xs font-semibold text-slate-500">
            * เมื่อสัญญาณอินเทอร์เน็ตกลับมา ระบบจะทำการซิงก์แบบร่างออฟไลน์ขึ้นระบบโดยอัตโนมัติ
          </div>

          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold transition cursor-pointer"
          >
            ปิดหน้าต่าง
          </button>
        </div>

      </div>
    </div>
  );
}

export default OfflineSyncModal;
