import React, { useRef, useState } from "react";
import { X, Printer, Download, FileText, CheckCircle2, AlertTriangle, ShieldCheck, Building2, Calendar, Award, Sparkles } from "lucide-react";
import { ActivityReport, toThaiNumerals } from "../types";
import { ROYAL_EMBLEM_IMAGE } from "../data/emblemLogo";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

export interface BppGroupData {
  code: string;
  groupShortTitle: string;
  fullGroupTitle: string;
  totalSchools: number;
  activeSchools: number;
  progressPercent: number;
  totalReports: number;
}

interface GroupChecklistPdfModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedGroupData: BppGroupData | null;
  allReports: ActivityReport[];
}

export interface Checklist24Item {
  id: number;
  code: string;
  title: string;
  goalCode: string;
  goalTitle: string;
  formRef: string;
  keywords: string[];
}

export const CHECKLIST_24_ITEMS: Checklist24Item[] = [
  { id: 1, code: "CHK-01", title: "การรวบรวมข้อมูลอนามัยแม่และเด็กในพื้นที่บริการ", goalCode: "GOAL_1", goalTitle: "เป้าหมายที่ 1: สุขภาพแม่และเด็ก", formRef: "แบบ 101", keywords: ["101", "แม่และเด็ก", "หญิงตั้งครรภ์", "ทารก"] },
  { id: 2, code: "CHK-02", title: "การสำรวจภาวะเจริญเติบโตและพัฒนาการเด็ก 0-3 ปี", goalCode: "GOAL_1", goalTitle: "เป้าหมายที่ 1: สุขภาพแม่และเด็ก", formRef: "แบบ 102", keywords: ["102", "0-3 ปี", "พัฒนาการเด็ก", "เจริญเติบโต"] },
  { id: 3, code: "CHK-03", title: "การเฝ้าระวังภาวะโภชนาการ นร.อนุบาล-มัธยม (ชั่งน้ำหนัก-วัดส่วนสูง)", goalCode: "GOAL_1", goalTitle: "เป้าหมายที่ 1: สุขภาพแม่และเด็ก", formRef: "แบบ 103", keywords: ["103", "ชั่งน้ำหนัก", "วัดส่วนสูง", "โภชนาการ"] },
  { id: 4, code: "CHK-04", title: "การจัดบริการอาหารกลางวันและนมพาสเจอร์ไรส์/ยูเอชที", goalCode: "GOAL_1", goalTitle: "เป้าหมายที่ 1: สุขภาพแม่และเด็ก", formRef: "อาหารกลางวัน/นม", keywords: ["อาหารกลางวัน", "ดื่มนม", "นมโรงเรียน", "โภชนาการ"] },
  { id: 5, code: "CHK-05", title: "การทดสอบสมรรถภาพทางกายนักเรียนรายบุคคล", goalCode: "GOAL_1", goalTitle: "เป้าหมายที่ 1: สุขภาพแม่และเด็ก", formRef: "แบบ 104", keywords: ["104", "สมรรถภาพทางกาย", "พลศึกษา", "ทดสอบร่างกาย"] },
  { id: 6, code: "CHK-06", title: "การตรวจคลำภาวะคอพอกและการจัดหาเกลือไอโอดีน", goalCode: "GOAL_1", goalTitle: "เป้าหมายที่ 1: สุขภาพแม่และเด็ก", formRef: "แบบ 105", keywords: ["105", "คอพอก", "เกลือไอโอดีน", "ไอโอดีน"] },
  { id: 7, code: "CHK-07", title: "การเฝ้าระวังและตรวจรักษาโรคไข้มาลาเรียในพื้นที่เสี่ยง", goalCode: "GOAL_1", goalTitle: "เป้าหมายที่ 1: สุขภาพแม่และเด็ก", formRef: "แบบ 106", keywords: ["106", "มาลาเรีย", "ไข้จับสั่น", "ยุงยักษ์"] },
  { id: 8, code: "CHK-08", title: "การตรวจอุจจาระหาไข่พยาธิและการให้ยาถ่ายพยาธิ", goalCode: "GOAL_1", goalTitle: "เป้าหมายที่ 1: สุขภาพแม่และเด็ก", formRef: "แบบ 107", keywords: ["107", "พยาธิ", "ถ่ายพยาธิ", "ตรวจอุจจาระ"] },
  { id: 9, code: "CHK-09", title: "การประเมินพฤติกรรมการบริโภคอาหารและสุขนิสัยของนักเรียน", goalCode: "GOAL_1", goalTitle: "เป้าหมายที่ 1: สุขภาพแม่และเด็ก", formRef: "แบบ 108", keywords: ["108", "พฤติกรรมบริโภค", "สุขนิสัย", "การแปรงฟัน"] },
  { id: 10, code: "CHK-10", title: "การตรวจสุขภาพช่องปาก ฟัน และบริการทันตกรรมป้องกัน", goalCode: "GOAL_1", goalTitle: "เป้าหมายที่ 1: สุขภาพแม่และเด็ก", formRef: "ทันตสุขภาพ", keywords: ["ฟัน", "ช่องปาก", "ทันตกรรม", "แปรงฟัน"] },
  { id: 11, code: "CHK-11", title: "การจัดทำแปลงเกษตรเพื่ออาหารกลางวัน (ผัก ปศุสัตว์ ประมง)", goalCode: "GOAL_2", goalTitle: "เป้าหมายที่ 2: ความมั่นคงอาหาร", formRef: "โครงการเกษตร", keywords: ["เกษตร", "ปลูกผัก", "เลี้ยงไก่", "ประมง", "บ่อปลา"] },
  { id: 12, code: "CHK-12", title: "การแปรรูป ถนอมอาหาร และถนอมผลผลิตทางการเกษตร", goalCode: "GOAL_2", goalTitle: "เป้าหมายที่ 2: ความมั่นคงอาหาร", formRef: "แปรรูปอาหาร", keywords: ["แปรรูป", "ถนอมอาหาร", "ตากแห้ง", "กวน", "ดอง"] },
  { id: 13, code: "CHK-13", title: "การจัดกิจกรรมสหกรณ์นักเรียน ร้านค้าสหกรณ์ และออมทรัพย์", goalCode: "GOAL_3", goalTitle: "เป้าหมายที่ 3: สหกรณ์นักเรียน", formRef: "สหกรณ์", keywords: ["สหกรณ์", "ออมทรัพย์", "ร้านค้าสหกรณ์", "บัญชี"] },
  { id: 14, code: "CHK-14", title: "การจัดการเรียนการสอนเร่งรัดการอ่านออกเขียนได้ (ภาษาไทย)", goalCode: "GOAL_4", goalTitle: "เป้าหมายที่ 4: คุณภาพการศึกษา", formRef: "ภาษาไทย", keywords: ["ภาษาไทย", "อ่านออกเขียนได้", "คัดลายมือ", "รักการอ่าน"] },
  { id: 15, code: "CHK-15", title: "การจัดทำแผนพัฒนาคุณภาพการเรียนรู้และยกผลสัมฤทธิ์ NT/O-NET", goalCode: "GOAL_4", goalTitle: "เป้าหมายที่ 4: คุณภาพการศึกษา", formRef: "ยกระดับผลสัมฤทธิ์", keywords: ["NT", "O-NET", "ผลสัมฤทธิ์", "ติว", "สอบ"] },
  { id: 16, code: "CHK-16", title: "การส่งเสริมการฝึกหัดอาชีพและภูมิปัญญาท้องถิ่น", goalCode: "GOAL_5", goalTitle: "เป้าหมายที่ 5: ฝึกหัดอาชีพ", formRef: "ฝึกอาชีพ", keywords: ["อาชีพ", "ฝึกอาชีพ", "ภูมิปัญญา", "งานช่าง", "หัตถกรรม"] },
  { id: 17, code: "CHK-17", title: "การอนุรักษ์วัฒนธรรม ประเพณี และภูมิปัญญาพื้นบ้าน", goalCode: "GOAL_6", goalTitle: "เป้าหมายที่ 6: อนุรักษ์วัฒนธรรม", formRef: "วัฒนธรรม", keywords: ["วัฒนธรรม", "ประเพณี", "ดนตรีไทย", "นาฏศิลป์", "ศาสนา"] },
  { id: 18, code: "CHK-18", title: "การอนุรักษ์ทรัพยากรธรรมชาติและสิ่งแวดล้อม (สวนพฤกษศาสตร์)", goalCode: "GOAL_7", goalTitle: "เป้าหมายที่ 7: สิ่งแวดล้อม", formRef: "สวนพฤกษศาสตร์", keywords: ["ทรัพยากรธรรมชาติ", "พฤกษศาสตร์", "ปลูกป่า", "สิ่งแวดล้อม", "ขยะ"] },
  { id: 19, code: "CHK-19", title: "การพัฒนาสุขาภิบาลสิ่งแวดล้อมและห้องน้ำห้องส้วมในโรงเรียน", goalCode: "GOAL_1", goalTitle: "เป้าหมายที่ 1: สุขาภิบาล", formRef: "สุขาภิบาล", keywords: ["สุขาภิบาล", "ห้องน้ำ", "ห้องส้วม", "ทำความสะอาด"] },
  { id: 20, code: "CHK-20", title: "การตรวจวัดคุณภาพน้ำดื่ม น้ำใช้ และดูแลระบบกรองน้ำ", goalCode: "GOAL_1", goalTitle: "เป้าหมายที่ 1: น้ำดื่มสะอาด", formRef: "น้ำดื่มสะอาด", keywords: ["น้ำดื่ม", "ระบบกรองน้ำ", "ตรวจคุณภาพน้ำ", "ตู้น้ำ"] },
  { id: 21, code: "CHK-21", title: "การจัดทำแผนซ้อมรับมือภัยพิบัติและสาธารณภัยประจำสถานศึกษา", goalCode: "GOAL_8", goalTitle: "เป้าหมายที่ 8: แผนความปลอดภัย", formRef: "แผนภัยพิบัติ", keywords: ["ภัยพิบัติ", "สาธารณภัย", "อัคคีภัย", "แผ่นดินไหว", "ซ้อมอพยพ"] },
  { id: 22, code: "CHK-22", title: "การพัฒนาศักยภาพครูใหญ่ ครูผู้สอน และบุคลากร ตชด.", goalCode: "GOAL_8", goalTitle: "เป้าหมายที่ 8: พัฒนาบุคลากร", formRef: "อบรมครู", keywords: ["อบรมครู", "พัฒนาครู", "ประชุมครู", "สัมมนา"] },
  { id: 23, code: "CHK-23", title: "การติดตามนักเรียนหลุดออกจากระบบการศึกษาและการเยี่ยมบ้าน", goalCode: "GOAL_4", goalTitle: "เป้าหมายที่ 4: เยี่ยมบ้าน/ติดตาม นร.", formRef: "ระบบดูแลนักเรียน", keywords: ["เยี่ยมบ้าน", "ติดตามนักเรียน", "หลุดระบบ", "ยากจน"] },
  { id: 24, code: "CHK-24", title: "การบันทึกรายงานสรุปผลการปฏิบัติงาน กพด. ฉบับที่ 5 ประจำภาคเรียน", goalCode: "GOAL_8", goalTitle: "เป้าหมายที่ 8: สรุปรายงาน กพด.5", formRef: "รายงาน A4 สรุปผล", keywords: ["สรุปผล", "ภาคเรียน", "กพด", "รายงาน A4"] },
];

