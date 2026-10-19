import React, { useState, useEffect, useMemo } from "react";
import { safeLocalStorage } from "../lib/storage";
import { toThaiNumerals } from "../types";
import { ROYAL_EMBLEM_IMAGE } from "../data/emblemLogo";
import {
  Sun,
  CheckSquare,
  Clock,
  Printer,
  Sparkles,
  Users,
  GraduationCap,
  RotateCcw,
  BookOpen,
  Info,
  CheckCircle2,
  Utensils,
  HeartPulse,
  ShieldCheck,
  Apple,
  Droplets,
  Search,
  Award,
  Trees,
  Landmark,
  Briefcase,
  Building2,
  Target,
  ChevronRight,
  Filter,
  Calendar,
  Layers,
  Sparkle,
  Download,
  Flame,
  FileCheck,
  Check,
  CircleDot,
  Compass,
  Smile,
  Wheat,
  Coins,
  Share2,
  Trash2,
  FileText
} from "lucide-react";

// Types
export interface RoutineActivity {
  id: string;
  goalId: number;
  timeSlot: "early_morning" | "morning_assembly" | "academic_morning" | "morning_break" | "midday_integrated" | "lunch_hygiene" | "afternoon_vocational" | "afternoon_agri" | "evening_health" | "closing_wrapup";
  timeLabel: string;
  role: "teacher" | "student" | "both";
  roleLabel: string;
  title: string;
  description: string;
  objective: string;
  indicators: string;
  points: number;
  steps: string[];
  tips?: string;
  isCoreDaily: boolean; // Must-do every school day
}

export interface GoalGroupInfo {
  id: number;
  code: string;
  name: string;
  shortName: string;
  icon: any;
  colorBg: string;
  colorBorder: string;
  colorText: string;
  colorBadge: string;
  gradient: string;
  summary: string;
}

// 8 Master Goals from Plan 5 (กพด. ฉบับที่ 5 พ.ศ. 2560-2569)
export const PLAN5_GOAL_INFOS: GoalGroupInfo[] = [
  {
    id: 1,
    code: "เป้าหมายที่ 1",
    name: "เสริมสร้างสุขภาพของเด็กตั้งแต่ในครรภ์มารดา",
    shortName: "สุขภาพในครรภ์ & ปฐมวัย",
    icon: HeartPulse,
    colorBg: "bg-rose-50",
    colorBorder: "border-rose-200",
    colorText: "text-rose-700",
    colorBadge: "bg-rose-100 text-rose-800 border-rose-300 whitespace-nowrap shrink-0",
    gradient: "from-rose-500 to-pink-600",
    summary: "โภชนาการและสุขภาพอนามัยของเด็กและเยาวชนได้รับการพัฒนาตามเกณฑ์มาตรฐาน สุขอนามัยส่วนบุคคล อาหาร 5 หมู่ นมโรงเรียน เกลือและน้ำดื่มเสริมไอโอดีน"
  },
  {
    id: 2,
    code: "เป้าหมายที่ 2",
    name: "เพิ่มโอกาสทางการศึกษา",
    shortName: "โอกาสทางการศึกษา",
    icon: GraduationCap,
    colorBg: "bg-blue-50",
    colorBorder: "border-blue-200",
    colorText: "text-blue-700",
    colorBadge: "bg-blue-100 text-blue-800 border-blue-300 whitespace-nowrap shrink-0",
    gradient: "from-blue-500 to-indigo-600",
    summary: "เด็กและเยาวชนทุกคนได้รับการศึกษาอย่างทั่วถึง เสมอภาค เช็คชื่อการเข้าเรียน ติดตามเด็กขาดเรียน ช่วยเหลือเด็กด้อยโอกาส/เด็กหอพัก"
  },
  {
    id: 3,
    code: "เป้าหมายที่ 3",
    name: "เสริมสร้างศักยภาพของเด็กและเยาวชนทางวิชาการและทางจริยธรรม",
    shortName: "วิชาการ & จริยธรรม",
    icon: Award,
    colorBg: "bg-amber-50",
    colorBorder: "border-amber-200",
    colorText: "text-amber-700",
    colorBadge: "bg-amber-100 text-amber-800 border-amber-300 whitespace-nowrap shrink-0",
    gradient: "from-amber-500 to-orange-600",
    summary: "พัฒนาทักษะการฟัง พูด อ่าน เขียนภาษาไทย 5 นาทีรักการอ่าน คลินิกภาษาไทย วิทยาศาสตร์-คณิตศาสตร์ และการปลูกฝังคุณธรรมจริยธรรม"
  },
  {
    id: 4,
    code: "เป้าหมายที่ 4",
    name: "เสริมสร้างศักยภาพของเด็กและเยาวชนทางการงานอาชีพ",
    shortName: "เกษตร & ทักษะอาชีพ",
    icon: Wheat,
    colorBg: "bg-lime-50",
    colorBorder: "border-lime-200",
    colorText: "text-lime-800",
    colorBadge: "bg-lime-100 text-lime-800 border-lime-300 whitespace-nowrap shrink-0",
    gradient: "from-lime-600 to-green-600",
    summary: "ปฏิบัติการแปลงเกษตร ปลูกผัก เลี้ยงไก่ไข่ ปลา เพาะเห็ด จดบันทึกผลผลิตส่งเข้าโครงการอาหารกลางวัน และฝึกงานอาชีพงานช่าง"
  },
  {
    id: 5,
    code: "เป้าหมายที่ 5",
    name: "ปลูกฝังจิตสำนึกและพัฒนาศักยภาพของเด็กและเยาวชนในการอนุรักษ์ทรัพยากรธรรมชาติและสิ่งแวดล้อม",
    shortName: "อนุรักษ์สิ่งแวดล้อม",
    icon: Trees,
    colorBg: "bg-emerald-50",
    colorBorder: "border-emerald-200",
    colorText: "text-emerald-700",
    colorBadge: "bg-emerald-100 text-emerald-800 border-emerald-300 whitespace-nowrap shrink-0",
    gradient: "from-emerald-500 to-teal-600",
    summary: "งานสวนพฤกษศาสตร์โรงเรียน กิจกรรม 5 ส. คัดแยกขยะ ธนาคารขยะ การประหยัดพลังงานน้ำ-ไฟฟ้า และรักษาความสะอาดสิ่งแวดล้อม"
  },
  {
    id: 6,
    code: "เป้าหมายที่ 6",
    name: "เสริมสร้างศักยภาพของเด็กและเยาวชนในการอนุรักษ์และสืบทอดวัฒนธรรมและภูมิปัญญาของท้องถิ่นและของชาติไทย",
    shortName: "วัฒนธรรม & ภูมิปัญญา",
    icon: Landmark,
    colorBg: "bg-purple-50",
    colorBorder: "border-purple-200",
    colorText: "text-purple-700",
    colorBadge: "bg-purple-100 text-purple-800 border-purple-300 whitespace-nowrap shrink-0",
    gradient: "from-purple-500 to-fuchsia-600",
    summary: "มารยาทไทย ยิ้ม-ไหว้-ทักทาย การอนุรักษ์ภาษาถิ่น ดนตรี นาฏศิลป์ หัตถกรรมพื้นบ้าน และการแลกเปลี่ยนเรียนรู้กับปราชญ์ชุมชน"
  },
  {
    id: 7,
    code: "เป้าหมายที่ 7",
    name: "ขยายการพัฒนาจากโรงเรียนสู่ชุมชน",
    shortName: "ขยายพัฒนาสู่ชุมชน",
    icon: Coins,
    colorBg: "bg-cyan-50",
    colorBorder: "border-cyan-200",
    colorText: "text-cyan-700",
    colorBadge: "bg-cyan-100 text-cyan-800 border-cyan-300 whitespace-nowrap shrink-0",
    gradient: "from-cyan-500 to-blue-600",
    summary: "การจัดทำบัญชีครัวเรือน การสหกรณ์นักเรียน กิจกรรมออมทรัพย์ประจำวัน และขยายผลผลิตพึ่งพาตนเองสู่ชุมชนโดยรอบ"
  },
  {
    id: 8,
    code: "เป้าหมายที่ 8",
    name: "พัฒนาสถานศึกษาเป็นศูนย์บริการความรู้",
    shortName: "ศูนย์บริการความรู้",
    icon: Building2,
    colorBg: "bg-orange-50",
    colorBorder: "border-orange-200",
    colorText: "text-orange-700",
    colorBadge: "bg-orange-100 text-orange-800 border-orange-300 whitespace-nowrap shrink-0",
    gradient: "from-orange-500 to-amber-600",
    summary: "บริการน้ำดื่มสะอาดแก่ชุมชน การสาธิตถ่ายทอดเทคโนโลยีการเกษตร การดูแลสุขอนามัยรอบรั้วโรงเรียน และการสื่อสารกับชุมชน"
  }
];

