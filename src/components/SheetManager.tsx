import { useState, useMemo, useEffect } from "react";
import { ActivityReport, ReportStatus, KOPODOT_GOALS } from "../types";
import { Link, CloudUpload, FileSpreadsheet, Plus, Trash2, Download, CheckCircle, Info, Copy, ChevronLeft, ChevronRight, ArrowRightLeft, ShieldCheck } from "lucide-react";
import { DataSchemaGuard, FullSchemaGuardReport } from "../lib/dataSchemaGuard";
import { DataSchemaGuardBanner } from "./DataSchemaGuardBanner";
import { sanitizeWindowsFilename, createWindowsSafeCsvBlob, triggerWindowsFileDownload } from "../lib/windowsUtils";

interface SheetManagerProps {
  reports: ActivityReport[];
  setReports: (reports: ActivityReport[]) => void;
  onSyncSheet: (csvText: string) => void;
  onOpenColumnMapper?: () => void;
  isSyncing: boolean;
  sheetSynced: boolean;
}

export default function SheetManager({ reports, setReports, onSyncSheet, onOpenColumnMapper, isSyncing, sheetSynced }: SheetManagerProps) {
  const [sheetUrl, setSheetUrl] = useState("");
  const [csvPasteText, setCsvPasteText] = useState("");
  const [showPasteBox, setShowPasteBox] = useState(false);
  const [editingCell, setEditingCell] = useState<{ id: string; field: keyof ActivityReport } | null>(null);
  const [editValue, setEditValue] = useState("");

  // Schema Guard Validation Report
  const [schemaGuardReport, setSchemaGuardReport] = useState<FullSchemaGuardReport | null>(null);

  useEffect(() => {
    if (reports && reports.length > 0) {
      const report = DataSchemaGuard.runFullGuard("", reports, "Google Sheets Live");
      setSchemaGuardReport(report);
    }
  }, [reports]);

  // Pagination states for large datasets
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(25);

  // Reset to page 1 when reports count changes or pageSize changes
  useEffect(() => {
    setCurrentPage(1);
  }, [reports.length, pageSize]);

  const totalPages = Math.ceil(reports.length / pageSize) || 1;

  // Sliced reports for current page
  const displayedReports = useMemo(() => {
    if (pageSize === 0) return reports; // Show all
    const startIdx = (currentPage - 1) * pageSize;
    return reports.slice(startIdx, startIdx + pageSize);
  }, [reports, currentPage, pageSize]);

  // Convert current reports back to CSV for user export
  const handleExportCSV = () => {
    const headers = [
      "id",
      "projectName",
      "activityName",
      "goalCode",
      "schoolName",
      "reportingPeriod",
      "dateString",
      "location",
      "targetGroup",
      "participantsCount",
      "objectives",
      "details",
      "quantitativeOutcome",
      "qualitativeOutcome",
      "problems",
      "suggestions",
      "reportedBy",
      "reportPosition",
      "approverName",
      "approverPosition",
      "status"
    ];

    const csvRows = [headers.join(",")];

    reports.forEach((r) => {
      const rowValues = headers.map((header) => {
        const val = r[header as keyof ActivityReport] || "";
        // Escape quotes
        const escaped = String(val).replace(/"/g, '""');
        return `"${escaped}"`;
      });
      csvRows.push(rowValues.join(","));
    });

    const csvContent = csvRows.join("\r\n");
    const blob = createWindowsSafeCsvBlob(csvContent);
    const fileName = sanitizeWindowsFilename(`kopodot_plan5_activity_reports_${new Date().toISOString().slice(0, 10)}.csv`);
    triggerWindowsFileDownload(blob, fileName);
  };

  // Try to fetch CSV from Public Google Sheet URL via server-side proxy or direct fetch
  const handleUrlSync = async () => {
    if (!sheetUrl) return;

    let targetUrl = sheetUrl.trim();
    if (targetUrl.includes("docs.google.com/spreadsheets") && !targetUrl.includes("export?format=csv") && !targetUrl.includes("output=csv")) {
      const match = targetUrl.match(/\/d\/([a-zA-Z0-9-_]+)/);
      if (match && match[1]) {
        targetUrl = `https://docs.google.com/spreadsheets/d/${match[1]}/export?format=csv`;
      }
    }

    try {
      // 1. Try server-side proxy to bypass CORS
      const serverRes = await fetch(`/api/fetch-live-sheet?url=${encodeURIComponent(targetUrl)}`);
      if (serverRes.ok) {
        const json = await serverRes.json();
        if (json.success && json.csvText) {
          onSyncSheet(json.csvText);
          alert("ดึงข้อมูลอัตโนมัติจาก Google Sheets สำเร็จเรียบร้อยแล้ว!");
          return;
        }
      }

      // 2. Client-side fallback fetch
      const res = await fetch(targetUrl);
      if (!res.ok) throw new Error("CORS or Invalid URL");
      const text = await res.text();
      onSyncSheet(text);
      alert("ดึงและซิงก์ข้อมูลสำเร็จเรียบร้อยแล้ว!");
    } catch (err) {
      console.warn("Direct and proxy fetch blocked. Switching to Paste CSV fallback.");
      setShowPasteBox(true);
      alert("ไม่สามารถดึงข้อมูลอัตโนมัติผ่าน URL นี้ได้โดยตรงเนื่องจากสิทธิ์การแชร์หรือข้อจำกัดด้านความปลอดภัย ระบบได้เปิดกล่องข้อความด้านล่าง เพื่อให้คุณคัดลอก CSV จาก Google Sheets มาวางโดยตรง");
    }
  };

  // Sync via Pasted Text
  const handlePasteSync = () => {
    if (!csvPasteText.trim()) return;
    onSyncSheet(csvPasteText);
    alert("ซิงก์ข้อมูลจากการวาง CSV สำเร็จแล้ว!");
    setCsvPasteText("");
    setShowPasteBox(false);
  };

  // Add a blank row
  const handleAddRow = () => {
    const newId = `REP-${String(reports.length + 1).padStart(3, "0")}`;
    const newReport: ActivityReport = {
      id: newId,
      projectName: "โครงการตามแผน กพด. ใหม่",
      activityName: "ชื่อกิจกรรมรายงาน",
      goalCode: "ด้านที่ 1",
      schoolName: "รร.ตชด.บ้านโคกแสลง",
      reportingPeriod: "งวดที่ 1/2569",
      dateString: "1 ตุลาคม 2569",
      location: "โรงเรียน",
      targetGroup: "นักเรียน",
      participantsCount: 30,
      objectives: "วัตถุประสงค์โครงการ...",
      details: "รายละเอียดกิจกรรม...",
      quantitativeOutcome: "ผลเชิงปริมาณ...",
      qualitativeOutcome: "ผลเชิงคุณภาพ...",
      problems: "-",
      suggestions: "-",
      reportedBy: "ผู้รายงานผล",
      reportPosition: "ครูผู้รับผิดชอบ",
      approverName: "ผู้อำนวยการ",
      approverPosition: "ผู้อำนวยการโรงเรียน",
      status: ReportStatus.DRAFT,
      lastUpdated: new Date().toISOString()
    };

    setReports([newReport, ...reports]);
  };

  // Delete a row
  const handleDeleteRow = (id: string) => {
    if (confirm(`คุณต้องการลบแถวรายงานรหัส ${id} ใช่หรือไม่?`)) {
      setReports(reports.filter((r) => r.id !== id));
    }
  };

  // Inline edit cells
  const startEditing = (id: string, field: keyof ActivityReport, currentVal: any) => {
    setEditingCell({ id, field });
    setEditValue(String(currentVal));
  };

  const saveCellEdit = (id: string, field: keyof ActivityReport) => {
    setReports(reports.map((r) => {
      if (r.id === id) {
        let value: any = editValue;
        if (field === "participantsCount") {
          value = Number(editValue) || 0;
        }
        return {
          ...r,
          [field]: value,
          lastUpdated: new Date().toISOString()
        };
      }
      return r;
    }));
    setEditingCell(null);
  };

  // Sample CSV Headers template string
  const sampleCSVTemplate = `projectName,activityName,goalCode,schoolName,reportingPeriod,dateString,location,targetGroup,participantsCount,objectives,details,quantitativeOutcome,qualitativeOutcome,problems,suggestions,reportedBy,reportPosition,approverName,approverPosition,status,imageUrl,videoUrl`;

  const copyTemplate = () => {
    navigator.clipboard.writeText(sampleCSVTemplate);
    alert("คัดลอกส่วนหัวเทมเพลตไปยังคลิปบอร์ดแล้ว คุณสามารถนำไปตั้งคอลัมน์ใน Google Sheet ได้ทันที!");
  };

  return (
    <div className="space-y-6">
      {/* Top synchronization panels */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* URL Sync Box */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs lg:col-span-7 space-y-4">
          <div className="flex items-center space-x-2.5">
            <div className="p-1.5 bg-blue-50 text-blue-600 rounded-lg">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <h2 className="font-extrabold text-slate-900 tracking-tight">เชื่อมต่อตารางและดึงข้อมูลจาก Google Sheet</h2>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed font-medium">
            คุณสามารถตั้งค่าคอลัมน์บน Google Sheets ให้มีชื่อตามคอลัมน์ระบบ จากนั้นแชร์ไฟล์เป็นสาธารณะ (Publish to web) เลือกรูปแบบเป็น Comma-Separated Values (CSV) และนำ URL มาซิงก์ที่นี่
          </p>

          <div className="flex space-x-2">
            <input
              type="text"
              value={sheetUrl}
              onChange={(e) => setSheetUrl(e.target.value)}
              placeholder="https://docs.google.com/spreadsheets/d/.../pub?output=csv"
              className="flex-grow text-xs px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none placeholder:text-slate-400 font-medium transition"
            />
            <button
              onClick={handleUrlSync}
              className="bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs px-5 py-2.5 rounded-lg shadow-sm transition flex items-center space-x-1.5 cursor-pointer"
            >
              <CloudUpload className="w-4 h-4" />
              <span>ซิงก์ข้อมูล</span>
            </button>

          </div>

          {/* Official Google Sheets and Google Forms Pipeline */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Google Form Link */}
            <div className="bg-purple-50/40 border border-purple-100 p-4 rounded-xl flex flex-col justify-between gap-3 text-xs">
              <div className="space-y-1">
                <div className="flex items-center gap-1.5">
                  <span className="font-extrabold text-purple-800 text-[10px] bg-purple-100 px-2 py-0.5 rounded-sm uppercase">ขั้นตอนที่ ๑</span>
                  <span className="text-purple-950 font-extrabold">ฟอร์มบันทึกรายงานกิจกรรม (Google Forms)</span>
                </div>
                <p className="text-[11px] text-slate-500 font-medium leading-relaxed">
                  เมื่อคุณครูจัดโครงการเสร็จสิ้นแล้ว สามารถกรอกรายงานรายละเอียดผลงาน พร้อมตัวชี้วัด กพด. เข้าสู่ระบบผ่านฟอร์มส่งข้อมูลนี้โดยตรง
                </p>
              </div>
              <a
                href="https://docs.google.com/forms/d/e/1FAIpQLSe1I3ZOG8PDvHkKIMEhrHwp3yd1kP0VfwDYWKBBaLuX7B8Jyg/viewform?usp=header"
                target="_blank"
                rel="noreferrer"
                className="w-full text-center text-xs text-white bg-purple-600 hover:bg-purple-700 px-4 py-2 rounded-lg font-extrabold transition flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
              >
                <Plus className="w-4 h-4" />
                <span>เปิดแบบฟอร์มส่งข้อมูลใหม่</span>
              </a>
            </div>

            {/* Google Sheet Link */}
            <div className="bg-blue-50/40 border border-blue-100 p-4 rounded-xl flex flex-col justify-between gap-3 text-xs">
              <div className="space-y-1">
                <div className="flex items-center gap-1.5">
                  <span className="font-extrabold text-blue-800 text-[10px] bg-blue-100 px-2 py-0.5 rounded-sm uppercase">ขั้นตอนที่ ๒</span>
                  <span className="text-blue-950 font-extrabold">ฐานข้อมูลคำตอบของระบบ (Google Sheets)</span>
                </div>
                <p className="text-[11px] text-slate-500 font-medium leading-relaxed">
                  คำตอบจะหลั่งไหลลงตารางนี้แบบเรียลไทม์ และคุณสามารถนำลิงก์มาวางในช่องด้านบนเพื่อซิงก์ข้อมูลอัปเดตล่าสุดเข้าสู่แดชบอร์ด
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setSheetUrl("https://docs.google.com/spreadsheets/d/1K6SK3N7KffCNJ8C6A8mogRompCcXiweuxBHZCjnR8kI/edit?usp=drivesdk")}
                  className="flex-1 text-[11px] text-blue-700 hover:text-blue-800 bg-white hover:bg-blue-50 border border-blue-200 py-2 rounded-lg font-extrabold transition cursor-pointer text-center"
                >
                  ใส่ลิงก์ชีตที่นี่
                </button>
                <a
                  href="https://docs.google.com/spreadsheets/d/1K6SK3N7KffCNJ8C6A8mogRompCcXiweuxBHZCjnR8kI/edit?usp=drivesdk"
                  target="_blank"
                  rel="noreferrer"
                  className="flex-1 text-[11px] text-slate-700 hover:text-slate-800 bg-white hover:bg-slate-100 border border-slate-300 py-2 rounded-lg font-extrabold transition flex items-center justify-center gap-1 cursor-pointer"
                >
                  <Link className="w-3.5 h-3.5 text-slate-450" />
                  <span>เปิดดูสเปรดชีต</span>
                </a>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 pt-1">
            <button
              onClick={() => setShowPasteBox(!showPasteBox)}
              className="text-xs text-blue-700 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 font-extrabold px-3.5 py-2 rounded-lg transition-colors cursor-pointer"
            >
              {showPasteBox ? "ซ่อนกล่องวาง CSV" : "เปิดตัวเลือกวางข้อความ CSV โดยตรง"}
            </button>
            <button
              onClick={handleExportCSV}
              className="text-xs text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 font-extrabold px-3.5 py-2 rounded-lg transition-colors flex items-center space-x-1 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>ส่งออกตารางเป็น .CSV</span>
            </button>
          </div>
        </div>

        {/* Template Instructions Box */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 lg:col-span-5 flex flex-col justify-between shadow-xs">
          <div>
            <div className="flex items-center space-x-2 text-slate-900 font-extrabold text-sm mb-2.5">
              <Info className="w-4 h-4 text-blue-600" />
              <span className="tracking-tight">ชื่อคอลัมน์ที่รองรับ (กพด. ฉบับที่ ๕)</span>
            </div>
            <p className="text-[11px] text-slate-400 font-medium leading-relaxed mb-3">
              แถวแรกของตารางบน Google Sheet ของคุณจะต้องตรงกับคำภาษาอังกฤษด้านล่างนี้เพื่อให้ระบบประมวลผลได้ถูกต้อง:
            </p>
            <div className="bg-slate-900 text-slate-300 font-mono text-[10px] p-3 rounded-lg border border-slate-800 select-all overflow-x-auto max-w-full truncate mb-3">
              {sampleCSVTemplate}
            </div>
          </div>
          
          <button
            onClick={copyTemplate}
            className="w-full flex items-center justify-center space-x-1.5 text-xs text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg py-2.5 font-bold transition cursor-pointer"
          >
            <Copy className="w-3.5 h-3.5" />
            <span>คัดลอกรายชื่อคอลัมน์</span>
          </button>
        </div>
      </div>

      {/* Manual CSV Paste Fallback */}
      {showPasteBox && (
        <div className="bg-blue-50/50 p-5 rounded-xl border border-blue-100 space-y-3 animate-fadeIn">
          <div className="flex items-center space-x-2 text-blue-900">
            <CloudUpload className="w-5 h-5 text-blue-600" />
            <h3 className="font-extrabold text-sm">วางข้อมูล CSV ดิบจากแผ่นตาราง Google Sheets</h3>
          </div>
          <p className="text-xs text-blue-700 leading-relaxed font-medium">
            วิธีง่ายที่สุด: บนตารางหน้า Google Sheets คลุมพื้นที่และแถวทั้งหมดที่คุณต้องการ (รวมหัวข้อด้วย) กดปุ่มคัดลอก (Ctrl+C / Cmd+C) แล้วนำมาวางในกล่องด้านล่างนี้โดยตรง ระบบจะเปลี่ยนเป็นข้อมูลในแอปทันที
          </p>
          <textarea
            value={csvPasteText}
            onChange={(e) => setCsvPasteText(e.target.value)}
            rows={5}
            placeholder="เช่น&#10;projectName,activityName,goalCode,schoolName,participantsCount,status&#10;โครงการเกษตรเพื่ออาหารกลางวัน,กิจกรรมเลี้ยงไก่ไข่,ด้านที่ 1,รร.ตชด.บ้านโคกแสลง,45,เสร็จสิ้น"
            className="w-full font-mono text-xs p-3 bg-white border border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
          />
          <div className="flex justify-end space-x-2">
            <button
              onClick={() => setShowPasteBox(false)}
              className="text-xs text-slate-500 bg-slate-150 hover:bg-slate-200 px-4 py-2 rounded-lg transition font-bold"
            >
              ยกเลิก
            </button>
            <button
              onClick={handlePasteSync}
              className="text-xs text-white bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg font-extrabold transition cursor-pointer shadow-sm"
            >
              ประมวลผลข้อมูลที่วาง
            </button>
          </div>
        </div>
      )}

      {/* Data Schema Guard & Validation Banner */}
      <DataSchemaGuardBanner 
        guardReport={schemaGuardReport} 
        onOpenColumnMapper={onOpenColumnMapper} 
      />

      {/* Spreadsheet grid UI */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        {/* Sheet Top actions */}
        <div className="flex flex-col sm:flex-row items-center justify-between p-4 bg-slate-50 border-b border-slate-200 gap-4">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-blue-600 text-white rounded-lg shadow-sm">
              <FileSpreadsheet className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-extrabold text-slate-900 text-sm tracking-tight">ตารางจัดการข้อมูลรายงานกิจกรรม (Interactive Grid)</h2>
              <p className="text-[11px] text-slate-400 font-semibold">ดับเบิลคลิกช่องเพื่อแก้ไขข้อมูลได้โดยตรง คอลัมน์ เป้าหมาย และ สถานะ จะทำการตรวจสอบความสอดคล้องตามแผน กพด.</p>
            </div>
          </div>
          
          <button
            onClick={handleAddRow}
            className="bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs px-4 py-2.5 rounded-lg shadow-sm transition flex items-center space-x-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>เพิ่มแถวกิจกรรมใหม่</span>
          </button>
        </div>

        {/* Real Table representation */}
        <div className="overflow-x-auto max-w-full">
          <table className="min-w-full border-collapse text-xs select-none">
            <thead className="bg-slate-100/80 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
              <tr className="divide-x divide-slate-200">
                <th className="px-2.5 py-2 text-center w-10">#</th>
                <th className="px-2.5 py-2 text-center w-12">ลบ</th>
                <th className="px-3 py-2 text-left w-24">รหัส</th>
                <th className="px-3 py-2 text-left min-w-[150px]">เป้าหมาย กพด.</th>
                <th className="px-3 py-2 text-left min-w-[200px]">ชื่อกิจกรรมรายงาน</th>
                <th className="px-3 py-2 text-left min-w-[150px]">สถานศึกษา/โรงเรียน</th>
                <th className="px-3 py-2 text-center w-24">ผู้ร่วมงาน (คน)</th>
                <th className="px-3 py-2 text-center w-28">สถานะ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {displayedReports.map((report, index) => {
                const globalIndex = pageSize === 0 ? index : (currentPage - 1) * pageSize + index;
                const rowNum = reports.length - globalIndex;
                return (
                  <tr key={report.id} className="divide-x divide-slate-150 hover:bg-slate-50/50 transition duration-150 font-medium text-slate-700">
                    {/* Row Index */}
                    <td className="px-2 py-2.5 text-center font-mono text-slate-400 bg-slate-50/80">{rowNum}</td>
                    
                    {/* Actions */}
                    <td className="px-2 py-2.5 text-center bg-slate-50/80">
                      <button
                        onClick={() => handleDeleteRow(report.id)}
                        className="text-rose-500 hover:text-rose-700 p-1 hover:bg-rose-50 rounded transition cursor-pointer"
                        title="ลบแถวนี้"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>

                    {/* ID */}
                    <td className="px-3 py-2.5 font-mono text-slate-500 font-bold">{report.id}</td>

                    {/* Goal Selection dropdown styled as cell */}
                    <td className="px-2 py-1.5">
                      <select
                        value={report.goalCode}
                        onChange={(e) => {
                          setReports(reports.map(r => r.id === report.id ? { ...r, goalCode: e.target.value } : r));
                        }}
                        className="w-full bg-transparent focus:bg-white border-0 focus:border border-slate-200 focus:ring-1 focus:ring-blue-500 rounded-md py-1 px-1.5 font-bold cursor-pointer transition"
                      >
                        {KOPODOT_GOALS.map((goal) => (
                          <option key={goal.id} value={goal.code}>
                            {goal.code}: {goal.title}
                          </option>
                        ))}
                      </select>
                    </td>

                    {/* Activity Name */}
                    <td 
                      className="px-3 py-2.5 cursor-pointer max-w-[250px] truncate hover:bg-slate-100/50 font-semibold text-slate-800"
                      onClick={() => startEditing(report.id, "activityName", report.activityName)}
                    >
                      {editingCell?.id === report.id && editingCell?.field === "activityName" ? (
                        <input
                          type="text"
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          onBlur={() => saveCellEdit(report.id, "activityName")}
                          onKeyDown={(e) => e.key === "Enter" && saveCellEdit(report.id, "activityName")}
                          className="w-full bg-white border border-blue-500 rounded p-1 text-xs focus:outline-none"
                          autoFocus
                        />
                      ) : (
                        <span>{report.activityName}</span>
                      )}
                    </td>

                    {/* School Name */}
                    <td 
                      className="px-3 py-2.5 cursor-pointer max-w-[150px] truncate hover:bg-slate-100/50"
                      onClick={() => startEditing(report.id, "schoolName", report.schoolName)}
                    >
                      {editingCell?.id === report.id && editingCell?.field === "schoolName" ? (
                        <input
                          type="text"
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          onBlur={() => saveCellEdit(report.id, "schoolName")}
                          onKeyDown={(e) => e.key === "Enter" && saveCellEdit(report.id, "schoolName")}
                          className="w-full bg-white border border-blue-500 rounded p-1 text-xs focus:outline-none"
                          autoFocus
                        />
                      ) : (
                        <span>{report.schoolName}</span>
                      )}
                    </td>

                    {/* Participants Count */}
                    <td 
                      className="px-3 py-2.5 cursor-pointer text-center hover:bg-slate-100/50 font-mono"
                      onClick={() => startEditing(report.id, "participantsCount", report.participantsCount)}
                    >
                      {editingCell?.id === report.id && editingCell?.field === "participantsCount" ? (
                        <input
                          type="number"
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          onBlur={() => saveCellEdit(report.id, "participantsCount")}
                          onKeyDown={(e) => e.key === "Enter" && saveCellEdit(report.id, "participantsCount")}
                          className="w-full bg-white border border-blue-500 rounded p-1 text-center text-xs focus:outline-none"
                          autoFocus
                        />
                      ) : (
                        <span>{(report.participantsCount || 0).toLocaleString()}</span>
                      )}
                    </td>

                    {/* Status Dropdown */}
                    <td className="px-2 py-1.5">
                      <select
                        value={report.status}
                        onChange={(e) => {
                          setReports(reports.map(r => r.id === report.id ? { ...r, status: e.target.value as ReportStatus } : r));
                        }}
                        className={`w-full bg-transparent border-0 font-extrabold text-center rounded-lg py-1 px-1 cursor-pointer transition ${
                          report.status === ReportStatus.COMPLETED ? "text-green-700 bg-green-50 border border-green-200" :
                          report.status === ReportStatus.IN_PROGRESS ? "text-blue-700 bg-blue-50 border border-blue-200" :
                          report.status === ReportStatus.OVERDUE ? "text-red-700 bg-red-50 border border-red-200" :
                          "text-slate-600 bg-slate-50 border border-slate-200"
                        }`}
                      >
                        {Object.values(ReportStatus).map((status) => (
                          <option key={status} value={status}>
                            {status}
                          </option>
                        ))}
                      </select>
                    </td>
                  </tr>
                );
              })}
              {reports.length === 0 && (
                <tr>
                  <td colSpan={10} className="text-center py-10 text-slate-400 font-bold bg-slate-50">
                    ตารางนี้ไม่มีข้อมูล กดปุ่ม "เพิ่มแถวกิจกรรมใหม่" หรือวางข้อมูลจาก Google Sheets เพื่อแสดงกิจกรรม
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Table Footer with Pagination Controls */}
        {reports.length > 0 && (
          <div className="p-3 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600 font-medium">
            <div className="flex items-center gap-2">
              <span>แสดงผล</span>
              <select
                value={pageSize}
                onChange={(e) => setPageSize(Number(e.target.value))}
                className="bg-white border border-slate-300 font-bold rounded-lg px-2 py-1 text-slate-800"
              >
                <option value={10}>10 แถว/หน้า</option>
                <option value={25}>25 แถว/หน้า</option>
                <option value={50}>50 แถว/หน้า</option>
                <option value={100}>100 แถว/หน้า</option>
                <option value={0}>แสดงทั้งหมด ({reports.length} รายการ)</option>
              </select>
              <span>
                {pageSize > 0 ? (
                  <>
                    แถวที่ <strong className="text-slate-900">{((currentPage - 1) * pageSize) + 1}</strong> ถึง{" "}
                    <strong className="text-slate-900">{Math.min(currentPage * pageSize, reports.length)}</strong> จากทั้งหมด{" "}
                    <strong className="text-slate-900">{reports.length}</strong> รายการ
                  </>
                ) : (
                  <>แสดงทั้งหมด {reports.length} รายการ</>
                )}
              </span>
            </div>

            {pageSize > 0 && totalPages > 1 && (
              <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-lg p-1">
                <button
                  type="button"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  className="p-1 rounded hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-transparent transition cursor-pointer"
                  title="หน้าก่อนหน้า"
                >
                  <ChevronLeft className="w-4 h-4 text-slate-700" />
                </button>

                <div className="flex items-center px-2 font-bold text-slate-800 text-xs">
                  หน้า {currentPage} จาก {totalPages}
                </div>

                <button
                  type="button"
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  className="p-1 rounded hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-transparent transition cursor-pointer"
                  title="หน้าถัดไป"
                >
                  <ChevronRight className="w-4 h-4 text-slate-700" />
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
