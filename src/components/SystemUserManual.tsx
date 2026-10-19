import React, { useState } from "react";
import { 
  BookOpen, 
  LayoutDashboard, 
  FileText, 
  Layers, 
  ShieldAlert, 
  AlertTriangle, 
  Sparkles, 
  ImageIcon, 
  Video, 
  CalendarCheck, 
  Sun, 
  Compass, 
  HelpCircle,
  CheckCircle2, 
  Info,
  ChevronRight,
  MapPin,
  FileCheck,
  Database,
  CloudLightning,
  RefreshCw,
  Trophy,
  Tv,
  Map,
  School,
  BarChart3,
  ClipboardList,
  Award
} from "lucide-react";

export default function SystemUserManual() {
  const [activeSection, setActiveSection] = useState<string>("overview");

  const sections = [
    {
      id: "overview",
      title: "1. ภาพรวมระบบ & 5 หมวดหมู่แถบงาน",
      icon: Info,
      color: "text-indigo-600 bg-indigo-50 border-indigo-200",
    },
    {
      id: "executive-strategic",
      title: "2. หมวดบริหาร & ภาพรวมยุทธศาสตร์",
      icon: LayoutDashboard,
      color: "text-indigo-600 bg-indigo-50 border-indigo-200",
    },
    {
      id: "reports-documents",
      title: "3. หมวดจัดการเอกสาร & รายงาน A4",
      icon: FileText,
      color: "text-blue-600 bg-blue-50 border-blue-200",
    },
    {
      id: "monitoring-audit",
      title: "4. หมวดกำกับ ติดตาม & ตรวจสอบคุณภาพ",
      icon: ShieldAlert,
      color: "text-emerald-600 bg-emerald-50 border-emerald-200",
    },
    {
      id: "media-gallery",
      title: "5. หมวดสื่อกิจกรรม & คลังมัลติมีเดีย",
      icon: ImageIcon,
      color: "text-purple-600 bg-purple-50 border-purple-200",
    },
    {
      id: "manuals-frameworks",
      title: "6. หมวดคู่มือปฏิบัติงาน & แผนงาน",
      icon: Compass,
      color: "text-amber-600 bg-amber-50 border-amber-200",
    },
    {
      id: "ai-offline",
      title: "7. ผู้ช่วย AI (Gemini) & ระบบออฟไลน์",
      icon: Sparkles,
      color: "text-pink-600 bg-pink-50 border-pink-200",
    }
  ];

  return (
    <div className="bg-slate-50 min-h-screen rounded-3xl border border-slate-200 shadow-xs overflow-hidden" id="system-manual-container">
      {/* Banner Header */}
      <div className="bg-linear-to-r from-slate-900 via-slate-800 to-indigo-950 text-white p-3.5 sm:p-5 relative overflow-hidden border-b border-slate-800">
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-emerald-500/5 rounded-full blur-2xl -ml-20 -mb-20 pointer-events-none"></div>
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="space-y-1 max-w-3xl">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] sm:text-xs font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
              <BookOpen className="w-3.5 h-3.5" />
              คู่มือผู้ใช้งานอย่างเป็นทางการ (Updated Board Structure)
            </span>
            <h1 className="text-base sm:text-lg md:text-xl font-black tracking-tight text-white leading-tight">
              คู่มือการใช้งานระบบติดตามผล แผน กพด. ฉบับที่ 5
            </h1>
            <p className="text-slate-300/90 text-xs sm:text-sm font-normal leading-relaxed">
              ยินดีต้อนรับสู่ระบบประมวลผลข้อมูลและภูมิสารสนเทศ (GIS) โครงการตามพระราชดำริฯ สังกัด บก.ตชด.ภาค 2 ปรับปรุงคู่มือการใช้งานครอบคลุม 5 หมวดหมู่หลักบนแถบเมนูปัจจุบัน เพื่อการปฏิบัติงานอย่างมีประสิทธิภาพ
            </p>
          </div>
          <div className="shrink-0 flex items-center bg-white/10 backdrop-blur-md px-3 py-2 rounded-2xl border border-white/15 shadow-inner">
            <div className="text-center">
              <div className="text-[9px] text-slate-300 font-semibold uppercase tracking-wider">เวอร์ชันระบบ</div>
              <div className="text-xs sm:text-sm font-black text-emerald-400 leading-tight">v5.3.0 (Active Board)</div>
              <div className="text-[9px] text-slate-300">อัปเดตล่าสุด: กันยายน 2569</div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-0">
        {/* Left Navigation Panel */}
        <aside className="lg:col-span-4 border-r border-slate-200 bg-white p-4 sm:p-5 space-y-5">
          <div>
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider px-2 mb-2.5">
              สารบัญหมวดหมู่เมนูระบบ
            </h3>
            <nav className="grid grid-cols-1 gap-2" id="manual-sections-nav">
              {sections.map((section) => {
                const Icon = section.icon;
                const isSelected = activeSection === section.id;
                return (
                  <button
                    key={section.id}
                    id={`btn-manual-${section.id}`}
                    onClick={() => setActiveSection(section.id)}
                    className={`w-full flex items-center justify-between p-3 rounded-2xl text-left transition-all duration-200 cursor-pointer group ${
                      isSelected
                        ? "bg-indigo-600 text-white font-bold shadow-md shadow-indigo-600/20 scale-[1.01]"
                        : "text-slate-700 hover:bg-slate-50 border border-slate-100 hover:border-slate-200 bg-white"
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0 flex-1 truncate">
                      <span className={`p-1.5 sm:p-2 rounded-xl transition-colors shrink-0 ${
                        isSelected 
                          ? "bg-white/20 text-white" 
                          : section.color.split(" ")[0] + " " + section.color.split(" ")[2]
                      }`}>
                        <Icon className="w-4 h-4 shrink-0" />
                      </span>
                      <span className="text-xs sm:text-sm font-bold truncate pr-1">{section.title}</span>
                    </div>
                    <ChevronRight className={`w-4 h-4 shrink-0 transition-transform ${
                      isSelected ? "translate-x-0.5 opacity-100" : "opacity-0 group-hover:opacity-50 group-hover:translate-x-0.5"
                    }`} />
                  </button>
                );
              })}
            </nav>
          </div>

          <div className="bg-linear-to-br from-indigo-50 to-slate-50 p-4 rounded-2xl border border-indigo-100/70 space-y-2.5">
            <h4 className="text-xs font-bold text-indigo-950 flex items-center gap-1.5">
              <HelpCircle className="w-4 h-4 text-indigo-600" />
              ต้องการความช่วยเหลือเพิ่มเติม?
            </h4>
            <p className="text-[11px] sm:text-xs text-slate-600 leading-relaxed">
              หากท่านมีข้อสงสัยเกี่ยวกับตัวชี้วัด แบบฟอร์ม 401-404 หรือต้องการวิเคราะห์ความสอดคล้อง ท่านสามารถสอบถามผ่าน <strong>"ผู้ช่วยอัจฉริยะ AI กพด.5"</strong> ในแถบเครื่องมือหลักได้ตลอดเวลา
            </p>
          </div>
        </aside>

        {/* Right Content Panel */}
        <main className="lg:col-span-8 bg-white p-4 sm:p-6 lg:p-8 overflow-y-auto">
          {/* Section 1: Overview */}
          {activeSection === "overview" && (
            <div className="space-y-6 fade-in" id="content-overview">
              <div className="space-y-2">
                <h2 className="text-base sm:text-lg md:text-xl font-black text-slate-900 flex items-center gap-2">
                  <span className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-sm shrink-0">1</span>
                  <span>ภาพรวมสถาปัตยกรรม & 5 หมวดหมู่หลักบนแถบเมนูปัจจุบัน</span>
                </h2>
                <div className="h-0.5 w-20 bg-indigo-600 rounded-full"></div>
              </div>

              <p className="text-slate-600 text-xs sm:text-sm leading-relaxed typo-app-body">
                ระบบบริหารและติดตามผล <strong>แผนพัฒนาเด็กและเยาวชนในถิ่นทุรกันดาร ตามพระราชดำริ สมเด็จพระกนิษฐาธิราชเจ้า กรมสมเด็จพระเทพรัตนราชสุดาฯ สยามบรมราชกุมารี ฉบับที่ 5 (พ.ศ. 2569 - 2573)</strong> สังกัด บก.ตชด.ภาค 2 ได้รับการจัดหมวดหมู่เมนูใหม่บนแถบซ้ายมือออกเป็น <strong>5 หมวดหมู่หลัก</strong> ตามลำดับความสำคัญของภารกิจ:
              </p>

              {/* 5 Board Categories Summary Table */}
              <div className="mt-4 space-y-3">
                <h3 className="font-extrabold text-slate-900 text-xs sm:text-sm">ตารางโครงสร้าง 5 หมวดหมู่หลักบนแถบเมนูปัจจุบัน</h3>
                
                <div className="border border-slate-200/90 rounded-2xl overflow-hidden shadow-2xs bg-white">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs min-w-[580px]">
                      <thead>
                        <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200 text-[11px] uppercase tracking-wide">
                          <th className="p-3 w-1/3 whitespace-nowrap">หมวดหมู่แถบเมนู</th>
                          <th className="p-3">เมนูและฟังก์ชันที่บรรจุภายใน</th>
                          <th className="p-3 w-1/4">วัตถุประสงค์หลัก</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-slate-600 text-[11px] sm:text-xs">
                        <tr>
                          <td className="p-3 font-bold text-slate-900 bg-indigo-50/40 align-top">
                            1. บริหาร & ภาพรวมยุทธศาสตร์
                          </td>
                          <td className="p-3 align-top">
                            <ul className="list-disc pl-4 space-y-1">
                              <li><strong>แผงควบคุมหลัก (Dashboard):</strong> สรุปสถิติ KPI รวม ดึงข้อมูลอัตโนมัติ</li>
                              <li><strong>สถานีนำเสนอผู้บังคับบัญชา:</strong> หน้าจอนำเสนอสถิติลำดับบริหาร</li>
                              <li><strong>แผนที่สารสนเทศ GIS ตชด.:</strong> พิกัดดาวเทียมจริง 53 โรงเรียน</li>
                              <li><strong>อันดับความดี & ประกาศเกียรติคุณ:</strong> ตารางเกียรติยศและลำดับผลงาน</li>
                            </ul>
                          </td>
                          <td className="p-3 text-[11px] text-slate-500 align-top leading-relaxed">
                            สรุปภาพรวมเชิงบริหาร นำเสนอผู้บังคับบัญชา และวิเคราะห์มิติเชิงพื้นที่
                          </td>
                        </tr>
                        <tr>
                          <td className="p-3 font-bold text-slate-900 bg-blue-50/40 align-top">
                            2. จัดการเอกสาร & รายงาน
                          </td>
                          <td className="p-3 align-top">
                            <ul className="list-disc pl-4 space-y-1">
                              <li><strong>เอกสารรายงาน A4:</strong> พิมพ์รายงานมาตรฐาน 30 หน้า/ชุด + Column Mapper</li>
                              <li><strong>แฟ้มรายงานทั้งหมด:</strong> ค้นหา กรอง และดาวน์โหลด CSV/ZIP</li>
                              <li><strong>วิเคราะห์รายสัปดาห์/เดือน/สะสม:</strong> วิเคราะห์แนวโน้มผลสัมฤทธิ์</li>
                              <li><strong>รายงานดำเนินงานปี 2568:</strong> ข้อมูลสถิติย้อนหลังเปรียบเทียบ</li>
                            </ul>
                          </td>
                          <td className="p-3 text-[11px] text-slate-500 align-top leading-relaxed">
                            จัดทำ จัดเก็บ และออกรายงานทางการ พิมพ์เป็นเอกสาร A4 และไฟล์ PDF
                          </td>
                        </tr>
                        <tr>
                          <td className="p-3 font-bold text-slate-900 bg-emerald-50/40 align-top">
                            3. กำกับ ติดตาม & ตรวจสอบคุณภาพ
                          </td>
                          <td className="p-3 align-top">
                            <ul className="list-disc pl-4 space-y-1">
                              <li><strong>ติดตามการส่งรายงาน:</strong> เช็กสถานะ + ออกร่างหนังสือติดตามราชการ</li>
                              <li><strong>ตรวจสอบความสอดคล้องตัวชี้วัด (KPI Explorer):</strong> ตรวจสอบความสอดคล้องเป้าหมาย</li>
                              <li><strong>ติดตามกิจกรรมหลายระยะ:</strong> ตรวจความก้าวหน้า 3 งวดกิจกรรม</li>
                              <li><strong>ปัญหาและอุปสรรค:</strong> บันทึกวิเคราะห์ปัญหาและแนวทางแก้ไข</li>
                              <li><strong>ฐานข้อมูล 53 โรงเรียน ตชด.:</strong> ข้อมูลที่ตั้ง ผู้บริหาร และครูผู้รับผิดชอบ</li>
                            </ul>
                          </td>
                          <td className="p-3 text-[11px] text-slate-500 align-top leading-relaxed">
                            กำกับดูแลความต่อเนื่อง ตรวจสอบคุณภาพข้อมูล และเร่งรัดการส่งงาน
                          </td>
                        </tr>
                        <tr>
                          <td className="p-3 font-bold text-slate-900 bg-purple-50/40 align-top">
                            4. สื่อกิจกรรม & คลังมัลติมีเดีย
                          </td>
                          <td className="p-3 align-top">
                            <ul className="list-disc pl-4 space-y-1">
                              <li><strong>คลังภาพกิจกรรม กพด.:</strong> ภาพแปลงเกษตร โภชนาการ และการเรียนการสอน</li>
                              <li><strong>คลังวิดีโอกิจกรรม กพด.:</strong> วิดีโอหลักฐานการจัดกิจกรรมสุขลักษณะ</li>
                            </ul>
                          </td>
                          <td className="p-3 text-[11px] text-slate-500 align-top leading-relaxed">
                            จัดเก็บและเผยแพร่หลักฐานสื่อมัลติมีเดียเชิงรูปธรรม
                          </td>
                        </tr>
                        <tr>
                          <td className="p-3 font-bold text-slate-900 bg-amber-50/40 align-top">
                            5. คู่มือปฏิบัติงาน & แผนงาน
                          </td>
                          <td className="p-3 align-top">
                            <ul className="list-disc pl-4 space-y-1">
                              <li><strong>คู่มือการใช้งานระบบ:</strong> คู่มือฉบับเต็มตรงตามบอร์ดปัจจุบัน</li>
                              <li><strong>คู่มือและปฏิทินงาน กพด.:</strong> ปฏิทินปฏิบัติงานครูรายภาคเรียน</li>
                              <li><strong>คู่มือปฏิบัติกิจวัตรรายวัน:</strong> ตารางกิจกรรมเด็ก 07:00 - 16:45 น.</li>
                              <li><strong>เอกสาร กพด. ฉบับที่ 5 (PDF):</strong> กรอบแผนยุทธศาสตร์รัฐบาล</li>
                              <li><strong>หลักเกณฑ์และตัวชี้วัด:</strong> รายละเอียดตัวชี้วัดที่ 1 - 34</li>
                            </ul>
                          </td>
                          <td className="p-3 text-[11px] text-slate-500 align-top leading-relaxed">
                            คลังอ้างอิงมาตรฐานทางกฎหมาย ปฏิทินงาน และเกณฑ์ประเมิน
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Section 2: Executive & Strategic */}
          {activeSection === "executive-strategic" && (
            <div className="space-y-6 fade-in" id="content-executive-strategic">
              <div className="space-y-2">
                <h2 className="text-base sm:text-lg md:text-xl font-black text-slate-900 flex items-center gap-2">
                  <span className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-sm shrink-0">2</span>
                  <span>หมวดที่ 1: บริหาร & ภาพรวมยุทธศาสตร์</span>
                </h2>
                <div className="h-0.5 w-20 bg-indigo-600 rounded-full"></div>
              </div>

              <p className="text-slate-600 text-xs sm:text-sm leading-relaxed typo-app-body">
                หมวดหมู่นี้ออกแบบมาเพื่อให้ผู้บังคับบัญชา ผู้บริหาร และเจ้าหน้าที่ประสานงานสามารถเข้าถึงสถิติภาพรวม ยุทธศาสตร์ 8 ด้าน และมิติเชิงพื้นที่ของโรงเรียนตำรวจตระเวนชายแดนทั้ง 53 แห่งได้อย่างรวดเร็ว:
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="border border-slate-200 p-4 rounded-2xl bg-slate-50 space-y-2 app-card-surface">
                  <div className="w-8 h-8 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold">
                    <LayoutDashboard className="w-4 h-4" />
                  </div>
                  <h3 className="font-bold text-slate-900 text-xs sm:text-sm">1. แผงควบคุมหลัก (Dashboard)</h3>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    แสดงตัวเลขสรุปผลสัมฤทธิ์ กราฟเปรียบเทียบสถิติรายด้าน และปุ่ม <strong>"ดึงข้อมูลอัตโนมัติ"</strong> เพื่ออัปเดตรางานล่าสุดแบบเรียลไทม์
                  </p>
                </div>

                <div className="border border-slate-200 p-4 rounded-2xl bg-slate-50 space-y-2 app-card-surface">
                  <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
                    <Tv className="w-4 h-4" />
                  </div>
                  <h3 className="font-bold text-slate-900 text-xs sm:text-sm">2. สถานีนำเสนอผู้บังคับบัญชา</h3>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    หน้าจอนำเสนอสไตล์ Executive Station เน้นตัวเลขสถิติตัวโต สรุปจุดแข็ง จุดที่ต้องเร่งรัด เหมาะสำหรับเปิดบนหน้าจอห้องประชุมการตรวจราชการ
                  </p>
                </div>

                <div className="border border-slate-200 p-4 rounded-2xl bg-slate-50 space-y-2 app-card-surface">
                  <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                    <Map className="w-4 h-4" />
                  </div>
                  <h3 className="font-bold text-slate-900 text-xs sm:text-sm">3. แผนที่สารสนเทศ GIS ตชด.</h3>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    แผนที่ระบุพิกัดละติจูด/ลองจิจูดจริงของ 53 รร.ตชด. แสดงหมุดสีตามเกณฑ์ผลสัมฤทธิ์ และปุ่ม Quick Jump เข้าสู่รายงานรายโรงเรียน
                  </p>
                </div>

                <div className="border border-slate-200 p-4 rounded-2xl bg-slate-50 space-y-2 app-card-surface">
                  <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center font-bold">
                    <Trophy className="w-4 h-4" />
                  </div>
                  <h3 className="font-bold text-slate-900 text-xs sm:text-sm">4. อันดับความดี & ประกาศเกียรติคุณ</h3>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    ตารางจัดลำดับเกียรติยศโรงเรียน ตชด. ที่มีผลการดำเนินงานยอดเยี่ยมประจำงวด เพื่อสร้างขวัญกำลังใจและยกย่องครูผู้ปฏิบัติงาน
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Section 3: Reports & Documents */}
          {activeSection === "reports-documents" && (
            <div className="space-y-6 fade-in" id="content-reports-documents">
              <div className="space-y-2">
                <h2 className="text-base sm:text-lg md:text-xl font-black text-slate-900 flex items-center gap-2">
                  <span className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-sm shrink-0">3</span>
                  <span>หมวดที่ 2: จัดการเอกสาร & รายงาน</span>
                </h2>
                <div className="h-0.5 w-20 bg-blue-600 rounded-full"></div>
              </div>

              <p className="text-slate-600 text-xs sm:text-sm leading-relaxed typo-app-body">
                หมวดหมู่นี้เป็นศูนย์กลางการออกเอกสารรายงานทางการ การแก้ไขข้อมูลตัวชี้วัด และการวิเคราะห์แนวโน้มผลสัมฤทธิ์:
              </p>

              <div className="border border-slate-200 rounded-2xl p-4 bg-slate-50/70 space-y-4 app-card-surface">
                <h3 className="font-bold text-slate-900 text-xs sm:text-sm flex items-center gap-2">
                  <FileText className="w-4 h-4 text-blue-600" />
                  <span>1. เอกสารรายงาน A4 (A4 Print-Ready Reports)</span>
                </h3>
                <ul className="text-xs text-slate-600 space-y-2 pl-4 list-disc leading-relaxed">
                  <li><strong>การแสดงผลแบบแบ่งหน้า 30 หน้า/ชุด:</strong> หน้าจอถูกตั้งค่าให้แสดงผลครั้งละ 30 หน้าอย่างเป็นระเบียบ และสามารถกดปุ่ม <em>"ดูรายงานเพิ่มเติม (+30 หน้า)"</em> เพื่อโหลดเอกสารถัดไปได้ทันที</li>
                  <li><strong>เครื่องมือจับคู่คอลัมน์ (Column Mapper):</strong> อนุญาตให้อัปโหลดไฟล์ Excel/CSV และจับคู่คอลัมน์ชื่อโรงเรียน ผลผลิต และตัวชี้วัดเข้าสู่ฐานข้อมูลแผน 5 ได้อัตโนมัติ</li>
                  <li><strong>การพิมพ์และส่งออก PDF:</strong> สั่งพิมพ์รายงาน A4 ผ่านเบราว์เซอร์ได้รูปเล่มมาตรฐาน ไม่บิดเบี้ยว</li>
                </ul>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="border border-slate-200 p-4 rounded-2xl bg-white space-y-2 app-card-surface">
                  <h4 className="font-bold text-slate-900 text-xs sm:text-sm flex items-center gap-1.5">
                    <ClipboardList className="w-4 h-4 text-emerald-600" />
                    <span>2. แฟ้มรายงานทั้งหมด</span>
                  </h4>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    ระบบสืบค้นและกรองรายงานตาม กก.ตชด. จังหวัด ตัวชี้วัด พร้อมปุ่มส่งออกข้อมูลเป็น CSV หรือดาวน์โหลดรูปเล่ม ZIP
                  </p>
                </div>

                <div className="border border-slate-200 p-4 rounded-2xl bg-white space-y-2 app-card-surface">
                  <h4 className="font-bold text-slate-900 text-xs sm:text-sm flex items-center gap-1.5">
                    <BarChart3 className="w-4 h-4 text-indigo-600" />
                    <span>3. วิเคราะห์รายสัปดาห์/เดือน/สะสม</span>
                  </h4>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    วิเคราะห์เปรียบเทียบอัตราการเติบโตและการสะสมผลผลิตเกษตร พัฒนาการโภชนาการรายไตรมาส
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Section 4: Monitoring & Audit */}
          {activeSection === "monitoring-audit" && (
            <div className="space-y-6 fade-in" id="content-monitoring-audit">
              <div className="space-y-2">
                <h2 className="text-base sm:text-lg md:text-xl font-black text-slate-900 flex items-center gap-2">
                  <span className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-sm shrink-0">4</span>
                  <span>หมวดที่ 3: กำกับ ติดตาม & ตรวจสอบคุณภาพ</span>
                </h2>
                <div className="h-0.5 w-20 bg-emerald-600 rounded-full"></div>
              </div>

              <p className="text-slate-600 text-xs sm:text-sm leading-relaxed typo-app-body">
                หมวดหมู่นี้มีฟังก์ชันสำคัญในการติดตามความคืบหน้าของโรงเรียน ตรวจสอบค้างส่งรายงาน และเร่งรัดการดำเนินงาน:
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="border border-slate-200 p-4 rounded-2xl bg-slate-50 space-y-2 app-card-surface">
                  <div className="w-8 h-8 rounded-xl bg-red-100 text-red-700 flex items-center justify-center font-bold">
                    <ShieldAlert className="w-4 h-4" />
                  </div>
                  <h3 className="font-bold text-slate-900 text-xs sm:text-sm">1. ติดตามการส่งรายงาน</h3>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    ตารางตรวจสอบโรงเรียนที่ส่งแล้วหรือค้างส่ง พร้อมระบบ <strong>"ร่างหนังสือติดตามราชการอัตโนมัติ"</strong> สำหรับออกจดหมายเตือนเป็นทางการ
                  </p>
                </div>

                <div className="border border-slate-200 p-4 rounded-2xl bg-slate-50 space-y-2 app-card-surface">
                  <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center font-bold">
                    <Award className="w-4 h-4" />
                  </div>
                  <h3 className="font-bold text-slate-900 text-xs sm:text-sm">2. ตรวจสอบความสอดคล้องตัวชี้วัด</h3>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    เครื่องมือ KPI Explorer ช่วยตรวจสอบความถูกต้อง ความสอดคล้องระหว่างกิจกรรมที่จัด กับเป้าหมายตัวชี้วัด 34 ข้อ
                  </p>
                </div>

                <div className="border border-slate-200 p-4 rounded-2xl bg-slate-50 space-y-2 app-card-surface">
                  <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center font-bold">
                    <Layers className="w-4 h-4" />
                  </div>
                  <h3 className="font-bold text-slate-900 text-xs sm:text-sm">3. ติดตามกิจกรรมหลายระยะ</h3>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    ติดตามความคืบหน้า 3 งวดกิจกรรม (งวดที่ 1 เตรียมการ, งวดที่ 2 บ่มเพาะฟอร์ม 401, งวดที่ 3 ประเมินปลายปี)
                  </p>
                </div>

                <div className="border border-slate-200 p-4 rounded-2xl bg-slate-50 space-y-2 app-card-surface">
                  <div className="w-8 h-8 rounded-xl bg-slate-200 text-slate-700 flex items-center justify-center font-bold">
                    <School className="w-4 h-4" />
                  </div>
                  <h3 className="font-bold text-slate-900 text-xs sm:text-sm">4. ฐานข้อมูล 53 โรงเรียน ตชด.</h3>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    ทำเนียบข้อมูล รร.ตชด. 53 แห่งในภาค 2 ระบุชื่อครูใหญ่ เบอร์ติดต่อ สังกัด กก.ตชด. 21, 22, 23, 24 และพิกัดภูมิศาสตร์
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Section 5: Media Gallery */}
          {activeSection === "media-gallery" && (
            <div className="space-y-6 fade-in" id="content-media-gallery">
              <div className="space-y-2">
                <h2 className="text-base sm:text-lg md:text-xl font-black text-slate-900 flex items-center gap-2">
                  <span className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center font-bold text-sm shrink-0">5</span>
                  <span>หมวดที่ 4: สื่อกิจกรรม & คลังมัลติมีเดีย</span>
                </h2>
                <div className="h-0.5 w-20 bg-purple-600 rounded-full"></div>
              </div>

              <p className="text-slate-600 text-xs sm:text-sm leading-relaxed typo-app-body">
                การรวบรวมหลักฐานเชิงรูปธรรมผ่านสื่อภาพถ่ายและวิดีโอ ช่วยให้การประเมินโครงการตามพระราชดำริฯ มีความน่าเชื่อถือสูง:
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="border border-slate-200 p-4 rounded-2xl bg-slate-50 space-y-2 app-card-surface">
                  <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center font-bold">
                    <ImageIcon className="w-4 h-4" />
                  </div>
                  <h3 className="font-bold text-slate-900 text-xs sm:text-sm">1. คลังภาพกิจกรรม กพด.</h3>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    คลังเก็บอัลบั้มภาพแปลงเกษตร โครงการอาหารกลางวัน กิจกรรมสหกรณ์นักเรียน และสุขภาพอนามัย แยกตามโรงเรียนและไตรมาส
                  </p>
                </div>

                <div className="border border-slate-200 p-4 rounded-2xl bg-slate-50 space-y-2 app-card-surface">
                  <div className="w-8 h-8 rounded-xl bg-pink-100 text-pink-700 flex items-center justify-center font-bold">
                    <Video className="w-4 h-4" />
                  </div>
                  <h3 className="font-bold text-slate-900 text-xs sm:text-sm">2. คลังวิดีโอกิจกรรม กพด.</h3>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    รวบรวมคลิปวิดีโอการสาธิตการทำเกษตรอินทรีย์ การแปรรูปอาหาร และสื่อการเรียนการสอนสุขอนามัยในโรงเรียนชายแดน
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Section 6: Manuals & Frameworks */}
          {activeSection === "manuals-frameworks" && (
            <div className="space-y-6 fade-in" id="content-manuals-frameworks">
              <div className="space-y-2">
                <h2 className="text-base sm:text-lg md:text-xl font-black text-slate-900 flex items-center gap-2">
                  <span className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center font-bold text-sm shrink-0">6</span>
                  <span>หมวดที่ 5: คู่มือปฏิบัติงาน & แผนงาน</span>
                </h2>
                <div className="h-0.5 w-20 bg-amber-600 rounded-full"></div>
              </div>

              <p className="text-slate-600 text-xs sm:text-sm leading-relaxed typo-app-body">
                รวมฐานข้อมูลคู่มือ กฎระเบียบ และเอกสารอ้างอิงทางการเพื่อความถูกต้องตามเกณฑ์ประเมินของรัฐบาล:
              </p>

              <div className="space-y-3">
                <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-slate-50 border border-slate-200 app-card-surface">
                  <CalendarCheck className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-bold text-slate-900 text-xs sm:text-sm">1. คู่มือและปฏิทินงาน กพด. รายภาคเรียน</h4>
                    <p className="text-[11px] text-slate-500 leading-relaxed mt-0.5">
                      กำหนดการปฏิบัติงานครูประจำภาคเรียน พฤษภาคม - มีนาคม รายสัปดาห์
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-slate-50 border border-slate-200 app-card-surface">
                  <Sun className="w-5 h-5 text-orange-500 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-bold text-slate-900 text-xs sm:text-sm">2. คู่มือปฏิบัติกิจวัตรรายวันของนักเรียน</h4>
                    <p className="text-[11px] text-slate-500 leading-relaxed mt-0.5">
                      ตารางเวลากิจวัตรสุขอนามัย โภชนาการ และการเกษตรของนักเรียน ตั้งแต่ 07:00 ถึง 16:45 น.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-slate-50 border border-slate-200 app-card-surface">
                  <BookOpen className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-bold text-slate-900 text-xs sm:text-sm">3. เอกสารแผน กพด. ฉบับที่ 5 (PDF)</h4>
                    <p className="text-[11px] text-slate-500 leading-relaxed mt-0.5">
                      ฉบับเต็มไฟล์ PDF ยุทธศาสตร์การพัฒนาเด็กและเยาวชนในถิ่นทุรกันดาร พ.ศ. 2569 - 2573
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-slate-50 border border-slate-200 app-card-surface">
                  <Compass className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-bold text-slate-900 text-xs sm:text-sm">4. หลักเกณฑ์และตัวชี้วัดทางการ (1 - 34)</h4>
                    <p className="text-[11px] text-slate-500 leading-relaxed mt-0.5">
                      นิยามและสูตรการคำนวณตัวชี้วัดเป้าหมายทั้ง 34 ข้ออย่างละเอียด
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Section 7: AI & Offline */}
          {activeSection === "ai-offline" && (
            <div className="space-y-6 fade-in" id="content-ai-offline">
              <div className="space-y-2">
                <h2 className="text-base sm:text-lg md:text-xl font-black text-slate-900 flex items-center gap-2">
                  <span className="w-8 h-8 rounded-lg bg-pink-50 text-pink-600 flex items-center justify-center font-bold text-sm shrink-0">7</span>
                  <span>ผู้ช่วยอัจฉริยะ AI (Gemini) & ระบบออฟไลน์</span>
                </h2>
                <div className="h-0.5 w-20 bg-pink-600 rounded-full"></div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="border border-pink-100 p-4 rounded-2xl bg-pink-50/40 space-y-2 app-card-surface">
                  <div className="w-8 h-8 rounded-xl bg-pink-100 text-pink-700 flex items-center justify-center font-bold">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <h3 className="font-bold text-slate-900 text-xs sm:text-sm">ผู้ช่วยอัจฉริยะ AI กพด.5</h3>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    ขัดเกลาบทสรุปผู้บริหาร วิเคราะห์ภาวะโภชนาการ และแนะนำแนวทางแก้ปัญหาภัยแล้งในโรงเรียนชายแดนผ่าน Google Gemini API
                  </p>
                </div>

                <div className="border border-sky-100 p-4 rounded-2xl bg-sky-50/40 space-y-2 app-card-surface">
                  <div className="w-8 h-8 rounded-xl bg-sky-100 text-sky-700 flex items-center justify-center font-bold">
                    <CloudLightning className="w-4 h-4" />
                  </div>
                  <h3 className="font-bold text-slate-900 text-xs sm:text-sm">ระบบออฟไลน์ (Offline-First)</h3>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    บันทึกร่างข้อมูลใน LocalStorage แม้ไม่มีสัญญาณเน็ต พร้อมระบบตรวจจับเครือข่ายและปุ่มจำลองการส่งซิงค์ข้อมูลอัตโนมัติ
                  </p>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Decorative Footer */}
      <div className="bg-slate-100 p-3.5 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-[10px] sm:text-[11px] text-slate-500 font-semibold uppercase tracking-wider">
        <div className="flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-indigo-600" />
          <span>ระบบติดตามผลแผน กพด.5 • บก.ตชด.ภาค 2 (Active Board Manual)</span>
        </div>
        <div>
          <span>จัดทำโดยคณะนักวิเคราะห์สถิติและวิศวกรรมสถาปัตยกรรมระบบอัจฉริยะ</span>
        </div>
      </div>
    </div>
  );
}