// Comprehensive 8-Goal Daily & Intraday Activity Database
export const COMPREHENSIVE_DAILY_ACTIVITIES: RoutineActivity[] = [
  // --- GOAL 1: Nutrition & Health ---
  {
    id: "g1-morning-hygiene",
    goalId: 1,
    timeSlot: "early_morning",
    timeLabel: "07:00 - 08:00 น. (ช่วงเช้าตรู่)",
    role: "both",
    roleLabel: "ครูเวร + นักเรียนแกนนำ",
    title: "ตรวจคัดกรองสุขอนามัยส่วนบุคคลและเครื่องแต่งกายแรกรับ",
    description: "ตรวจสุขอนามัยส่วนบุคคล ได้แก่ ความสะอาดของผม เล็บ เสื้อผ้า รองเท้า ผื่นผิวหนัง ตาแดง และอาการเจ็บป่วยเบื้องต้น",
    objective: "ป้องกันโรคติดต่อ ปลูกฝังสุขนิสัยความสะอาด และเฝ้าระวังสุขภาพนักเรียนทุกคนก่อนเข้าห้องเรียน",
    indicators: "ตัวชี้วัด กพด. ด้านที่ 1 (ร้อยละของนักเรียนมีสุขนิสัยถูกต้องตามเกณฑ์สุขบัญญัติ 10 ประการ)",
    points: 10,
    steps: [
      "ครูเวรและนักเรียนแกนนำสุขอนามัยยืนประจำจุดตรวจทางเข้าโรงเรียน",
      "ตรวจเล็บมือ สุขภาพช่องปาก ความสะอาดของเส้นผมและเสื้อผ้า",
      "ตรวจดูอาการเป็นไข้ ไอ เจ็บคอ หรือตาแดง หากพบให้แยกปฐมพยาบาลเบื้องต้น",
      "บันทึกสถิตินักเรียนที่มีปัญหาสุขอนามัยเพื่อติดตามรายบุคคล"
    ],
    tips: "ใช้จิตวิทยาเชิงบวก ชื่นชมเด็กที่มีสุขอนามัยดี และให้คำแนะนำที่เข้าใจง่าย",
    isCoreDaily: true
  },
  {
    id: "g1-iodine-water-prep",
    goalId: 1,
    timeSlot: "early_morning",
    timeLabel: "07:00 - 07:45 น. (ช่วงเช้าตรู่)",
    role: "teacher",
    roleLabel: "ครูอนามัยโรงเรียน",
    title: "จัดเตรียมน้ำดื่มสะอาดเสริมสารไอโอดีนประจำวัน",
    description: "เตรียมถังน้ำดื่มสะอาดผ่านการกรองและหยดสารละลายไอโอดีนตามสัดส่วนที่กระทรวงสาธารณสุขกำหนด เพื่อให้นักเรียนดื่มตลอดวัน",
    objective: "ป้องกันโรคขาดสารไอโอดีน เสริมสร้างพัฒนาการสมองและสติปัญญาของเด็กและเยาวชน",
    indicators: "ตัวชี้วัด กพด. ด้านที่ 1 (อัตราการเข้าถึงน้ำดื่มเสริมไอโอดีนและภาวะการขาดสารไอโอดีน)",
    points: 10,
    steps: [
      "ตรวจสอบความสะอาดของถังพักน้ำ แก้วน้ำ และก๊อกจ่ายน้ำดื่ม",
      "เติมสารละลายโพแทสเซียมไอโอเดตตามอัตราส่วนมาตรฐานที่กำหนด (1 หยด ต่อน้ำ 10 ลิตร หรือตามสูตร สธ.)",
      "คนให้เข้ากันและปิดฝาถังน้ำดื่มให้มิดชิดป้องกันฝุ่นละอองและแมลง",
      "ตรวจเช็คจุดจ่ายน้ำดื่มทุกอาคารเรียนให้พร้อมบริการ"
    ],
    tips: "จัดให้นักเรียนมีแก้วน้ำหรือกระบอกน้ำประจำตัว ไม่ใช้แก้วร่วมกันเพื่อป้องกันโรคติดต่อ",
    isCoreDaily: true
  },
  {
    id: "g1-morning-milk",
    goalId: 1,
    timeSlot: "morning_break",
    timeLabel: "10:00 - 10:15 น. (ช่วงพักเบรกเช้า)",
    role: "both",
    roleLabel: "ครูประจำชั้น + นักเรียนทุกคน",
    title: "กิจกรรมดื่มนมโรงเรียนเพื่อเสริมสร้างการเจริญเติบโต",
    description: "แจกและดื่มนมโรงเรียนชนิดพาสเจอร์ไรส์หรือยูเอชทีวันละ 1 ถุง/กล่อง ครบทุกคน พร้อมทั้งตรวจสอบวันหมดอายุและสภาพบรรจุภัณฑ์",
    objective: "ให้นักเรียนได้รับแคลเซียมและสารอาหารโปรตีนอย่างเพียงพอ เสริมสร้างความสูงและมวลกระดูกตามวัย",
    indicators: "ตัวชี้วัด กพด. ด้านที่ 1 (ร้อยละของนักเรียนได้ดื่มนมโรงเรียนครบตามเกณฑ์มาตรฐาน 260 วัน/ปี)",
    points: 10,
    steps: [
      "ตรวจสภาพกล่อง/ถุงนม และวันหมดอายุก่อนแจกนักเรียน",
      "ให้นักเรียนล้างมือก่อนรับกล่องนม",
      "ดื่มนมให้หมดกล่องภายในเวลาที่กำหนด ไม่ทิ้งค้าง",
      "พับกล่องนมหรือล้างถุงนมเพื่อนำเข้าสู่กิจกรรมธนาคารขยะ/รีไซเคิล"
    ],
    tips: "สำหรับเด็กที่แพ้นมวัว ให้จัดเตรียมนมถั่วเหลืองเสริมแคลเซียมทดแทนตามแผนโภชนาการ",
    isCoreDaily: true
  },
  {
    id: "g1-lunch-nutrition-iodine",
    goalId: 1,
    timeSlot: "lunch_hygiene",
    timeLabel: "12:00 - 12:40 น. (ช่วงอาหารกลางวัน)",
    role: "both",
    roleLabel: "แม่ครัว + ครูโภชนาการ + นักเรียน",
    title: "รับประทานอาหารกลางวันสุขอนามัย 5 หมู่ ปรุงด้วยเกลือไอโอดีน",
    description: "รับประทานอาหารกลางวันที่ปรุงสุกใหม่ สะอาด ครบ 5 หมู่ ใช้ผลผลิตเกษตรของโรงเรียน และใช้เกลือเสริมไอโอดีนในการปรุงรส",
    objective: "ส่งเสริมภาวะโภชนาการสมวัย ป้องกันภาวะทุพโภชนาการ (เตี้ย ผอม อ้วน) ในเด็กวัยเรียน",
    indicators: "ตัวชี้วัด กพด. ด้านที่ 1 (ภาวะการเจริญเติบโต น้ำหนักและส่วนสูงตามเกณฑ์อายุ)",
    points: 10,
    steps: [
      "ครูโภชนาการตรวจเช็คการใช้เกลือเสริมไอโอดีนและวัตถุดิบผักปลอดภัยจากฟาร์มโรงเรียน",
      "นักเรียนล้างมือด้วยสบู่ 7 ขั้นตอนก่อนรับประทานอาหาร",
      "รับประทานอาหารให้ครบปริมาณ ทั้งข้าว ผัก โปรตีน และผลไม้ประจำมื้อ",
      "ใช้ช้อนกลางและช้อนส้อมส่วนตัว ฝึกสุขนิสัยการเคี้ยวให้ละเอียดและไม่ส่งเสียงดัง"
    ],
    tips: "เน้นการตักอาหารในปริมาณที่พอเหมาะ กินให้หมดจาน ปลูกฝังจิตสำนึกคุณค่าของอาหาร",
    isCoreDaily: true
  },
  {
    id: "g1-toothbrushing-post-lunch",
    goalId: 1,
    timeSlot: "lunch_hygiene",
    timeLabel: "12:40 - 13:00 น. (หลังอาหารกลางวัน)",
    role: "student",
    roleLabel: "นักเรียนทุกคน (มีครูกำกับ)",
    title: "กิจกรรมแปรงฟันหลังอาหารกลางวัน 2 นาทีด้วยยาสีฟันผสมฟลูออไรด์",
    description: "นักเรียนทุกคนเข้าแถวแปรงฟันอย่างถูกวิธีหลังอาหารกลางวันวันละ 1 ครั้ง ด้วยยาสีฟันผสมฟลูออไรด์อย่างน้อย 2 นาที",
    objective: "ป้องกันฟันผุและโรคเหงือกอักเสบในเด็กวัยเรียน ส่งเสริมสุขภาพช่องปากที่แข็งแรง",
    indicators: "ตัวชี้วัด กพด. ด้านที่ 1 (ร้อยละของเด็กที่มีฟันผุในฟันแท้ลดลง และมีพฤติกรรมแปรงฟันสม่ำเสมอ)",
    points: 10,
    steps: [
      "นักเรียนเตรียมแปรงสีฟัน ยาสีฟันฟลูออไรด์ และแก้วน้ำประจำตัว",
      "บีบยาสีฟันขนาดพอเหมาะ (ขนาดเท่าเม็ดถั่วเขียวสำหรับเด็กเล็ก หรือเท่าเม็ดข้าวโพดสำหรับเด็กโต)",
      "แปรงฟันตามหลัก 2-2-2 (แปรงวันละ 2 ครั้ง, นานครั้งละ 2 นาที, งดกินอาหารหลังแปรง 2 ชั่วโมง)",
      "ล้างแปรงสีฟันให้สะอาดและเก็บในที่แห้ง อากาศถ่ายเทสะดวก"
    ],
    tips: "จัดให้มีกระจกส่องฟันและเพลงประกอบการแปรงฟัน 2 นาที เพื่อสร้างบรรยากาศสนุกสนาน",
    isCoreDaily: true
  },
  {
    id: "g1-physical-exercise",
    goalId: 1,
    timeSlot: "evening_health",
    timeLabel: "15:30 - 16:15 น. (ช่วงบ่ายแก่)",
    role: "student",
    roleLabel: "นักเรียนทุกคน + ครูพลศึกษา",
    title: "กิจกรรมออกกำลังกาย เล่นกีฬา และนันทนาการเพื่อสุขภาพ",
    description: "ออกกำลังกาย เล่นกีฬาพื้นบ้าน หรือกายบริหารร่วมกันอย่างน้อย 30-45 นาที เพื่อเสริมสร้างสมรรถภาพทางกาย",
    objective: "เสริมสร้างกล้ามเนื้อ ความยืดหยุ่น และลดปัญหาภาวะเริ่มอ้วนและอ้วนในเด็กวัยเรียน",
    indicators: "ตัวชี้วัด กพด. ด้านที่ 1 (ร้อยละของนักเรียนที่มีสมรรถภาพทางกายผ่านเกณฑ์มาตรฐาน กรมพลศึกษา)",
    points: 10,
    steps: [
      "อบอุ่นร่างกาย (Warm-up) และยืดเหยียดกล้ามเนื้อ 5-10 นาที",
      "เล่นกีฬาประเภทบุคคลหรือทีม เช่น วิ่ง ตะกร้อ ฟุตบอล วอลเลย์บอล หรือกระโดดเชือก",
      "คลายอุ่นร่างกาย (Cool-down) 5 นาที และดื่มน้ำสะอาดเสริมไอโอดีนหลังออกกำลังกาย"
    ],
    tips: "จัดกิจกรรมที่สอดคล้องกับสภาพพื้นที่และความสนใจของเด็กทุกระดับชั้น",
    isCoreDaily: true
  },

  // --- GOAL 2: Educational Opportunity & Access ---
  {
    id: "g2-morning-attendance",
    goalId: 2,
    timeSlot: "early_morning",
    timeLabel: "07:45 - 08:15 น. (ช่วงเข้าแถว/โฮมรูม)",
    role: "teacher",
    roleLabel: "ครูประจำชั้น",
    title: "เช็คชื่อการมาเรียนรายวันและคัดกรองนักเรียนกลุ่มเสี่ยงขาดเรียน",
    description: "เช็คชื่อนักเรียนในสมุด ปพ.5 หรือระบบดิจิทัล ตรวจสอบสาเหตุการขาดเรียน และติดตามกรณีนักเรียนขาดเรียนติดต่อกัน",
    objective: "เพิ่มอัตราการเข้าเรียน ป้องกันเด็กหลุดออกจากระบบการศึกษา และให้ความช่วยเหลือได้ทันท่วงที",
    indicators: "ตัวชี้วัด กพด. ด้านที่ 2 (อัตราการเข้าเรียนเฉลี่ยไม่น้อยกว่าร้อยละ 95 และอัตราการคงอยู่)",
    points: 10,
    steps: [
      "ครูประจำชั้นเช็คชื่อนักเรียนรายบุคคลในช่วงกิจกรรมโฮมรูม",
      "กรณีนักเรียนขาดเรียน ให้สอบถามเพื่อนสนิทหรือโทรศัพท์/ประสานผู้นำชุมชนสอบถามผู้ปกครอง",
      "บันทึกสถิติการมาเรียน ขาด ลา มาสาย ลงในระบบ",
      "หากขาดเรียนเกิน 3 วันต่อเนื่อง ให้วางแผนลงพื้นที่เยี่ยมบ้านทันที"
    ],
    tips: "บันทึกข้อมูลเด็กกลุ่มเปราะบาง/เด็กหอพักเป็นพิเศษเพื่อการดูแลที่ใกล้ชิด",
    isCoreDaily: true
  },
  {
    id: "g2-dormitory-welfare",
    goalId: 2,
    timeSlot: "closing_wrapup",
    timeLabel: "16:30 - 17:30 น. (ช่วงเย็น)",
    role: "teacher",
    roleLabel: "ครูเวรหอพักนักเรียน",
    title: "ตรวจสภาพความเป็นอยู่และสุขภาวะนักเรียนบ้านไกล/นักเรียนพักนอน",
    description: "ตรวจเช็คความเป็นอยู่ ความสะอาดที่นอน อาหารมื้อเย็น และการทำภารกิจส่วนตัวของนักเรียนพักนอนในโรงเรียน",
    objective: "ดูแลเด็กด้อยโอกาสและเด็กพื้นที่ห่างไกลให้ได้รับความปลอดภัยและสุขภาวะที่ดีเทียบเท่าเด็กทั่วไป",
    indicators: "ตัวชี้วัด กพด. ด้านที่ 2 (การดูแลนักเรียนพักนอนและนักเรียนด้อยโอกาสอย่างมีคุณภาพ)",
    points: 10,
    steps: [
      "เช็คยอดจำนวนนักเรียนพักนอนทุกคนก่อนเข้าที่พัก",
      "ตรวจสอบอาหารมื้อเย็นและน้ำดื่มสะอาดสำหรับนักเรียนพักนอน",
      "ตรวจความสะอาดของห้องนอน มุ้ง ผ้าห่ม และห้องน้ำหอพัก",
      "ให้คำปรึกษาและกำกับช่วงเวลาทบทวนบทเรียนช่วงค่ำ (19:00 - 20:00 น.)"
    ],
    tips: "สร้างบรรยากาศที่อบอุ่น ปลอดภัย เหมือนอยู่บ้าน เพื่อคลายความคิดถึงครอบครัว",
    isCoreDaily: false
  },

  // --- GOAL 3: Academic Competence & 21st Century Skills ---
  {
    id: "g3-morning-morality-anthem",
    goalId: 3,
    timeSlot: "morning_assembly",
    timeLabel: "08:00 - 08:30 น. (กิจกรรมหน้าเสาธง)",
    role: "both",
    roleLabel: "ครูเวร + ประธานนักเรียน + นักเรียนทุกคน",
    title: "กิจกรรมเคารพธงชาติ สวดมนต์ แผ่เมตตา และ 5 นาทีเสริมสร้างคุณธรรม",
    description: "เข้าแถวเคารพธงชาติ สวดมนต์ บำเพ็ญสมาธิ 1-2 นาที และฟังข้อคิดคุณธรรมประจำวัน เช่น ความซื่อสัตย์ ความกตัญญู ความสามัคคี",
    objective: "ปลูกฝังความจงรักภักดีต่อชาติ ศาสนา พระมหากษัตริย์ และสร้างสมาธิพร้อมเรียนรู้ตลอดวัน",
    indicators: "ตัวชี้วัด กพด. ด้านที่ 3 (คุณลักษณะอันพึงประสงค์และการมีวินัย คุณธรรม จริยธรรม)",
    points: 10,
    steps: [
      "ยืนตรงเคารพธงชาติ ร้องเพลงชาติไทยด้วยความพร้อมเพรียงและภาคภูมิใจ",
      "สวดมนต์ไหว้พระ แผ่เมตตา และฝึกนั่งสมาธิระลึกรู้ลมหายใจ 2 นาที",
      "ตัวแทนนักเรียนหรือครูเวรเล่าเรื่องคุณธรรม/ข้อคิดประจำวัน 3-5 นาที",
      "ตรวจระเบียบแถวและเดินเข้าห้องเรียนอย่างเป็นระเบียบ"
    ],
    tips: "หมุนเวียนให้นักเรียนทุกระดับชั้นได้เป็นผู้นำสวดมนต์และเล่าเรื่องคุณธรรมหน้าเสาธง",
    isCoreDaily: true
  },
  {
    id: "g3-thai-language-clinic",
    goalId: 3,
    timeSlot: "academic_morning",
    timeLabel: "08:30 - 09:00 น. (ต้นชั่วโมงเรียน)",
    role: "both",
    roleLabel: "ครูภาษาไทย + นักเรียนทุกคน",
    title: "กิจกรรม 10 นาทีรักการอ่าน และคลินิกภาษาไทย (อ่านออก เขียนได้ สื่อสารคล่อง)",
    description: "ฝึกอ่านออกเสียง คำศัพท์ภาษาไทยวันละ 3-5 คำ อ่านนิทานสั้น และเขียนสะกดคำ เพื่อยกระดับทักษะภาษาไทยของนักเรียนชายขอบ",
    objective: "ยกระดับผลสัมฤทธิ์ภาษาไทย แก้ไขปัญหาเด็กอ่านไม่ออกเขียนไม่ได้ และเสริมสร้างนิสัยรักการอ่าน",
    indicators: "ตัวชี้วัด กพด. ด้านที่ 3 (ร้อยละของนักเรียน ป.1-ป.3 ที่อ่านออกเขียนได้ และคะแนน NT/O-NET)",
    points: 10,
    steps: [
      "นักเรียนอ่านหนังสือหรือบทความที่ตนเองสนใจ 5-10 นาที (ช่วงเช้า)",
      "ครูนำเสนอ 'ภาษาไทยวันละคำ' พร้อมความหมายและการนำไปใช้",
      "จัดกลุ่มช่วยเหลือนักเรียนที่มีปัญหาการแจกลูกสะกดคำ (คลินิกภาษาไทยแบบเพื่อนช่วยเพื่อน)",
      "บันทึกชื่อหนังสือและข้อคิดที่ได้ลงใน 'สมุดบันทึกรักการอ่าน'"
    ],
    tips: "ใช้สื่อนิทานภาพและบัตรคำสีสันสดใสเพื่อดึงดูดความสนใจของเด็กที่ไม่ใช้ภาษาไทยเป็นภาษาแม่",
    isCoreDaily: true
  },
  {
    id: "g3-good-deeds-log",
    goalId: 3,
    timeSlot: "closing_wrapup",
    timeLabel: "16:00 - 16:30 น. (ก่อนเลิกเรียน)",
    role: "student",
    roleLabel: "นักเรียนทุกคน (ครูประจำชั้นตรวจ)",
    title: "บันทึกสมุดบันทึกความดีและสะท้อนคิดบทเรียนประจำวัน",
    description: "นักเรียนจดบันทึกการทำความดีอย่างน้อยวันละ 1 ข้อ (เช่น ช่วยเพื่อนทำความสะอาด แบ่งปัน ช่วยงานครู เก็บขยะ) และสิ่งที่ได้เรียนรู้ในวันนั้น",
    objective: "ปลูกฝังพฤติกรรมเชิงบวก ฝึกการสะท้อนคิด (Reflection) และความภูมิใจในคุณค่าของตนเอง",
    indicators: "ตัวชี้วัด กพด. ด้านที่ 3 (การประเมินคุณธรรมจริยธรรมและค่านิยมหลัก 12 ประการ)",
    points: 10,
    steps: [
      "นักเรียนเขียนบันทึกความดี 1 การกระทำที่ทำในวันนี้ลงในสมุดความดี",
      "ระบุความรู้สึกและประโยชน์ที่ผู้อื่นได้รับจากการทำความดีนั้น",
      "ครูประจำชั้นตรวจ เซ็นรับทราบ และเขียนข้อความให้กำลังใจสัปดาห์ละ 1-2 ครั้ง"
    ],
    tips: "จัดมุม 'ต้นไม้แห่งความดี' ในห้องเรียนเพื่อนำเรื่องราวความดีของนักเรียนมาติดแสดง",
    isCoreDaily: true
  },

  // --- GOAL 5: Environment & Natural Resources ---
  {
    id: "g4-school-cleaning-5s",
    goalId: 5,
    timeSlot: "early_morning",
    timeLabel: "07:15 - 07:45 น. (ช่วงเช้าตรู่)",
    role: "student",
    roleLabel: "นักเรียนทุกกลุ่มสี/ห้องเรียน",
    title: "กิจกรรม 5 ส. พัฒนาเขตพื้นที่รับผิดชอบและดูแลห้องเรียนสะอาด",
    description: "นักเรียนทำความสะอาดเขตพื้นที่รับผิดชอบรอบโรงเรียน กวาดลานใบไม้ ล้างห้องน้ำ และจัดโต๊ะเก้าอี้ในห้องเรียนให้เป็นระเบียบ",
    objective: "ฝึกความรับผิดชอบ การทำงานร่วมกันเป็นทีม และรักษาสภาพแวดล้อมโรงเรียนให้น่าดู น่าอยู่ น่าเรียน",
    indicators: "ตัวชี้วัด กพด. ด้านที่ 4 (สภาพแวดล้อมโรงเรียนสะอาดถูกสุขลักษณะและปลอดภัย)",
    points: 10,
    steps: [
      "นักเรียนแบ่งกลุ่มตามเขตพื้นที่รับผิดชอบ (ห้องเรียน ลานหน้าเสาธง โรงอาหาร โรงเพาะเห็ด)",
      "กวาดขยะ เก็บใบไม้ แยกเศษกิ่งไม้เพื่อนำไปทำปุ๋ยหมัก",
      "เช็ดโต๊ะ กระดานดำ และจัดวางอุปกรณ์การเรียนให้เป็นระเบียบ",
      "ล้างมือด้วยสบู่หลังจากทำความสะอาดเสร็จสิ้น"
    ],
    tips: "ครูเวรเดินตรวจและให้คะแนนความสะอาดเพื่อกระตุ้นจิตสำนึกที่ดี",
    isCoreDaily: true
  },
  {
    id: "g4-waste-segregation-bank",
    goalId: 5,
    timeSlot: "evening_health",
    timeLabel: "15:30 - 16:00 น. (ช่วงเย็น)",
    role: "both",
    roleLabel: "นักเรียนแกนนำธนาคารขยะ + นักเรียนทุกคน",
    title: "กิจกรรมคัดแยกขยะ 4 ประเภท และเปิดธนาคารขยะรีไซเคิล",
    description: "คัดแยกขยะในแต่ละวันออกเป็น 4 ประเภท (ขยะรีไซเคิล, ขยะอินทรีย์/เศษอาหาร, ขยะทั่วไป, ขยะอันตราย) และนำเศษอาหารไปเลี้ยงสัตว์/ทำปุ๋ยหมัก",
    objective: "ลดปริมาณขยะในโรงเรียน ปลูกฝังหลัก 3Rs (Reduce, Reuse, Recycle) และสร้างมูลค่าจากขยะรีไซเคิล",
    indicators: "ตัวชี้วัด กพด. ด้านที่ 4 (การจัดการขยะมูลฝอยและสุขาภิบาลสิ่งแวดล้อมในสถานศึกษา)",
    points: 10,
    steps: [
      "ตรวจสอบถังขยะทุกจุดในโรงเรียนให้มีป้ายสีและสัญลักษณ์ถูกต้อง",
      "นำเศษอาหารจากโรงอาหารไปเทลงในถังหมักปุ๋ยชีวภาพหรือบ่อเลี้ยงหนอนแมลงวันลายสำหรับอาหารปลา/ไก่",
      "นำขวดพลาสติก กล่องนม กระดาษ ไปฝากที่ธนาคารขยะรีไซเคิลของโรงเรียน",
      "บันทึกยอดน้ำหนักขยะรีไซเคิลในสมุดบัญชีธนาคารขยะ"
    ],
    tips: "เปลี่ยนขยะรีไซเคิลเป็นแต้มสะสมแลกอุปกรณ์การเรียนหรือเงินออมในสหกรณ์",
    isCoreDaily: true
  },
  {
    id: "g4-botanical-garden-check",
    goalId: 5,
    timeSlot: "midday_integrated",
    timeLabel: "11:15 - 12:00 น. (คาบเรียนบูรณาการ)",
    role: "student",
    roleLabel: "นักเรียนแกนนำพฤกษศาสตร์",
    title: "กิจกรรมดูแลพันธุ์ไม้ในโครงการสวนพฤกษศาสตร์โรงเรียน",
    description: "สำรวจ บันทึกการเจริญเติบโต และรดน้ำต้นไม้ที่มีป้ายรหัสพรรณไม้ อพ.สธ. ศึกษาคุณสมบัติและพืชสมุนไพรท้องถิ่น",
    objective: "สร้างความตระหนักรู้คุณค่าของความหลากหลายทางชีวภาพและพันธุ์พืชท้องถิ่น",
    indicators: "ตัวชี้วัด กพด. ด้านที่ 4 (การดำเนินงานโครงการอนุรักษ์พันธุกรรมพืชอันเนื่องมาจากพระราชดำริฯ)",
    points: 10,
    steps: [
      "รดน้ำต้นไม้และใส่ปุ๋ยหมักอินทรีย์รอบโคนต้นไม้ในพื้นที่ศึกษา",
      "ตรวจสอบป้ายชื่อพรรณไม้ (ป้ายชื่อพื้นเมือง ชื่อวิทยาศาสตร์ และรหัสพรรณไม้)",
      "จดบันทึกการออกดอก การติดผล หรือการเปลี่ยนแปลงตามฤดูกาลในสมุดทะเบียนพรรณไม้",
      "ศึกษาประโยชน์ทางสมุนไพรหรือภูมิปัญญาพื้นบ้านของพืชแต่ละชนิด"
    ],
    tips: "จัดทำ QR Code ติดบนป้ายพรรณไม้เพื่อให้นักเรียนและชุมชนสแกนเรียนรู้ได้ง่าย",
    isCoreDaily: false
  },
  {
    id: "g4-energy-saving-check",
    goalId: 5,
    timeSlot: "closing_wrapup",
    timeLabel: "16:15 - 16:45 น. (ก่อนปิดอาคาร)",
    role: "both",
    roleLabel: "หัวหน้าห้อง + ครูเวรประจำวัน",
    title: "ตรวจเช็คการประหยัดพลังงาน ปิดไฟ ปิดพัดลม และปิดก๊อกน้ำทุกจุด",
    description: "เดินสำรวจความเรียบร้อยของห้องเรียน อาคารปฏิบัติการ และห้องน้ำ ตรวจสอบให้แน่ใจว่าปิดสวิตช์ไฟ พัดลม และก๊อกน้ำสนิททุกตัว",
    objective: "ปลูกฝังจิตสำนึกการใช้พลังงานอย่างคุ้มค่า ลดการสิ้นเปลืองทรัพยากรธรรมชาติ และป้องกันไฟฟ้าลัดวงจร",
    indicators: "ตัวชี้วัด กพด. ด้านที่ 4 (การใช้พลังงานและทรัพยากรอย่างมีประสิทธิภาพในสถานศึกษา)",
    points: 10,
    steps: [
      "หัวหน้าห้องตรวจเช็คและปิดสวิตช์ไฟ พัดลม อุปกรณ์ไฟฟ้าในห้องเรียนก่อนออกจากห้อง",
      "ปิดหน้าต่าง ประตูล็อคกุญแจให้เรียบร้อย",
      "ครูเวรเดินตรวจเช็ควาล์วน้ำ ก๊อกน้ำตามห้องน้ำและแปลงเกษตร ไม่ให้มีน้ำรั่วไหล",
      "สับคัทเอาท์หรือเบรกเกอร์ที่ไม่จำเป็นในอาคารปฏิบัติการ"
    ],
    tips: "ติดป้ายเตือนใจ 'ปิดไฟเมื่อไม่ใช้ ปิดก๊อกน้ำให้สนิท' ไว้เหนือสวิตช์ทุกจุด",
    isCoreDaily: true
  },

  // --- GOAL 6: Culture & Local Wisdom ---
  {
    id: "g5-thai-manners-greeting",
    goalId: 6,
    timeSlot: "early_morning",
    timeLabel: "07:30 - 08:00 น. (ช่วงรับอรุณ)",
    role: "student",
    roleLabel: "นักเรียนทุกคน",
    title: "กิจกรรม 'ยิ้มง่าย ไหว้สวย ทักทายด้วยไมตรี' และมารยาทไทย",
    description: "ฝึกฝนการไหว้ระดับต่าง ๆ (ไหว้พระ ไหว้ครูอาจารย์/ผู้ใหญ่ ไหว้บุคคลเสมอกัน) การกล่าวคำทักทายและคำขอบคุณอย่างถูกต้อง",
    objective: "สืบทอดเอกลักษณ์วัฒนธรรมไทย ปลูกฝังความอ่อนน้อมถ่อมตนและกิริยามารยาทอันงดงาม",
    indicators: "ตัวชี้วัด กพด. ด้านที่ 5 (ร้อยละของนักเรียนมีมารยาทไทยถูกต้องตามแบบแผนประเพณี)",
    points: 10,
    steps: [
      "นักเรียนกล่าวคำทักทาย 'สวัสดีครับ/สวัสดีค่ะ' พร้อมยกมือไหว้ครูและผู้มาเยือนอย่างถูกต้อง",
      "ฝึกการก้มศีรษะ ปลายนิ้วชี้จรดระหว่างคิ้ว นิ้วหัวแม่มือจรดปลายจมูกสำหรับไหว้ครูอาจารย์",
      "กล่าวคำ 'ขอบคุณครับ/ขอบคุณค่ะ' และ 'ขอโทษครับ/ขอโทษค่ะ' ในสถานการณ์จริงเป็นประจำ"
    ],
    tips: "ครูและรุ่นพี่ปฏิบัติตนเป็นแบบอย่างที่ดีในการรับไหว้และทักทายด้วยความเมตตา",
    isCoreDaily: true
  },
  {
    id: "g5-local-arts-crafts",
    goalId: 6,
    timeSlot: "afternoon_vocational",
    timeLabel: "13:00 - 14:30 น. (คาบกิจกรรมเสริม)",
    role: "both",
    roleLabel: "ปราชญ์ชาวบ้าน + ครู + นักเรียน",
    title: "กิจกรรมสืบทอดดนตรี นาฏศิลป์ หัตถกรรม และภาษาถิ่น",
    description: "ฝึกซ้อมดนตรีพื้นบ้าน นาฏศิลป์ท้องถิ่น งานจักสาน ทอผ้า หรือการเล่าเรื่องราวนิทานพื้นบ้านชนเผ่า/ท้องถิ่น",
    objective: "ธำรงรักษาและภาคภูมิใจในมรดกทางวัฒนธรรมและภูมิปัญญาบรรพบุรุษของท้องถิ่น",
    indicators: "ตัวชี้วัด กพด. ด้านที่ 5 (การอนุรักษ์สืบทอดภูมิปัญญาท้องถิ่นและการมีส่วนร่วมของปราชญ์ชาวบ้าน)",
    points: 10,
    steps: [
      "เชิญปราชญ์ชาวบ้านหรือผู้ทรงคุณวุฒิท้องถิ่นร่วมถ่ายทอดองค์ความรู้ในโรงเรียน",
      "นักเรียนฝึกปฏิบัติจริง เช่น การจักสานไม้ไผ่ การย้อมสีธรรมชาติ การตีกลองพื้นเมือง",
      "บันทึกองค์ความรู้และคำศัพท์ภาษาถิ่นลงใน 'สมุดคลังปัญญาท้องถิ่น'",
      "นำผลงานฝีมือนักเรียนไปจัดแสดงหรือจำหน่ายผ่านร้านค้าสหกรณ์นักเรียน"
    ],
    tips: "จัดมุมนิทรรศการวัฒนธรรมท้องถิ่นที่มีชีวิตในโรงเรียน ให้นักเรียนได้ศึกษาทุกวัน",
    isCoreDaily: false
  },

  // --- GOAL 4: School Agriculture & Vocational Skills ---
  {
    id: "g6-farm-daily-care",
    goalId: 4,
    timeSlot: "afternoon_agri",
    timeLabel: "14:30 - 15:30 น. (ชั่วโมงการงานอาชีพ/เกษตร)",
    role: "both",
    roleLabel: "ครูเกษตร + นักเรียนกลุ่มเกษตร",
    title: "ปฏิบัติการแปลงเกษตร ดูแลพืชผัก เลี้ยงไก่ไข่ ปลา และเพาะเห็ด",
    description: "รดน้ำแปลงผัก พรวนดิน กำจัดวัชพืช ให้อาหารไก่ไข่ ให้อาหารปลา รดน้ำโรงเพาะเห็ด และดูแลสุขอนามัยคอกสัตว์",
    objective: "ฝึกทักษะอาชีพการเกษตรตามหลักปรัชญาเศรษฐกิจพอเพียง และผลิตอาหารปลอดภัยสำหรับโครงการอาหารกลางวัน",
    indicators: "ตัวชี้วัด กพด. ด้านที่ 6 (ปริมาณผลผลิตทางการเกษตรที่ผลิตได้ในสถานศึกษาเทียบกับเกณฑ์ความต้องการ)",
    points: 10,
    steps: [
      "ตรวจดูสุขภาพพืชในแปลงผัก รดน้ำด้วยระบบน้ำหยดหรือบัวรดน้ำอย่างทั่วถึง",
      "ให้อาหารไก่ไข่ เก็บมูลไก่ และตรวจเช็คความสะอาดของรางน้ำและรังไข่",
      "ให้อาหารปลาในบ่อดิน/กระชัง และตรวจวัดคุณภาพน้ำเบื้องต้น",
      "รดน้ำสร้างความชื้นในโรงเรือนเพาะเห็ดนางฟ้า/เห็ดฟางวันละ 2-3 ครั้ง"
    ],
    tips: "เน้นการใช้ปุ๋ยหมักชีวภาพและสารสกัดสมุนไพรไล่แมลง ปลอดสารเคมี 100%",
    isCoreDaily: true
  },
  {
    id: "g6-harvest-log-to-kitchen",
    goalId: 4,
    timeSlot: "early_morning",
    timeLabel: "07:00 - 08:00 น. (ช่วงเก็บผลผลิตเช้า)",
    role: "both",
    roleLabel: "ครูผู้รับผิดชอบฟาร์ม + นักเรียนเวรฟาร์ม",
    title: "เก็บเกี่ยวผลผลิตและจดบันทึกปริมาณส่งเข้าโรงอาหารและสหกรณ์",
    description: "เก็บเกี่ยวผลผลิตการเกษตรประจำวัน (ไข่ไก่ ผักสด เห็ด ปลา) ชั่งน้ำหนัก นับจำนวน และจดบันทึกในสมุดทะเบียนผลผลิตทางการเกษตร",
    objective: "สร้างความโปร่งใส ตรวจสอบย้อนกลับได้ และเชื่อมโยงห่วงโซ่ผลผลิตจากฟาร์มสู่สหกรณ์และครัวอาหารกลางวัน",
    indicators: "ตัวชี้วัด กพด. ด้านที่ 6 (การบันทึกปริมาณผลผลิตทางการเกษตรรายวันอย่างถูกต้องครบถ้วน)",
    points: 10,
    steps: [
      "เก็บไข่ไก่ช่วงเช้า คัดแยกขนาด ทำความสะอาด และนับจำนวนเป็นฟอง",
      "ตัดเก็บผักสดและเห็ดนางฟ้า ชั่งน้ำหนักเป็นกิโลกรัม",
      "จดบันทึกข้อมูลใน 'สมุดทะเบียนผลผลิตฟาร์ม' ระบุชนิด จำนวน และมูลค่าตามราคาสหกรณ์",
      "ส่งมอบผลผลิตให้ผู้จัดการร้านค้าสหกรณ์นักเรียนเพื่อจำหน่ายต่อให้ครัวอาหารกลางวัน"
    ],
    tips: "ติดป้ายแสดงสถิติผลผลิตประจำวันบนบอร์ดฟาร์มเพื่อให้นักเรียนทุกคนได้ติดตาม",
    isCoreDaily: true
  },

  // --- GOAL 7: Student Cooperative & Self-Reliance ---
  {
    id: "g7-coop-store-operation",
    goalId: 7,
    timeSlot: "midday_integrated",
    timeLabel: "11:45 - 12:30 น. (ช่วงพักกลางวัน)",
    role: "both",
    roleLabel: "กรรมการสหกรณ์นักเรียน + ครูที่ปรึกษา",
    title: "เปิดดำเนินการร้านค้าสหกรณ์นักเรียนและจัดซื้อผลผลิตฟาร์ม",
    description: "คณะกรรมการสหกรณ์นักเรียนเปิดให้บริการจำหน่ายอุปกรณ์การเรียน ของใช้จำเป็น รับซื้อผลผลิตจากฟาร์ม และขายให้โครงการอาหารกลางวัน",
    objective: "ฝึกทักษะการบริหารจัดการธุรกิจสหกรณ์ ประชาธิปไตย ความซื่อสัตย์ และการทำงานร่วมกัน",
    indicators: "ตัวชี้วัด กพด. ด้านที่ 7 (การดำเนินงานสหกรณ์นักเรียนครบ 4 กิจกรรม และการจัดทำบัญชีสหกรณ์)",
    points: 10,
    steps: [
      "ตรวจนับสต็อกสินค้า อุปกรณ์การเรียน และผลผลิตทางการเกษตรที่รับเข้ามา",
      "ให้บริการจำหน่ายสินค้า บันทึกใบเสร็จรับเงินหรือสมุดบันทึกการขายรายวัน",
      "ตรวจนับยอดเงินสดคงเหลือประจำวันและกระทบยอดกับใบเสร็จ",
      "ลงบัญชีเงินสด บัญชีคุมสินค้า และสรุปยอดขายประจำวัน"
    ],
    tips: "ส่งเสริมให้สหกรณ์นักเรียนจำหน่ายเฉพาะสินค้าที่มีประโยชน์ ปลอดภัย ไม่มีขนมกรุบกรอบหรือน้ำอัดลม",
    isCoreDaily: true
  },
  {
    id: "g7-daily-savings-account",
    goalId: 7,
    timeSlot: "early_morning",
    timeLabel: "07:30 - 08:00 น. (ช่วงเช้า)",
    role: "both",
    roleLabel: "เจ้าหน้าที่ออมทรัพย์นักเรียน + นักเรียนทุกคน",
    title: "กิจกรรมส่งเสริมการออมทรัพย์นักเรียนประจำวัน",
    description: "นักเรียนนำเงินค่าขนมส่วนที่เหลือมาฝากออมทรัพย์กับสหกรณ์นักเรียน เจ้าหน้าที่ลงบันทึกในสมุดคู่ฝากและทะเบียนคุมยอดเงินฝาก",
    objective: "ปลูกฝังวินัยทางการเงิน การประหยัดอดออม และการวางแผนทางการเงินเพื่ออนาคต",
    indicators: "ตัวชี้วัด กพด. ด้านที่ 7 (ร้อยละของนักเรียนที่มีเงินออมสม่ำเสมอและมียอดเงินออมเฉลี่ยต่อคน)",
    points: 10,
    steps: [
      "นักเรียนนำสมุดเงินฝากและเงินสดมายื่นที่จุดรับฝากออมทรัพย์ประจำห้องเรียน",
      "เจ้าหน้าที่นักเรียนตรวจสอบจำนวนเงินและบันทึกลงในสมุดคู่ฝากพร้อมลงลายมือชื่อ",
      "รวบรวมเงินและส่งมอบให้ครูที่ปรึกษาสหกรณ์นำไปฝากธนาคารพาณิชย์/ธ.ก.ส.",
      "ประกาศยกย่องนักเรียนที่มีวินัยการออมสม่ำเสมอประจำเดือน"
    ],
    tips: "แม้จะออมเพียงวันละ 1 บาท หรือ 5 บาท ก็นับเป็นความสำเร็จในการสร้างวินัยชีวิต",
    isCoreDaily: true
  },
  {
    id: "g7-household-income-expense-log",
    goalId: 7,
    timeSlot: "closing_wrapup",
    timeLabel: "16:00 - 16:30 น. (ก่อนเลิกเรียน)",
    role: "student",
    roleLabel: "นักเรียนชั้น ป.4 - ม.3",
    title: "บันทึก 'บัญชีต้นกล้าเศรษฐกิจพอเพียง' (สมุดบัญชีรายรับ-รายจ่าย)",
    description: "นักเรียนบันทึกรายรับ-รายจ่ายส่วนตัวในแต่ละวัน (เงินที่ได้รับจากผู้ปกครอง, ค่าอาหาร, เงินออม, รายได้เสริม) ลงในสมุดบัญชีต้นกล้า",
    objective: "ฝึกทักษะการทำบัญชีส่วนบุคคล การวิเคราะห์ค่าใช้จ่ายที่จำเป็นและไม่จำเป็นตามหลักพอเพียง",
    indicators: "ตัวชี้วัด กพด. ด้านที่ 7 (ร้อยละของนักเรียนชั้น ป.4 ขึ้นไปสามารถจัดทำบัญชีรายรับ-รายจ่ายได้ถูกต้อง)",
    points: 10,
    steps: [
      "นักเรียนเปิดสมุดบัญชีต้นกล้าเศรษฐกิจพอเพียง",
      "บันทึกรายการรายรับในวันนี้ (เช่น ค่าขนม รายได้จากการขายผลผลิต)",
      "บันทึกรายการรายจ่ายในวันนี้ (เช่น ค่าดินสอ ค่าขนม เงินฝากออมทรัพย์)",
      "คำนวณยอดเงินคงเหลือยกไป และตรวจสอบความถูกต้อง"
    ],
    tips: "สอนให้นักเรียนสังเกตรายการที่ไม่จำเป็นและวางแผนลดรายจ่ายฟุ่มเฟือยในวันถัดไป",
    isCoreDaily: true
  },

  // --- GOAL 8: Community Learning & Service Center ---
  {
    id: "g8-clean-water-community-service",
    goalId: 8,
    timeSlot: "early_morning",
    timeLabel: "07:00 - 17:00 น. (บริการตลอดวัน)",
    role: "both",
    roleLabel: "ครูบริการชุมชน + นักเรียนแกนนำ",
    title: "เปิดจุดบริการน้ำดื่มสะอาดและน้ำกรองคุณภาพแก่ชุมชนรอบโรงเรียน",
    description: "ตรวจสอบระบบเครื่องกรองน้ำ ตรวจเช็คค่าความสะอาด (TDS/คลอรีน) และเปิดจุดบริการน้ำดื่มสะอาดให้ชาวบ้านและผู้ปกครองเข้ามารับบริการ",
    objective: "ให้โรงเรียนเป็นแหล่งพึ่งพิงด้านสุขาภิบาลน้ำดื่ม ยกระดับสุขภาพชุมชน และเสริมสร้างความสัมพันธ์อันดี",
    indicators: "ตัวชี้วัด กพด. ด้านที่ 8 (การให้บริการด้านสุขอนามัยและน้ำดื่มสะอาดแก่ชุมชนโดยรอบสถานศึกษา)",
    points: 10,
    steps: [
      "ตรวจสอบแรงดันน้ำ สภาพไส้กรอง และความสะอาดของหัวจ่ายน้ำดื่มชุมชน",
      "เปิดวาล์วจ่ายน้ำและดูแลความสะอาดบริเวณจุดรองรับน้ำของประชาชน",
      "จดบันทึกสถิติปริมาณการใช้น้ำหรือจำนวนครัวเรือนที่มารับบริการน้ำดื่ม",
      "ทำความสะอาดบริเวณรอบจุดบริการน้ำดื่มทุกเย็นหลังปิดบริการ"
    ],
    tips: "ติดตั้งป้ายแสดงผลการตรวจคุณภาพน้ำดื่ม (ผ่านเกณฑ์มาตรฐาน) เพื่อสร้างความมั่นใจให้ชุมชน",
    isCoreDaily: true
  },
  {
    id: "g8-community-agri-learning-hub",
    goalId: 8,
    timeSlot: "afternoon_agri",
    timeLabel: "15:00 - 16:30 น. (ช่วงบ่าย)",
    role: "both",
    roleLabel: "ครูเกษตร + นักเรียนแกนนำ + ผู้ปกครอง",
    title: "เปิดสถานศึกษาเป็นศูนย์เรียนรู้เกษตรธรรมชาติและสาธิตเทคโนโลยีแก่ชุมชน",
    description: "ต้อนรับผู้ปกครองและเกษตรกรในหมู่บ้านเข้ามาศึกษาดูงานแปลงเกษตรสาธิต โรงปุ๋ยหมักชีวภาพ และการเพาะเห็ดในโรงเรียน",
    objective: "ถ่ายทอดองค์ความรู้และเทคโนโลยีการเกษตรที่เหมาะสม ขยายผลสู่ครัวเรือนเพื่อความมั่นคงทางอาหารของชุมชน",
    indicators: "ตัวชี้วัด กพด. ด้านที่ 8 (จำนวนผู้ปกครองและชุมชนที่ได้รับการถ่ายทอดความรู้และนำไปประยุกต์ใช้)",
    points: 10,
    steps: [
      "จัดเตรียมนิทรรศการมีชีวิตและป้ายอธิบายองค์ความรู้ในแต่ละฐานการเรียนรู้",
      "นักเรียนแกนนำทำหน้าที่เป็น 'มัคคุเทศก์น้อย' อธิบายขั้นตอนการดูแลพืชและสัตว์",
      "แจกจ่ายกล้าพันธุ์ผัก เมล็ดพันธุ์ หรือปุ๋ยหมักชีวภาพให้ผู้ปกครองนำไปขยายผลที่บ้าน",
      "บันทึกรายชื่อและข้อคิดเห็นของผู้เข้ามาศึกษาดูงานในสมุดเยี่ยมชม"
    ],
    tips: "จัดเวทีแลกเปลี่ยนเรียนรู้ร่วมกับผู้นำหมู่บ้านและ อสม. เดือนละ 1-2 ครั้ง",
    isCoreDaily: false
  }
];

