import React, { useState, useRef, useEffect } from "react";
import { 
  Sparkles, 
  Send, 
  Bot, 
  User, 
  X, 
  Loader2, 
  Lightbulb, 
  Copy,
  Check,
  RotateCcw,
  Minimize2,
  Maximize2,
  FileText,
  Target,
  Zap,
  Brain,
  ShieldCheck,
  Download,
  Info,
  ChevronRight,
  MessageSquare
} from "lucide-react";

export type ChatRole = "general" | "quick_assistant" | "strategic_analyst" | "official_drafter";

export interface RoleConfig {
  id: ChatRole;
  title: string;
  badge: string;
  model: string;
  taskType: "general" | "fast" | "complex";
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  accentColor: string;
  badgeBg: string;
  welcomeMessage: string;
  prompts: string[];
}

export const CHAT_ROLES: Record<ChatRole, RoleConfig> = {
  general: {
    id: "general",
    title: "ผู้ช่วยทั่วไป (General)",
    badge: "Gemini 3.5 Flash",
    model: "gemini-3.5-flash",
    taskType: "general",
    description: "แนะนำการใช้งานระบบ กพด.๕ รอบด้าน ตอบคำถามและช่วยเหลือทั่วไป",
    icon: Sparkles,
    accentColor: "from-indigo-600 to-blue-600",
    badgeBg: "bg-indigo-50 text-indigo-700 border-indigo-200",
    welcomeMessage: `สวัสดีครับ ผมคือ **ผู้ช่วยอัจฉริยะระบบ กพด.๕** (powered by Google Gemini 3.5 Flash)

ผมพร้อมให้คำแนะนำและช่วยเหลือท่านในการใช้งานระบบนี้ทุกฟังก์ชันครับ:
• 📊 **การใช้งานระบบ:** แดชบอร์ดหลัก, เอกสารรายงาน A4, แผนที่ GIS ตชด., ติดตามการส่งรายงาน
• 📌 **เป้าหมาย กพด.๕:** ข้อมูลเป้าหมาย ๘ ด้าน และเกณฑ์การดำเนินงาน
• 💡 **แนะนำการบันทึก:** วิธีลงบันทึกรายงานกิจกรรม คัดกรอง และค้นหาข้อมูล`,
    prompts: [
      "ระบบนี้มีฟังก์ชันหลักอะไรบ้าง และใช้งานอย่างไร?",
      "แนะนำวิธีค้นหาและกรองรายงานกิจกรรมตามเป้าหมาย กพด.๕",
      "อธิบายเป้าหมาย ๘ ด้านของแผน กพด. ฉบับที่ ๕ โดยสังเขป",
      "การส่งออกรายงานแบบฟอร์ม A4 เป็นไฟล์ PDF หรือภาพ ทำอย่างไร?"
    ]
  },
  quick_assistant: {
    id: "quick_assistant",
    title: "ตอบด่วน ฉับไว (Fast Tasks)",
    badge: "Gemini 3.1 Flash-Lite",
    model: "gemini-3.1-flash-lite",
    taskType: "fast",
    description: "ตอบคำถามฉับไว สรุปขั้นตอนเร็ว กระชับ ตรงประเด็น ไม่เยิ่นเย้อ",
    icon: Zap,
    accentColor: "from-amber-500 to-orange-500",
    badgeBg: "bg-amber-50 text-amber-800 border-amber-200",
    welcomeMessage: `⚡ **ผู้ช่วยตอบด่วน สรุปประเด็นฉับไว กพด.๕** (powered by Gemini 3.1 Flash-Lite)

โหมดเน้นความรวดเร็วและกระชับ ตอบทันที ตรงจุด เหมาะสำหรับครูและเจ้าหน้าที่ผู้ปฏิบัติงานหน้างาน:
• ⏱️ ถามข้อความสั้นหรือคำถามเฉพาะเจาะจง
• 📌 สรุปขั้นตอนทำงานแบบ Step-by-Step สั้นๆ
• 🔢 สอบถามตัวเลขสถิติหรือนิยามตัวชี้วัดด่วน`,
    prompts: [
      "สรุปเป้าหมาย กพด.๕ สั้นๆ ใน ๓ บรรทัด",
      "เกณฑ์มาตรฐานน้ำดื่มสะอาดใน รร.ตชด. มีอะไรบ้าง?",
      "ขั้นตอนการลงบันทึกรายงานแบบฟอร์ม A4 มีกี่ขั้นตอน?",
      "สรุปจำนวน รร.ตชด. ในสังกัด บก.ตชด.ภาค ๒ ทั้งหมด"
    ]
  },
  strategic_analyst: {
    id: "strategic_analyst",
    title: "วิเคราะห์ยุทธศาสตร์เชิงลึก (Complex Tasks)",
    badge: "Gemini 3.1 Pro Preview",
    model: "gemini-3.1-pro-preview",
    taskType: "complex",
    description: "วิเคราะห์สถิติเชิงลึก เจาะลึก KPIs วินิจฉัยความก้าวหน้าโครงการ และเสนอแนะระดับผู้บริหาร",
    icon: Brain,
    accentColor: "from-purple-600 to-indigo-700",
    badgeBg: "bg-purple-50 text-purple-700 border-purple-200",
    welcomeMessage: `🧠 **ผู้เชี่ยวชาญการวิเคราะห์ยุทธศาสตร์เชิงลึก กพด.๕** (powered by Gemini 3.1 Pro Preview)

โหมดวิเคราะห์ขั้นสูงสำหรับผู้บังคับบัญชา ครูใหญ่ และคณะทำงานนโยบาย:
• 📈 **วินิจฉัยเชิงลึก:** วิเคราะห์ข้อมูลกิจกรรมและตัวชี้วัด KPIs ของ ๕๓ โรงเรียน ตชด.
• 🎯 **Gap Analysis:** ประเมินช่องว่างความก้าวหน้าเทียบกับเป้าหมายแผน กพด. ฉบับที่ ๕
• 🏛️ **ข้อเสนอแนะเชิงกลยุทธ์:** จัดลำดับความสำคัญและมาตรการแก้ไขปัญหาที่มีหลักฐานอ้างอิง`,
    prompts: [
      "วิเคราะห์ภาพรวมการขับเคลื่อนแผน กพด.๕ ใน ๕๓ รร.ตชด. และจุดที่ควรเร่งรัด",
      "ประเมินช่องว่าง (Gap Analysis) ด้านโภชนาการและสุขอนามัยในถิ่นทุรกันดาร",
      "เสนอแนะแนวทางยกระดับผลสัมฤทธิ์วิชาการและทักษะอาชีพของเยาวชน ตชด.",
      "แนวทางการจัดสรรทรัพยากรเพื่อลดความเหลื่อมล้ำทางการศึกษาตามแนวพระราชดำริ"
    ]
  },
  official_drafter: {
    id: "official_drafter",
    title: "ยกร่างภาษาราชการ (Drafting)",
    badge: "Gemini 3.5 Flash",
    model: "gemini-3.5-flash",
    taskType: "general",
    description: "ช่วยยกร่างหนังสือราชการ คำนำ บันทึกข้อความ และผลสัมฤทธิ์ตามระเบียบสารบรรณ",
    icon: FileText,
    accentColor: "from-emerald-600 to-teal-700",
    badgeBg: "bg-emerald-50 text-emerald-800 border-emerald-200",
    welcomeMessage: `✍️ **ผู้เชี่ยวชาญการยกร่างภาษาหนังสือราชการ กพด.๕** (powered by Google Gemini)

พร้อมช่วยยกร่างและขัดเกลาถ้อยคำให้ถูกต้องตามระเบียบงานสารบรรณ พ.ศ. ๒๕๒๖:
• 📑 ยกร่างคำนำและวัตถุประสงค์โครงการ
• 📝 เรียบเรียงผลสัมฤทธิ์เชิงปริมาณและคุณภาพ
• ✉️ ร่างบันทึกข้อความรายงานเสนอผู้บังคับบัญชาเพื่อโปรดพิจารณาอนุมัติ`,
    prompts: [
      "ช่วยยกร่างคำนำรายงานกิจกรรมโครงการเกษตรเพื่ออาหารกลางวัน",
      "ยกร่างบันทึกข้อความรายงานสรุปผลกิจกรรมเสนอผู้บังคับบัญชา",
      "เขียนผลสัมฤทธิ์เชิงปริมาณและคุณภาพสำหรับกิจกรรมค่ายคณิตศาสตร์",
      "ยกร่างสรุปผลการจัดกิจกรรมส่งเสริมอาชีพตามหลักปรัชญาเศรษฐกิจพอเพียง"
    ]
  }
};

