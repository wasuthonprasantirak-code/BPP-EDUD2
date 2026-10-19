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
  RefreshCw
} from "lucide-react";

export default function ChildDevPlan5Guide() {
  const [activeSubTab, setActiveSubTab] = useState<"pdf" | "indicators_doc" | "structure" | "overview">("pdf");
  const [selectedGoal, setSelectedGoal] = useState<number | null>(null);
  const [viewerEngine, setViewerEngine] = useState<"drive" | "google" | "native">("drive");
  const [viewerHeight, setViewerHeight] = useState<"standard" | "large" | "fullscreen">("large");
  const [iframeKey, setIframeKey] = useState<number>(1);

  const DRIVE_DOC_URL = "https://drive.google.com/file/d/1Iotuni7Lh_Iu9amd6PDH-P2k7r0zUn6j/view?usp=sharing";
  const DRIVE_PREVIEW_URL = "https://drive.google.com/file/d/1Iotuni7Lh_Iu9amd6PDH-P2k7r0zUn6j/preview";
  const INDICATORS_DOC_URL = "https://drive.google.com/file/d/15CrFOOk4eO2N8kn--myqZ21jIjm0cC-n/view?usp=sharing";
  const INDICATORS_DOC_PREVIEW_URL = "https://drive.google.com/file/d/15CrFOOk4eO2N8kn--myqZ21jIjm0cC-n/preview";
  const PDF_URL = "https://www.psproject.org/wp-content/uploads/2025/10/child_dev_plan60_69.pdf";
  const OFFICIAL_SITE_URL = "https://www.psproject.org/?p=3074";

  const getEmbedUrl = () => {
    if (viewerEngine === "drive") {
      return DRIVE_PREVIEW_URL;
    }
    if (viewerEngine === "google") {
      return `https://docs.google.com/gview?url=${encodeURIComponent(PDF_URL)}&embedded=true`;
    }
    // "native" mode: Use Drive Preview URL to prevent Chrome cross-origin iframe blocking
    return DRIVE_PREVIEW_URL;
  };

  // 8 Main Goals of Plan 5 (กพด. ฉบับที่ 5 พ.ศ. 2560 - 2569)
  const PLAN5_GOALS = [
    {
      id: 1,
      code: "ด้านที่ 1",
      title: "การเสริมสร้างสุขภาพของเด็กตั้งแต่ในครรภ์มารดา",
      icon: HeartPulse,
      color: "bg-rose-500 text-rose-600 border-rose-200 bg-rose-50",
      description: "โภชนาการและสุขภาพอนามัยของเด็กและเยาวชนได้รับการพัฒนาตามเกณฑ์มาตรฐาน สุขอนามัยส่วนบุคคล อาหาร 5 หมู่",
      targets: [
        "นักเรียนมีภาวะโภชนาการดี เจริญเติบโตตามวัย",
        "ปลอดจากโรคที่ป้องกันได้ด้วยวัคซีนและโรคติดต่อในโรงเรียน",
        "มีสุขนิสัยและพฤติกรรมอนามัยที่ดี"
      ]
    },
    {
      id: 2,
      code: "ด้านที่ 2",
      title: "การเพิ่มโอกาสทางการศึกษา",
      icon: GraduationCap,
      color: "bg-blue-500 text-blue-600 border-blue-200 bg-blue-50",
      description: "เด็กและเยาวชนได้รับโอกาสในการศึกษาจนถึงระดับสูงสุดตามศักยภาพและความถนัด",
      targets: [
        "เด็กวัยเรียนทุกคนได้รับการศึกษาขั้นพื้นฐาน",
        "นักเรียนจบการศึกษาได้รับโอกาสเรียนต่อในระดับสูงขึ้น",
        "ส่งเสริมทุนการศึกษานักเรียนในพระราชานุเคราะห์"
      ]
    },
    {
      id: 3,
      code: "ด้านที่ 3",
      title: "การเสริมสร้างศักยภาพของเด็กและเยาวชนทางวิชาการและทางจริยธรรม",
      icon: Award,
      color: "bg-indigo-500 text-indigo-600 border-indigo-200 bg-indigo-50",
      description: "เด็กและเยาวชนมีคุณภาพและความสมบูรณ์ทางวิชาการ อ่านออกเขียนได้ตามระดับชั้น และได้รับการปลูกฝังคุณธรรมจริยธรรม",
      targets: [
        "ทักษะการอ่าน การเขียน และภาษาไทยของนักเรียน",
        "ผลสัมฤทธิ์ทางการเรียนกลุ่มสาระการเรียนรู้หลัก",
        "ยกระดับสื่อและเทคโนโลยีเพื่อการจัดการเรียนรู้"
      ]
    },
    {
      id: 4,
      code: "ด้านที่ 4",
      title: "การเสริมสร้างศักยภาพของเด็กและเยาวชนทางการงานอาชีพ",
      icon: Briefcase,
      color: "bg-purple-500 text-purple-600 border-purple-200 bg-purple-50",
      description: "ปฏิบัติการแปลงเกษตร ปลูกผัก เลี้ยงไก่ไข่ ปลา เพาะเห็ด เพื่ออาหารกลางวัน และฝึกทักษะงานอาชีพ",
      targets: [
        "การผลิตอาหารในโรงเรียน (พืชผัก ปศุสัตว์ ประมง) สมทบโครงการอาหารกลางวัน",
        "ฝึกทักษะการแปรรูปผลผลิตและทักษะอาชีพท้องถิ่น",
        "การบริหารจัดการผลผลิตเกษตรปลอดภัย"
      ]
    },
    {
      id: 5,
      code: "ด้านที่ 5",
      title: "การปลูกฝังจิตสำนึกและพัฒนาศักยภาพของเด็กและเยาวชนในการอนุรักษ์ทรัพยากรธรรมชาติและสิ่งแวดล้อม",
      icon: Trees,
      color: "bg-emerald-500 text-emerald-600 border-emerald-200 bg-emerald-50",
      description: "งานสวนพฤกษศาสตร์โรงเรียน กิจกรรม 5 ส. คัดแยกขยะ ธนาคารขยะ การประหยัดพลังงานน้ำ-ไฟฟ้า",
      targets: [
        "โครงการสวนพฤกษศาสตร์โรงเรียนและโครงการอนุรักษ์พันธุกรรมพืชฯ",
        "การจัดการขยะ สิ่งแวดล้อม และภูมิทัศน์ในสถานศึกษา",
        "การใช้น้ำและพลังงานอย่างคุ้มค่า"
      ]
    },
    {
      id: 6,
      code: "ด้านที่ 6",
      title: "การเสริมสร้างศักยภาพของเด็กและเยาวชนในการอนุรักษ์และสืบทอดวัฒนธรรมและภูมิปัญญาของท้องถิ่นและของชาติไทย",
      icon: Landmark,
      color: "bg-amber-500 text-amber-600 border-amber-200 bg-amber-50",
      description: "มารยาทไทย ยิ้ม-ไหว้-ทักทาย การอนุรักษ์ภาษาถิ่น ดนตรี นาฏศิลป์ หัตถกรรมพื้นบ้าน",
      targets: [
        "การรวบรวมและรักษามรดกทางวัฒนธรรมและภูมิปัญญาท้องถิ่น",
        "ส่งเสริมกิจกรรมดนตรี นาฏศิลป์ หัตถกรรมท้องถิ่น",
        "การปลูกฝังคุณธรรม จริยธรรม และค่านิยมที่ดีงาม"
      ]
    },
    {
      id: 7,
      code: "ด้านที่ 7",
      title: "การขยายการพัฒนาจากโรงเรียนสู่ชุมชน",
      icon: Users,
      color: "bg-teal-500 text-teal-600 border-teal-200 bg-teal-50",
      description: "การขยายกิจกรรมการพัฒนาจากโรงเรียนสู่ครัวเรือน และการดำเนินกิจกรรมสหกรณ์ออมทรัพย์",
      targets: [
        "การขยายกิจกรรมการพัฒนาจากโรงเรียนสู่ครัวเรือนในเขตบริการ",
        "ส่งเสริมความเข้มแข็งของชุมชนและการดำเนินงานสหกรณ์",
        "การจดบันทึกบัญชีครัวเรือนและการออมทรัพย์"
      ]
    },
    {
      id: 8,
      code: "ด้านที่ 8",
      title: "การพัฒนาสถานศึกษาเป็นศูนย์บริการความรู้",
      icon: Building2,
      color: "bg-sky-500 text-sky-600 border-sky-200 bg-sky-50",
      description: "สถานศึกษาเป็นศูนย์กลางการบริการน้ำดื่มสะอาด แหล่งสาธิตถ่ายทอดเทคโนโลยีและการเรียนรู้ของชุมชน",
      targets: [
        "การให้บริการด้านสุขภาพ โภชนาการ และการเกษตรแก่ชุมชน",
        "บริการแหล่งเรียนรู้ ห้องสมุด คอมพิวเตอร์ และอินเทอร์เน็ตแก่ประชาชน",
        "การเป็นศูนย์สาธิตการพัฒนาตามแนวพระราชดำริ"
      ]
    }
  ];

  return (
    <div className="space-y-4 sm:space-y-5 max-w-7xl mx-auto pb-12 animate-fadeIn">
      {/* Main Sub-Navigation Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-2 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-1 overflow-x-auto w-full sm:w-auto scrollbar-none">
          <button
            onClick={() => setActiveSubTab("pdf")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-extrabold text-xs transition cursor-pointer whitespace-nowrap ${
              activeSubTab === "pdf"
                ? "bg-indigo-600 text-white shadow-xs"
                : "bg-slate-50 text-slate-700 hover:bg-slate-100"
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>เอกสารแผน กพด.5 (Document Viewer)</span>
          </button>

          <button
            onClick={() => setActiveSubTab("indicators_doc")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-extrabold text-xs transition cursor-pointer whitespace-nowrap ${
              activeSubTab === "indicators_doc"
                ? "bg-indigo-600 text-white shadow-xs"
                : "bg-slate-50 text-slate-700 hover:bg-slate-100"
            }`}
          >
            <FileText className="w-4 h-4 text-amber-300" />
            <span>เอกสารตัวชี้วัดแผน (Google Drive)</span>
          </button>

          <button
            onClick={() => setActiveSubTab("structure")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-extrabold text-xs transition cursor-pointer whitespace-nowrap ${
              activeSubTab === "structure"
                ? "bg-indigo-600 text-white shadow-xs"
                : "bg-slate-50 text-slate-700 hover:bg-slate-100"
            }`}
          >
            <Target className="w-4 h-4" />
            <span>เป้าหมายหลัก 8 ด้าน (กพด.5)</span>
          </button>

          <button
            onClick={() => setActiveSubTab("overview")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-extrabold text-xs transition cursor-pointer whitespace-nowrap ${
              activeSubTab === "overview"
                ? "bg-indigo-600 text-white shadow-xs"
                : "bg-slate-50 text-slate-700 hover:bg-slate-100"
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>วัตถุประสงค์ & กรอบการดำเนินงาน</span>
          </button>
        </div>

        <div className="hidden lg:flex items-center gap-2 text-xs text-slate-500 font-medium px-3">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span>เอกสารทางการจากโครงการส่วนพระองค์ฯ</span>
        </div>
      </div>

      {/* SubTab 1: Embedded PDF / Drive Viewer */}
      {activeSubTab === "pdf" && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center shrink-0">
                <FileText className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <h2 className="font-extrabold text-sm text-slate-900">
                  ไฟล์เอกสาร: แผนพัฒนาเด็กและเยาวชนในถิ่นทุรกันดาร ตามพระราชดำริฯ ฉบับที่ 5 (อัปเดต Google Drive)
                </h2>
                <p className="text-xs text-slate-500">
                  ลิงก์เอกสารฉบับทางการ: https://drive.google.com/file/d/1Iotuni7Lh_Iu9amd6PDH-P2k7r0zUn6j/view
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
              <a
                href={DRIVE_DOC_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 md:flex-initial inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs transition shadow-xs"
              >
                <Maximize2 className="w-3.5 h-3.5" />
                <span>เปิดใน Google Drive (New Tab)</span>
              </a>
              <a
                href={PDF_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 md:flex-initial inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-extrabold text-xs transition border border-slate-300"
              >
                <Download className="w-3.5 h-3.5 text-slate-600" />
                <span>ลิงก์สำรอง (PDF)</span>
              </a>
            </div>
          </div>

          {/* Embedded PDF iframe viewer & control toolbar */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-md overflow-hidden flex flex-col">
            {/* Light control bar */}
            <div className="bg-slate-50 border-b border-slate-200 px-4 py-3 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-extrabold text-slate-700 mr-1">เครื่องมืออ่านเอกสาร:</span>
                
                {/* Engine Selector */}
                <div className="inline-flex rounded-xl bg-slate-200/80 p-0.5 border border-slate-300/60">
                  <button
                    type="button"
                    onClick={() => { setViewerEngine("drive"); setIframeKey(k => k + 1); }}
                    className={`px-3 py-1 rounded-lg font-extrabold text-xs transition cursor-pointer ${
                      viewerEngine === "drive"
                        ? "bg-white text-indigo-900 shadow-2xs"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    Google Drive Viewer (แนะนำ)
                  </button>
                  <button
                    type="button"
                    onClick={() => { setViewerEngine("google"); setIframeKey(k => k + 1); }}
                    className={`px-3 py-1 rounded-lg font-extrabold text-xs transition cursor-pointer ${
                      viewerEngine === "google"
                        ? "bg-white text-indigo-900 shadow-2xs"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    Google Docs GView
                  </button>
                  <button
                    type="button"
                    onClick={() => { setViewerEngine("native"); setIframeKey(k => k + 1); }}
                    className={`px-3 py-1 rounded-lg font-extrabold text-xs transition cursor-pointer ${
                      viewerEngine === "native"
                        ? "bg-white text-indigo-900 shadow-2xs"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    Drive Direct PDF
                  </button>
                </div>

                {/* Height Toggle */}
                <div className="inline-flex rounded-xl bg-slate-200/80 p-0.5 border border-slate-300/60">
                  <button
                    type="button"
                    onClick={() => setViewerHeight("standard")}
                    className={`px-2.5 py-1 rounded-lg font-bold text-xs transition cursor-pointer ${
                      viewerHeight === "standard"
                        ? "bg-white text-indigo-900 shadow-2xs"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    ปกติ (680px)
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewerHeight("large")}
                    className={`px-2.5 py-1 rounded-lg font-bold text-xs transition cursor-pointer ${
                      viewerHeight === "large"
                        ? "bg-white text-indigo-900 shadow-2xs"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    ขยายสูง (950px)
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIframeKey(k => k + 1)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-slate-100 text-slate-700 font-bold border border-slate-300 transition cursor-pointer shadow-2xs"
                  title="โหลดเอกสารใหม่"
                >
                  <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
                  <span>รีเฟรช PDF</span>
                </button>
              </div>
            </div>

            {/* Document Frame Container */}
            <div className={`w-full bg-slate-100 relative overflow-hidden transition-all duration-300 ${
              viewerHeight === "large" ? "min-h-[950px] h-[950px]" : "min-h-[680px] h-[680px]"
            }`}>
              <iframe
                key={iframeKey}
                src={getEmbedUrl()}
                title="แผนพัฒนาเด็กและเยาวชนในถิ่นทุรกันดาร ฉบับที่ 5 (พ.ศ. 2560-2569)"
                className="w-full h-full border-0"
              />
            </div>
          </div>
        </div>
      )}

      {/* SubTab: Indicators Document (Google Drive) */}
      {activeSubTab === "indicators_doc" && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center shrink-0">
                <FileText className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h2 className="font-extrabold text-sm text-slate-900">
                  ไฟล์เอกสาร: เอกสารตัวชี้วัดแผนพัฒนาเด็กและเยาวชนในถิ่นทุรกันดาร (กพด.5)
                </h2>
                <p className="text-xs text-slate-500">
                  ลิงก์เอกสารฉบับทางการ: https://drive.google.com/file/d/15CrFOOk4eO2N8kn--myqZ21jIjm0cC-n/view
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
              <a
                href={INDICATORS_DOC_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 md:flex-initial inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs transition shadow-xs"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>เปิดใน Google Drive (New Tab)</span>
              </a>
            </div>
          </div>

          <div className="bg-white rounded-3xl border border-slate-200 shadow-md overflow-hidden flex flex-col">
            <div className="bg-slate-50 border-b border-slate-200 px-4 py-3 flex items-center justify-between text-xs">
              <span className="font-extrabold text-slate-700">พรีวิวเอกสารตัวชี้วัดแผน (Google Drive Viewer)</span>
              <button
                type="button"
                onClick={() => setIframeKey(k => k + 1)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-slate-100 text-slate-700 font-bold border border-slate-300 transition cursor-pointer shadow-2xs"
              >
                <RefreshCw className="w-3.5 h-3.5 text-indigo-600" />
                <span>รีเฟรชเอกสาร</span>
              </button>
            </div>
            <div className="w-full bg-slate-100 relative overflow-hidden h-[750px] min-h-[750px]">
              <iframe
                key={`indicators-doc-iframe-${iframeKey}`}
                src={INDICATORS_DOC_PREVIEW_URL}
                title="เอกสารตัวชี้วัดแผน กพด.5"
                className="w-full h-full border-0"
              />
            </div>
          </div>
        </div>
      )}

      {/* SubTab 2: Plan 5 - 8 Goals Breakdown */}
      {activeSubTab === "structure" && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex items-center justify-between">
            <div>
              <h2 className="font-extrabold text-slate-900 text-base">
                เป้าหมายหลัก 8 ด้าน ตามแผน กพด. ฉบับที่ 5 (พ.ศ. 2560 – 2569)
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                คลิกเลือกด้านที่ต้องการเพื่อดูรายละเอียดวัตถุประสงค์และตัวชี้วัดสำคัญ
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {PLAN5_GOALS.map((goal) => {
              const Icon = goal.icon;
              const isSelected = selectedGoal === goal.id;
              return (
                <div
                  key={goal.id}
                  onClick={() => setSelectedGoal(isSelected ? null : goal.id)}
                  className={`bg-white rounded-2xl p-5 border transition-all cursor-pointer flex flex-col justify-between space-y-4 hover:shadow-md ${
                    isSelected
                      ? "border-indigo-600 ring-2 ring-indigo-500/20 shadow-md bg-indigo-50/20"
                      : "border-slate-200 hover:border-slate-300"
                  }`}
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[16px] font-black px-3 py-1 rounded-lg bg-indigo-100 text-indigo-900 font-mono" style={{ fontSize: "16px" }}>
                        {goal.code}
                      </span>
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center border ${goal.color}`}>
                        <Icon className="w-5 h-5" />
                      </div>
                    </div>

                    <h3 className="font-extrabold text-sm text-slate-900 leading-snug">
                      {goal.title}
                    </h3>

                    <p className="text-xs text-slate-600 line-clamp-3 leading-relaxed">
                      {goal.description}
                    </p>
                  </div>

                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-indigo-700">
                    <span>เป้าหมายย่อย ({goal.targets.length} ข้อ)</span>
                    <ChevronRight className={`w-4 h-4 transition-transform ${isSelected ? "rotate-90" : ""}`} />
                  </div>

                  {isSelected && (
                    <div className="pt-3 border-t border-indigo-100 space-y-2 text-xs text-slate-700 animate-fadeIn">
                      <p className="font-black text-indigo-950 text-[11px] uppercase tracking-wider">
                        ตัวชี้วัดและเป้าหมายย่อย:
                      </p>
                      <ul className="space-y-1.5">
                        {goal.targets.map((tgt, i) => (
                          <li key={i} className="flex items-start gap-1.5 text-[11px] leading-snug">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                            <span>{tgt}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* SubTab 3: Overview & Vision */}
      {activeSubTab === "overview" && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
            <div className="border-b border-slate-100 pb-4">
              <h2 className="text-lg font-black text-slate-900">
                วัตถุประสงค์หลักและวิสัยทัศน์ แผน กพด. ฉบับที่ 5 (พ.ศ. 2560 – 2569)
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                กรอบยุทธศาสตร์การพัฒนาเด็กและเยาวชนในถิ่นทุรกันดารตามพระราชดำริฯ
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-blue-50/60 rounded-2xl p-5 border border-blue-200/80 space-y-2">
                <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center font-black text-sm">
                  1
                </div>
                <h3 className="font-extrabold text-sm text-blue-950">วิสัยทัศน์ (Vision)</h3>
                <p className="text-xs text-slate-700 leading-relaxed">
                  เด็กและเยาวชนในถิ่นทุรกันดารได้รับการพัฒนาอย่างสมบูรณ์รอบด้าน มีคุณภาพชีวิตที่ดี และสามารถพึ่งตนเองได้ เป็นกำลังสำคัญในการพัฒนาชุมชนและประเทศชาติ
                </p>
              </div>

              <div className="bg-emerald-50/60 rounded-2xl p-5 border border-emerald-200/80 space-y-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-black text-sm">
                  2
                </div>
                <h3 className="font-extrabold text-sm text-emerald-950">หลักการสำคัญ (Core Principles)</h3>
                <p className="text-xs text-slate-700 leading-relaxed">
                  ยึดเด็กและเยาวชนเป็นศูนย์กลาง บูรณาการการทำงานร่วมกับหน่วยงานภาคีเครือข่าย พัฒนาสถานศึกษาให้เป็นศูนย์กลางของชุมชน และน้อมนำปรัชญาเศรษฐกิจพอเพียงมาประยุกต์ใช้
                </p>
              </div>

              <div className="bg-amber-50/60 rounded-2xl p-5 border border-amber-200/80 space-y-2">
                <div className="w-8 h-8 rounded-xl bg-amber-600 text-white flex items-center justify-center font-black text-sm">
                  3
                </div>
                <h3 className="font-extrabold text-sm text-amber-950">กลุ่มเป้าหมาย (Target Group)</h3>
                <p className="text-xs text-slate-700 leading-relaxed">
                  เด็กและเยาวชนในโรงเรียนตำรวจตระเวนชายแดน โรงเรียนพระปริยัติธรรม และโรงเรียนในพื้นที่ทุรกันดารทั่วประเทศ รวมถึงประชาชนในชุมชนรอบข้าง
                </p>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-2 text-xs text-slate-600 font-medium">
                <Info className="w-4 h-4 text-indigo-600 shrink-0" />
                <span>สอบถามข้อมูลเพิ่มเติมเกี่ยวกับแผนงาน ได้ที่โครงการส่วนพระองค์สมเด็จพระกนิษฐาธิราชเจ้า กรมสมเด็จพระเทพรัตนราชสุดาฯ สยามบรมราชกุมารี</span>
              </div>

              <a
                href={PDF_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs shadow-xs transition"
              >
                <Download className="w-3.5 h-3.5" />
                <span>ดาวน์โหลดแผนฉบับเต็ม (PDF)</span>
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