// Time Slot Metadata for Timeline View
export const TIMELINE_SLOTS = [
  { id: "early_morning", label: "ช่วงเช้าตรู่ (07:00 - 08:00 น.)", desc: "สุขอนามัยแรกรับ, น้ำดื่มไอโอดีน, ออมทรัพย์, บันทึกผลผลิตฟาร์ม" },
  { id: "morning_assembly", label: "เข้าแถวเคารพธงชาติ (08:00 - 08:30 น.)", desc: "เคารพธงชาติ, สวดมนต์, มารยาทไทย, 5 นาทีเสริมสร้างคุณธรรม" },
  { id: "academic_morning", label: "ภาควิชาการหลัก (08:30 - 10:00 น.)", desc: "10 นาทีรักการอ่าน, ภาษาไทยวันละคำ, คลินิกภาษาไทย, วิทย์-คณิต" },
  { id: "morning_break", label: "พักเบรกเช้า (10:00 - 10:15 น.)", desc: "ดื่มนมโรงเรียนครบทุกคน, น้ำดื่มเสริมไอโอดีน, สุขอนามัยล้างมือ" },
  { id: "midday_integrated", label: "บูรณาการ & สหกรณ์ (10:15 - 12:00 น.)", desc: "ร้านค้าสหกรณ์นักเรียน, งานสวนพฤกษศาสตร์โรงเรียน" },
  { id: "lunch_hygiene", label: "อาหารกลางวัน & แปรงฟัน (12:00 - 13:00 น.)", desc: "อาหาร 5 หมู่, เกลือไอโอดีน, แปรงฟันหลังอาหาร 2 นาที" },
  { id: "afternoon_vocational", label: "ทักษะอาชีพ & ภูมิปัญญา (13:00 - 14:30 น.)", desc: "งานช่าง, หัตถกรรมพื้นบ้าน, ปราชญ์ชาวบ้าน, ศิลปวัฒนธรรม" },
  { id: "afternoon_agri", label: "เกษตรเพื่ออาหารกลางวัน (14:30 - 15:30 น.)", desc: "ดูแลแปลงผัก, ให้อาหารไก่ไข่/ปลา, ศูนย์เรียนรู้เกษตรชุมชน" },
  { id: "evening_health", label: "พลศึกษา & สิ่งแวดล้อม (15:30 - 16:15 น.)", desc: "ออกกำลังกาย, 5 ส., ธนาคารขยะ, คัดแยกขยะ 4 ประเภท" },
  { id: "closing_wrapup", label: "สรุปบันทึกประจำวัน (16:15 - 17:00 น.)", desc: "สมุดบันทึกความดี, บัญชีต้นกล้า, ปิดน้ำ-ไฟ, บริการชุมชน" }
];

