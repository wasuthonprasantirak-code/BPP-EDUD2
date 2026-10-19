import React, { useState } from "react";
import {
  FileText,
  Download,
  ExternalLink,
  BookOpen,
  Target,
  CheckCircle2,
  HeartPulse,
  GraduationCap,
  Award,
  Trees,
  Landmark,
  Briefcase,
  Users,
  Building2,
  Sparkles,
  Printer,
  ShieldCheck,
  ChevronRight,
  Eye,
  Info,
  Maximize2,
  Calendar,
  Layers,
  TrendingUp,
  BarChart3,
  Search,
  CheckCircle,
  Zap
} from "lucide-react";
import PdfCanvasViewer from "./PdfCanvasViewer";
import { UniversalPageBanner } from "./UniversalPageBanner";

export default function AnnualReport2568View({
  onOpenBannerCustomizer,
}: {
  onOpenBannerCustomizer?: (pageKey: string) => void;
} = {}) {
  const [activeSubTab, setActiveSubTab] = useState<"pdf" | "highlights" | "dimensions" | "statistics">("pdf");
  const [selectedDimension, setSelectedDimension] = useState<number | null>(null);
  const [viewerEngine, setViewerEngine] = useState<"canvas" | "direct" | "google" | "office">("canvas");
  const [viewerHeight, setViewerHeight] = useState<"standard" | "large" | "fullscreen">("large");
  const [iframeKey, setIframeKey] = useState<number>(1);
  const [searchTerm, setSearchTerm] = useState<string>("");

  const REPORT_2568_PDF_URL = "https://www.psproject.org/wp-content/uploads/2026/04/reportchild-dev-69.pdf";

  const getEmbedUrl = () => {
    if (viewerEngine === "direct") {
      return `/api/pdf-proxy?url=${encodeURIComponent(REPORT_2568_PDF_URL)}#toolbar=1&navpanes=1&zoom=100`;
    }
    if (viewerEngine === "google") {
      return `https://docs.google.com/gview?url=${encodeURIComponent(REPORT_2568_PDF_URL)}&embedded=true`;
    }
    if (viewerEngine === "office") {
      return `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(REPORT_2568_PDF_URL)}`;
    }
    return `/api/pdf-proxy?url=${encodeURIComponent(REPORT_2568_PDF_URL)}`;
  };

  // Highlights of Year 2568
  const YEAR_2568_HIGHLIGHTS = [
    {
      id: 1,
      title: "การเสริมสร้างโภชนาการและสุขอนามัยรอบด้าน",
      icon: HeartPulse,
      badge: "ด้านที่ 1",
      color: "bg-rose-500 text-rose-700 border-rose-200 bg-rose-50",
      summary: "นักเรียน รร.ตชด. ได้รับประทานอาหารกลางวันที่มีคุณค่าทางโภชนาการครบ 5 หมู่ และดื่มนมทุกวันเรียน เฝ้าระวังการเจริญเติบโตน้ำหนัก-ส่วนสูงตามเกณฑ์มาตรฐาน",
      keyMetrics: "อัตราโภชนาการสมส่วนร้อยละ 92.4"
    },
    {
      id: 2,
      title: "การเพิ่มพูนโอกาสและการสนับสนุนทุนการศึกษา",
      icon: GraduationCap,
      badge: "ด้านที่ 2",
      color: "bg-blue-500 text-blue-700 border-blue-200 bg-blue-50",
      summary: "เด็กและเยาวชนในถิ่นทุรกันดารได้รับโอกาสทางการศึกษาอย่างทั่วถึง และส่งเสริมทุนการศึกษานักเรียนในพระราชานุเคราะห์จนสำเร็จการศึกษาระดับอุดมศึกษา",
      keyMetrics: "นักเรียนได้รับโอกาสศึกษาต่อ 100%"
    },
    {
      id: 3,
      title: "ยกระดับผลสัมฤทธิ์และทักษะการสื่อสารภาษาไทย",
      icon: Award,
      badge: "ด้านที่ 3",
      color: "bg-indigo-500 text-indigo-700 border-indigo-200 bg-indigo-50",
      summary: "การจัดกิจกรรมส่งเสริมการอ่านออกเขียนได้ แก้ปัญหาภาษาไทยเป็นภาษาที่สอง พัฒนาสื่อนวัตกรรมการสอนและห้องสมุดมีชีวิตในโรงเรียน ตชด.",
      keyMetrics: "ผลการประเมินการอ่านเขียนผ่านเกณฑ์ 90.8%"
    },
    {
      id: 4,
      title: "ขับเคลื่อนเกษตรเพื่ออาหารกลางวันอย่างยั่งยืน",
      icon: Briefcase,
      badge: "ด้านที่ 6",
      color: "bg-emerald-500 text-emerald-700 border-emerald-200 bg-emerald-50",
      summary: "การผลิตพืชผักปลอดภัย ปศุสัตว์ (ไก่ไข่ สุกร เป็ด) และประมงน้ำจืด สมทบโครงการอาหารกลางวัน พร้อมถ่ายทอดทักษะวิชาชีพการแปรรูปสู่ชุมชน",
      keyMetrics: "พึ่งพาผลผลิตเกษตรในโรงเรียนกว่า 85%"
    },
    {
      id: 5,
      title: "สหกรณ์นักเรียน ปลูกฝังประชาธิปไตยและการออม",
      icon: Users,
      badge: "ด้านที่ 7",
      color: "bg-teal-500 text-teal-700 border-teal-200 bg-teal-50",
      summary: "ดำเนินกิจกรรมร้านค้าสหกรณ์ กิจกรรมออมทรัพย์ และส่งเสริมการบันทึกบัญชีรายรับ-รายจ่าย เพื่อสร้างวินัยทางการเงินและทักษะการทำงานร่วมกัน",
      keyMetrics: "สมาชิกสหกรณ์นักเรียนมีเงินออมสม่ำเสมอ"
    },
    {
      id: 6,
      title: "สถานศึกษาเป็นศูนย์กลางบริการและการพัฒนาชุมชน",
      icon: Building2,
      badge: "ด้านที่ 8",
      color: "bg-amber-500 text-amber-700 border-amber-200 bg-amber-50",
      summary: "รร.ตชด. ทำหน้าที่เป็นศูนย์กลางการเรียนรู้ บริการน้ำดื่มสะอาด ถ่ายทอดเทคโนโลยีการเกษตร และเป็นศูนย์ช่วยเหลือประชาชนในยามประสบภัยพิบัติ",
      keyMetrics: "ให้บริการชุมชนรอบสถานศึกษาครบ 53 แห่ง"
    }
  ];

  // 8 Dimensions detailed summary
  const DIMENSIONS_DATA = [
    {
      id: 1,
      code: "ด้านที่ 1",
      title: "การเสริมสร้างโภชนาการและสุขภาพอนามัย",
      icon: HeartPulse,
      color: "rose",
      objective: "เพื่อให้นักเรียนมีสุขภาพอนามัยแข็งแรง เติบโตสมวัย และปลอดจากโรคติดต่อที่ป้องกันได้",
      outputs2568: [
        "จัดอาหารกลางวันที่มีคุณค่าทางโภชนาการครบ 5 หมู่ ตลอดปีการศึกษา",
        "จัดสรรนมโรงเรียนให้นักเรียนทุกคนดื่มเป็นประจำทุกวันเรียน",
        "ตรวจสุขภาพ ร่างกาย ช่องปากและฟัน การฉีดวัคซีนป้องกันโรคตามเกณฑ์",
        "เสริมสร้างสุขนิสัย พฤติกรรมอนามัย และการใช้ห้องน้ำสุขาอย่างถูกสุขลักษณะ"
      ],
      progress: 95
    },
    {
      id: 2,
      code: "ด้านที่ 2",
      title: "การเพิ่มพูนโอกาสทางการศึกษา",
      icon: GraduationCap,
      color: "blue",
      objective: "เพื่อให้นักเรียนในถิ่นทุรกันดารได้รับโอกาสเข้าถึงการศึกษาที่มีคุณภาพจนถึงระดับสูงสุด",
      outputs2568: [
        "รับนักเรียนเข้าเรียนครบตามเกณฑ์การศึกษาภาคบังคับ 100%",
        "จัดกิจกรรมแนะแนวการศึกษาต่อและการประกอบอาชีพ",
        "สนับสนุนและติดตามนักเรียนผู้รับทุนพระราชทานและทุนในพระราชานุเคราะห์",
        "จัดหาอุปกรณ์การเรียน เครื่องแบบนักเรียน และสิ่งอำนวยความสะดวกที่จำเป็น"
      ],
      progress: 92
    },
    {
      id: 3,
      code: "ด้านที่ 3",
      title: "การเสริมสร้างสมรรถนะทางวิชาการ",
      icon: Award,
      color: "indigo",
      objective: "เพื่อให้นักเรียนมีผลสัมฤทธิ์ทางวิชาการและทักษะการเรียนรู้ที่ได้มาตรฐานสากล",
      outputs2568: [
        "พัฒนาทักษะการอ่านออกเขียนได้ภาษาไทย โดยเฉพาะนักเรียนกลุ่มภาษาชาติพันธุ์",
        "ยกระดับการเรียนการสอนวิทยาศาสตร์ คณิตศาสตร์ และเทคโนโลยีเบื้องต้น",
        "ส่งเสริมกิจกรรมรักการอ่าน ห้องสมุดโรงเรียน และมุมหนังสือประจำห้องเรียน",
        "พัฒนาครูผู้สอนในการใช้สื่อ นวัตกรรม และเทคโนโลยีดิจิทัลเพื่อการศึกษา"
      ],
      progress: 89
    },
    {
      id: 4,
      code: "ด้านที่ 4",
      title: "การปลูกฝังจิตสำนึกและอนุรักษ์ทรัพยากรธรรมชาติและสิ่งแวดล้อม",
      icon: Trees,
      color: "emerald",
      objective: "เพื่อสร้างจิตสำนึกและทักษะการอนุรักษ์ดิน น้ำ ป่า และสิ่งแวดล้อมแก่เด็กและเยาวชน",
      outputs2568: [
        "ขับเคลื่อนงานสวนพฤกษศาสตร์โรงเรียนและโครงการอนุรักษ์พันธุกรรมพืชฯ",
        "กิจกรรมคัดแยกขยะ ธนาคารขยะ และลดการใช้พลาสติกในโรงเรียน",
        "ดูแลรักษาแหล่งน้ำ ปลูกต้นไม้เพิ่มพื้นที่สีเขียว และอนุรักษ์ดิน",
        "ส่งเสริมการใช้พลังงานสะอาดและพลังงานหมุนเวียนในสถานศึกษา"
      ],
      progress: 94
    },
    {
      id: 5,
      code: "ด้านที่ 5",
      title: "การเสริมสร้างศักยภาพการอนุรักษ์และสืบทอดวัฒนธรรมและภูมิปัญญาท้องถิ่น",
      icon: Landmark,
      color: "amber",
      objective: "เพื่อให้เด็กและเยาวชนภาคภูมิใจในรากเหง้าวัฒนธรรมและร่วมสืบทอดภูมิปัญญาไทย",
      outputs2568: [
        "จัดกิจกรรมถ่ายทอดภูมิปัญญาท้องถิ่น ศิลปะ ดนตรี และการแสดงพื้นบ้าน",
        "เชิญปราชญ์ชาวบ้านและผู้ทรงคุณวุฒิในชุมชนมาร่วมจัดการเรียนรู้",
        "จัดนิทรรศการและมุมแสดงผลงานวัฒนธรรมและประเพณีท้องถิ่น",
        "ปลูกฝังคุณธรรม จริยธรรม ค่านิยมความซื่อสัตย์ และความกตัญญูกตเวทิตา"
      ],
      progress: 91
    },
    {
      id: 6,
      code: "ด้านที่ 6",
      title: "การพัฒนาทักษะอาชีพและการทำเกษตรเพื่ออาหารกลางวัน",
      icon: Briefcase,
      color: "purple",
      objective: "เพื่อฝึกทักษะอาชีพพื้นฐานและผลิตอาหารปลอดภัยสนับสนุนโครงการอาหารกลางวัน",
      outputs2568: [
        "ปลูกพืชผักสวนครัว ไม้ผล เห็ดนางฟ้า และพืชสมุนไพรปลอดสารพิษ",
        "เลี้ยงไก่ไข่ ไก่พื้นเมือง เป็ด สุกร และเลี้ยงปลาในบ่อหรือกระชัง",
        "แปรรูปและถนอมอาหารจากผลผลิตทางการเกษตรของโรงเรียน",
        "ฝึกทักษะอาชีพช่างพื้นฐาน งานหัตถกรรม และอาชีพที่เหมาะสมกับท้องถิ่น"
      ],
      progress: 96
    },
    {
      id: 7,
      code: "ด้านที่ 7",
      title: "การพัฒนาศักยภาพการพึ่งตนเองและการสหกรณ์",
      icon: Users,
      color: "teal",
      objective: "เพื่อให้เด็กและเยาวชนมีความรู้ อุดมการณ์ และทักษะการดำเนินงานสหกรณ์นักเรียน",
      outputs2568: [
        "ดำเนินกิจกรรมร้านค้าสหกรณ์นักเรียน จำหน่ายเครื่องเขียนและผลผลิตเกษตร",
        "ดำเนินกิจกรรมออมทรัพย์นักเรียน ส่งเสริมการฝากเงินสม่ำเสมอ",
        "ฝึกปฏิบัติการประชุมคณะกรรมการสหกรณ์นักเรียนตามวิถีประชาธิปไตย",
        "จดบันทึกบัญชีรายรับ-รายจ่าย ทั้งระดับส่วนตัวและกิจกรรมสหกรณ์"
      ],
      progress: 93
    },
    {
      id: 8,
      code: "ด้านที่ 8",
      title: "การพัฒนาสถานศึกษาเป็นศูนย์บริการชุมชน",
      icon: Building2,
      color: "sky",
      objective: "เพื่อให้โรงเรียน ตชด. เป็นศูนย์กลางการเรียนรู้ บริการ และพัฒนาคุณภาพชีวิตชุมชน",
      outputs2568: [
        "บริการระบบน้ำดื่มสะอาดที่ผ่านการกรองและฆ่าเชื้อแก่ราษฎรในหมู่บ้าน",
        "เป็นศูนย์กลางฝึกอบรมและถ่ายทอดเทคโนโลยีการเกษตรปลอดภัยแก่ชุมชน",
        "บริการข้อมูลข่าวสาร อินเทอร์เน็ต และกิจกรรมสาธารณประโยชน์",
        "ประสานความร่วมมือระหว่างโรงเรียน บ้าน ชุมชน และหน่วยงานราชการ"
      ],
      progress: 90
    }
  ];

  const filteredDimensions = DIMENSIONS_DATA.filter((dim) => 
    dim.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    dim.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    dim.objective.toLowerCase().includes(searchTerm.toLowerCase()) ||
    dim.outputs2568.some(o => o.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 animate-in fade-in duration-200">
      {/* 0. Top Panoramic Banner (Configurable Per-Page) */}
      <UniversalPageBanner 
        pageKey="report2568" 
        onOpenCustomizer={onOpenBannerCustomizer}
      />

      {/* Main Sub-Navigation Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-2 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-1 overflow-x-auto w-full sm:w-auto scrollbar-none">
          <button
            type="button"
            onClick={() => setActiveSubTab("pdf")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-extrabold text-xs transition cursor-pointer whitespace-nowrap ${
              activeSubTab === "pdf"
                ? "bg-indigo-600 text-white shadow-xs"
                : "bg-slate-50 text-slate-700 hover:bg-slate-100"
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>เอกสารรายงาน PDF (Interactive Viewer)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab("highlights")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-extrabold text-xs transition cursor-pointer whitespace-nowrap ${
              activeSubTab === "highlights"
                ? "bg-indigo-600 text-white shadow-xs"
                : "bg-slate-50 text-slate-700 hover:bg-slate-100"
            }`}
          >
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span>ไฮไลต์ผลงานสำคัญปี 2568</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab("dimensions")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-extrabold text-xs transition cursor-pointer whitespace-nowrap ${
              activeSubTab === "dimensions"
                ? "bg-indigo-600 text-white shadow-xs"
                : "bg-slate-50 text-slate-700 hover:bg-slate-100"
            }`}
          >
            <Target className="w-4 h-4" />
            <span>ผลการดำเนินงาน 8 ด้าน</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab("statistics")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-extrabold text-xs transition cursor-pointer whitespace-nowrap ${
              activeSubTab === "statistics"
                ? "bg-indigo-600 text-white shadow-xs"
                : "bg-slate-50 text-slate-700 hover:bg-slate-100"
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            <span>ตารางสรุปข้อมูลสถิติ</span>
          </button>
        </div>

        <div className="hidden lg:flex items-center gap-2 text-xs text-slate-500 font-medium px-3">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span>เอกสารทางการโครงการส่วนพระองค์ฯ (PS Project)</span>
        </div>
      </div>

      {/* SubTab 1: Embedded PDF Viewer */}
      {activeSubTab === "pdf" && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3 w-full sm:w-auto min-w-0">
              <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center shrink-0">
                <FileText className="w-5 h-5 text-amber-600" />
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="font-extrabold text-sm text-slate-900 truncate flex items-center gap-2">
                  <span className="truncate">reportchild-dev-69.pdf</span>
                  <span className="text-[11px] font-black px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
                    กพด. 2568
                  </span>
                </h2>
                <p className="text-xs text-slate-500 truncate">
                  รายงานผลการดำเนินงานโครงการ กพด. ประจำปีงบประมาณ 2568 (ตชด. ภาค 2)
                </p>
              </div>
            </div>

            <div className="flex flex-row items-center gap-2 w-full sm:w-auto justify-stretch sm:justify-end shrink-0">
              <a
                href={REPORT_2568_PDF_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs transition shadow-xs cursor-pointer whitespace-nowrap"
              >
                <Maximize2 className="w-3.5 h-3.5" />
                <span>เปิดเต็มหน้าจอ (New Tab)</span>
              </a>
              <a
                href={REPORT_2568_PDF_URL}
                download="reportchild-dev-69.pdf"
                className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-extrabold text-xs transition border border-slate-300 cursor-pointer whitespace-nowrap"
              >
                <Download className="w-3.5 h-3.5 text-slate-600" />
                <span>ดาวน์โหลด</span>
              </a>
            </div>
          </div>

          {/* Rendering the Active Engine */}
          {viewerEngine === "canvas" ? (
            <PdfCanvasViewer
              pdfUrl={REPORT_2568_PDF_URL}
              directDownloadUrl={REPORT_2568_PDF_URL}
              documentTitle="รายงานผลการดำเนินงาน ปี 2568 (กพด. 69)"
              initialScale={1.0}
            />
          ) : (
            <div className="bg-white rounded-3xl border border-slate-200 shadow-md overflow-hidden flex flex-col">
              {/* Direct Stream Notice */}
              {viewerEngine === "direct" && (
                <div className="bg-amber-50 border-b border-amber-200 px-4 py-2.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs text-amber-900">
                  <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>
                      กำลังสตรีมเอกสารผ่าน <strong>/api/pdf-proxy</strong> (ปลดล็อกข้อจำกัดความปลอดภัยของ Chrome อัตโนมัติ)
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setViewerEngine("canvas")}
                    className="text-indigo-700 hover:text-indigo-900 font-extrabold underline cursor-pointer"
                  >
                    สลับเป็นโปรแกรมอ่านอัจฉริยะ (Canvas)
                  </button>
                </div>
              )}

              <div 
                className={`w-full bg-slate-100 relative transition-all duration-300 ${
                  viewerHeight === "standard" ? "h-[650px]" : viewerHeight === "large" ? "h-[950px]" : "h-[1200px]"
                }`}
              >
                <iframe
                  key={iframeKey}
                  src={getEmbedUrl()}
                  className="w-full h-full border-0"
                  title="รายงานผลการดำเนินงาน ปี 2568 (PDF)"
                  loading="lazy"
                  allow="autoplay; encrypted-media"
                  allowFullScreen
                />
              </div>

              {/* Viewer Footer Note */}
              <div className="bg-slate-50 border-t border-slate-200 px-6 py-3 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-2">
                <div className="flex items-center gap-2">
                  <Info className="w-4 h-4 text-indigo-500 shrink-0" />
                  <span>หากเบราว์เซอร์ของท่านปิดกั้นการแสดงผล สามารถสลับเป็นโหมด Canvas หรือคลิกเปิดแท็บใหม่ได้ทันที</span>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setViewerEngine("canvas")}
                    className="text-amber-700 hover:text-amber-900 font-bold hover:underline cursor-pointer"
                  >
                    เปิดด้วย Canvas Reader
                  </button>
                  <span>•</span>
                  <a
                    href={REPORT_2568_PDF_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-indigo-600 hover:text-indigo-800 font-extrabold hover:underline flex items-center gap-1 shrink-0 cursor-pointer"
                  >
                    <span>เปิดอ่านผ่านแท็บใหม่</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* SubTab 2: Highlights of Year 2568 */}
      {activeSubTab === "highlights" && (
        <div className="space-y-6">
          <div className="bg-gradient-to-r from-indigo-50 via-white to-blue-50 p-6 rounded-3xl border border-indigo-100 shadow-xs">
            <h2 className="text-lg font-black text-slate-900 mb-2 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-500" />
              <span>สรุปไฮไลต์และผลสัมฤทธิ์เด่น ประจำปีงบประมาณ 2568</span>
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              ภาพรวมผลการดำเนินงานโครงการ กพด. ในพื้นที่ 53 โรงเรียนตำรวจตระเวนชายแดน สังกัด กองบังคับการตำรวจตระเวนชายแดนภาค 2 
              ครอบคลุมพื้นที่ 11 จังหวัดในภาคตะวันออกเฉียงเหนือ มุ่งเน้นการพัฒนาคุณภาพชีวิตเด็ก เยาวชน และชุมชนอย่างยั่งยืน
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {YEAR_2568_HIGHLIGHTS.map((item) => {
              const Icon = item.icon;
              return (
                <div 
                  key={item.id}
                  className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs hover:shadow-md transition-all duration-200 flex flex-col justify-between space-y-4"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className={`p-2.5 rounded-xl ${item.color} border`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <span className="text-[11px] font-black px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                        {item.badge}
                      </span>
                    </div>

                    <h3 className="font-extrabold text-sm sm:text-base text-slate-900 leading-snug">
                      {item.title}
                    </h3>

                    <p className="text-xs text-slate-600 leading-relaxed">
                      {item.summary}
                    </p>
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                    <span className="font-extrabold text-emerald-700 flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>{item.keyMetrics}</span>
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Special Focus Box */}
          <div className="bg-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-amber-400/20 text-amber-400">
                <Target className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-black text-base sm:text-lg">
                  การบูรณาการตามแนวพระราชดำริ ในปี 2568
                </h3>
                <p className="text-xs text-slate-400">
                  สอดรับตามยุทธศาสตร์แผนพัฒนาเด็กและเยาวชนในถิ่นทุรกันดาร ฉบับที่ 5 (พ.ศ. 2560 - 2569)
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2">
              <div className="bg-white/5 border border-white/10 p-4 rounded-2xl space-y-1.5">
                <div className="text-2xl font-black text-amber-400">53 แห่ง</div>
                <div className="text-xs font-bold text-white">รร.ตชด. เป้าหมาย</div>
                <div className="text-[11px] text-slate-400">ในสังกัด บก.ตชด.ภาค 2 ครบ 100%</div>
              </div>
              <div className="bg-white/5 border border-white/10 p-4 rounded-2xl space-y-1.5">
                <div className="text-2xl font-black text-emerald-400">4 กก.ตชด.</div>
                <div className="text-xs font-bold text-white">หน่วยกำกับการ</div>
                <div className="text-[11px] text-slate-400">กก.ตชด. 21, 22, 23, 24</div>
              </div>
              <div className="bg-white/5 border border-white/10 p-4 rounded-2xl space-y-1.5">
                <div className="text-2xl font-black text-sky-400">8 ด้าน</div>
                <div className="text-xs font-bold text-white">มิติการพัฒนาหลัก</div>
                <div className="text-[11px] text-slate-400">ครอบคลุมทุกด้านของการเติบโต</div>
              </div>
              <div className="bg-white/5 border border-white/10 p-4 rounded-2xl space-y-1.5">
                <div className="text-2xl font-black text-rose-400">11 จังหวัด</div>
                <div className="text-xs font-bold text-white">พื้นที่ปฏิบัติงาน</div>
                <div className="text-[11px] text-slate-400">ภาคตะวันออกเฉียงเหนือทั้งหมด</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SubTab 3: 8 Dimensions Detailed Overview */}
      {activeSubTab === "dimensions" && (
        <div className="space-y-6">
          {/* Search bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="ค้นหากิจกรรมหรือมิติการพัฒนา..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9.5 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            </div>
            <div className="text-xs font-bold text-slate-500">
              แสดงทั้งหมด {filteredDimensions.length} มิติการพัฒนา
            </div>
          </div>

          <div className="space-y-4">
            {filteredDimensions.map((dim) => {
              const Icon = dim.icon;
              const isSelected = selectedDimension === dim.id;
              return (
                <div
                  key={dim.id}
                  className={`bg-white rounded-3xl border transition-all duration-200 overflow-hidden shadow-xs ${
                    isSelected ? "border-indigo-400 ring-2 ring-indigo-500/10" : "border-slate-200 hover:border-slate-300"
                  }`}
                >
                  <div 
                    onClick={() => setSelectedDimension(isSelected ? null : dim.id)}
                    className="p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer hover:bg-slate-50/60 transition"
                  >
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center shrink-0">
                        <Icon className="w-6 h-6 text-indigo-600" />
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-black text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-full border border-indigo-100">
                            {dim.code}
                          </span>
                          <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                            ผลดำเนินงาน {dim.progress}%
                          </span>
                        </div>
                        <h3 className="text-base font-extrabold text-slate-900">
                          {dim.title}
                        </h3>
                        <p className="text-xs text-slate-500 max-w-2xl">
                          {dim.objective}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
                      <div className="w-28 sm:w-36 bg-slate-100 h-2.5 rounded-full overflow-hidden border border-slate-200">
                        <div 
                          className="bg-indigo-600 h-full rounded-full transition-all duration-500" 
                          style={{ width: `${dim.progress}%` }} 
                        />
                      </div>
                      <button
                        type="button"
                        className="text-xs font-extrabold text-indigo-600 flex items-center gap-0.5 hover:underline"
                      >
                        <span>{isSelected ? "ย่อรายละเอียด" : "ดูผลงาน"}</span>
                        <ChevronRight className={`w-4 h-4 transition-transform ${isSelected ? "rotate-90" : ""}`} />
                      </button>
                    </div>
                  </div>

                  {/* Expanded detail items */}
                  {isSelected && (
                    <div className="bg-slate-50/80 border-t border-slate-100 p-5 sm:p-6 space-y-4 animate-in fade-in duration-150">
                      <h4 className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-emerald-600" />
                        <span>ผลผลิตและกิจกรรมสำคัญที่ดำเนินการแล้วเสร็จในปี 2568</span>
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {dim.outputs2568.map((output, idx) => (
                          <div 
                            key={idx}
                            className="bg-white p-3.5 rounded-2xl border border-slate-200/80 flex items-start gap-2.5 text-xs text-slate-700 font-medium"
                          >
                            <span className="w-5 h-5 rounded-full bg-indigo-50 text-indigo-700 font-black text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                              {idx + 1}
                            </span>
                            <span className="leading-relaxed">{output}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* SubTab 4: Statistics Summary */}
      {activeSubTab === "statistics" && (
        <div className="space-y-6">
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-black text-base text-slate-900">
                  ตารางสรุปสถิติเป้าหมายและผลลัพธ์ ประจำปี 2568
                </h3>
                <p className="text-xs text-slate-500">
                  ข้อมูลสรุปจากรายงานผลการดำเนินงาน กพด. ฉบับทางการ
                </p>
              </div>
              <span className="text-xs font-bold text-slate-500 bg-slate-100 px-3 py-1 rounded-full">
                ประจำปีงบประมาณ 2568
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-y border-slate-200 text-slate-700 font-black">
                    <th className="py-2.5 px-3 sm:py-3 sm:px-4">มิติการพัฒนา</th>
                    <th className="py-2.5 px-3 sm:py-3 sm:px-4">ตัวชี้วัดหลัก</th>
                    <th className="py-2.5 px-3 sm:py-3 sm:px-4 text-center">เป้าหมาย</th>
                    <th className="py-2.5 px-3 sm:py-3 sm:px-4 text-center">ผลการดำเนินงาน</th>
                    <th className="py-2.5 px-3 sm:py-3 sm:px-4 text-center">สถานะ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  <tr className="hover:bg-slate-50/60">
                    <td className="py-2.5 px-3 sm:py-3 sm:px-4 font-bold text-slate-900">1. โภชนาการและสุขภาพ</td>
                    <td className="py-2.5 px-3 sm:py-3 sm:px-4">นักเรียนมีภาวะโภชนาการสมส่วนและดื่มนมทุกวัน</td>
                    <td className="py-2.5 px-3 sm:py-3 sm:px-4 text-center font-bold">90%</td>
                    <td className="py-2.5 px-3 sm:py-3 sm:px-4 text-center font-black text-emerald-700">92.4%</td>
                    <td className="py-2.5 px-3 sm:py-3 sm:px-4 text-center">
                      <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10.5px] font-bold">บรรลุเป้าหมาย</span>
                    </td>
                  </tr>
                  <tr className="hover:bg-slate-50/60">
                    <td className="py-2.5 px-3 sm:py-3 sm:px-4 font-bold text-slate-900">2. โอกาสทางการศึกษา</td>
                    <td className="py-2.5 px-3 sm:py-3 sm:px-4">เด็กวัยเรียนเข้าถึงการศึกษาภาคบังคับ</td>
                    <td className="py-2.5 px-3 sm:py-3 sm:px-4 text-center font-bold">100%</td>
                    <td className="py-2.5 px-3 sm:py-3 sm:px-4 text-center font-black text-emerald-700">100%</td>
                    <td className="py-2.5 px-3 sm:py-3 sm:px-4 text-center">
                      <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10.5px] font-bold">บรรลุเป้าหมาย</span>
                    </td>
                  </tr>
                  <tr className="hover:bg-slate-50/60">
                    <td className="py-2.5 px-3 sm:py-3 sm:px-4 font-bold text-slate-900">3. สมรรถนะทางวิชาการ</td>
                    <td className="py-2.5 px-3 sm:py-3 sm:px-4">ทักษะการอ่านออกเขียนได้ภาษาไทย</td>
                    <td className="py-2.5 px-3 sm:py-3 sm:px-4 text-center font-bold">85%</td>
                    <td className="py-2.5 px-3 sm:py-3 sm:px-4 text-center font-black text-indigo-700">90.8%</td>
                    <td className="py-2.5 px-3 sm:py-3 sm:px-4 text-center">
                      <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10.5px] font-bold">บรรลุเป้าหมาย</span>
                    </td>
                  </tr>
                  <tr className="hover:bg-slate-50/60">
                    <td className="py-2.5 px-3 sm:py-3 sm:px-4 font-bold text-slate-900">4. สิ่งแวดล้อมและพฤกษศาสตร์</td>
                    <td className="py-2.5 px-3 sm:py-3 sm:px-4">ดำเนินงานสวนพฤกษศาสตร์โรงเรียนและจัดการขยะ</td>
                    <td className="py-2.5 px-3 sm:py-3 sm:px-4 text-center font-bold">53 รร.</td>
                    <td className="py-2.5 px-3 sm:py-3 sm:px-4 text-center font-black text-emerald-700">53 รร.</td>
                    <td className="py-2.5 px-3 sm:py-3 sm:px-4 text-center">
                      <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10.5px] font-bold">ครบถ้วน 100%</span>
                    </td>
                  </tr>
                  <tr className="hover:bg-slate-50/60">
                    <td className="py-2.5 px-3 sm:py-3 sm:px-4 font-bold text-slate-900">5. ภูมิปัญญาและวัฒนธรรม</td>
                    <td className="py-2.5 px-3 sm:py-3 sm:px-4">กิจกรรมสืบทอดภูมิปัญญาท้องถิ่นร่วมกับชุมชน</td>
                    <td className="py-2.5 px-3 sm:py-3 sm:px-4 text-center font-bold">53 รร.</td>
                    <td className="py-2.5 px-3 sm:py-3 sm:px-4 text-center font-black text-emerald-700">53 รร.</td>
                    <td className="py-2.5 px-3 sm:py-3 sm:px-4 text-center">
                      <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10.5px] font-bold">ครบถ้วน 100%</span>
                    </td>
                  </tr>
                  <tr className="hover:bg-slate-50/60">
                    <td className="py-2.5 px-3 sm:py-3 sm:px-4 font-bold text-slate-900">6. เกษตรเพื่ออาหารกลางวัน</td>
                    <td className="py-2.5 px-3 sm:py-3 sm:px-4">ผลผลิตสมทบโครงการอาหารกลางวัน</td>
                    <td className="py-2.5 px-3 sm:py-3 sm:px-4 text-center font-bold">80%</td>
                    <td className="py-2.5 px-3 sm:py-3 sm:px-4 text-center font-black text-emerald-700">87.5%</td>
                    <td className="py-2.5 px-3 sm:py-3 sm:px-4 text-center">
                      <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10.5px] font-bold">บรรลุเป้าหมาย</span>
                    </td>
                  </tr>
                  <tr className="hover:bg-slate-50/60">
                    <td className="py-2.5 px-3 sm:py-3 sm:px-4 font-bold text-slate-900">7. สหกรณ์นักเรียน</td>
                    <td className="py-2.5 px-3 sm:py-3 sm:px-4">การจัดกิจกรรมออมทรัพย์และร้านค้าสหกรณ์</td>
                    <td className="py-2.5 px-3 sm:py-3 sm:px-4 text-center font-bold">53 รร.</td>
                    <td className="py-2.5 px-3 sm:py-3 sm:px-4 text-center font-black text-emerald-700">53 รร.</td>
                    <td className="py-2.5 px-3 sm:py-3 sm:px-4 text-center">
                      <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10.5px] font-bold">ครบถ้วน 100%</span>
                    </td>
                  </tr>
                  <tr className="hover:bg-slate-50/60">
                    <td className="py-2.5 px-3 sm:py-3 sm:px-4 font-bold text-slate-900">8. ศูนย์บริการชุมชน</td>
                    <td className="py-2.5 px-3 sm:py-3 sm:px-4">บริการน้ำดื่มสะอาดและฝึกอบรมแก่ชุมชน</td>
                    <td className="py-2.5 px-3 sm:py-3 sm:px-4 text-center font-bold">53 รร.</td>
                    <td className="py-2.5 px-3 sm:py-3 sm:px-4 text-center font-black text-emerald-700">53 รร.</td>
                    <td className="py-2.5 px-3 sm:py-3 sm:px-4 text-center">
                      <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10.5px] font-bold">ครบถ้วน 100%</span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