export const GroupChecklistPdfModal: React.FC<GroupChecklistPdfModalProps> = ({
  isOpen,
  onClose,
  selectedGroupData,
  allReports,
}) => {
  const [isExporting, setIsExporting] = useState(false);
  const printContainerRef = useRef<HTMLDivElement>(null);

  if (!isOpen || !selectedGroupData) return null;

  // Filter reports for this specific group
  const groupReports = allReports.filter((r) => {
    const groupName = (r as any).bppGroup || r.schoolName || "";
    if (selectedGroupData.code === "21") return groupName.includes("21") || groupName.includes("21");
    if (selectedGroupData.code === "22") return groupName.includes("22") || groupName.includes("22");
    if (selectedGroupData.code === "23") return groupName.includes("23") || groupName.includes("23");
    if (selectedGroupData.code === "24") return groupName.includes("24") || groupName.includes("24");
    return true;
  });

  // Calculate report count for each of the 24 checklist items
  const itemsWithCounts = CHECKLIST_24_ITEMS.map((item) => {
    const matchedReports = groupReports.filter((r) => {
      const textToSearch = `${r.activityName || ""} ${r.details || ""} ${r.goalCode || ""} ${(r as any).indicatorTitle || ""}`.toLowerCase();
      return item.keywords.some((kw) => textToSearch.includes(kw.toLowerCase()));
    });

    const count = matchedReports.length;
    let status: "completed" | "in_progress" | "pending" = "pending";
    if (count >= 3) status = "completed";
    else if (count > 0) status = "in_progress";

    return {
      ...item,
      count,
      status,
    };
  });

  const completedItemsCount = itemsWithCounts.filter((i) => i.count > 0).length;
  const coveragePercent = Math.round((completedItemsCount / 24) * 100);

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPdf = async () => {
    if (!printContainerRef.current) return;
    try {
      setIsExporting(true);
      const canvas = await html2canvas(printContainerRef.current, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: "#ffffff",
      });

      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();

      pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight, undefined, "FAST");
      pdf.save(`รายงานติดตาม24รายการ_${selectedGroupData.groupShortTitle}_${new Date().toISOString().slice(0, 10)}.pdf`);
    } catch (err) {
      console.error("PDF Export error:", err);
      alert("เกิดข้อผิดพลาดในการดาวน์โหลด PDF โปรดใช้ปุ่มพิมพ์เอกสารเพื่อบันทึกเป็น PDF");
    } finally {
      setIsExporting(false);
    }
  };

  const currentDateThai = new Date().toLocaleDateString("th-TH", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 overflow-y-auto animate-fadeIn">
      {/* Container */}
      <div className="bg-slate-900 border border-slate-700/80 w-full max-w-5xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[95vh] my-auto">
        
        {/* Header Bar */}
        <div className="bg-gradient-to-r from-slate-950 via-indigo-950 to-slate-950 p-4 sm:p-5 border-b border-indigo-900/60 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3 min-w-0">
            <div className="p-2.5 bg-amber-400/20 text-amber-300 rounded-xl border border-amber-400/30 shrink-0">
              <FileText className="w-5 h-5 sm:w-6 sm:h-6 text-amber-300" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base sm:text-lg font-black text-white leading-tight">
                  ส่งออกเอกสาร PDF รายการที่ต้องทำ 24 รายการ
                </h2>
                <span className="bg-amber-400 text-slate-950 font-black text-[10px] px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                  {selectedGroupData.groupShortTitle}
                </span>
              </div>
              <p className="text-xs text-indigo-200/90 font-medium mt-0.5 truncate">
                รายงานติดตามผลการปฏิบัติงาน 24 รายการตามแผน กพด. ฉบับที่ 5 สังกัด {selectedGroupData.fullGroupTitle}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 ml-2">
            <button
              onClick={handlePrint}
              className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl text-xs transition flex items-center gap-1.5 shadow-md active:scale-95 cursor-pointer"
            >
              <Printer className="w-4 h-4 text-slate-950" />
              <span className="hidden sm:inline">พิมพ์ / เซฟ PDF</span>
            </button>

            <button
              onClick={handleDownloadPdf}
              disabled={isExporting}
              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-black rounded-xl text-xs transition flex items-center gap-1.5 shadow-md active:scale-95 cursor-pointer disabled:opacity-50"
            >
              <Download className="w-4 h-4 text-white" />
              <span className="hidden sm:inline">{isExporting ? "กำลังสร้าง PDF..." : "ดาวน์โหลด PDF"}</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-xl transition cursor-pointer"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Printable Area Container */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-100 flex justify-center">
          
          <div
            ref={printContainerRef}
            id="printable-checklist-24"
            className="bg-white text-slate-900 w-full max-w-[210mm] p-6 sm:p-8 rounded-lg shadow-xl border border-slate-300 font-sarabun text-xs leading-normal space-y-5"
            style={{ minHeight: "297mm" }}
          >
            {/* Document Official Header */}
            <div className="border-b-2 border-indigo-900 pb-4 text-center space-y-1.5 relative">
              <div className="flex items-center justify-center gap-3">
                <img
                  src={ROYAL_EMBLEM_IMAGE}
                  alt="ตราสัญลักษณ์"
                  className="w-14 h-14 object-contain"
                />
              </div>
              <h1 className="text-base sm:text-lg font-black text-indigo-950 uppercase tracking-tight mt-1">
                รายงานติดตามและสรุปผลรายการปฏิบัติงาน 24 รายการ (Checklist 24 Items)
              </h1>
              <p className="text-xs font-bold text-slate-700">
                โครงการตามพระราชดำริ แผนพัฒนาเด็กและเยาวชนในถิ่นทุรกันดาร (กพด. ฉบับที่ 5 พ.ศ. 2560–2569)
              </p>
              <p className="text-[11px] font-semibold text-slate-600">
                กองบังคับการตำรวจตระเวนชายแดนภาค 2 (บก.ตชด.ภาค 2) • กองบัญชาการตำรวจตระเวนชายแดน
              </p>
            </div>

            {/* Selected Group Metadata Banner */}
            <div className="bg-indigo-50/80 border border-indigo-200 rounded-xl p-3.5 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div>
                <span className="text-slate-500 font-medium block">หน่วยงานปฏิบัติการ:</span>
                <strong className="text-indigo-950 text-sm font-black">{selectedGroupData.fullGroupTitle}</strong>
              </div>
              <div>
                <span className="text-slate-500 font-medium block">สถานะการส่งรายงานในสังกัด:</span>
                <strong className="text-slate-900 font-bold">
                  {toThaiNumerals(selectedGroupData.activeSchools)} / {toThaiNumerals(selectedGroupData.totalSchools)} โรงเรียน ({toThaiNumerals(selectedGroupData.progressPercent)}%)
                </strong>
              </div>
              <div>
                <span className="text-slate-500 font-medium block">วันที่ออกรายงาน:</span>
                <strong className="text-slate-900 font-bold">{currentDateThai}</strong>
              </div>
            </div>

            {/* Checklist Progress Highlights Bar */}
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-2.5">
                <span className="text-[10px] font-bold text-emerald-800 uppercase block">ความครอบคลุมรายการ</span>
                <span className="text-lg font-black text-emerald-700">
                  {toThaiNumerals(completedItemsCount)} / 24 <span className="text-xs font-bold">รายการ</span>
                </span>
              </div>
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-2.5">
                <span className="text-[10px] font-bold text-blue-800 uppercase block">อัตราความสมบูรณ์</span>
                <span className="text-lg font-black text-blue-700">{toThaiNumerals(coveragePercent)}%</span>
              </div>
              <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-2.5">
                <span className="text-[10px] font-bold text-indigo-800 uppercase block">จำนวนรายงานรวม</span>
                <span className="text-lg font-black text-indigo-900">
                  {toThaiNumerals(selectedGroupData.totalReports)} <span className="text-xs font-bold">ฉบับ</span>
                </span>
              </div>
            </div>

            {/* 24 Items Detailed Table */}
            <div className="overflow-x-auto border border-slate-300 rounded-xl shadow-2xs">
              <table className="w-full text-left border-collapse text-[11px]">
                <thead>
                  <tr className="bg-indigo-950 text-white font-bold">
                    <th className="p-2 border-r border-indigo-900 text-center w-10">ลำดับ</th>
                    <th className="p-2 border-r border-indigo-900 min-w-[220px]">รายการที่ต้องทำ 24 รายการ</th>
                    <th className="p-2 border-r border-indigo-900 w-[140px]">เป้าหมาย กพด.</th>
                    <th className="p-2 border-r border-indigo-900 text-center w-[90px]">แบบอ้างอิง</th>
                    <th className="p-2 border-r border-indigo-900 text-center w-[80px]">รายงาน (ครั้ง)</th>
                    <th className="p-2 text-center w-[100px]">สถานะในสังกัด</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white font-medium text-slate-800">
                  {itemsWithCounts.map((item, index) => (
                    <tr
                      key={item.id}
                      className={index % 2 === 0 ? "bg-white" : "bg-slate-50/70"}
                    >
                      <td className="p-2 text-center font-bold text-slate-600 border-r border-slate-200">
                        {toThaiNumerals(index + 1)}
                      </td>
                      <td className="p-2 font-bold text-slate-900 border-r border-slate-200">
                        {item.title}
                      </td>
                      <td className="p-2 text-[10px] font-semibold text-slate-600 border-r border-slate-200 whitespace-nowrap">
                        {item.goalTitle}
                      </td>
                      <td className="p-2 text-center font-bold text-indigo-800 border-r border-slate-200 text-[10px]">
                        {item.formRef}
                      </td>
                      <td className="p-2 text-center font-black text-slate-900 border-r border-slate-200 text-xs">
                        {toThaiNumerals(item.count)}
                      </td>
                      <td className="p-2 text-center">
                        {item.count >= 3 ? (
                          <span className="inline-flex items-center gap-1 text-[9.5px] font-black px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            <span>สมบูรณ์</span>
                          </span>
                        ) : item.count > 0 ? (
                          <span className="inline-flex items-center gap-1 text-[9.5px] font-black px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300">
                            <Sparkles className="w-3 h-3 text-amber-600" />
                            <span>กำลังทำ</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[9.5px] font-black px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
                            <AlertTriangle className="w-3 h-3 text-rose-500" />
                            <span>รอดำเนินการ</span>
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Official Signature Footer */}
            <div className="pt-6 border-t border-slate-300 grid grid-cols-2 gap-8 text-center text-slate-800 text-xs mt-4">
              <div className="space-y-10 min-w-0">
                <p className="font-bold whitespace-nowrap overflow-hidden text-ellipsis text-left pl-2 sm:pl-4">ลงชื่อ..........................................ผู้จัดทำรายงาน</p>
                <div>
                  <p className="font-extrabold whitespace-nowrap overflow-hidden text-ellipsis">(..........................................)</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">ตำแหน่ง เจ้าหน้าที่ผู้รับผิดชอบงาน กพด. {selectedGroupData.groupShortTitle}</p>
                </div>
              </div>

              <div className="space-y-10 min-w-0">
                <p className="font-bold whitespace-nowrap overflow-hidden text-ellipsis text-left pl-2 sm:pl-4">ลงชื่อ..........................................ผู้รับรองรายงาน</p>
                <div>
                  <p className="font-extrabold whitespace-nowrap overflow-hidden text-ellipsis">(..........................................)</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">ผู้บังคับบัญชา / ผู้กำกับการ {selectedGroupData.groupShortTitle}</p>
                </div>
              </div>
            </div>

            <div className="text-[9.5px] text-slate-600 text-center pt-2 border-t border-slate-100">
              เอกสารระบบสารสนเทศ บก.ตชด.ภาค 2 • ออกแบบเพื่อการตรวจสอบตามมาตรฐาน กพด. ฉบับที่ 5 (24 รายการ)
            </div>

          </div>
        </div>

      </div>
    </div>
  );
};