export default function DailyRoutineGuide() {
  const [activeMainTab, setActiveMainTab] = useState<"goals" | "timeline" | "roles" | "assessment">("goals");
  const [selectedGoalId, setSelectedGoalId] = useState<number | "all">("all");
  const [selectedRole, setSelectedRole] = useState<"all" | "teacher" | "student">("all");
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [onlyCoreDaily, setOnlyCoreDaily] = useState<boolean>(false);
  const [inspectorName, setInspectorName] = useState<string>("");
  const [schoolName, setSchoolName] = useState<string>("โรงเรียน ตชด. สังกัด บก.ตชด. ภาค 2");
  const [inspectionDate, setInspectionDate] = useState<string>(new Date().toISOString().split("T")[0]);

  // Persisted checked activities
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>(() => {
    try {
      const saved = safeLocalStorage.getItem("kopodot_daily_routine_v2_checklist");
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  useEffect(() => {
    safeLocalStorage.setItem("kopodot_daily_routine_v2_checklist", JSON.stringify(checkedItems));
  }, [checkedItems]);

  const toggleCheck = (id: string) => {
    setCheckedItems((prev) => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const handleCheckAllFiltered = (ids: string[]) => {
    const updated = { ...checkedItems };
    ids.forEach(id => {
      updated[id] = true;
    });
    setCheckedItems(updated);
  };

  const handleUncheckAllFiltered = (ids: string[]) => {
    const updated = { ...checkedItems };
    ids.forEach(id => {
      delete updated[id];
    });
    setCheckedItems(updated);
  };

  const handleResetAll = () => {
    if (window.confirm("คุณต้องการรีเซ็ตเช็คลิสต์กิจกรรมประจำวันทั้งหมดใช่หรือไม่?")) {
      setCheckedItems({});
    }
  };

  const handlePrint = () => {
    window.print();
  };

  // Filtered activities
  const filteredActivities = useMemo(() => {
    return COMPREHENSIVE_DAILY_ACTIVITIES.filter((act) => {
      if (selectedGoalId !== "all" && act.goalId !== selectedGoalId) return false;
      if (selectedRole !== "all" && act.role !== selectedRole && act.role !== "both") return false;
      if (selectedTimeSlot !== "all" && act.timeSlot !== selectedTimeSlot) return false;
      if (onlyCoreDaily && !act.isCoreDaily) return false;

      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const matchTitle = act.title.toLowerCase().includes(term);
        const matchDesc = act.description.toLowerCase().includes(term);
        const matchObj = act.objective.toLowerCase().includes(term);
        const matchInd = act.indicators.toLowerCase().includes(term);
        const matchSteps = act.steps.some((s) => s.toLowerCase().includes(term));
        if (!matchTitle && !matchDesc && !matchObj && !matchInd && !matchSteps) {
          return false;
        }
      }
      return true;
    });
  }, [selectedGoalId, selectedRole, selectedTimeSlot, onlyCoreDaily, searchTerm]);

  // Statistics
  const totalActivitiesCount = COMPREHENSIVE_DAILY_ACTIVITIES.length;
  const completedCount = COMPREHENSIVE_DAILY_ACTIVITIES.filter((a) => checkedItems[a.id]).length;
  const totalPoints = COMPREHENSIVE_DAILY_ACTIVITIES.reduce((sum, a) => sum + a.points, 0);
  const earnedPoints = COMPREHENSIVE_DAILY_ACTIVITIES.filter((a) => checkedItems[a.id]).reduce((sum, a) => sum + a.points, 0);
  const progressPercent = totalActivitiesCount > 0 ? Math.round((completedCount / totalActivitiesCount) * 100) : 0;

  return (
    <div className="w-full max-w-7xl mx-auto px-3 sm:px-6 py-5 space-y-4">
      {/* Quick Metrics & Actions Bar */}
      <div className="app-card-surface bg-gradient-to-r from-amber-500/10 via-amber-100/20 to-slate-50 border border-amber-200/90 p-4 sm:p-5 space-y-3.5 shadow-2xs">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="bg-white/90 px-3 py-1.5 rounded-xl border border-amber-200/80 shadow-2xs flex items-center gap-2">
              <Target className="w-4 h-4 text-amber-600" />
              <div className="text-xs">
                <span className="text-slate-500 text-[10px] block">ครอบคลุม</span>
                <span className="font-extrabold text-slate-900">8 เป้าหมายหลัก กพด.</span>
              </div>
            </div>

            <div className="bg-white/90 px-3 py-1.5 rounded-xl border border-emerald-200/80 shadow-2xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <div className="text-xs">
                <span className="text-slate-500 text-[10px] block">ความสำเร็จวันนี้</span>
                <span className="font-black text-emerald-700">
                  {completedCount} / {totalActivitiesCount} รายการ ({progressPercent}%)
                </span>
              </div>
            </div>

            <div className="bg-white/90 px-3 py-1.5 rounded-xl border border-orange-200/80 shadow-2xs flex items-center gap-2">
              <Award className="w-4 h-4 text-orange-600" />
              <div className="text-xs">
                <span className="text-slate-500 text-[10px] block">คะแนนสะสมสุขภาวะ</span>
                <span className="font-black text-orange-700">
                  {earnedPoints} / {totalPoints} คะแนน
                </span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleResetAll}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-amber-50 text-amber-900 text-xs font-bold transition border border-amber-200 cursor-pointer shadow-2xs active:scale-95"
              title="รีเซ็ตสถานะเช็คลิสต์ทั้งหมด"
            >
              <RotateCcw className="w-3.5 h-3.5 text-amber-600" />
              <span>รีเซ็ต</span>
            </button>

            <button
              type="button"
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-xs font-extrabold transition shadow-2xs cursor-pointer active:scale-95"
              title="พิมพ์แบบฟอร์มเช็คลิสต์ตรวจงานรายวัน"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>พิมพ์ / บันทึก PDF</span>
            </button>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-slate-200/80 rounded-full h-2 overflow-hidden">
          <div
            className="bg-gradient-to-r from-amber-500 via-emerald-500 to-teal-500 h-full rounded-full transition-all duration-500"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Main View Mode Selector (Tabs) */}
      <div className="bg-white rounded-2xl border border-slate-200 p-2 shadow-xs flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            type="button"
            onClick={() => setActiveMainTab("goals")}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-black transition flex items-center gap-2 cursor-pointer ${
              activeMainTab === "goals"
                ? "bg-amber-600 text-white shadow-xs"
                : "text-slate-700 hover:bg-slate-100"
            }`}
          >
            <Target className="w-4 h-4 text-amber-300" />
            <span>1. แยกตาม 8 เป้าหมาย กพด.</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveMainTab("timeline")}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-black transition flex items-center gap-2 cursor-pointer ${
              activeMainTab === "timeline"
                ? "bg-amber-600 text-white shadow-xs"
                : "text-slate-700 hover:bg-slate-100"
            }`}
          >
            <Clock className="w-4 h-4 text-amber-300" />
            <span>2. ลำดับเวลาตลอดวัน (Timeline)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveMainTab("roles")}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-black transition flex items-center gap-2 cursor-pointer ${
              activeMainTab === "roles"
                ? "bg-amber-600 text-white shadow-xs"
                : "text-slate-700 hover:bg-slate-100"
            }`}
          >
            <Users className="w-4 h-4 text-amber-300" />
            <span>3. แยกตามบทบาทผู้รับผิดชอบ</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveMainTab("assessment")}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-black transition flex items-center gap-2 cursor-pointer ${
              activeMainTab === "assessment"
                ? "bg-amber-600 text-white shadow-xs"
                : "text-slate-700 hover:bg-slate-100"
            }`}
          >
            <FileCheck className="w-4 h-4 text-amber-300" />
            <span>4. แบบบันทึกตรวจงานประจำวัน (Official Sheet)</span>
          </button>
        </div>

        {/* Quick check/uncheck for currently filtered items */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => handleCheckAllFiltered(filteredActivities.map((a) => a.id))}
            className="text-xs font-bold text-emerald-700 hover:text-emerald-800 hover:bg-emerald-50 px-2.5 py-1.5 rounded-lg transition border border-emerald-200 cursor-pointer"
            title="เช็คทั้งหมดในหน้านี้"
          >
            เช็คทั้งหมด ({filteredActivities.length})
          </button>
          <button
            type="button"
            onClick={() => handleUncheckAllFiltered(filteredActivities.map((a) => a.id))}
            className="text-xs font-bold text-slate-600 hover:text-slate-800 hover:bg-slate-100 px-2.5 py-1.5 rounded-lg transition border border-slate-200 cursor-pointer"
            title="ยกเลิกเช็คในหน้านี้"
          >
            ยกเลิกเช็ค
          </button>
        </div>
      </div>

      {/* Goal Filter Pills (Visible when in "goals" tab) */}
      {activeMainTab === "goals" && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-9 gap-2">
          <button
            type="button"
            onClick={() => setSelectedGoalId("all")}
            className={`p-2.5 rounded-2xl border text-left transition flex flex-col justify-between cursor-pointer ${
              selectedGoalId === "all"
                ? "bg-slate-900 text-white border-slate-900 shadow-md"
                : "bg-white text-slate-700 border-slate-200 hover:border-slate-300 hover:bg-slate-50"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-black">ทั้งหมด</span>
              <Layers className="w-3.5 h-3.5 opacity-80" />
            </div>
            <div className="text-xs font-bold mt-1 truncate">ครบ 8 เป้าหมาย</div>
          </button>

          {PLAN5_GOAL_INFOS.map((goal) => {
            const GoalIcon = goal.icon;
            const isSelected = selectedGoalId === goal.id;
            const goalActivities = COMPREHENSIVE_DAILY_ACTIVITIES.filter((a) => a.goalId === goal.id);
            const goalDoneCount = goalActivities.filter((a) => checkedItems[a.id]).length;

            return (
              <button
                key={goal.id}
                type="button"
                onClick={() => setSelectedGoalId(goal.id)}
                className={`p-2.5 rounded-2xl border text-left transition flex flex-col justify-between cursor-pointer relative overflow-hidden ${
                  isSelected
                    ? "bg-amber-600 text-white border-amber-700 shadow-md"
                    : `${goal.colorBg} ${goal.colorText} ${goal.colorBorder} hover:shadow-xs`
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className={`text-[10px] font-black whitespace-nowrap shrink-0 ${isSelected ? "text-amber-200" : "opacity-80"}`}>
                    เป้าหมายที่ {goal.id}
                  </span>
                </div>
                <div className="text-[11px] font-extrabold mt-1 truncate">
                  {goal.shortName}
                </div>
                <div className="text-[10px] opacity-75 mt-0.5">
                  {goalDoneCount}/{goalActivities.length} เสร็จ
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-white p-3 sm:p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          {/* Role Filter */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs">
            <button
              type="button"
              onClick={() => setSelectedRole("all")}
              className={`px-2.5 py-1 rounded-lg font-bold transition cursor-pointer ${
                selectedRole === "all" ? "bg-white text-slate-900 shadow-2xs font-black" : "text-slate-600"
              }`}
            >
              ทุกบทบาท
            </button>
            <button
              type="button"
              onClick={() => setSelectedRole("teacher")}
              className={`px-2.5 py-1 rounded-lg font-bold transition flex items-center gap-1 cursor-pointer ${
                selectedRole === "teacher" ? "bg-white text-amber-700 shadow-2xs font-black" : "text-slate-600"
              }`}
            >
              <Users className="w-3 h-3" />
              <span>ครู/บุคลากร</span>
            </button>
            <button
              type="button"
              onClick={() => setSelectedRole("student")}
              className={`px-2.5 py-1 rounded-lg font-bold transition flex items-center gap-1 cursor-pointer ${
                selectedRole === "student" ? "bg-white text-orange-700 shadow-2xs font-black" : "text-slate-600"
              }`}
            >
              <GraduationCap className="w-3 h-3" />
              <span>นักเรียน</span>
            </button>
          </div>

          {/* Time Slot Filter */}
          <select
            value={selectedTimeSlot}
            onChange={(e) => setSelectedTimeSlot(e.target.value)}
            className="text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
          >
            <option value="all">ทุกช่วงเวลาของวัน</option>
            {TIMELINE_SLOTS.map((slot) => (
              <option key={slot.id} value={slot.id}>
                {slot.label}
              </option>
            ))}
          </select>

          {/* Core Daily Only Toggle */}
          <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={onlyCoreDaily}
              onChange={(e) => setOnlyCoreDaily(e.target.checked)}
              className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500"
            />
            <span>เฉพาะกิจกรรมหลักทุกวัน (Core Daily)</span>
          </label>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="ค้นหากิจกรรม, ตัวชี้วัด, สุขอนามัย..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-8 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50/80 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm("")}
              className="absolute right-2.5 top-2.5 text-xs text-slate-400 hover:text-slate-600 font-bold"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* ----------------- TAB 1: GOALS VIEW ----------------- */}
      {activeMainTab === "goals" && (
        <div className="space-y-6">
          {PLAN5_GOAL_INFOS.filter((g) => selectedGoalId === "all" || selectedGoalId === g.id).map((goal) => {
            const GoalIcon = goal.icon;
            const goalActivities = filteredActivities.filter((a) => a.goalId === goal.id);

            if (goalActivities.length === 0) return null;

            return (
              <div
                key={goal.id}
                className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col"
              >
                {/* Goal Header */}
                <div className={`p-4 sm:p-5 border-b flex flex-wrap items-center justify-between gap-3 ${goal.colorBg} ${goal.colorBorder}`}>
                  <div className="flex items-center gap-3.5">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className={`text-[16px] font-black px-3 py-1 rounded-full border ${goal.colorBadge}`} style={{ fontSize: "16px" }}>
                          {goal.code}
                        </span>
                        <h2 className="text-[15.875px] font-black text-slate-900 ml-[14px]" style={{ fontSize: "15.875px", marginLeft: "14px" }}>
                          {goal.name}
                        </h2>
                      </div>
                      <p className="text-xs text-slate-600 font-medium mt-0.5 max-w-3xl">
                        {goal.summary}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black text-slate-700 bg-white/80 px-3 py-1 rounded-xl border border-slate-200 shadow-2xs">
                      {goalActivities.filter((a) => checkedItems[a.id]).length} / {goalActivities.length} กิจกรรมเสร็จสิ้น
                    </span>
                  </div>
                </div>

                {/* Activities List */}
                <div className="p-4 sm:p-5 space-y-4 bg-slate-50/40">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {goalActivities.map((activity) => {
                      const isDone = !!checkedItems[activity.id];
                      return (
                        <div
                          key={activity.id}
                          onClick={() => toggleCheck(activity.id)}
                          className={`p-4 rounded-2xl transition border cursor-pointer flex flex-col justify-between gap-3 select-none ${
                            isDone
                              ? "bg-emerald-50/80 border-emerald-300 text-slate-900 shadow-xs"
                              : "bg-white border-slate-200/90 hover:border-amber-400 hover:bg-amber-50/30 shadow-2xs"
                          }`}
                        >
                          <div className="space-y-2">
                            {/* Top metadata badge */}
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className={`text-[10px] font-black px-2 py-0.5 rounded-md border ${
                                  activity.role === "teacher"
                                    ? "bg-blue-50 text-blue-800 border-blue-200"
                                    : activity.role === "student"
                                    ? "bg-orange-50 text-orange-800 border-orange-200"
                                    : "bg-purple-50 text-purple-800 border-purple-200"
                                }`}>
                                  {activity.roleLabel}
                                </span>
                                <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                                  {activity.timeLabel}
                                </span>
                                {activity.isCoreDaily && (
                                  <span className="text-[10px] font-black text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded-md border border-rose-200">
                                    ทุกวันเรียน
                                  </span>
                                )}
                              </div>

                              <div className="flex items-center gap-1.5 shrink-0">
                                <span className="text-[11px] font-black text-amber-700 bg-amber-100 px-2 py-0.5 rounded-md">
                                  +{activity.points} แต้ม
                                </span>
                                <input
                                  type="checkbox"
                                  checked={isDone}
                                  onChange={() => {}}
                                  className="w-5 h-5 text-emerald-600 rounded-md border-slate-300 focus:ring-emerald-500 shrink-0 cursor-pointer"
                                />
                              </div>
                            </div>

                            {/* Title & Description */}
                            <div>
                              <h3 className={`text-sm sm:text-base font-extrabold leading-snug ${
                                isDone ? "line-through text-slate-500" : "text-slate-900"
                              }`}>
                                {activity.title}
                              </h3>
                              <p className={`text-xs mt-1 leading-relaxed ${
                                isDone ? "text-slate-400" : "text-slate-600"
                              }`}>
                                {activity.description}
                              </p>
                            </div>

                            {/* Action Steps */}
                            {activity.steps && activity.steps.length > 0 && (
                              <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200/80 space-y-1">
                                <span className="text-[11px] font-bold text-slate-700 flex items-center gap-1">
                                  <CircleDot className="w-3 h-3 text-amber-500" />
                                  <span>ขั้นตอนการปฏิบัติสำคัญ:</span>
                                </span>
                                <ul className="list-disc list-inside text-xs text-slate-600 space-y-0.5 pl-1">
                                  {activity.steps.map((step, sIdx) => (
                                    <li key={sIdx} className={isDone ? "line-through text-slate-400" : "text-slate-700"}>
                                      {step}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>

                          {/* Footer indicator tag */}
                          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                            <span className="truncate pr-2" title={activity.indicators}>
                              📌 {activity.indicators}
                            </span>
                            <span className="font-bold shrink-0 text-amber-700">
                              เป้าหมายที่ {activity.goalId}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ----------------- TAB 2: TIMELINE VIEW ----------------- */}
      {activeMainTab === "timeline" && (
        <div className="space-y-6">
          <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 flex items-center gap-3">
            <Clock className="w-6 h-6 text-blue-600 shrink-0" />
            <div className="text-xs text-blue-900">
              <strong className="font-extrabold text-sm block">ลำดับกิจวัตรประจำวันตั้งแต่ 07:00 - 17:00 น. (Chronological Timeline)</strong>
              จัดหมวดหมู่ตามช่วงเวลาของวันเรียน เพื่อให้ครูเวรและนักเรียนสามารถตรวจสอบความพร้อมและปฏิบัติงานได้อย่างราบรื่น
            </div>
          </div>

          <div className="space-y-4">
            {TIMELINE_SLOTS.map((slot, index) => {
              const slotActivities = filteredActivities.filter((a) => a.timeSlot === slot.id);
              if (slotActivities.length === 0 && selectedTimeSlot !== "all") return null;

              return (
                <div
                  key={slot.id}
                  className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden"
                >
                  {/* Slot Header */}
                  <div className="bg-slate-900 text-white px-5 py-3.5 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-amber-500 text-slate-950 font-black flex items-center justify-center text-xs shrink-0">
                        {index + 1}
                      </div>
                      <div>
                        <h3 className="font-black text-sm sm:text-base text-amber-300">
                          {slot.label}
                        </h3>
                        <p className="text-xs text-slate-300 font-medium">
                          {slot.desc}
                        </p>
                      </div>
                    </div>

                    <span className="text-xs font-bold bg-slate-800 px-3 py-1 rounded-xl text-slate-300 border border-slate-700">
                      {slotActivities.filter((a) => checkedItems[a.id]).length} / {slotActivities.length} เสร็จ
                    </span>
                  </div>

                  {/* Slot Items */}
                  <div className="p-4 sm:p-5">
                    {slotActivities.length === 0 ? (
                      <p className="text-xs text-slate-400 italic py-2">ไม่มีกิจกรรมที่ตรงกับเงื่อนไขการค้นหาในรอบเวลานี้</p>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                        {slotActivities.map((act) => {
                          const isDone = !!checkedItems[act.id];
                          const goalInfo = PLAN5_GOAL_INFOS.find((g) => g.id === act.goalId);
                          return (
                            <div
                              key={act.id}
                              onClick={() => toggleCheck(act.id)}
                              className={`p-3.5 rounded-2xl border transition cursor-pointer flex items-start gap-3 ${
                                isDone
                                  ? "bg-emerald-50/70 border-emerald-300 text-slate-900"
                                  : "bg-slate-50/70 border-slate-200 hover:bg-white hover:border-amber-400"
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={isDone}
                                onChange={() => {}}
                                className="w-5 h-5 mt-0.5 text-emerald-600 rounded-md border-slate-300 focus:ring-emerald-500 shrink-0 cursor-pointer"
                              />
                              <div className="space-y-1 flex-1 min-w-0">
                                <div className="flex items-center justify-between gap-2">
                                  <span className={`text-[10px] font-black px-2 py-0.5 rounded-md border ${goalInfo?.colorBadge}`}>
                                    เป้าหมายที่ {act.goalId} ({goalInfo?.shortName})
                                  </span>
                                  <span className="text-[10px] font-bold text-slate-500">
                                    {act.roleLabel}
                                  </span>
                                </div>
                                <h4 className={`text-xs sm:text-sm font-extrabold ${isDone ? "line-through text-slate-500" : "text-slate-900"}`}>
                                  {act.title}
                                </h4>
                                <p className={`text-xs leading-relaxed ${isDone ? "text-slate-400" : "text-slate-600"}`}>
                                  {act.description}
                                </p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ----------------- TAB 3: ROLES VIEW ----------------- */}
      {activeMainTab === "roles" && (
        <div className="space-y-6">
          {/* Teacher Section */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="bg-blue-600 text-white p-5 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center font-black">
                  <Users className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-base sm:text-lg font-black">
                    ส่วนที่ 1: ภาระงานและบทบาทของ "ครูและบุคลากรในสถานศึกษา"
                  </h2>
                  <p className="text-xs text-blue-100 font-medium">
                    การกำกับ ติดตาม ดูแล บันทึกทะเบียนฟาร์ม โภชนาการ และการจัดการเรียนรู้ประจำวัน
                  </p>
                </div>
              </div>

              <span className="text-xs font-extrabold bg-blue-700/80 px-3 py-1.5 rounded-xl border border-blue-500">
                {filteredActivities.filter((a) => a.role === "teacher" && checkedItems[a.id]).length} /{" "}
                {filteredActivities.filter((a) => a.role === "teacher").length} รายการ
              </span>
            </div>

            <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredActivities
                .filter((a) => a.role === "teacher" || a.role === "both")
                .map((act) => {
                  const isDone = !!checkedItems[act.id];
                  const goalInfo = PLAN5_GOAL_INFOS.find((g) => g.id === act.goalId);
                  return (
                    <div
                      key={act.id}
                      onClick={() => toggleCheck(act.id)}
                      className={`p-4 rounded-2xl border transition cursor-pointer flex flex-col justify-between gap-2.5 ${
                        isDone
                          ? "bg-emerald-50 border-emerald-300 text-slate-800"
                          : "bg-slate-50 border-slate-200 hover:border-blue-400 hover:bg-blue-50/20"
                      }`}
                    >
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between gap-2">
                          <span className={`text-[10px] font-black px-2 py-0.5 rounded-md border ${goalInfo?.colorBadge}`}>
                            {goalInfo?.code}
                          </span>
                          <span className="text-[10px] font-bold text-slate-500">{act.timeLabel}</span>
                        </div>
                        <h4 className={`text-sm font-extrabold ${isDone ? "line-through text-slate-500" : "text-slate-900"}`}>
                          {act.title}
                        </h4>
                        <p className={`text-xs leading-relaxed ${isDone ? "text-slate-400" : "text-slate-600"}`}>
                          {act.description}
                        </p>
                      </div>

                      <div className="pt-2 border-t border-slate-200/80 flex items-center justify-between text-xs">
                        <span className="text-[11px] text-slate-500">{act.objective}</span>
                        <input
                          type="checkbox"
                          checked={isDone}
                          onChange={() => {}}
                          className="w-4 h-4 text-emerald-600 rounded border-slate-300"
                        />
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>

          {/* Student Section */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="bg-orange-600 text-white p-5 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center font-black">
                  <GraduationCap className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-base sm:text-lg font-black">
                    ส่วนที่ 2: กิจวัตรและสุขนิสัยประจำวันของ "นักเรียน"
                  </h2>
                  <p className="text-xs text-orange-100 font-medium">
                    การฝึกฝนสุขอนามัยส่วนบุคคล การแปรงฟัน ดื่มนม บันทึกความดี และการมีส่วนร่วมในแปลงเกษตร/สหกรณ์
                  </p>
                </div>
              </div>

              <span className="text-xs font-extrabold bg-orange-700/80 px-3 py-1.5 rounded-xl border border-orange-500">
                {filteredActivities.filter((a) => a.role === "student" && checkedItems[a.id]).length} /{" "}
                {filteredActivities.filter((a) => a.role === "student").length} รายการ
              </span>
            </div>

            <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredActivities
                .filter((a) => a.role === "student" || a.role === "both")
                .map((act) => {
                  const isDone = !!checkedItems[act.id];
                  const goalInfo = PLAN5_GOAL_INFOS.find((g) => g.id === act.goalId);
                  return (
                    <div
                      key={act.id}
                      onClick={() => toggleCheck(act.id)}
                      className={`p-4 rounded-2xl border transition cursor-pointer flex flex-col justify-between gap-2.5 ${
                        isDone
                          ? "bg-emerald-50 border-emerald-300 text-slate-800"
                          : "bg-slate-50 border-slate-200 hover:border-orange-400 hover:bg-orange-50/20"
                      }`}
                    >
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between gap-2">
                          <span className={`text-[10px] font-black px-2 py-0.5 rounded-md border ${goalInfo?.colorBadge}`}>
                            {goalInfo?.code}
                          </span>
                          <span className="text-[10px] font-bold text-slate-500">{act.timeLabel}</span>
                        </div>
                        <h4 className={`text-sm font-extrabold ${isDone ? "line-through text-slate-500" : "text-slate-900"}`}>
                          {act.title}
                        </h4>
                        <p className={`text-xs leading-relaxed ${isDone ? "text-slate-400" : "text-slate-600"}`}>
                          {act.description}
                        </p>
                      </div>

                      <div className="pt-2 border-t border-slate-200/80 flex items-center justify-between text-xs">
                        <span className="text-[11px] text-slate-500">{act.objective}</span>
                        <input
                          type="checkbox"
                          checked={isDone}
                          onChange={() => {}}
                          className="w-4 h-4 text-emerald-600 rounded border-slate-300"
                        />
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        </div>
      )}

      {/* ----------------- TAB 4: ASSESSMENT & PRINTABLE SHEET ----------------- */}
      {activeMainTab === "assessment" && (
        <div className="space-y-6">
          {/* Header controls for printable sheet */}
          <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div>
                <h2 className="text-base sm:text-lg font-black text-slate-900 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-amber-600" />
                  <span>แบบบันทึกผลการตรวจเช็คกิจวัตรประจำวัน (Daily Inspection Record)</span>
                </h2>
                <p className="text-xs text-slate-500">
                  แบบฟอร์มประเมินอย่างเป็นทางการสำหรับครูเวรประจำวันและผู้บริหารสถานศึกษา
                </p>
              </div>

              <button
                type="button"
                onClick={handlePrint}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-black transition shadow-sm cursor-pointer"
              >
                <Printer className="w-4 h-4 text-amber-400" />
                <span>พิมพ์แบบฟอร์มนี้ (A4 Print)</span>
              </button>
            </div>

            {/* School & Date Inputs */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">ชื่อสถานศึกษา</label>
                <input
                  type="text"
                  value={schoolName}
                  onChange={(e) => setSchoolName(e.target.value)}
                  className="w-full text-xs font-extrabold bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">วันที่ตรวจประเมิน</label>
                <input
                  type="date"
                  value={inspectionDate}
                  onChange={(e) => setInspectionDate(e.target.value)}
                  className="w-full text-xs font-extrabold bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">ชื่อครูเวรผู้ตรวจประเมิน</label>
                <input
                  type="text"
                  placeholder="ระบุชื่อ-นามสกุล ครูเวร..."
                  value={inspectorName}
                  onChange={(e) => setInspectorName(e.target.value)}
                  className="w-full text-xs font-extrabold bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                />
              </div>
            </div>
          </div>

          {/* Paginated Simulated A4 Paper Pages Container - Dynamic Unlimited Pages (Non-Table Layout) */}
          <div className="bg-slate-200/90 p-3 sm:p-6 md:p-10 rounded-3xl border border-slate-300 shadow-inner overflow-x-auto flex flex-col items-center space-y-8">
            {(() => {
              const ITEMS_PER_PAGE_P1 = 4;
              const ITEMS_PER_PAGE_OTHER = 5;
              const totalActivities = COMPREHENSIVE_DAILY_ACTIVITIES.length;
              const pageChunks = [];

              if (totalActivities <= ITEMS_PER_PAGE_P1) {
                pageChunks.push({
                  pageNumber: 1,
                  startIndex: 0,
                  items: COMPREHENSIVE_DAILY_ACTIVITIES,
                });
              } else {
                pageChunks.push({
                  pageNumber: 1,
                  startIndex: 0,
                  items: COMPREHENSIVE_DAILY_ACTIVITIES.slice(0, ITEMS_PER_PAGE_P1),
                });

                let currentIdx = ITEMS_PER_PAGE_P1;
                let pNum = 2;
                while (currentIdx < totalActivities) {
                  const sliceEnd = currentIdx + ITEMS_PER_PAGE_OTHER;
                  pageChunks.push({
                    pageNumber: pNum,
                    startIndex: currentIdx,
                    items: COMPREHENSIVE_DAILY_ACTIVITIES.slice(currentIdx, sliceEnd),
                  });
                  currentIdx = sliceEnd;
                  pNum++;
                }
              }

              const totalPages = pageChunks.length;

              return pageChunks.map((chunk) => {
                const isFirstPage = chunk.pageNumber === 1;
                const isLastPage = chunk.pageNumber === totalPages;
                const pageThaiNum = toThaiNumerals(chunk.pageNumber);
                const totalPagesThaiNum = toThaiNumerals(totalPages);

                return (
                  <div
                    key={`a4-page-${chunk.pageNumber}`}
                    className="w-full max-w-[210mm] min-h-[297mm] bg-white p-6 sm:p-10 md:p-12 shadow-[0_20px_50px_rgba(0,0,0,0.18)] rounded-sm border border-slate-300/90 text-slate-900 font-sans relative flex flex-col justify-between space-y-5 print:shadow-none print:border-none print:p-0 print:m-0 print:max-w-none print:min-h-0 print:page-break-after-always"
                  >
                    <div className="space-y-5">
                      {/* Top A4 Page Decorative Accent Bar */}
                      <div className="w-full h-1.5 bg-gradient-to-r from-amber-700 via-indigo-900 to-amber-700 rounded-t"></div>

                      {/* Page Number Badge Top Right */}
                      <div className="absolute top-8 right-8 text-[11px] font-black text-slate-500 bg-slate-100 px-3 py-1 rounded-full border border-slate-200 print:hidden">
                        แผ่นที่ {pageThaiNum} / {totalPagesThaiNum}
                      </div>

                      {/* Header Section */}
                      {isFirstPage ? (
                        <>
                          {/* Royal Emblem & Official Form Header */}
                          <div className="text-center space-y-2 border-b-2 border-slate-900 pb-4">
                            <div className="flex justify-center pb-1">
                              <img
                                src={ROYAL_EMBLEM_IMAGE}
                                alt="ตราสัญลักษณ์ กพด."
                                referrerPolicy="no-referrer"
                                className="w-16 h-16 sm:w-18 sm:h-18 object-contain filter drop-shadow-xs"
                              />
                            </div>
                            <div className="space-y-0.5">
                              <h2 className="text-sm sm:text-base font-black tracking-tight text-slate-900 leading-snug">
                                แบบบันทึกการกำกับติดตามและประเมินกิจวัตรรายวันตามแผน กพด. ฉบับที่ 5
                              </h2>
                              <p className="text-xs font-bold text-slate-800">
                                โครงการพัฒนาเด็กและเยาวชนในถิ่นทุรกันดารตามพระราชดำริ สมเด็จพระกนิษฐาธิราชเจ้า กรมสมเด็จพระเทพรัตนราชสุดาฯ สยามบรมราชกุมารี
                              </p>
                            </div>

                            <div className="pt-2 text-xs font-semibold text-slate-800 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 bg-slate-50 py-2 px-3 rounded-xl border border-slate-300">
                              <span><strong>สถานศึกษา:</strong> {schoolName}</span>
                              <span className="text-slate-400">|</span>
                              <span><strong>ประจำวันที่:</strong> {toThaiNumerals(inspectionDate)}</span>
                              <span className="text-slate-400">|</span>
                              <span><strong>ผู้ตรวจประเมิน:</strong> {inspectorName || "(ยังไม่ระบุชื่อ)"}</span>
                            </div>
                          </div>

                          {/* Score Summary Box inside A4 Sheet */}
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
                            <div className="bg-slate-50 p-2.5 sm:p-3 rounded-xl border border-slate-300 text-center">
                              <div className="text-[10px] sm:text-[11px] text-slate-600 font-bold">กิจกรรมทั้งหมด</div>
                              <div className="text-base sm:text-lg font-black text-slate-900">{toThaiNumerals(totalActivitiesCount)} รายการ</div>
                            </div>
                            <div className="bg-emerald-50/80 p-2.5 sm:p-3 rounded-xl border border-emerald-300 text-center">
                              <div className="text-[10px] sm:text-[11px] text-emerald-800 font-bold">ปฏิบัติครบถ้วน</div>
                              <div className="text-base sm:text-lg font-black text-emerald-900">{toThaiNumerals(completedCount)} รายการ</div>
                            </div>
                            <div className="bg-amber-50/80 p-2.5 sm:p-3 rounded-xl border border-amber-300 text-center">
                              <div className="text-[10px] sm:text-[11px] text-amber-800 font-bold">คะแนนสะสม</div>
                              <div className="text-base sm:text-lg font-black text-amber-900">{toThaiNumerals(earnedPoints)} / {toThaiNumerals(totalPoints)}</div>
                            </div>
                            <div className="bg-blue-50/80 p-2.5 sm:p-3 rounded-xl border border-blue-300 text-center">
                              <div className="text-[10px] sm:text-[11px] text-blue-800 font-bold">ระดับผลการประเมิน</div>
                              <div className="text-xs sm:text-sm font-black text-blue-950">
                                {progressPercent >= 80 ? "ดีเยี่ยม (ระดับสากล)" : progressPercent >= 60 ? "ดี (ผ่านเกณฑ์)" : "ต้องปรับปรุง"}
                              </div>
                            </div>
                          </div>
                        </>
                      ) : (
                        /* Continuation Header */
                        <div className="flex items-center justify-between border-b-2 border-slate-900 pb-3 gap-4">
                          <div className="flex items-center gap-3">
                            <img
                              src={ROYAL_EMBLEM_IMAGE}
                              alt="ตราสัญลักษณ์ กพด."
                              referrerPolicy="no-referrer"
                              className="w-10 h-10 object-contain filter drop-shadow-xs"
                            />
                            <div>
                              <h3 className="text-sm sm:text-base font-black text-slate-900">
                                แบบบันทึกการกำกับติดตามและประเมินกิจวัตรรายวันตามแผน กพด. ฉบับที่ 5 (ต่อ)
                              </h3>
                              <p className="text-[11px] font-bold text-slate-600">
                                สถานศึกษา: {schoolName} | วันที่: {toThaiNumerals(inspectionDate)}
                              </p>
                            </div>
                          </div>
                          <div className="text-xs font-black bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-300 whitespace-nowrap">
                            แผ่นที่ {pageThaiNum} / {totalPagesThaiNum}
                          </div>
                        </div>
                      )}

                      {/* Structured Items List (Non-Table Layout) */}
                      <div className="space-y-3">
                        {chunk.items.map((item, itemIdx) => {
                          const globalIndex = chunk.startIndex + itemIdx;
                          const isDone = !!checkedItems[item.id];
                          return (
                            <div
                              key={item.id}
                              className={`p-3.5 sm:p-4 rounded-xl border transition-all ${
                                isDone
                                  ? "bg-emerald-50/50 border-emerald-300"
                                  : "bg-slate-50/70 border-slate-300"
                              }`}
                            >
                              <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-200">
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="w-6 h-6 rounded-full bg-slate-900 text-white font-black text-xs flex items-center justify-center shrink-0">
                                    {toThaiNumerals(globalIndex + 1)}
                                  </span>
                                  <span className="font-extrabold text-amber-900 text-xs bg-amber-100/80 px-2.5 py-0.5 rounded-md border border-amber-300/80">
                                    เป้าหมายที่ {toThaiNumerals(item.goalId)}
                                  </span>
                                  <span className="text-xs font-bold text-slate-700 bg-white px-2.5 py-0.5 rounded-md border border-slate-200">
                                    {toThaiNumerals(item.timeLabel.split("(")[0])}
                                  </span>
                                </div>

                                <span className={`inline-flex items-center justify-center gap-1 px-3 py-1 rounded-full font-black text-[11px] border ${
                                  isDone ? "bg-emerald-100 text-emerald-900 border-emerald-400" : "bg-slate-200/80 text-slate-700 border-slate-300"
                                }`}>
                                  {isDone ? "✓ ปฏิบัติแล้ว" : "○ ยังไม่ปฏิบัติ"}
                                </span>
                              </div>

                              <div className="pt-2.5 space-y-1">
                                <h4 className="font-black text-slate-900 text-xs sm:text-sm leading-snug">
                                  {item.title}
                                </h4>
                                <p className="text-[11px] text-slate-600 font-medium leading-relaxed">
                                  {item.objective}
                                </p>
                                <div className="pt-1.5 flex items-center gap-2 text-[11px] font-bold text-slate-700">
                                  <span className="text-slate-500">ผู้รับผิดชอบ:</span>
                                  <span className="text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-200">{item.roleLabel}</span>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Signature Block - Rendered on the LAST page */}
                      {isLastPage && (
                        <div className="grid grid-cols-3 gap-3 sm:gap-6 pt-6 border-t-2 border-slate-900 text-center text-xs">
                          <div className="space-y-4 min-w-0">
                            <div className="whitespace-nowrap overflow-hidden text-ellipsis font-medium text-slate-900">ลงชื่อ...................................</div>
                            <div className="font-extrabold text-slate-800">(ประธานนักเรียน/ผู้แทนนักเรียน)</div>
                            <div className="text-slate-600 font-medium">ผู้ร่วมบันทึกกิจกรรม</div>
                          </div>

                          <div className="space-y-4 min-w-0">
                            <div className="whitespace-nowrap overflow-hidden text-ellipsis font-medium text-slate-900">ลงชื่อ...................................</div>
                            <div className="font-extrabold text-slate-800">({inspectorName || "ครูเวรประจำวัน"})</div>
                            <div className="text-slate-600 font-medium">ครูเวรผู้ตรวจประเมิน</div>
                          </div>

                          <div className="space-y-4 min-w-0">
                            <div className="whitespace-nowrap overflow-hidden text-ellipsis font-medium text-slate-900">ลงชื่อ...................................</div>
                            <div className="font-extrabold text-slate-800">(ผู้อำนวยการ/ครูใหญ่โรงเรียน ตชด.)</div>
                            <div className="text-slate-600 font-medium">ผู้รับรองรายงาน</div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Footer Paper Mark */}
                    <div className="pt-4 flex items-center justify-between text-[10px] text-slate-500 font-medium border-t border-slate-300 mt-auto">
                      <span>เอกสารบันทึกรายงานระบบแผนพัฒนาเด็กและเยาวชนในถิ่นทุรกันดาร (กพด.5)</span>
                      <span className="font-bold">หน้า {pageThaiNum} / {totalPagesThaiNum}</span>
                    </div>
                  </div>
                );
              });
            })()}
          </div>
        </div>
      )}

      {/* Official Guidelines & References Box */}
      <div className="bg-amber-50/70 border border-amber-200 rounded-3xl p-5 text-xs text-amber-950 space-y-2">
        <div className="flex items-center gap-2 font-black text-amber-900 text-sm">
          <Info className="w-4 h-4 text-amber-700" />
          <span>มาตรฐานการบูรณาการและการเทียบเคียงแผนพัฒนาเด็กและเยาวชนในถิ่นทุรกันดารฯ (กพด. ฉบับที่ 5)</span>
        </div>
        <p className="leading-relaxed text-amber-900/90">
          คู่มือกิจวัตรนี้ถูกจัดทำขึ้นตามกรอบพระราชดำริและตัวชี้วัดแผน กพด. ฉบับที่ 5 (พ.ศ. 2560-2569) โดยเชื่อมโยง <strong>เป้าหมายที่ 1 (โภชนาการและสุขภาพอนามัย)</strong>, <strong>เป้าหมายที่ 2 (โอกาสการศึกษา)</strong>, <strong>เป้าหมายที่ 3 (วิชาการและคุณธรรม)</strong>, <strong>เป้าหมายที่ 4 (สิ่งแวดล้อมและพฤกษศาสตร์)</strong>, <strong>เป้าหมายที่ 5 (วัฒนธรรมและภูมิปัญญา)</strong>, <strong>เป้าหมายที่ 6 (เกษตรเพื่ออาหารกลางวันและทักษะอาชีพ)</strong>, <strong>เป้าหมายที่ 7 (สหกรณ์นักเรียนและการออมทรัพย์)</strong> และ <strong>เป้าหมายที่ 8 (ศูนย์บริการชุมชน)</strong> เข้าสู่ตารางชีวิตประจำวันของโรงเรียนตำรวจตระเวนชายแดนอย่างสมบูรณ์แบบ
        </p>
      </div>
    </div>
  );
}
