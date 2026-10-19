import React, { useState, useEffect } from "react";
import { safeLocalStorage } from "../lib/storage";
import {
  Calendar,
  CheckSquare,
  Clock,
  FileText,
  Filter,
  Search,
  Printer,
  Sparkles,
  AlertCircle,
  CalendarCheck,
  Bookmark,
  RotateCcw,
  BookOpen,
  Send,
  ChevronRight,
  Info,
  CheckCircle2,
  ListTodo,
  Target,
  HeartPulse,
  GraduationCap,
  Award,
  Briefcase,
  Trees,
  Landmark,
  Users,
  Building2,
  ImageIcon,
  Maximize2,
  Eye,
  Download,
  ExternalLink,
  Layers,
  X,
  ZoomIn,
  Upload,
  CheckCircle
} from "lucide-react";

export default function SchoolCalendarGuide() {
  const [activeTab, setActiveTab] = useState<"infographic" | "roles" | "timeline" | "reports">("infographic");
  const [selectedGoalId, setSelectedGoalId] = useState<number | "all">("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedReportGroup, setSelectedReportGroup] = useState<string>("all");

  // Lightbox modal state for viewing full-size Infographic image
  const [lightboxImage, setLightboxImage] = useState<{
    url: string;
    title: string;
    subtitle: string;
    description: string;
    deadlines: { date: string; label: string; bg: string }[];
  } | null>(null);

  // Default Infographic Image URLs from user's Google Drive links
  const DEFAULT_INFOGRAPHIC_1 = "https://drive.google.com/thumbnail?id=1fTsCAmy3dT7QJpoQO57Grm8jbktmI0x3&sz=w2000";
  const DEFAULT_INFOGRAPHIC_2 = "https://drive.google.com/thumbnail?id=1Y-g6zhTnq1eYeFpS0m244jSKH2-EPdpv&sz=w2000";

  // Formatter to support Google Drive share links, direct links, or custom URLs
  const formatImageUrl = (rawUrl: string, defaultUrl: string) => {
    const url = (rawUrl && rawUrl.trim()) ? rawUrl.trim() : defaultUrl;
    const driveMatch = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/) || url.match(/id=([a-zA-Z0-9_-]+)/);
    if (driveMatch && driveMatch[1]) {
      return `https://drive.google.com/thumbnail?id=${driveMatch[1]}&sz=w2000`;
    }
    return url;
  };

  // Custom user image URLs stored in localStorage
  const [customInfographic1Url, setCustomInfographic1Url] = useState<string>(() => {
    return safeLocalStorage.getItem("kopodot_infographic_1_url") || "";
  });
  const [customInfographic2Url, setCustomInfographic2Url] = useState<string>(() => {
    return safeLocalStorage.getItem("kopodot_infographic_2_url") || "";
  });

  const img1Url = formatImageUrl(customInfographic1Url, DEFAULT_INFOGRAPHIC_1);
  const img2Url = formatImageUrl(customInfographic2Url, DEFAULT_INFOGRAPHIC_2);

  const saveCustomUrl = (key: "1" | "2", url: string) => {
    if (key === "1") {
      setCustomInfographic1Url(url);
      safeLocalStorage.setItem("kopodot_infographic_1_url", url);
    } else {
      setCustomInfographic2Url(url);
      safeLocalStorage.setItem("kopodot_infographic_2_url", url);
    }
  };

  // Interactive checklist state saved in localStorage
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>(() => {
    try {
      const saved = safeLocalStorage.getItem("kopodot_calendar_guide_checklist");
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  useEffect(() => {
    safeLocalStorage.setItem("kopodot_calendar_guide_checklist", JSON.stringify(checkedItems));
  }, [checkedItems]);

  const toggleCheck = (id: string) => {
    setCheckedItems((prev) => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const handleResetChecklist = () => {
    if (window.confirm("คุณต้องการรีเซ็ตสถานะเช็คลิสต์ทั้งหมดใช่หรือไม่?")) {
      setCheckedItems({});
    }
  };

  const handlePrint = () => {
    window.print();
  };

  // DATA 1: 8 Goals & Indicators (from Annual Roles)
  const goalsData = [
    {
      id: 1,
      title: "เป้าหมายหลักที่ ๑: การเสริมสร้างสุขภาพของเด็กตั้งแต่ในครรภ์มารดา",
      icon: HeartPulse,
      badgeColor: "bg-rose-100 text-rose-800 border-rose-200",
      accentBg: "from-rose-50 to-orange-50/30",
      iconBg: "bg-rose-600 text-white",
      indicators: "ตัวชี้วัดที่ ๑ - ๑๕",
      items: [
        {
          title: "การรวบรวมข้อมูลอนามัยแม่และเด็กในรอบปีงบประมาณ (ตัวชี้วัดที่ ๑ และ ๒)",
          ref: "อ้างอิงข้อ 3-5",
          form: "แบบรายงาน ๑๐๑",
          detail: "ครูผู้รับผิดชอบต้องประสานงานกับ อาสาสมัครสาธารณสุขประจำหมู่บ้าน (อสม.) และโรงพยาบาลส่งเสริมสุขภาพตำบล (รพ.สต.) เพื่อรวบรวมข้อมูลจำนวนหญิงตั้งครรภ์ การคลอด ทารกเกิดมีชีพ และการตายของทารกแรกเกิด (อายุต่ำกว่า 28 วัน) รวมถึงชั่งน้ำหนักเด็กแรกเกิดว่าน้อยกว่า 2,500 กรัมหรือไม่ โดยเก็บรวบรวมข้อมูลในช่วงวันที่ ๑ ตุลาคม ถึง ๓๐ กันยายน"
        },
        {
          title: "การสำรวจการเจริญเติบโตและพัฒนาการของเด็กแรกเกิดถึง ๓ ปี (ตัวชี้วัดที่ ๓, ๔, ๕)",
          ref: "อ้างอิงข้อ 6-11",
          form: "แบบรายงาน ๑๐๒",
          detail: "ครูผู้รับผิดชอบประสานงานกับ รพ.สต. เพื่อรวบรวมข้อมูลน้ำหนัก ส่วนสูง และพัฒนาการของเด็กแรกเกิดถึง 3 ปีทุกคนในเขตบริการ นำมาเทียบกับเกณฑ์มาตรฐานเจริญเติบโตขององค์การอนามัยโลก (WHO 2006) เพื่อตรวจหาภาวะน้ำหนักน้อยกว่าเกณฑ์ ภาวะเตี้ย และประเมินพัฒนาการสมวัย"
        },
        {
          title: "การเฝ้าระวังทางโภชนาการ (ตัวชี้วัดที่ ๖, ๗, ๘, ๙)",
          ref: "อ้างอิงข้อ 12-17",
          form: "แบบรายงาน ๑๐๓ ด, ๑๐๓ อ, ๑๐๓ ป, และ ๑๐๓ ม",
          detail: "ครูอนามัยและครูประจำชั้นต้องจัดกิจกรรมชั่งน้ำหนักและวัดส่วนสูงของเด็กเล็ก เด็กปฐมวัย (อนุบาล) นักเรียนประถมศึกษา และมัธยมศึกษาทุกคน นำมาเทียบเกณฑ์มาตรฐาน (WHO 2006 สำหรับเด็กไม่เกิน 5 ปี และเกณฑ์กรมอนามัย 2538 สำหรับเด็กอายุ 6 ปีขึ้นไป) เพื่อแปลผลภาวะโภชนาการ (น้ำหนักน้อยกว่าเกณฑ์ เตี้ย ผอม เริ่มอ้วนและอ้วน)"
        },
        {
          title: "การทดสอบสมรรถภาพทางกาย (ตัวชี้วัดที่ ๑๐)",
          ref: "อ้างอิงข้อ 18-20",
          form: "แบบรายงาน ๑๐๔",
          detail: "ครูพลศึกษาหรือครูประจำชั้นต้องดำเนินการทดสอบสมรรถภาพทางกายของนักเรียนทุกระดับชั้น (อนุบาล ประถม มัธยม) ตามตัวบ่งชี้และเกณฑ์มาตรฐานของกรมพลศึกษาตามช่วงอายุ (เช่น อายุ 4-6 ปี ทดสอบ 7 รายการ; อายุ 7-12 ปี และ 13-18 ปี ทดสอบ 7 รายการ) คิดคะแนนเฉลี่ยเป็นรายคน"
        },
        {
          title: "การตรวจภาวะคอพอก (ตัวชี้วัดที่ ๑๑)",
          ref: "อ้างอิงข้อ 21, 22",
          form: "แบบรายงาน ๑๐๕",
          detail: "ครูอนามัยต้องทำการตรวจคลำคอพอกให้กับนักเรียนประถมศึกษาทุกคน เพื่อจำแนกระดับอาการคอพอก (ระดับ 0 ปกติ, ระดับ 1 คลำพบแต่ไม่เห็น, ระดับ 2 มองเห็นได้ชัดเจน)"
        },
        {
          title: "การเฝ้าระวังโรคติดต่อมาลาเรีย (ตัวชี้วัดที่ ๑๒)",
          ref: "อ้างอิงข้อ 23, 24",
          form: "แบบรายงาน ๑๐๖",
          detail: "สำหรับสถานศึกษาในพื้นที่เสี่ยง 14 จังหวัด ครูผู้รับผิดชอบต้องรวบรวมข้อมูลนักเรียนที่ตรวจเลือดพบเชื้อและป่วยด้วยโรคไข้มาลาเรียรายใหม่จาก รพ.สต. หรือหน่วยงานสาธารณสุขในพื้นที่ แยกแยะเป็นรายเดือน"
        },
        {
          title: "การเฝ้าระวังโรคหนอนพยาธิ (ตัวชี้วัดที่ ๑๓)",
          ref: "อ้างอิงข้อ 25",
          form: "แบบรายงาน ๑๐๗",
          detail: "ครูอนามัยประสานขอข้อมูลผลการตรวจพยาธิของนักเรียนจากเจ้าหน้าที่สาธารณสุขที่เข้ามาตรวจในรอบปีการศึกษา เพื่อสรุปชนิดพยาธิและจำนวนที่พบ"
        },
        {
          title: "การประเมินพฤติกรรมการบริโภคอาหารและสุขนิสัย (ตัวชี้วัดที่ ๑๔ และ ๑๕)",
          ref: "อ้างอิงข้อ 26-29",
          form: "แบบรายงาน ๑๐๘",
          detail: "ครูผู้รับผิดชอบจัดทำแบบประเมินและทำการประเมินโดยสัมภาษณ์ร่วมกับสังเกตพฤติกรรมของนักเรียนเป็นรายคน (ประเมินพฤติกรรมการบริโภคพึงประสงค์ 8 ข้อ; สุขนิสัยพึงประสงค์ 12 ข้อ) สรุปจำนวนนักเรียนที่ผ่านเกณฑ์"
        }
      ]
    },
    {
      id: 2,
      title: "เป้าหมายหลักที่ ๒: การเพิ่มโอกาสทางการศึกษา",
      icon: GraduationCap,
      badgeColor: "bg-blue-100 text-blue-800 border-blue-200",
      accentBg: "from-blue-50 to-indigo-50/30",
      iconBg: "bg-blue-600 text-white",
      indicators: "ตัวชี้วัดที่ ๑๖ - ๒๐",
      items: [
        {
          title: "การติดตามการศึกษาต่อชั้น ม.๑ (ตัวชี้วัดที่ ๑๖)",
          ref: "อ้างอิงข้อ 30, 31",
          form: "แบบบันทึกข้อมูลพื้นฐาน กพด. ๐๐๑ (หัวข้อ ๗.๑)",
          detail: "ครูผู้รับผิดชอบทำการสำรวจนักเรียนที่จบการศึกษาชั้นประถมศึกษาปีที่ 6 ในปีการศึกษาที่ผ่านมาว่าได้เข้าเรียนต่อในชั้นมัธยมศึกษาปีที่ 1 ในปีการศึกษาปัจจุบันจำนวนกี่คน"
        },
        {
          title: "การดูแลและพัฒนาเด็กพิการ (ตัวชี้วัดที่ ๑๗)",
          ref: "อ้างอิงข้อ 32, 33",
          form: "แบบรายงาน ๒๐๑",
          detail: "ครูผู้รับผิดชอบทำการสำรวจเด็กพิการในโรงเรียน (จำแนกตามประเภทความพิการ 9 ประเภท) เพื่อติดตามว่าได้รับการจัดทำแผนการจัดการศึกษาเฉพาะบุคคล (IEP) และได้รับการศึกษาในรูปแบบที่เหมาะสมหรือไม่"
        },
        {
          title: "การติดตามนักเรียนในพระราชานุเคราะห์ (ตัวชี้วัดที่ ๑๘, ๑๙, ๒๐)",
          ref: "อ้างอิงข้อ 34-37",
          form: "ระเบียน ปพ.1 / แบบจิตอาสา / กพด. ๐๐๑",
          detail: "การเรียนต่อ: นักเรียนในพระราชานุเคราะห์ที่จบชั้น ม.3 และ ม.6 ในปีการศึกษาที่ผ่านมา ต้องบันทึกข้อมูลและส่งหลักฐานการศึกษาต่อ ได้แก่ ใบแจ้งผลจบการศึกษา, ระเบียนแสดงผลการเรียน ปพ. 1 และใบรับรองผลการสอบคัดเลือก\nการบำเพ็ญประโยชน์ (จิตอาสา): ต้องบำเพ็ญสาธารณประโยชน์อย่างน้อย ๘ ชั่วโมงต่อภาคเรียน (๑๖ ชั่วโมงต่อปีการศึกษา) และบันทึกลงในแบบบันทึกกิจกรรมนอกหลักสูตร"
        }
      ]
    },
    {
      id: 3,
      title: "เป้าหมายหลักที่ ๓: การเสริมสร้างศักยภาพของเด็กและเยาวชนทางวิชาการและทางจริยธรรม",
      icon: Award,
      badgeColor: "bg-indigo-100 text-indigo-800 border-indigo-200",
      accentBg: "from-indigo-50 to-indigo-50/30",
      iconBg: "bg-indigo-600 text-white",
      indicators: "ตัวชี้วัดที่ ๒๑ - ๒๖",
      items: [
        {
          title: "การรายงานผลสัมฤทธิ์ทางการเรียน (O-NET) (ตัวชี้วัดที่ ๒๑, ๒๒, ๒๓, ๒๔)",
          ref: "อ้างอิงข้อ 38",
          form: "แบบรายงาน ๓๐๑",
          detail: "ครูผู้รับผิดชอบเรียกดูรายงานผลคะแนน O-NET ในกลุ่มสาระวิชาภาษาไทย วิทยาศาสตร์ คณิตศาสตร์ และภาษาอังกฤษ ของนักเรียนชั้น ป.6, ม.3 และ ม.6 จากระบบ สทศ. (niets.or.th)"
        },
        {
          title: "การประเมินคุณธรรมและจริยธรรมนักเรียน (ตัวชี้วัดที่ ๒๕)",
          ref: "อ้างอิงข้อ 39, 40",
          form: "แบบรายงาน ๓๐๒",
          detail: "ครูประจำชั้นทำการสัมภาษณ์ร่วมกับสังเกตพฤติกรรมนักเรียนชั้น ป.6, ม.3 และ ม.6 เป็นรายคน ตามคุณลักษณะอันพึงประสงค์ 8 ข้อของหลักสูตรแกนกลางฯ 2551"
        },
        {
          title: "การประเมินทักษะการใช้เทคโนโลยีสารสนเทศ (ตัวชี้วัดที่ ๒๖)",
          ref: "อ้างอิงข้อ 41, 42",
          form: "แบบรายงาน ๓๐๓",
          detail: "ครูผู้รับผิดชอบประเมินทักษะไอที 4 ข้อของนักเรียนชั้น ป.6, ม.3 และ ม.6 เป็นรายคน โดยสังเกตการปฏิบัติ ชิ้นงาน หรือจากการทดสอบ สรุปลงในแบบรายงาน"
        }
      ]
    },
    {
      id: 4,
      title: "เป้าหมายหลักที่ ๔: การเสริมสร้างศักยภาพของเด็กและเยาวชนทางการงานอาชีพ",
      icon: Briefcase,
      badgeColor: "bg-purple-100 text-purple-800 border-purple-200",
      accentBg: "from-purple-50 to-pink-50/30",
      iconBg: "bg-purple-600 text-white",
      indicators: "ตัวชี้วัดที่ ๒๗ - ๒๙",
      items: [
        {
          title: "การจดบันทึกปริมาณผลผลิตทางการเกษตร (ตัวชี้วัดที่ ๒๗)",
          ref: "อ้างอิงข้อ 43-45",
          form: "แบบรายงาน ๔๐๑",
          detail: "ครูผู้รับผิดชอบต้องจดบันทึกปริมาณผลผลิตทางการเกษตรของโรงเรียนในแต่ละวันเรียน ที่นำออกจากฟาร์มเพื่อนำไปประกอบอาหารกลางวัน (แบ่งเป็นกลุ่มเนื้อสัตว์/ไข่/ปลา, ถั่วเมล็ดแห้ง, ผัก, ผลไม้ โดยบันทึกน้ำหนักเป็นกิโลกรัม ยกเว้นไข่บันทึกเป็นฟอง) รวบรวมข้อมูลรายเดือน"
        },
        {
          title: "การวัดผลสัมฤทธิ์วิชาเฉพาะของนักเรียน ป.๖ (ตัวชี้วัดที่ ๒๘, ๒๙)",
          ref: "อ้างอิงข้อ 46-51",
          form: "แบบรายงาน ๔๐๒, ๔๐๓",
          detail: "• วิชาเกษตร (ตัวชี้วัด ๒๘): ประเมินความรู้และทักษะ 5 ด้านย่อย (สอบวัดความรู้ 40 คะแนน และทักษะปฏิบัติ 60 คะแนน) [แบบ ๔๐๒]\n• วิชาชีพที่จำเป็นต่อการดำรงชีวิต (ตัวชี้วัด ๒๙): เลือกวิชาชีพพื้นฐาน 1-2 วิชาที่ถนัดที่สุด ประเมินผลสัมฤทธิ์ปลายปี (สอบความรู้ 40 คะแนน ทักษะ 60 คะแนน) [แบบ ๔๐๓]"
        }
      ]
    },
    {
      id: 5,
      title: "เป้าหมายหลักที่ ๕: การปลูกฝังจิตสำนึกและพัฒนาศักยภาพของเด็กและเยาวชนในการอนุรักษ์ทรัพยากรธรรมชาติและสิ่งแวดล้อม",
      icon: Trees,
      badgeColor: "bg-emerald-100 text-emerald-800 border-emerald-200",
      accentBg: "from-emerald-50 to-emerald-50/30",
      iconBg: "bg-emerald-600 text-white",
      indicators: "ตัวชี้วัดที่ ๓๑",
      items: [
        {
          title: "การวัดผลสัมฤทธิ์วิชาการอนุรักษ์ทรัพยากรธรรมชาติฯ ป.๖ (ตัวชี้วัดที่ ๓๑)",
          ref: "อ้างอิงข้อ 52-55",
          form: "แบบรายงาน ๕๐๑",
          detail: "ครูประเมินผลสัมฤทธิ์ปลายปีการศึกษาของนักเรียน ป.6 ในด้านความรู้พื้นฐานระบบนิเวศและพฤติกรรมการอนุรักษ์สิ่งแวดล้อม (สอบวัดความรู้ 40 คะแนน และพฤติกรรม 60 คะแนน)"
        }
      ]
    },
    {
      id: 6,
      title: "เป้าหมายหลักที่ ๖: การเสริมสร้างศักยภาพของเด็กและเยาวชนในการอนุรักษ์และสืบทอดวัฒนธรรมและภูมิปัญญาของท้องถิ่นและของชาติไทย",
      icon: Landmark,
      badgeColor: "bg-amber-100 text-amber-800 border-amber-200",
      accentBg: "from-amber-50 to-yellow-50/30",
      iconBg: "bg-amber-600 text-white",
      indicators: "ตัวชี้วัดที่ ๓๒",
      items: [
        {
          title: "การวัดผลสัมฤทธิ์วิชาวัฒนธรรมและภูมิปัญญาท้องถิ่น ป.๖ (ตัวชี้วัดที่ ๓๒)",
          ref: "อ้างอิงข้อ 56-58",
          form: "แบบรายงาน ๖๐๑",
          detail: "ครูประเมินผลสัมฤทธิ์ปลายปีการศึกษาของนักเรียน ป.6 ด้านประวัติ ความรู้ความเข้าใจ และการอนุรักษ์ภูมิปัญญา (สอบวัดความรู้ 40 คะแนน และทักษะ 60 คะแนน)"
        }
      ]
    },
    {
      id: 7,
      title: "เป้าหมายหลักที่ ๗: การขยายการพัฒนาจากโรงเรียนสู่ชุมชน",
      icon: Users,
      badgeColor: "bg-teal-100 text-teal-800 border-teal-200",
      accentBg: "from-teal-50 to-teal-50/30",
      iconBg: "bg-teal-600 text-white",
      indicators: "ตัวชี้วัดที่ ๓๐ และ ๓๓",
      items: [
        {
          title: "การวัดผลสัมฤทธิ์วิชาสหกรณ์ของนักเรียน ป.๖ (ตัวชี้วัดที่ ๓๐)",
          ref: "อ้างอิงข้อ 46-51",
          form: "แบบรายงาน ๔๐๔",
          detail: "• วิชาสหกรณ์ (ตัวชี้วัด ๓๐): ประเมินความรู้ ทักษะ และพฤติกรรมตามหลักสหกรณ์และการประเมินลักษณะนิสัย 2 ด้านหลัก (สอบความรู้ 40 คะแนน ทักษะ/พฤติกรรม 60 คะแนน) [แบบ ๔๐๔]"
        },
        {
          title: "การสำรวจข้อมูลการขยายกิจกรรมสู่ครัวเรือน (ตัวชี้วัดที่ ๓๓)",
          ref: "อ้างอิงข้อ 59, 60",
          form: "แบบบันทึกข้อมูลพื้นฐาน กพด. ๐๐๑ (หัวข้อ ๘)",
          detail: "ครูผู้รับผิดชอบสำรวจจำนวนครัวเรือนในเขตบริการที่ได้รับการขยายกิจกรรมการพัฒนาจากโรงเรียนสู่ชุมชน 4 ด้าน (เกษตร สุขภาพ วิชาชีพ/บัญชีครัวเรือน สหกรณ์ และอื่น ๆ)"
        }
      ]
    },
    {
      id: 8,
      title: "เป้าหมายหลักที่ ๘: การพัฒนาสถานศึกษาเป็นศูนย์บริการความรู้",
      icon: Building2,
      badgeColor: "bg-sky-100 text-sky-800 border-sky-200",
      accentBg: "from-sky-50 to-cyan-50/30",
      iconBg: "bg-sky-600 text-white",
      indicators: "ตัวชี้วัดที่ ๓๔",
      items: [
        {
          title: "การสำรวจประชาชนที่มาใช้แหล่งเรียนรู้ (ตัวชี้วัดที่ ๓๔)",
          ref: "อ้างอิงข้อ 61-63",
          form: "แบบบันทึกข้อมูลพื้นฐาน กพด. ๐๐๑ (หัวข้อ ๙)",
          detail: "ครูผู้รับผิดชอบสำรวจจำนวนครั้งและจำนวนประชาชนที่เข้ามาใช้แหล่งเรียนรู้ในโรงเรียนเกี่ยวกับกิจกรรมการเกษตร สุขภาพ อนามัย การฝึกอาชีพ หรือสหกรณ์ ในรอบปีการศึกษาที่ผ่านมา"
        }
      ]
    }
  ];

  // DATA 2: Academic Year Timeline
  const timelineData = [
    {
      month: "พฤษภาคม",
      tagColor: "bg-emerald-100 text-emerald-800 border-emerald-200",
      deadline: "-",
      deadlineBadge: "bg-slate-100 text-slate-600 border-slate-200",
      items: [
        {
          task: "จัดกิจกรรมชั่งน้ำหนัก/วัดส่วนสูง นักเรียนทุกคน (ครั้งที่ 1)",
          form: "แบบ ๑๐๓ (ด/อ/ป/ม)",
          ref: "อ้างอิงข้อ 15-17"
        },
        {
          task: "ทดสอบสมรรถภาพทางกาย นักเรียนทุกคน (ครั้งที่ 1)",
          form: "แบบ ๑๐๔",
          ref: "อ้างอิงข้อ 20"
        },
        {
          task: "ตรวจคอพอก นักเรียนประถมศึกษาทุกคน (ครั้งที่ 1)",
          form: "แบบ ๑๐๕",
          ref: "อ้างอิงข้อ 21, 22"
        },
        {
          task: "เริ่มบันทึกข้อมูลการเจ็บป่วยไข้มาลาเรียรายเดือน",
          form: "แบบ ๑๐๖",
          ref: "อ้างอิงข้อ 23"
        },
        {
          task: "เริ่มบันทึกปริมาณผลผลิตทางการเกษตรรายวัน (ครั้งที่ 1)",
          form: "แบบ ๔๐๑",
          ref: "อ้างอิงข้อ 44, 45"
        }
      ]
    },
    {
      month: "มิถุนายน",
      tagColor: "bg-blue-100 text-blue-800 border-blue-200",
      deadline: "ภายใน ๑๕ มิถุนายน",
      deadlineBadge: "bg-rose-100 text-rose-800 border-rose-300 font-extrabold",
      items: [
        {
          task: "รายงานผลรอบที่ 1: สรุปผลภาวะโภชนาการ, สมรรถภาพ และผลตรวจคอพอก",
          form: "แบบ ๑๐๓, ๑๐๔, ๑๐๕ (ครั้งที่ 1)",
          ref: "อ้างอิงข้อ 20, 22"
        },
        {
          task: "สำรวจและบันทึกการเรียนต่อชั้น ม.1 ของนักเรียนที่จบ ป.6",
          form: "แบบ กพด. ๐๐๑ (หัวข้อ ๗)",
          ref: "อ้างอิงข้อ 31, 64-66"
        },
        {
          task: "สำรวจครัวเรือนที่ได้รับการขยายกิจกรรมและประชาชนที่ใช้แหล่งเรียนรู้",
          form: "แบบ กพด. ๐๐๑ (หัวข้อ ๘, ๙)",
          ref: "อ้างอิงข้อ 60, 63"
        }
      ]
    },
    {
      month: "กรกฎาคม - กันยายน",
      tagColor: "bg-slate-100 text-slate-800 border-slate-200",
      deadline: "-",
      deadlineBadge: "bg-slate-100 text-slate-600 border-slate-200",
      items: [
        {
          task: "จดบันทึกข้อมูลผลผลิตการเกษตรรายวันอย่างต่อเนื่อง",
          form: "แบบ ๔๐๑",
          ref: "อ้างอิงข้อ 44, 45"
        },
        {
          task: "บันทึกข้อมูลการเจ็บป่วยไข้มาลาเรียประจำเดือน",
          form: "แบบ ๑๐๖",
          ref: "อ้างอิงข้อ 23"
        }
      ]
    },
    {
      month: "ตุลาคม",
      tagColor: "bg-amber-100 text-amber-800 border-amber-200",
      deadline: "ภายใน ๓๐ ตุลาคม",
      deadlineBadge: "bg-rose-100 text-rose-800 border-rose-300 font-extrabold",
      items: [
        {
          task: "สำรวจรวบรวมข้อมูลเด็กแรกเกิด - 3 ปี (น้ำหนัก, ส่วนสูง, พัฒนาการ)",
          form: "แบบ ๑๐๒",
          ref: "อ้างอิงข้อ 7, 9, 11, 68"
        },
        {
          task: "รวบรวมข้อมูลหญิงตั้งครรภ์/น้ำหนักแรกเกิดในรอบปีงบประมาณ (1 ต.ค. - 30 ก.ย.)",
          form: "แบบ ๑๐๑",
          ref: "อ้างอิงข้อ 3, 5, 68"
        },
        {
          task: "ส่งรายงานผลผลิตการเกษตร ช่วง พ.ค. - ก.ย. (ครั้งที่ 1)",
          form: "แบบ ๔๐๑ (ครั้งที่ 1)",
          ref: "อ้างอิงข้อ 45"
        },
        {
          task: "(เฉพาะปี 60, 64, 69) สำรวจและสรุปผลตรวจหนอนพยาธิจากสาธารณสุข",
          form: "แบบ ๑๐๗",
          ref: "อ้างอิงข้อ 25, 67"
        }
      ]
    },
    {
      month: "พฤศจิกายน",
      tagColor: "bg-indigo-100 text-indigo-800 border-indigo-200",
      deadline: "ภายใน ๓๐ พฤศจิกายน",
      deadlineBadge: "bg-amber-100 text-amber-800 border-amber-300 font-bold",
      items: [
        {
          task: "เริ่มบันทึกปริมาณผลผลิตทางการเกษตรรายวัน (ภาคเรียนที่ 2 / ครั้งที่ 2)",
          form: "แบบ ๔๐๑ (ครั้งที่ 2)",
          ref: "อ้างอิงข้อ 45"
        },
        {
          task: "นักเรียนในพระราชานุเคราะห์รายงานบำเพ็ญประโยชน์ (ภาคเรียนที่ 1)",
          form: "แบบจิตอาสา",
          ref: "อ้างอิงข้อ 37, 69"
        }
      ]
    },
    {
      month: "ธันวาคม - มกราคม",
      tagColor: "bg-slate-100 text-slate-800 border-slate-200",
      deadline: "-",
      deadlineBadge: "bg-slate-100 text-slate-600 border-slate-200",
      items: [
        {
          task: "จดบันทึกข้อมูลผลผลิตการเกษตรและโรคไข้มาลาเรียรายเดือน",
          form: "แบบ ๔๐๑, แบบ ๑๐๖",
          ref: "อ้างอิงข้อ 23, 45"
        }
      ]
    },
    {
      month: "กุมภาพันธ์",
      tagColor: "bg-purple-100 text-purple-800 border-purple-200",
      deadline: "-",
      deadlineBadge: "bg-slate-100 text-slate-600 border-slate-200",
      items: [
        {
          task: "จัดกิจกรรมชั่งน้ำหนัก/วัดส่วนสูง นักเรียนทุกคน (ครั้งที่ 2)",
          form: "แบบ ๑๐๓ (ด/อ/ป/ม)",
          ref: "อ้างอิงข้อ 15-17"
        },
        {
          task: "ทดสอบสมรรถภาพทางกาย นักเรียนทุกคน (ครั้งที่ 2)",
          form: "แบบ ๑๐๔",
          ref: "อ้างอิงข้อ 20"
        },
        {
          task: "ตรวจคอพอก นักเรียนประถมศึกษาทุกคน (ครั้งที่ 2)",
          form: "แบบ ๑๐๕",
          ref: "อ้างอิงข้อ 22"
        },
        {
          task: "สิ้นสุดการเก็บข้อมูลไข้มาลาเรียประจำเดือนของปีการศึกษา",
          form: "แบบ ๑๐๖",
          ref: "อ้างอิงข้อ 23"
        }
      ]
    },
    {
      month: "มีนาคม",
      tagColor: "bg-rose-100 text-rose-800 border-rose-200",
      deadline: "ภายใน ๑๕ มีนาคม",
      deadlineBadge: "bg-rose-100 text-rose-800 border-rose-300 font-extrabold",
      items: [
        {
          task: "รายงานผลรอบที่ 2: สรุปภาวะโภชนาการ, สมรรถภาพ, และผลตรวจคอพอก",
          form: "แบบ ๑๐๓, ๑๐๔, ๑๐๕ (ครั้งที่ 2)",
          ref: "อ้างอิงข้อ 20, 22, 64-66"
        },
        {
          task: "สรุปและรายงานผลผลิตทางการเกษตรช่วง พ.ย. - มี.ค.",
          form: "แบบ ๔๐๑ (ครั้งที่ 2)",
          ref: "อ้างอิงข้อ 45"
        },
        {
          task: "รายงานสรุปอัตราป่วยไข้มาลาเรียรายปีของสถานศึกษา",
          form: "แบบ ๑๐๖",

          ref: "อ้างอิงข้อ 24"
        },
        {
          task: "ประเมินสุขนิสัยและการบริโภคอาหารของนักเรียนทุกคน",
          form: "แบบ ๑๐๘",
          ref: "อ้างอิงข้อ 28, 29, 70"
        },
        {
          task: "สำรวจข้อมูลเด็กและเยาวชนพิการที่ได้รับแผน IEP",
          form: "แบบ ๒๐๑",
          ref: "อ้างอิงข้อ 33, 71"
        },
        {
          task: "ดึงข้อมูล O-NET และประเมินวิชาการ, จริยธรรม, ทักษะไอซีที (ป.6, ม.3, ม.6)",
          form: "แบบ ๓๐๑, ๓๐๒, ๓๐๓",
          ref: "อ้างอิงข้อ 38, 40, 42, 72-74"
        },
        {
          task: "ประเมินและรายงานคะแนนวิชาเกษตร, สหกรณ์, วิชาชีพ, สิ่งแวดล้อม, และวัฒนธรรมท้องถิ่น (ป.6)",
          form: "แบบ ๔๐๒, ๔๐๓, ๔๐๔, ๕๐๑, ๖๐๑",
          ref: "อ้างอิงข้อ 47, 49, 51, 55, 58, 75"
        }
      ]
    },
    {
      month: "เมษายน",
      tagColor: "bg-teal-100 text-teal-800 border-teal-200",
      deadline: "ตามกำหนดโครงการฯ",
      deadlineBadge: "bg-sky-100 text-sky-800 border-sky-300 font-bold",
      items: [
        {
          task: "นักเรียนในพระราชานุเคราะห์รายงานจบการศึกษาและส่งหลักฐานเรียนต่อ",
          form: "ใบ ปพ.1 / เอกสารมอบตัว",
          ref: "อ้างอิงข้อ 34, 35"
        },
        {
          task: "นักเรียนในพระราชานุเคราะห์รายงานบำเพ็ญประโยชน์ (ภาคเรียนที่ 2)",
          form: "แบบจิตอาสา",
          ref: "อ้างอิงข้อ 37"
        }
      ]
    }
  ];

  // DATA 3: Report-based Checklists (101-601 & กพด.001)
  const reportGroups = [
    {
      id: "g1",
      number: "๑",
      title: "กลุ่มอนามัยแม่และเด็ก และโภชนาการเด็กปฐมวัย",
      deadline: "จัดส่งภายใน ๓๐ ตุลาคม ของทุกปี",
      deadlineTag: "๓๐ ตุลาคม",
      badgeColor: "bg-pink-100 text-pink-800 border-pink-200",
      items: [
        {
          id: "rep-101",
          code: "แบบรายงาน ๑๐๑",
          indicator: "ตัวชี้วัดที่ ๑ และ ๒",
          title: "เก็บข้อมูลอนามัยแม่และเด็กในหมู่บ้านเขตบริการ",
          detail: "ประสาน อสม. และ รพ.สต. เพื่อรวบรวมจำนวนหญิงตั้งครรภ์ การคลอด ทารกเกิดมีชีพ การตายของทารกแรกเกิด และจำนวนทารกแรกเกิดที่มีน้ำหนักต่ำกว่า 2,500 กรัม (เก็บข้อมูลย้อนหลังรอบปีงบประมาณ ๑ ต.ค. - ๓๐ ก.ย.)",
          deadlineText: "จัดส่งภายใน ๓๐ ตุลาคม ของทุกปี",
          ref: "อ้างอิงข้อ 2-5"
        },
        {
          id: "rep-102",
          code: "แบบรายงาน ๑๐๒",
          indicator: "ตัวชี้วัดที่ ๓, ๔, ๕",
          title: "สำรวจและประเมินภาวะเจริญเติบโตของเด็กแรกเกิด - ๓ ปีในชุมชน",
          detail: "รวบรวมน้ำหนัก ส่วนสูง และสถานะพัฒนาการของเด็กอายุ 0-3 ปีทุกคนในหมู่บ้าน นำมาแปลผลเทียบมาตรฐาน WHO 2006",
          deadlineText: "จัดส่งภายใน ๓๐ ตุลาคม ของทุกปี",
          ref: "อ้างอิงข้อ 6-11"
        }
      ]
    },
    {
      id: "g2",
      number: "๒",
      title: "กลุ่มสุขภาวะและโภชนาการของนักเรียน",
      deadline: "ประเมินปีละ ๒ ครั้ง: พฤษภาคม และ กุมภาพันธ์",
      deadlineTag: "๑๕ มิ.ย. / ๑๕ มี.ค.",
      badgeColor: "bg-blue-100 text-blue-800 border-blue-200",
      items: [
        {
          id: "rep-103",
          code: "แบบรายงาน ๑๐๓ (ด/อ/ป/ม)",
          indicator: "ตัวชี้วัดที่ ๖, ๗, ๘, ๙",
          title: "เฝ้าระวังทางโภชนาการ ชั่งน้ำหนัก วัดส่วนสูง นักเรียนทุกคน",
          detail: "ประเมินและบันทึกภาวะโภชนาการ (น้ำหนักน้อย, เตี้ย, ผอม, เริ่มอ้วน, อ้วน) จำแนกตามระดับชั้น (ด=เด็กเล็ก, อ=อนุบาล, ป=ประถม, ม=มัธยม)",
          deadlineText: "รายงานรอบที่ 1 ภายใน 15 มิ.ย. / รอบที่ 2 ภายใน 15 มี.ค.",
          ref: "อ้างอิงข้อ 12-17"
        },
        {
          id: "rep-104",
          code: "แบบรายงาน ๑๐๔",
          indicator: "ตัวชี้วัดที่ ๑๐",
          title: "ทดสอบสมรรถภาพทางกายของนักเรียนทุกระดับชั้น",
          detail: "ทดสอบ 7 รายการตามเกณฑ์กรมพลศึกษา คิดคะแนนเฉลี่ยเป็นรายคนเพื่อวัดความแข็งแรงและสมรรถภาพ",
          deadlineText: "รายงานรอบที่ 1 ภายใน 15 มิ.ย. / รอบที่ 2 ภายใน 15 มี.ค.",
          ref: "อ้างอิงข้อ 18-20"
        },
        {
          id: "rep-105",
          code: "แบบรายงาน ๑๐๕",
          indicator: "ตัวชี้วัดที่ ๑๑",
          title: "ตรวจคลำภาวะคอพอกในนักเรียนประถมศึกษาทุกคน",
          detail: "จำแนกระดับคอพอก (ระดับ 0=ปกติ, 1=คลำพบ, 2=มองเห็นชัด) เพื่อป้องกันโรคขาดสารไอโอดีน",
          deadlineText: "รายงานรอบที่ 1 ภายใน 15 มิ.ย. / รอบที่ 2 ภายใน 15 มี.ค.",
          ref: "อ้างอิงข้อ 21-22"
        },
        {
          id: "rep-106",
          code: "แบบรายงาน ๑๐๖",
          indicator: "ตัวชี้วัดที่ ๑๒",
          title: "เฝ้าระวังและบันทึกผู้ป่วยไข้มาลาเรียรายเดือน (เฉพาะพื้นที่เสี่ยง)",
          detail: "เก็บข้อมูลนักเรียนที่ป่วยด้วยโรคมาลาเรียรายใหม่เป็นประจำทุกเดือน สรุปรวมรายปีสิ้นสุดเดือนกุมภาพันธ์",
          deadlineText: "จัดส่งรายงานสรุปรายปี ภายใน ๑๕ มีนาคม",
          ref: "อ้างอิงข้อ 23-24"
        },
        {
          id: "rep-107",
          code: "แบบรายงาน ๑๐๗",
          indicator: "ตัวชี้วัดที่ ๑๓",
          title: "รายงานผลการตรวจโรคหนอนพยาธิในนักเรียน",
          detail: "ประสานเจ้าหน้าที่สาธารณสุขเพื่อสรุปชนิดพยาธิและอัตราการติดเชื้อพยาธิในโรงเรียน (สำรวจในปี 2560, 2564, 2569)",
          deadlineText: "จัดส่งภายใน ๓๐ ตุลาคม ของปีที่มีการสำรวจ",
          ref: "อ้างอิงข้อ 25"
        },
        {
          id: "rep-108",
          code: "แบบรายงาน ๑๐๘",
          indicator: "ตัวชี้วัดที่ ๑๔ และ ๑๕",
          title: "ประเมินพฤติกรรมการบริโภคอาหารและสุขนิสัยของนักเรียน",
          detail: "ประเมินพฤติกรรมบริโภคพึงประสงค์ 8 ข้อ และสุขนิสัยพึงประสงค์ 12 ข้อเป็นรายบุคคล",
          deadlineText: "จัดส่งรายงานสรุปปลายปี ภายใน ๑๕ มีนาคม",
          ref: "อ้างอิงข้อ 26-29"
        }
      ]
    },
    {
      id: "g3",
      number: "๓",
      title: "กลุ่มโอกาสทางการศึกษาและกลุ่มเป้าหมายพิเศษ",
      deadline: "ประเมินและรายงานช่วงปลายปีการศึกษา",
      deadlineTag: "๑๕ มีนาคม / ๑๕ มิถุนายน",
      badgeColor: "bg-purple-100 text-purple-800 border-purple-200",
      items: [
        {
          id: "rep-201",
          code: "แบบรายงาน ๒๐๑",
          indicator: "ตัวชี้วัดที่ ๑๗",
          title: "สำรวจและติดตามการจัดทำแผน IEP สำหรับนักเรียนพิการ",
          detail: "จำแนกเด็กพิการ 9 ประเภท ตรวจสอบว่าได้รับการจัดทำแผนการจัดการศึกษาเฉพาะบุคคล (IEP) และได้รับการดูแลอย่างเหมาะสมหรือไม่",
          deadlineText: "จัดส่งรายงานสรุปปลายปี ภายใน ๑๕ มีนาคม",
          ref: "อ้างอิงข้อ 32-33"
        },
        {
          id: "rep-001-sec7",
          code: "กพด. ๐๐๑ (หัวข้อ ๗)",
          indicator: "ตัวชี้วัดที่ ๑๖, ๑๘-๒๐",
          title: "ติดตามการเข้าเรียนต่อ ม.1 และติดตามนักเรียนในพระราชานุเคราะห์",
          detail: "สำรวจนักเรียน ป.6 ที่เข้าเรียนต่อ ม.1 และติดตามการศึกษาต่อ/การจิตอาสาบำเพ็ญประโยชน์ของนักเรียนในพระราชานุเคราะห์",
          deadlineText: "ส่งข้อมูลการเรียนต่อ ม.1 ภายใน ๑๕ มิถุนายน",
          ref: "อ้างอิงข้อ 30-37"
        }
      ]
    },
    {
      id: "g4",
      number: "๔",
      title: "กลุ่มผลสัมฤทธิ์ทางวิชาการและคุณธรรมจริยธรรม",
      deadline: "ประเมินเมื่อจบปีการศึกษา",
      deadlineTag: "๑๕ มีนาคม",
      badgeColor: "bg-amber-100 text-amber-800 border-amber-200",
      items: [
        {
          id: "rep-301",
          code: "แบบรายงาน ๓๐๑",
          indicator: "ตัวชี้วัดที่ ๒๑-๒๔",
          title: "รวบรวมรายงานผลคะแนนสอบ O-NET (ป.6, ม.3, ม.6)",
          detail: "ดึงคะแนนเฉลี่ยระดับโรงเรียน 4 วิชาหลัก (ภาษาไทย, วิทยาศาสตร์, คณิตศาสตร์, ภาษาอังกฤษ) จากระบบ สทศ.",
          deadlineText: "จัดส่งทันทีหลัง สทศ. ประกาศผล หรือภายใน ๑๕ มีนาคม",
          ref: "อ้างอิงข้อ 38"
        },
        {
          id: "rep-302",
          code: "แบบรายงาน ๓๐๒",
          indicator: "ตัวชี้วัดที่ ๒๕",
          title: "ประเมินคุณลักษณะอันพึงประสงค์ 8 ประการของนักเรียนจบชั้น",
          detail: "สัมภาษณ์และสังเกตพฤติกรรมนักเรียนชั้น ป.6, ม.3, ม.6 ตามเกณฑ์คุณธรรมจริยธรรม 8 ข้อ",
          deadlineText: "จัดส่งรายงานสรุปปลายปี ภายใน ๑๕ มีนาคม",
          ref: "อ้างอิงข้อ 39-40"
        },
        {
          id: "rep-303",
          code: "แบบรายงาน ๓٠๓",
          indicator: "ตัวชี้วัดที่ ๒๖",
          title: "ประเมินทักษะการใช้เทคโนโลยีสารสนเทศ (ICT)",
          detail: "ประเมินทักษะไอที 4 ข้อของนักเรียนจบชั้น ป.6, ม.3, ม.6 ผ่านการทดสอบหรือการปฏิบัติงานจริง",
          deadlineText: "จัดส่งรายงานสรุปปลายปี ภายใน ๑๕ มีนาคม",
          ref: "อ้างอิงข้อ 41-42"
        }
      ]
    },
    {
      id: "g5",
      number: "๕",
      title: "กลุ่มทักษะการงานอาชีพ เกษตร สหกรณ์ และสิ่งแวดล้อม",
      deadline: "บันทึกรายวัน / รายงานปีละ 2 ครั้ง และปลายปี",
      deadlineTag: "๓๐ ต.ค. / ๑๕ มี.ค.",
      badgeColor: "bg-emerald-100 text-emerald-800 border-emerald-200",
      items: [
        {
          id: "rep-401",
          code: "แบบรายงาน ๔๐๑",
          indicator: "ตัวชี้วัดที่ ๒๗",
          title: "บันทึกปริมาณผลผลิตทางการเกษตรรายวันเพื่ออาหารกลางวัน",
          detail: "จดบันทึกน้ำหนักผลผลิตจากฟาร์ม (เนื้อสัตว์, ถั่ว, ผัก, ผลไม้ เป็น kg / ไข่ เป็นฟอง) รวบรวมส่งรายงานปีละ 2 ครั้ง",
          deadlineText: "ครั้งที่ 1 ภายใน 30 ต.ค. / ครั้งที่ 2 ภายใน 15 มี.ค.",
          ref: "อ้างอิงข้อ 43-45"
        },
        {
          id: "rep-402",
          code: "แบบรายงาน ๔๐๒",
          indicator: "ตัวชี้วัดที่ ๒๘",
          title: "ประเมินผลสัมฤทธิ์วิชาเกษตร ของนักเรียน ป.๖",
          detail: "ประเมินความรู้ 40 คะแนน และทักษะปฏิบัติงานเกษตร 5 ด้านย่อย 60 คะแนน รวม 100 คะแนน",
          deadlineText: "จัดส่งรายงานสรุปปลายปี ภายใน ๑๕ มีนาคม",
          ref: "อ้างอิงข้อ 46-47"
        },
        {
          id: "rep-403",
          code: "แบบรายงาน ๔๐๓",
          indicator: "ตัวชี้วัดที่ ๒๙",
          title: "ประเมินผลสัมฤทธิ์วิชาชีพที่จำเป็นต่อการดำรงชีวิต ป.๖",
          detail: "เลือกวิชาชีพพื้นฐานที่โรงเรียนสอน 1-2 วิชา ประเมินความรู้ 40 คะแนน และทักษะปฏิบัติ 60 คะแนน",
          deadlineText: "จัดส่งรายงานสรุปปลายปี ภายใน ๑๕ มีนาคม",
          ref: "อ้างอิงข้อ 48-49"
        },
        {
          id: "rep-404",
          code: "แบบรายงาน ๔๐๔",
          indicator: "ตัวชี้วัดที่ ๓๐",
          title: "ประเมินผลสัมฤทธิ์วิชาการสหกรณ์ นักเรียน ป.๖",
          detail: "ประเมินความรู้หลักการสหกรณ์ 40 คะแนน และทักษะ/ลักษณะนิสัยประหยัดออม 60 คะแนน",
          deadlineText: "จัดส่งรายงานสรุปปลายปี ภายใน ๑๕ มีนาคม",
          ref: "อ้างอิงข้อ 50-51"
        },
        {
          id: "rep-501",
          code: "แบบรายงาน ๕๐๑",
          indicator: "ตัวชี้วัดที่ ๓๑",
          title: "ประเมินผลสัมฤทธิ์วิชาการอนุรักษ์ทรัพยากรธรรมชาติ ป.๖",
          detail: "ประเมินความรู้ระบบนิเวศ 40 คะแนน และพฤติกรรมการอนุรักษ์สิ่งแวดล้อม 60 คะแนน",
          deadlineText: "จัดส่งรายงานสรุปปลายปี ภายใน ๑๕ มีนาคม",
          ref: "อ้างอิงข้อ 52-55"
        },
        {
          id: "rep-601",
          code: "แบบรายงาน ๖๐๑",
          indicator: "ตัวชี้วัดที่ ๓๒",
          title: "ประเมินผลสัมฤทธิ์วิชาวัฒนธรรมและภูมิปัญญาท้องถิ่น ป.๖",
          detail: "ประเมินความรู้ภูมิปัญญา 40 คะแนน และทักษะการสืบทอดวัฒนธรรมท้องถิ่น 60 คะแนน",
          deadlineText: "จัดส่งรายงานสรุปปลายปี ภายใน ๑๕ มีนาคม",
          ref: "อ้างอิงข้อ 56-58"
        }
      ]
    },
    {
      id: "g6",
      number: "๖",
      title: "กลุ่มการขยายผลสู่ชุมชนและศูนย์บริการความรู้",
      deadline: "สำรวจรวบรวมปลายปีการศึกษา",
      deadlineTag: "ภายใน ๑๕ มิถุนายน",
      badgeColor: "bg-indigo-100 text-indigo-800 border-indigo-200",
      items: [
        {
          id: "rep-001-sec8",
          code: "กพด. ๐๐๑ (หัวข้อ ๘)",
          indicator: "ตัวชี้วัดที่ ๓๓",
          title: "สำรวจครัวเรือนที่ได้รับการขยายกิจกรรมพัฒนาจากโรงเรียน",
          detail: "สำรวจจำนวนครัวเรือนในเขตบริการที่นำความรู้ด้านเกษตร สุขภาพ บัญชีครัวเรือน สหกรณ์ ไปปรับใช้ในบ้าน",
          deadlineText: "จัดส่งพร้อมแบบข้อมูลพื้นฐาน ภายใน ๑๕ มิถุนายน",
          ref: "อ้างอิงข้อ 59-60"
        },
        {
          id: "rep-001-sec9",
          code: "กพด. ๐๐๑ (หัวข้อ ๙)",
          indicator: "ตัวชี้วัดที่ ๓๔",
          title: "สำรวจประชาชนที่เข้ามาใช้แหล่งเรียนรู้ในโรงเรียน",
          detail: "บันทึกจำนวนครั้งและจำนวนประชาชนที่เข้ามาศึกษาดูงานหรือฝึกอบรมอาชีพในศูนย์บริการความรู้ของโรงเรียน",
          deadlineText: "จัดส่งพร้อมแบบข้อมูลพื้นฐาน ภายใน ๑๕ มิถุนายน",
          ref: "อ้างอิงข้อ 61-63"
        }
      ]
    }
  ];

  // Total counts for checklists
  const allReportIds = reportGroups.flatMap(g => g.items.map(i => i.id));
  const checkedReportCount = allReportIds.filter(id => checkedItems[id]).length;

  return (
    <div className="w-full max-w-7xl mx-auto px-3 sm:px-6 py-5 space-y-4">
      {/* Main Tab Navigation Bar & Action Bar */}
      <div className="bg-white p-3 rounded-2xl border border-slate-200/90 shadow-2xs space-y-2.5">
        {/* บรรทัดที่ ๑: แท็บเมนูหลัก 4 เมนู */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-1.5">
          <button
            onClick={() => setActiveTab("infographic")}
            className={`flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer border text-center ${
              activeTab === "infographic"
                ? "bg-gradient-to-r from-blue-700 to-indigo-800 text-white border-blue-800 shadow-xs"
                : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
            }`}
          >
            <ImageIcon className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span className="truncate">ภาพรวมปฏิทินแบบ Infographic</span>
          </button>

          <button
            onClick={() => setActiveTab("roles")}
            className={`flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer border text-center ${
              activeTab === "roles"
                ? "bg-blue-600 text-white border-blue-700 shadow-xs"
                : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
            }`}
          >
            <Target className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span className="truncate">๑. บทบาทและกิจกรรมตาม ๘ เป้าหมายหลัก</span>
          </button>

          <button
            onClick={() => setActiveTab("timeline")}
            className={`flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer border text-center ${
              activeTab === "timeline"
                ? "bg-blue-600 text-white border-blue-700 shadow-xs"
                : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
            }`}
          >
            <Calendar className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span className="truncate">๒. ปฏิทินปฏิบัติงานและรายงานผล ๑ ปีการศึกษา</span>
          </button>

          <button
            onClick={() => setActiveTab("reports")}
            className={`flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer border text-center ${
              activeTab === "reports"
                ? "bg-blue-600 text-white border-blue-700 shadow-xs"
                : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
            }`}
          >
            <CheckSquare className="w-3.5 h-3.5 text-purple-400 shrink-0" />
            <span className="truncate">๓. เช็คลิสต์จำแนกตามแบบรายงาน (๑๐๑-๖๐๑)</span>
          </button>
        </div>

        {/* บรรทัดที่ ๒: ช่องค้นหาอัจฉริยะ + ปุ่มคำสั่งลัด */}
        <div className="pt-2 border-t border-slate-100 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="ค้นหากิจกรรม, ตัวชี้วัด (34 ตัวชี้วัด), หรือแบบรายงาน (101-601)..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-8 pr-8 py-1.5 text-xs rounded-xl border border-slate-200 bg-slate-50/90 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-medium transition"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm("")}
                className="absolute right-2.5 top-2 text-xs text-slate-400 hover:text-slate-600 font-bold bg-slate-200/60 w-4 h-4 rounded-full flex items-center justify-center"
              >
                ✕
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0 justify-end">
            <button
              onClick={handleResetChecklist}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition border border-slate-200 cursor-pointer active:scale-95 shadow-2xs"
              title="รีเซ็ตสถานะเช็คลิสต์ที่บันทึกไว้"
            >
              <RotateCcw className="w-3.5 h-3.5 text-amber-600" />
              <span>รีเซ็ตเช็คลิสต์</span>
            </button>

            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-extrabold transition shadow-2xs cursor-pointer active:scale-95"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>พิมพ์ / บันทึก PDF</span>
            </button>
          </div>
        </div>
      </div>

      {/* SECTION 0: INFOGRAPHIC OVERVIEW */}
      {activeTab === "infographic" && (
        <div className="space-y-5 animate-in fade-in duration-300">
          
          {/* Top Banner Notice */}
          <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white p-4 sm:p-5 rounded-2xl shadow-md border border-blue-800/80 flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="space-y-1">
              <div className="inline-flex items-center gap-1.5 bg-blue-500/20 text-blue-200 border border-blue-400/30 px-2 py-0.5 rounded-full text-[10.5px] font-bold">
                <ImageIcon className="w-3 h-3 text-amber-300" />
                <span>คู่มือภาพรวม กพด. รูปแบบ Infographic แบบโต้ตอบ</span>
              </div>
              <h2 className="text-sm sm:text-base font-extrabold text-white">
                ปฏิทินสรุปภาระงานและกำหนดเวลาส่งรายงานโครงการ กพด. (Infographic Roadmap)
              </h2>
              <p className="text-xs text-blue-100 font-normal max-w-3xl leading-relaxed">
                ภาพสรุปการทำงานตลอดปีการศึกษาสำหรับครูผู้ปฏิบัติงาน โรงเรียน ตชด. และสถานศึกษาในโครงการพระราชดำริ คลิกที่รูปภาพเพื่อขยายใหญ่ ดูรายละเอียด และดาวน์โหลด
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setLightboxImage({
                  url: img1Url,
                  title: "ปฏิทินเช็คลิสต์ภาระงาน กพด. สำหรับสถานศึกษา",
                  subtitle: "คู่มือการดำเนินงานตลอดปีการศึกษา (กำหนดเวลาส่งรายงาน)",
                  description: "แสดงเส้นทางการดำเนินงานตลอดปีการศึกษา ตั้งแต่ช่วงเปิดภาคเรียนที่ 1, กลางปี, ปลายปีการศึกษา และวันสิ้นสุดปีการศึกษา พร้อมกำหนดส่งรายงาน (Deadline)",
                  deadlines: [
                    { date: "15 มิถุนายน", label: "รายงานชุดที่ 1 (103, 104, 105, 001)", bg: "bg-amber-500" },
                    { date: "30 ตุลาคม", label: "รายงานชุดที่ 2 (101, 102, 401, 107)", bg: "bg-emerald-500" },
                    { date: "30 พฤศจิกายน", label: "ส่งจิตอาสา เทอม 1", bg: "bg-orange-500" },
                    { date: "15 มีนาคม", label: "รายงานชุดใหญ่ (103-108, 201, 301-303, 401)", bg: "bg-purple-600" },
                    { date: "20 & 30 เมษายน", label: "ส่งต่อทุน ปพ.1 & จิตอาสา เทอม 2", bg: "bg-blue-600" }
                  ]
                })}
                className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs rounded-xl transition flex items-center gap-1.5 shadow-sm cursor-pointer"
              >
                <Maximize2 className="w-3.5 h-3.5" />
                <span>ขยายภาพปฏิทินเต็มจอ</span>
              </button>
            </div>
          </div>

          {/* Grid of 2 Key Infographic Posters */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

            {/* Poster Card 1: Checklist Timeline */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden flex flex-col group hover:border-indigo-300 transition duration-200">
              <div className="px-4 py-3 bg-slate-900 text-white flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-indigo-500/20 text-indigo-300 rounded-xl">
                    <Calendar className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs sm:text-sm font-bold text-white">ปฏิทินเช็คลิสต์ภาระงาน กพด. สำหรับสถานศึกษา</h3>
                    <p className="text-[10.5px] text-slate-300">คู่มือการดำเนินงานตลอดปีการศึกษา และวันสิ้นสุดการส่งรายงาน</p>
                  </div>
                </div>
                <span className="text-[9.5px] font-bold bg-indigo-600 text-white px-2 py-0.5 rounded-full border border-indigo-400/40 shrink-0">
                  Infographic 1
                </span>
              </div>

              {/* Poster Image Container */}
              <div 
                onClick={() => setLightboxImage({
                  url: img1Url,
                  title: "ปฏิทินเช็คลิสต์ภาระงาน กพด. สำหรับสถานศึกษา",
                  subtitle: "คู่มือการดำเนินงานตลอดปีการศึกษา",
                  description: "สรุปขั้นตอนการทำงานรายเดือนและวันกำหนดส่งรายงานหลัก (15 มิ.ย., 30 ต.ค., 30 พ.ย., 15 มี.ค., 20 & 30 เม.ย.)",
                  deadlines: [
                    { date: "15 มิถุนายน", label: "รายงานชุดที่ 1 (103, 104, 105, 001)", bg: "bg-amber-500" },
                    { date: "30 ตุลาคม", label: "รายงานชุดที่ 2 (101, 102, 401, 107)", bg: "bg-emerald-500" },
                    { date: "15 มีนาคม", label: "รายงานชุดใหญ่ (103-108, 201, 301-303, 401)", bg: "bg-purple-600" },
                    { date: "20 & 30 เมษายน", label: "ติดตามนักเรียนทุนฯ ปพ.1 & จิตอาสา เทอม 2", bg: "bg-blue-600" }
                  ]
                })}
                className="relative bg-slate-950 h-80 sm:h-96 w-full cursor-pointer overflow-hidden group/img flex items-center justify-center p-2"
              >
                {/* Visual Graphic Representation / Image */}
                <img
                  src={img1Url}
                  alt="ปฏิทินเช็คลิสต์ภาระงาน กพด."
                  referrerPolicy="no-referrer"
                  className="max-h-full max-w-full object-contain transition duration-300 group-hover/img:scale-102 rounded-lg"
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />

                {/* Hover Overlay Prompt */}
                <div className="absolute inset-0 bg-slate-950/60 opacity-0 group-hover/img:opacity-100 transition duration-200 flex flex-col items-center justify-center p-4 text-center">
                  <div className="w-10 h-10 rounded-full bg-indigo-600 text-white flex items-center justify-center shadow-lg mb-2 border border-indigo-400">
                    <Maximize2 className="w-5 h-5 animate-pulse" />
                  </div>
                  <span className="text-white font-bold text-xs">คลิกเพื่อขยายดูภาพโปสเตอร์ความละเอียดสูง</span>
                  <span className="text-indigo-200 text-[11px] mt-0.5">ขยายใหญ่เต็มจอ (Zoom Lightbox)</span>
                </div>

                <div className="absolute bottom-2.5 left-2.5 right-2.5 bg-slate-900/90 backdrop-blur-xs border border-slate-700/80 p-2 rounded-xl flex items-center justify-between text-[11px] text-white">
                  <span className="font-semibold flex items-center gap-1.5">
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                    <span>ภาระงาน 4 ช่วงเวลาตลอดปีการศึกษา</span>
                  </span>
                  <span className="text-indigo-300 font-bold underline flex items-center gap-1">
                    <Eye className="w-3 h-3" />
                    <span>คลิกเพื่อเปิด</span>
                  </span>
                </div>
              </div>

              {/* Summary Deadlines Breakdown */}
              <div className="p-3.5 bg-slate-50 border-t border-slate-200 space-y-2.5 flex-1 flex flex-col justify-between">
                <div>
                  <h4 className="text-[11px] font-bold text-slate-800 uppercase tracking-wider mb-1.5">
                    กำหนดเวลาส่งรายงานสำคัญในโปสเตอร์ (Deadlines):
                  </h4>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="p-2 bg-amber-50 rounded-xl border border-amber-200">
                      <span className="font-bold text-amber-900 block text-xs">15 มิถุนายน</span>
                      <span className="text-[10.5px] text-amber-700">แบบ 103, 104, 105, 001</span>
                    </div>
                    <div className="p-2 bg-emerald-50 rounded-xl border border-emerald-200">
                      <span className="font-bold text-emerald-900 block text-xs">30 ตุลาคม</span>
                      <span className="text-[10.5px] text-emerald-700">แบบ 101, 102, 401, 107</span>
                    </div>
                    <div className="p-2 bg-purple-50 rounded-xl border border-purple-200">
                      <span className="font-bold text-purple-900 block text-xs">15 มีนาคม</span>
                      <span className="text-[10.5px] text-purple-700">แบบ 103-108, 201, 301, 401</span>
                    </div>
                    <div className="p-2 bg-blue-50 rounded-xl border border-blue-200">
                      <span className="font-bold text-blue-900 block text-xs">20 & 30 เมษายน</span>
                      <span className="text-[10.5px] text-blue-700">ส่งต่อ ปพ.1 & จิตอาสา</span>
                    </div>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-xs">
                  <span className="text-slate-500 font-normal text-[11px]">รูปภาพปฏิทินที่ 1</span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setLightboxImage({
                        url: img1Url,
                        title: "ปฏิทินเช็คลิสต์ภาระงาน กพด. สำหรับสถานศึกษา",
                        subtitle: "คู่มือการดำเนินงานตลอดปีการศึกษา",
                        description: "สรุปขั้นตอนการทำงานรายเดือนและวันกำหนดส่งรายงานหลัก",
                        deadlines: [
                          { date: "15 มิถุนายน", label: "รายงานชุดที่ 1", bg: "bg-amber-500" },
                          { date: "30 ตุลาคม", label: "รายงานชุดที่ 2", bg: "bg-emerald-500" },
                          { date: "15 มีนาคม", label: "รายงานชุดใหญ่", bg: "bg-purple-600" }
                        ]
                      })}
                      className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-lg transition flex items-center gap-1 cursor-pointer"
                    >
                      <ZoomIn className="w-3 h-3" />
                      <span>ขยายดูรูปภาพ</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Poster Card 2: 8 Goals Overview & Evaluation */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden flex flex-col group hover:border-indigo-300 transition duration-200">
              <div className="px-4 py-3 bg-slate-900 text-white flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-emerald-500/20 text-emerald-300 rounded-xl">
                    <Target className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs sm:text-sm font-bold text-white">คู่มือสรุปกิจกรรมและปฏิทินงาน กพด. ในรอบ ๑ ปี</h3>
                    <p className="text-[10.5px] text-slate-300">ภาพรวมบทบาท หน้าที่ กิจกรรมตามตัวชี้วัด และเกณฑ์การประเมิน ป.6</p>
                  </div>
                </div>
                <span className="text-[9.5px] font-bold bg-emerald-600 text-white px-2 py-0.5 rounded-full border border-emerald-400/40 shrink-0">
                  Infographic 2
                </span>
              </div>

              {/* Poster Image Container */}
              <div 
                onClick={() => setLightboxImage({
                  url: img2Url,
                  title: "คู่มือสรุปกิจกรรมและปฏิทินการทำงานโครงการ กพด. ในรอบ ๑ ปีการศึกษา",
                  subtitle: "ภาพรวมบทบาท หน้าที่ กิจกรรมตามตัวชี้วัด และเกณฑ์วัดผลสัมฤทธิ์ ป.6",
                  description: "แสดงการจำแนกงานตาม 8 เป้าหมายหลัก (โภชนาการ, โอกาสศึกษา, ทักษะวิชาการ, อนุรักษ์ทรัพยากร) และสัดส่วนการให้คะแนนวิชาเฉพาะของนักเรียนชั้น ป.6",
                  deadlines: [
                    { date: "พฤษภาคม - มิถุนายน", label: "เริ่มต้นปีการศึกษา ชั่งน้ำหนัก ตรวจคอพอก", bg: "bg-blue-600" },
                    { date: "ตุลาคม", label: "สรุปข้อมูลเด็กเล็ก & ผลผลิตเกษตร", bg: "bg-emerald-600" },
                    { date: "พฤศจิกายน - กุมภาพันธ์", label: "กิจกรรมภาคเรียนที่ 2 & จิตอาสา", bg: "bg-amber-600" },
                    { date: "มีนาคม", label: "สรุปผลสัมฤทธิ์ & ประเมินวิชาเฉพาะ ป.6", bg: "bg-purple-600" }
                  ]
                })}
                className="relative bg-slate-950 h-80 sm:h-96 w-full cursor-pointer overflow-hidden group/img flex items-center justify-center p-2"
              >
                <img
                  src={img2Url}
                  alt="คู่มือสรุปกิจกรรมและปฏิทินงาน กพด. ในรอบ ๑ ปี"
                  referrerPolicy="no-referrer"
                  className="max-h-full max-w-full object-contain transition duration-300 group-hover/img:scale-102 rounded-lg"
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />

                <div className="absolute inset-0 bg-slate-950/60 opacity-0 group-hover/img:opacity-100 transition duration-200 flex flex-col items-center justify-center p-4 text-center">
                  <div className="w-10 h-10 rounded-full bg-emerald-600 text-white flex items-center justify-center shadow-lg mb-2 border border-emerald-400">
                    <Maximize2 className="w-5 h-5 animate-pulse" />
                  </div>
                  <span className="text-white font-bold text-xs">คลิกเพื่อขยายดูภาพโปสเตอร์เป้าหมายและความสำเร็จ</span>
                  <span className="text-emerald-200 text-[11px] mt-0.5">ขยายใหญ่เต็มจอ (Zoom Lightbox)</span>
                </div>

                <div className="absolute bottom-2.5 left-2.5 right-2.5 bg-slate-900/90 backdrop-blur-xs border border-slate-700/80 p-2 rounded-xl flex items-center justify-between text-[11px] text-white">
                  <span className="font-semibold flex items-center gap-1.5">
                    <Award className="w-3.5 h-3.5 text-amber-400" />
                    <span>เกณฑ์ประเมิน 8 เป้าหมาย & สัดส่วน ป.6</span>
                  </span>
                  <span className="text-emerald-300 font-bold underline flex items-center gap-1">
                    <Eye className="w-3 h-3" />
                    <span>คลิกเพื่อเปิด</span>
                  </span>
                </div>
              </div>

              {/* Summary Goals Breakdown */}
              <div className="p-3.5 bg-slate-50 border-t border-slate-200 space-y-2.5 flex-1 flex flex-col justify-between">
                <div>
                  <h4 className="text-[11px] font-bold text-slate-800 uppercase tracking-wider mb-1.5">
                    องค์ประกอบสำคัญในแผนภาพ (Key Features):
                  </h4>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="p-2 bg-emerald-50 rounded-xl border border-emerald-200">
                      <span className="font-bold text-emerald-900 block text-xs">เป้าหมายที่ ๑ - ๒</span>
                      <span className="text-[10.5px] text-emerald-700">สุขภาพ โภชนาการ และโอกาสศึกษา</span>
                    </div>
                    <div className="p-2 bg-blue-50 rounded-xl border border-blue-200">
                      <span className="font-bold text-blue-900 block text-xs">เป้าหมายที่ ๓ - ๘</span>
                      <span className="text-[10.5px] text-blue-700">วิชาการ คุณธรรม อนุรักษ์ชุมชน</span>
                    </div>
                    <div className="p-2 bg-amber-50 rounded-xl border border-amber-200">
                      <span className="font-bold text-amber-900 block text-xs">เกณฑ์ประเมิน ป.6</span>
                      <span className="text-[10.5px] text-amber-700">ความรู้ 40% : ทักษะ/ปฏิบัติ 60%</span>
                    </div>
                    <div className="p-2 bg-purple-50 rounded-xl border border-purple-200">
                      <span className="font-bold text-purple-900 block text-xs">วิชาเฉพาะที่ประเมิน</span>
                      <span className="text-[10.5px] text-purple-700">เกษตร อาชีพ สหกรณ์ วัฒนธรรม</span>
                    </div>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-xs">
                  <span className="text-slate-500 font-normal text-[11px]">รูปภาพปฏิทินที่ 2</span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setLightboxImage({
                        url: img2Url,
                        title: "คู่มือสรุปกิจกรรมและปฏิทินการทำงานโครงการ กพด. ในรอบ ๑ ปีการศึกษา",
                        subtitle: "ภาพรวมบทบาท หน้าที่ และเกณฑ์วัดผล",
                        description: "แสดงรายละเอียดเป้าหมายหลักและสัดส่วนคะแนนประเมินวิชาเฉพาะนักเรียน ป.6",
                        deadlines: [
                          { date: "พฤษภาคม - มิถุนายน", label: "เริ่มต้นปีการศึกษา", bg: "bg-blue-600" },
                          { date: "มีนาคม", label: "ประเมินวิชาเฉพาะ ป.6", bg: "bg-purple-600" }
                        ]
                      })}
                      className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg transition flex items-center gap-1 cursor-pointer"
                    >
                      <ZoomIn className="w-3 h-3" />
                      <span>ขยายดูรูปภาพ</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>

          </div>

          {/* Interactive Timeline Roadmap Step Cards */}
          <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-xs space-y-3">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2.5">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-indigo-600" />
                <h3 className="text-xs sm:text-sm font-bold text-slate-900">
                  สรุปขั้นตอนและวันกำหนดส่งรายงานหลัก (Roadmap Breakdown)
                </h3>
              </div>
              <span className="text-[11px] font-bold text-slate-500">4 ช่วงเวลาหลัก</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
              
              {/* Phase 1 */}
              <div className="p-3.5 rounded-xl bg-blue-50/70 border border-blue-200 space-y-1.5 flex flex-col justify-between">
                <div>
                  <span className="px-2 py-0.5 rounded bg-blue-600 text-white font-bold text-[9.5px] inline-block mb-1">
                    ช่วงที่ 1: พ.ค. - มิ.ย.
                  </span>
                  <h4 className="font-bold text-blue-950 text-xs sm:text-sm">เปิดภาคเรียนที่ 1</h4>
                  <ul className="mt-1.5 space-y-1 text-slate-700 font-normal text-[11px] list-disc list-inside">
                    <li>ชั่งน้ำหนัก / วัดส่วนสูง ครั้งที่ 1</li>
                    <li>ตรวจคอพอก & ทดสอบสมรรถภาพ</li>
                    <li>เริ่มบันทึกไข้มาลาเรีย & ผลผลิตเกษตร</li>
                  </ul>
                </div>
                <div className="mt-2.5 pt-2 border-t border-blue-200 flex items-center justify-between text-[11px]">
                  <span className="font-bold text-blue-800">Deadline:</span>
                  <span className="font-bold text-rose-700 bg-rose-100 px-1.5 py-0.5 rounded">15 มิถุนายน</span>
                </div>
              </div>

              {/* Phase 2 */}
              <div className="p-3.5 rounded-xl bg-emerald-50/70 border border-emerald-200 space-y-1.5 flex flex-col justify-between">
                <div>
                  <span className="px-2 py-0.5 rounded bg-emerald-600 text-white font-bold text-[9.5px] inline-block mb-1">
                    ช่วงที่ 2: ก.ค. - พ.ย.
                  </span>
                  <h4 className="font-bold text-emerald-950 text-xs sm:text-sm">กลางปี & สิ้นปีงบฯ</h4>
                  <ul className="mt-1.5 space-y-1 text-slate-700 font-normal text-[11px] list-disc list-inside">
                    <li>ติดตามงานเกษตร & ประสานชุมชน</li>
                    <li>เก็บข้อมูลอนามัยแม่และเด็ก (0-3 ปี)</li>
                    <li>บันทึกกิจกรรมจิตอาสา เทอม 1</li>
                  </ul>
                </div>
                <div className="mt-2.5 pt-2 border-t border-emerald-200 flex items-center justify-between text-[11px]">
                  <span className="font-bold text-emerald-800">Deadline:</span>
                  <span className="font-bold text-rose-700 bg-rose-100 px-1.5 py-0.5 rounded">30 ต.ค. & 30 พ.ย.</span>
                </div>
              </div>

              {/* Phase 3 */}
              <div className="p-3.5 rounded-xl bg-purple-50/70 border border-purple-200 space-y-1.5 flex flex-col justify-between">
                <div>
                  <span className="px-2 py-0.5 rounded bg-purple-600 text-white font-bold text-[9.5px] inline-block mb-1">
                    ช่วงที่ 3: ก.พ. - มี.ค.
                  </span>
                  <h4 className="font-bold text-purple-950 text-xs sm:text-sm">ปลายปีการศึกษา</h4>
                  <ul className="mt-1.5 space-y-1 text-slate-700 font-normal text-[11px] list-disc list-inside">
                    <li>ชั่งน้ำหนัก / วัดส่วนสูง ครั้งที่ 2</li>
                    <li>ดึงคะแนน O-NET & สุขนิสัย</li>
                    <li>ประเมินวิชาเฉพาะ ป.6 (เกษตร,อาชีพฯ)</li>
                  </ul>
                </div>
                <div className="mt-2.5 pt-2 border-t border-purple-200 flex items-center justify-between text-[11px]">
                  <span className="font-bold text-purple-800">Deadline:</span>
                  <span className="font-bold text-rose-700 bg-rose-100 px-1.5 py-0.5 rounded">15 มีนาคม</span>
                </div>
              </div>

              {/* Phase 4 */}
              <div className="p-3.5 rounded-xl bg-amber-50/70 border border-amber-200 space-y-1.5 flex flex-col justify-between">
                <div>
                  <span className="px-2 py-0.5 rounded bg-amber-600 text-white font-bold text-[9.5px] inline-block mb-1">
                    ช่วงที่ 4: เมษายน
                  </span>
                  <h4 className="font-bold text-amber-950 text-xs sm:text-sm">สิ้นสุดปีการศึกษา</h4>
                  <ul className="mt-1.5 space-y-1 text-slate-700 font-normal text-[11px] list-disc list-inside">
                    <li>ติดตามนักเรียนทุนฯ ในพระราชานุเคราะห์</li>
                    <li>รวบรวมใบแจ้งจบการศึกษา (ปพ.1)</li>
                    <li>ส่งบันทึกจิตอาสา ภาคเรียนที่ 2</li>
                  </ul>
                </div>
                <div className="mt-2.5 pt-2 border-t border-amber-200 flex items-center justify-between text-[11px]">
                  <span className="font-bold text-amber-800">Deadline:</span>
                  <span className="font-bold text-rose-700 bg-rose-100 px-1.5 py-0.5 rounded">20 & 30 เมษายน</span>
                </div>
              </div>

            </div>
          </div>

          {/* Optional URL Manager to customize Infographic images */}
          <div className="bg-slate-900 text-white rounded-2xl p-3.5 sm:p-4 border border-slate-800 shadow-md space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Upload className="w-3.5 h-3.5 text-indigo-400" />
                <h4 className="text-xs font-bold text-white">ตั้งค่าเปลี่ยนรูปภาพ Infographic (Custom Image Links)</h4>
              </div>
              <span className="text-[10px] text-slate-400">รองรับ Google Drive Direct Link หรือ Image URL</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
              <div>
                <label className="text-[10.5px] font-semibold text-slate-300 block mb-1">URL รูปโปสเตอร์ที่ 1 (ปฏิทินเช็คลิสต์):</label>
                <input
                  type="text"
                  placeholder="วางลิงก์รูปภาพ หรือ Google Drive..."
                  value={customInfographic1Url}
                  onChange={(e) => saveCustomUrl("1", e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-xs focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="text-[10.5px] font-semibold text-slate-300 block mb-1">URL รูปโปสเตอร์ที่ 2 (คู่มือสรุป 8 เป้าหมาย):</label>
                <input
                  type="text"
                  placeholder="วางลิงก์รูปภาพ หรือ Google Drive..."
                  value={customInfographic2Url}
                  onChange={(e) => saveCustomUrl("2", e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-xs focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
          </div>

        </div>
      )}

      {/* SECTION 1: 8 GOALS & INDICATORS */}
      {activeTab === "roles" && (
        <div className="space-y-4">
          {/* Sub-filter by Goal */}
          <div className="flex flex-nowrap items-center gap-1.5 bg-slate-100/90 p-2 rounded-2xl border border-slate-200 overflow-x-auto scrollbar-none">
            <button
              onClick={() => setSelectedGoalId("all")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer whitespace-nowrap shrink-0 ${
                selectedGoalId === "all"
                  ? "bg-slate-900 text-white shadow-xs"
                  : "bg-white text-slate-700 hover:bg-slate-200/80"
              }`}
            >
              แสดงทั้งหมด (8 เป้าหมาย)
            </button>
            {goalsData.map((g) => (
              <button
                key={g.id}
                onClick={() => setSelectedGoalId(g.id)}
                className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer whitespace-nowrap shrink-0 ${
                  selectedGoalId === g.id
                    ? "bg-blue-600 text-white shadow-xs"
                    : "bg-white text-slate-700 hover:bg-slate-200/80"
                }`}
              >
                เป้าหมายที่ {g.id}
              </button>
            ))}
          </div>

          <div className="space-y-4">
            {goalsData
              .filter((g) => selectedGoalId === "all" || selectedGoalId === g.id)
              .filter((g) => {
                if (!searchTerm) return true;
                const term = searchTerm.toLowerCase();
                return (
                  g.title.toLowerCase().includes(term) ||
                  g.items.some(
                    (item) =>
                      item.title.toLowerCase().includes(term) ||
                      item.detail.toLowerCase().includes(term) ||
                      item.form.toLowerCase().includes(term)
                  )
                );
              })
              .map((goal) => {
                return (
                  <div
                    key={goal.id}
                    className="bg-white border border-slate-200/90 rounded-2xl shadow-xs overflow-hidden"
                  >
                    <div className={`px-4 py-3 bg-gradient-to-r ${goal.accentBg} border-b border-slate-200/80 flex flex-wrap items-center justify-between gap-2.5`}>
                      <div className="flex items-center gap-2.5">
                        <div>
                          <h2 className="text-sm sm:text-base font-bold text-slate-900 leading-snug">
                            {goal.title}
                          </h2>
                          <span className={`inline-block mt-0.5 text-[10.5px] font-bold px-2.5 py-0.5 rounded-full border ${goal.badgeColor}`}>
                            {goal.indicators}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="p-3.5 sm:p-4 grid grid-cols-1 md:grid-cols-2 gap-3.5">
                      {goal.items.map((item, idx) => (
                        <div
                          key={idx}
                          className="bg-slate-50/70 border border-slate-200/90 rounded-xl p-3 sm:p-3.5 flex flex-col justify-between space-y-2.5 hover:border-blue-400 hover:bg-white transition shadow-2xs"
                        >
                          <div className="space-y-1.5">
                            <div className="flex items-start justify-between gap-2 border-b border-slate-200/60 pb-1.5">
                              <h3 className="text-xs sm:text-sm font-bold text-slate-900 leading-snug">
                                {item.title}
                              </h3>
                              <span className="text-[10px] text-slate-500 font-semibold shrink-0 bg-slate-200/70 px-1.5 py-0.5 rounded">
                                [{item.ref}]
                              </span>
                            </div>

                            <p className="text-xs text-slate-700 leading-relaxed font-normal whitespace-pre-line">
                              {item.detail}
                            </p>
                          </div>

                          <div className="pt-2 border-t border-slate-200/80 flex items-center justify-between gap-2 text-xs">
                            <span className="text-[11px] font-medium text-slate-600">
                              แบบรายงาน:
                            </span>
                            <span className="text-[11px] font-bold text-blue-800 bg-blue-100/80 px-2 py-0.5 rounded-lg border border-blue-300">
                              {item.form}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* SECTION 2: ACADEMIC TIMELINE */}
      {activeTab === "timeline" && (
        <div className="space-y-4">
          <div className="bg-amber-500/10 border border-amber-300/80 rounded-2xl p-3.5 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-amber-600 text-white flex items-center justify-center font-bold shrink-0 shadow-xs">
                <Calendar className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-xs sm:text-sm font-bold text-amber-950">
                  ๒. ปฏิทินกำหนดการจัดกิจกรรมและการรายงานผลในรอบ ๑ ปีการศึกษา (Academic Year Timeline)
                </h2>
                <p className="text-[11px] text-amber-800 font-normal">
                  กำหนดการรวบรวมข้อมูล จัดเก็บ และกรอบเวลาจัดส่งรายงานไปยังโครงการส่วนพระองค์ฯ ในแต่ละเดือน
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            {timelineData
              .filter((monthGroup) => {
                if (!searchTerm) return true;
                const term = searchTerm.toLowerCase();
                return (
                  monthGroup.month.toLowerCase().includes(term) ||
                  monthGroup.deadline.toLowerCase().includes(term) ||
                  monthGroup.items.some(
                    (i) =>
                      i.task.toLowerCase().includes(term) ||
                      i.form.toLowerCase().includes(term)
                  )
                );
              })
              .map((group, mIdx) => (
                <div
                  key={mIdx}
                  className="bg-white border border-slate-200 rounded-2xl shadow-2xs overflow-hidden transition hover:border-slate-300"
                >
                  <div className="bg-slate-50/80 px-3.5 py-2.5 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-lg border ${group.tagColor}`}>
                        {group.month}
                      </span>
                      <span className="text-[11px] font-medium text-slate-500">
                        {group.items.length} ภารกิจจัดเก็บ/รายงาน
                      </span>
                    </div>

                    {group.deadline !== "-" && (
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3 h-3 text-rose-600" />
                        <span className={`text-[10.5px] font-bold px-2 py-0.5 rounded-full border ${group.deadlineBadge}`}>
                          {group.deadline}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="p-3 sm:p-4 space-y-2">
                    {group.items.map((item, idx) => (
                      <div
                        key={idx}
                        className="bg-slate-50/70 p-2.5 sm:p-3 rounded-xl border border-slate-200/90 flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-2xs hover:bg-white transition"
                      >
                        <div className="space-y-0.5 flex-1">
                          <p className="text-xs sm:text-sm font-bold text-slate-900 leading-snug">
                            {item.task}
                          </p>
                          <p className="text-[10.5px] text-slate-500 font-medium">
                            [{item.ref}]
                          </p>
                        </div>

                        <div className="shrink-0 flex items-center gap-2">
                          <span className="text-[11px] font-bold text-blue-900 bg-blue-100/90 px-2 py-0.5 rounded-lg border border-blue-300">
                            {item.form}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* SECTION 3: REPORT CHECKLISTS */}
      {activeTab === "reports" && (
        <div className="space-y-4">
          <div className="bg-blue-500/10 border border-blue-300/80 rounded-2xl p-3.5 sm:p-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold shrink-0 shadow-xs">
                <CheckSquare className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-xs sm:text-sm font-bold text-blue-950">
                  ๓. เช็คลิสต์และคู่มือสรุปจำแนกตามแบบรายงาน (๑๐๑ - ๖๐๑ และ กพด. ๐๐๑)
                </h2>
                <p className="text-[11px] text-blue-900 font-normal mt-0.5">
                  คลิกเช็คที่ช่องเพื่อบันทึกสถานะการรวบรวมข้อมูลและจัดส่งแบบรายงานแต่ละฉบับ
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 bg-white px-2.5 py-1.5 rounded-xl border border-blue-300 shadow-2xs text-xs font-medium text-blue-950">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>ความคืบหน้า: <strong className="text-emerald-700 font-bold">{checkedReportCount} / {allReportIds.length}</strong> แบบรายงาน</span>
            </div>
          </div>

          {/* Group Filter */}
          <div className="flex flex-wrap items-center gap-1.5 bg-slate-100/90 p-2 rounded-2xl border border-slate-200">
            <button
              onClick={() => setSelectedReportGroup("all")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                selectedReportGroup === "all"
                  ? "bg-slate-900 text-white shadow-xs"
                  : "bg-white text-slate-700 hover:bg-slate-200/80"
              }`}
            >
              ทั้งหมด (6 กลุ่ม)
            </button>
            {reportGroups.map((group) => (
              <button
                key={group.id}
                onClick={() => setSelectedReportGroup(group.id)}
                className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                  selectedReportGroup === group.id
                    ? "bg-blue-600 text-white shadow-xs"
                    : "bg-white text-slate-700 hover:bg-slate-200/80"
                }`}
              >
                กลุ่มที่ {group.number}
              </button>
            ))}
          </div>

          <div className="space-y-4">
            {reportGroups
              .filter(g => selectedReportGroup === "all" || selectedReportGroup === g.id)
              .filter(g => {
                if (!searchTerm) return true;
                const term = searchTerm.toLowerCase();
                return (
                  g.title.toLowerCase().includes(term) ||
                  g.items.some(item =>
                    item.title.toLowerCase().includes(term) ||
                    item.code.toLowerCase().includes(term) ||
                    item.detail.toLowerCase().includes(term)
                  )
                );
              })
              .map((group) => (
                <div key={group.id} className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
                  <div className="bg-slate-50/90 px-3.5 sm:px-4 py-2.5 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-md bg-blue-600 text-white flex items-center justify-center text-xs font-bold">
                        {group.number}
                      </span>
                      <h3 className="font-bold text-xs sm:text-sm text-slate-900">
                        {group.title}
                      </h3>
                    </div>

                    <span className={`text-[10.5px] font-bold px-2 py-0.5 rounded-full border ${group.badgeColor}`}>
                      {group.deadline}
                    </span>
                  </div>

                  <div className="p-3 sm:p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                    {group.items.map((item) => {
                      const isChecked = !!checkedItems[item.id];
                      return (
                        <div
                          key={item.id}
                          onClick={() => toggleCheck(item.id)}
                          className={`p-3 sm:p-3.5 rounded-xl transition border cursor-pointer flex items-start gap-3 shadow-2xs ${
                            isChecked
                              ? "bg-emerald-50/70 border-emerald-300 text-slate-800"
                              : "bg-slate-50/60 border-slate-200/90 hover:border-blue-400 hover:bg-white"
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => {}}
                            className="w-4 h-4 mt-0.5 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500 shrink-0 cursor-pointer"
                          />

                          <div className="space-y-1.5 flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2 border-b border-slate-200/60 pb-1.5">
                              <div>
                                <span className="inline-block text-[10px] font-bold text-blue-800 bg-blue-100/90 px-1.5 py-0.5 rounded mb-0.5 border border-blue-200">
                                  {item.code}
                                </span>
                                <h4 className={`text-xs sm:text-sm font-bold leading-snug ${isChecked ? "line-through text-slate-500" : "text-slate-900"}`}>
                                  {item.title}
                                </h4>
                              </div>
                              <span className="text-[10px] text-slate-500 font-semibold shrink-0 bg-slate-200/60 px-1.5 py-0.5 rounded">
                                [{item.ref}]
                              </span>
                            </div>

                            <p className={`text-xs leading-relaxed font-normal ${isChecked ? "text-slate-400" : "text-slate-700"}`}>
                              {item.detail}
                            </p>

                            <div className="pt-1.5 border-t border-slate-200/60 flex items-center justify-between gap-2 text-xs">
                              <span className="font-medium text-slate-600 text-[11px]">
                                กำหนดส่ง:
                              </span>
                              <span className="font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200 text-[10.5px]">
                                {item.deadlineText}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* FULLSCREEN LIGHTBOX MODAL FOR INFOGRAPHIC */}
      {lightboxImage && (
        <div 
          className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex flex-col p-3 sm:p-6 overflow-y-auto animate-in fade-in duration-200"
          onClick={() => setLightboxImage(null)}
        >
          <div 
            className="bg-slate-900 border border-slate-700 text-white rounded-3xl max-w-5xl w-full mx-auto my-auto shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-4 sm:p-5 bg-slate-950 border-b border-slate-800 flex items-center justify-between gap-3 shrink-0">
              <div className="space-y-0.5">
                <span className="text-[10px] font-black uppercase tracking-wider text-amber-400 bg-amber-400/10 px-2.5 py-0.5 rounded-full border border-amber-400/20">
                  Infographic Full-Size Viewer
                </span>
                <h3 className="text-base sm:text-lg font-black text-white leading-snug">
                  {lightboxImage.title}
                </h3>
                <p className="text-xs text-slate-400 font-medium">{lightboxImage.subtitle}</p>
              </div>

              <div className="flex items-center gap-2">
                <a
                  href={lightboxImage.url}
                  target="_blank"
                  rel="noreferrer"
                  className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-2xl transition flex items-center gap-1.5 text-xs font-bold"
                  title="เปิดในแท็บใหม่"
                >
                  <ExternalLink className="w-4 h-4" />
                  <span className="hidden sm:inline">เปิดแท็บใหม่</span>
                </a>

                <button
                  type="button"
                  onClick={() => setLightboxImage(null)}
                  className="p-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-2xl transition shadow-lg cursor-pointer"
                  title="ปิดหน้าต่าง"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Image Body (Scrollable/Zoomable) */}
            <div className="p-3 sm:p-5 bg-slate-950 overflow-auto flex-1 flex items-center justify-center min-h-[300px] border-b border-slate-800">
              <img
                src={lightboxImage.url}
                alt={lightboxImage.title}
                referrerPolicy="no-referrer"
                className="max-w-full max-h-[60vh] sm:max-h-[70vh] object-contain rounded-xl shadow-2xl border border-slate-800"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
            </div>

            {/* Modal Footer Deadlines & Info */}
            <div className="p-4 sm:p-5 bg-slate-900 space-y-3 shrink-0">
              <p className="text-xs text-slate-300 font-medium leading-relaxed">
                {lightboxImage.description}
              </p>

              {lightboxImage.deadlines.length > 0 && (
                <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-800">
                  <span className="text-[11px] font-bold text-slate-400 mr-1">กำหนดส่งในภาพ:</span>
                  {lightboxImage.deadlines.map((dl, idx) => (
                    <span 
                      key={idx}
                      className={`text-[11px] font-black text-white px-2.5 py-1 rounded-xl shadow-xs ${dl.bg}`}
                    >
                      {dl.date}: {dl.label}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