export interface Message {
  id: string;
  role: "user" | "model";
  text: string;
  time: string;
  modelUsed?: string;
  roleId?: ChatRole;
  isFallback?: boolean;
}

interface GeminiAssistantModalProps {
  isOpen: boolean;
  onClose: () => void;
  totalReportsCount?: number;
  selectedSchoolName?: string;
  isEmbedded?: boolean;
}

export default function GeminiAssistantModal({
  isOpen,
  onClose,
  totalReportsCount = 0,
  selectedSchoolName = "ภาพรวมทุกโรงเรียน",
  isEmbedded = false
}: GeminiAssistantModalProps) {
  const [selectedRole, setSelectedRole] = useState<ChatRole>("general");
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome-1",
      role: "model",
      text: CHAT_ROLES.general.welcomeMessage,
      time: new Date().toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" }),
      modelUsed: CHAT_ROLES.general.badge,
      roleId: "general"
    }
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const activeRoleConfig = CHAT_ROLES[selectedRole];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (isOpen || isEmbedded) {
      scrollToBottom();
    }
  }, [messages, isOpen, isEmbedded, isLoading]);

  // Focus input when modal opens
  useEffect(() => {
    if (isOpen && !isEmbedded) {
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [isOpen, isEmbedded]);

  if (!isOpen && !isEmbedded) return null;

  const handleRoleChange = (newRole: ChatRole) => {
    setSelectedRole(newRole);
    const newConfig = CHAT_ROLES[newRole];
    // Add role transition indicator message into the thread
    const roleNoticeMsg: Message = {
      id: `role-change-${Date.now()}`,
      role: "model",
      text: newConfig.welcomeMessage,
      time: new Date().toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" }),
      modelUsed: newConfig.badge,
      roleId: newRole
    };
    setMessages((prev) => [...prev, roleNoticeMsg]);
  };

  const handleCopyText = (text: string, id: string) => {
    const plainText = text.replace(/\*\*/g, "");
    navigator.clipboard.writeText(plainText);
    setCopiedIndex(id);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const handleExportChat = () => {
    const formatted = messages.map(m => {
      const sender = m.role === "user" ? "👤 ผู้ใช้งาน" : `🤖 AI (${m.modelUsed || "Gemini"})`;
      return `[${m.time}] ${sender}:\n${m.text}\n----------------------------------------\n`;
    }).join("\n");

    const blob = new Blob([formatted], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `บันทึกสนทนา-Gemini-กพด๕-${new Date().toISOString().slice(0, 10)}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleResetChat = () => {
    setMessages([
      {
        id: `reset-${Date.now()}`,
        role: "model",
        text: activeRoleConfig.welcomeMessage,
        time: new Date().toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" }),
        modelUsed: activeRoleConfig.badge,
        roleId: selectedRole
      }
    ]);
  };

  const handleSend = async (textToSend?: string) => {
    const query = (textToSend || input).trim();
    if (!query || isLoading) return;

    const userMsg: Message = {
      id: `user-${Date.now()}`,
      role: "user",
      text: query,
      time: new Date().toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" })
    };

    const newHistory = [...messages, userMsg];
    setMessages(newHistory);
    if (!textToSend) setInput("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/gemini/smart-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roleId: selectedRole,
          taskType: activeRoleConfig.taskType,
          messages: newHistory.map((m) => ({
            role: m.role === "model" ? "model" : "user",
            text: m.text
          })),
          contextData: {
            totalReports: totalReportsCount,
            selectedSchool: selectedSchoolName,
            organization: "กองบังคับการตำรวจตระเวนชายแดนภาค 2 (53 โรงเรียน)",
            planName: "แผนพัฒนาเด็กและเยาวชนในถิ่นทุรกันดาร (กพด. ฉบับที่ 5)"
          }
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || data.details || "Failed to communicate with AI");
      }

      const botMsg: Message = {
        id: `model-${Date.now()}`,
        role: "model",
        text: data.reply || "ขออภัย ระบบไม่สามารถประมวลผลคำตอบได้ในขณะนี้",
        time: new Date().toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" }),
        modelUsed: data.modelUsed ? (data.modelUsed.includes("pro") ? "Gemini 3.1 Pro Preview" : data.modelUsed.includes("lite") ? "Gemini 3.1 Flash-Lite" : "Gemini 3.5 Flash") : activeRoleConfig.badge,
        roleId: selectedRole,
        isFallback: data.isFallback
      };

      setMessages((prev) => [...prev, botMsg]);
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          id: `error-${Date.now()}`,
          role: "model",
          text: `❌ เกิดข้อผิดพลาด: ${err.message || "ไม่สามารถเชื่อมต่อกับ Gemini AI ได้"}`,
          time: new Date().toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" }),
          modelUsed: "Offline Error",
          roleId: selectedRole
        }
      ]);
    } finally {
      setIsLoading(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

  // Helper renderer to render bold markdown and lists
  const renderFormattedText = (rawText: string) => {
    const lines = rawText.split("\n");
    return lines.map((line, lIdx) => {
      if (!line.trim()) return <div key={lIdx} className="h-2" />;

      const parts = line.split(/(\*\*.*?\*\*)/g);
      const renderedLine = parts.map((part, pIdx) => {
        if (part.startsWith("**") && part.endsWith("**")) {
          return (
            <strong key={pIdx} className="font-black text-slate-900">
              {part.slice(2, -2)}
            </strong>
          );
        }
        return part;
      });

      const isBullet = line.trim().startsWith("•") || line.trim().startsWith("-");
      const isNumbered = /^[0-9๑-๙]+\./.test(line.trim());
      const isHeader = line.trim().startsWith("#");

      return (
        <div 
          key={lIdx} 
          className={`leading-relaxed text-[15px] sm:text-[16.5px] ${
            isHeader 
              ? "font-black text-indigo-950 text-base sm:text-lg pt-1 pb-0.5" 
              : isBullet 
              ? "pl-3 py-0.5 text-slate-800 flex items-start gap-1.5" 
              : isNumbered 
              ? "pl-2 py-0.5 font-medium text-slate-800" 
              : "py-0.5 text-slate-800"
          }`}
          style={{ fontSize: "16.5px" }}
        >
          {renderedLine}
        </div>
      );
    });
  };

  const ActiveIcon = activeRoleConfig.icon;

  const chatContent = (
    <div 
      className={`bg-white rounded-2xl ${
        isEmbedded 
          ? "app-card-surface shadow-xs border border-slate-200/90 w-full h-[84vh] min-h-[640px]" 
          : "shadow-2xl border border-slate-200/90 transition-all duration-300 overflow-hidden " + (isExpanded ? "w-full h-[96vh] max-w-6xl" : "w-full max-w-3xl h-[84vh] min-h-[580px]")
      } flex flex-col overflow-hidden`}
    >
      {/* Top Header */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 px-4 sm:px-5 py-3.5 text-white flex items-center justify-between shrink-0 border-b border-indigo-900/40">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-500 via-purple-500 to-amber-400 flex items-center justify-center text-white shadow-md shadow-indigo-500/30 shrink-0">
            <Sparkles className="w-5 h-5 animate-pulse" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="no-h1-override font-black text-base sm:text-lg tracking-tight leading-snug text-white truncate">
                ผู้ช่วยอัจฉริยะ AI กพด.๕
              </h1>
              <span className="bg-indigo-500/30 text-indigo-200 text-[10px] font-bold px-2 py-0.5 rounded-full border border-indigo-400/40 font-mono shrink-0 whitespace-nowrap flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                {activeRoleConfig.badge}
              </span>
            </div>
            <p className="text-[11px] text-slate-300 font-medium truncate">
              {activeRoleConfig.description}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
          <button
            onClick={handleExportChat}
            className="p-1.5 sm:px-2.5 sm:py-1 text-slate-300 hover:text-white hover:bg-white/10 rounded-lg transition flex items-center gap-1 text-xs font-semibold cursor-pointer"
            title="ส่งออกบันทึกการสนทนา (.txt)"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline text-[11px]">ส่งออก</span>
          </button>
          <button
            onClick={handleResetChat}
            className="p-1.5 sm:px-2.5 sm:py-1 text-slate-300 hover:text-white hover:bg-white/10 rounded-lg transition flex items-center gap-1 text-xs font-semibold cursor-pointer"
            title="ล้างประวัติการสนทนา"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline text-[11px]">ล้างแชท</span>
          </button>
          {!isEmbedded && (
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-1.5 text-slate-300 hover:text-white hover:bg-white/10 rounded-lg transition cursor-pointer"
              title={isExpanded ? "ย่อหน้าต่าง" : "ขยายเต็มจอ"}
            >
              {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
          )}
          {!isEmbedded && (
            <button
              onClick={onClose}
              className="p-1.5 text-slate-300 hover:text-white hover:bg-white/10 rounded-lg transition cursor-pointer"
              title="ปิดหน้าต่าง"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* Role Selection Selector Bar */}
      <div className="bg-slate-50 border-b border-slate-200/90 p-2 sm:p-2.5 px-3 sm:px-4 shrink-0">
        <div className="flex items-center justify-between gap-2 mb-1.5">
          <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-700">
            <ActiveIcon className="w-3.5 h-3.5 text-indigo-600" />
            <span>เลือกบทบาทผู้ช่วย AI (Chatbot Roles):</span>
          </div>
          <span className="text-[10px] text-slate-500 hidden sm:inline">
            ปรับเปลี่ยนโมเดลและบทบาทตามลักษณะงาน
          </span>
        </div>

        {/* 4 Chatbot Roles Tabs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
          {(Object.keys(CHAT_ROLES) as ChatRole[]).map((roleKey) => {
            const role = CHAT_ROLES[roleKey];
            const isSelected = selectedRole === roleKey;
            const Icon = role.icon;

            return (
              <button
                key={roleKey}
                onClick={() => handleRoleChange(roleKey)}
                className={`p-2 rounded-xl text-left transition-all border cursor-pointer flex flex-col justify-between ${
                  isSelected
                    ? "bg-white border-indigo-600 shadow-xs ring-1 ring-indigo-500/20"
                    : "bg-white/70 hover:bg-white border-slate-200 hover:border-slate-300 text-slate-600"
                }`}
              >
                <div className="flex items-center gap-1.5 mb-0.5">
                  <div className={`w-5 h-5 rounded-lg flex items-center justify-center ${
                    isSelected ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-600"
                  }`}>
                    <Icon className="w-3 h-3" />
                  </div>
                  <span className={`text-[11px] font-bold truncate ${
                    isSelected ? "text-indigo-950 font-black" : "text-slate-700"
                  }`}>
                    {role.title.split(" (")[0]}
                  </span>
                </div>
                <div className="flex items-center justify-between mt-0.5">
                  <span className={`text-[9.5px] px-1.5 py-0.2 rounded font-mono font-bold ${
                    isSelected ? "bg-indigo-50 text-indigo-700" : "bg-slate-100 text-slate-500"
                  }`}>
                    {role.badge.replace("Gemini ", "")}
                  </span>
                  {isSelected && (
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* Quick Prompts Carousel for Current Role */}
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pt-2">
          <span className="text-[10.5px] font-bold text-slate-500 whitespace-nowrap flex items-center gap-1 shrink-0">
            <Lightbulb className="w-3 h-3 text-amber-500" />
            ตัวอย่างคำถาม:
          </span>
          {activeRoleConfig.prompts.map((prompt, idx) => (
            <button
              key={idx}
              onClick={() => handleSend(prompt)}
              disabled={isLoading}
              className="text-[10.5px] font-medium bg-white hover:bg-indigo-50 text-slate-700 hover:text-indigo-900 px-2.5 py-1 rounded-full border border-slate-200 hover:border-indigo-300 transition cursor-pointer whitespace-nowrap shrink-0 shadow-2xs"
            >
              {prompt}
            </button>
          ))}
        </div>
      </div>

      {/* Scrollable Chat Thread */}
      <div className="flex-1 p-3.5 sm:p-5 overflow-y-auto space-y-3.5 bg-slate-50/70 select-text">
        {messages.map((msg) => {
          const isUser = msg.role === "user";
          const roleCfg = msg.roleId ? CHAT_ROLES[msg.roleId] : activeRoleConfig;
          const RoleIcon = roleCfg?.icon || Bot;

          return (
            <div
              key={msg.id}
              className={`flex gap-2.5 sm:gap-3 ${isUser ? "flex-row-reverse" : "flex-row"}`}
              style={{ fontSize: "16.5px" }}
            >
              {/* Avatar */}
              <div
                className={`w-7 h-7 sm:w-8 sm:h-8 rounded-xl flex items-center justify-center shrink-0 text-white font-bold text-xs shadow-xs ${
                  isUser
                    ? "bg-slate-800"
                    : `bg-gradient-to-tr ${roleCfg ? roleCfg.accentColor : "from-indigo-600 to-purple-600"}`
                }`}
              >
                {isUser ? <User className="w-4 h-4" /> : <RoleIcon className="w-4 h-4" />}
              </div>

              {/* Message Bubble Container */}
              <div className={`max-w-[88%] sm:max-w-[82%] group relative flex flex-col ${isUser ? "items-end" : "items-start"}`}>
                <div
                  className={`rounded-2xl p-3.5 sm:p-4 text-[15px] sm:text-[16.5px] shadow-xs ${
                    isUser
                      ? "bg-indigo-600 text-white rounded-tr-xs shadow-md font-medium"
                      : "bg-white text-slate-800 border border-slate-200/90 rounded-tl-xs"
                  }`}
                  style={{ fontSize: "16.5px" }}
                >
                  {/* Bot Role & Model Header inside card */}
                  {!isUser && (
                    <div className="flex items-center gap-1.5 pb-2 mb-2 border-b border-slate-100 text-[10px] text-slate-400 font-medium">
                      <span className="font-bold text-slate-700">{roleCfg?.title.split(" (")[0] || "ผู้ช่วย AI กพด.๕"}</span>
                      <span>•</span>
                      <span className="font-mono text-indigo-600 font-semibold">{msg.modelUsed || activeRoleConfig.badge}</span>
                      {msg.isFallback && (
                        <span className="bg-amber-100 text-amber-800 text-[9px] px-1.5 py-0.2 rounded font-semibold">
                          Contextual Engine
                        </span>
                      )}
                    </div>
                  )}

                  {!isUser ? (
                    <div className="space-y-1">
                      {renderFormattedText(msg.text)}
                    </div>
                  ) : (
                    <div className="whitespace-pre-wrap leading-relaxed text-[15px] sm:text-[16.5px]" style={{ fontSize: "16.5px" }}>{msg.text}</div>
                  )}
                </div>

                {/* Footer Time & Copy Actions */}
                <div className="flex items-center gap-2 mt-1 px-1">
                  <span className="text-[10px] font-medium text-slate-400">
                    {msg.time}
                  </span>
                  {!isUser && (
                    <button
                      onClick={() => handleCopyText(msg.text, msg.id)}
                      className="text-[10px] font-semibold text-slate-500 hover:text-indigo-600 bg-white border border-slate-200 px-2 py-0.5 rounded-md transition shadow-2xs flex items-center gap-1 cursor-pointer"
                      title="คัดลอกข้อความนี้"
                    >
                      {copiedIndex === msg.id ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-600" />
                          <span className="text-emerald-600">คัดลอกแล้ว</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          <span>คัดลอก</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {/* Loading Indicator */}
        {isLoading && (
          <div className="flex gap-2.5 items-center text-slate-700 text-xs bg-white p-3 rounded-2xl border border-indigo-200/90 w-fit shadow-xs animate-pulse">
            <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
            <span className="font-semibold text-indigo-950">
              {activeRoleConfig.badge} กำลังวิเคราะห์และเรียบเรียงคำตอบ...
            </span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Bar */}
      <div className="p-3 sm:p-4 bg-white border-t border-slate-200/90 shrink-0">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="flex items-center gap-2"
        >
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={`พิมพ์คำถาม หรือสั่งให้ ${activeRoleConfig.title.split(" (")[0]} ช่วยเหลือ...`}
            disabled={isLoading}
            className="flex-1 text-xs sm:text-sm px-4 py-3 bg-slate-50 border border-slate-200/90 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition text-slate-800 placeholder:text-slate-400"
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white px-4 sm:px-5 py-3 rounded-xl font-bold text-xs sm:text-sm flex items-center gap-1.5 shadow-md transition cursor-pointer shrink-0"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <span className="hidden sm:inline">ส่งคำถาม</span>
                <Send className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        <div className="flex items-center justify-between mt-2 px-1 text-[10px] text-slate-400 font-medium">
          <span className="flex items-center gap-1 truncate">
            <Sparkles className="w-3 h-3 text-indigo-500 shrink-0" />
            <span className="truncate">ระบบวิเคราะห์ภาษาธรรมชาติอัจฉริยะ Google Gemini • Multi-Turn Chat</span>
          </span>
          <span className="hidden sm:inline text-slate-500 font-semibold shrink-0">
            โหมดปัจจุบัน: {activeRoleConfig.badge}
          </span>
        </div>
      </div>
    </div>
  );

  if (isEmbedded) {
    return <div className="w-full select-text">{chatContent}</div>;
  }

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 animate-in fade-in duration-200">
      {chatContent}
    </div>
  );
}
