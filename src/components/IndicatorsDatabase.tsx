import { useState, useMemo } from "react";
import { OFFICIAL_INDICATORS, ActivityIndicator } from "../data/indicatorsData";
import { KOPODOT_GOALS } from "../types";
import { 
  Search, 
  Compass, 
  BookOpen, 
  Clock, 
  Activity, 
  CheckCircle, 
  HelpCircle, 
  ChevronRight, 
  ListCollapse, 
  Award, 
  FileText, 
  ExternalLink,
  ChevronDown,
  Sparkles,
  MinusCircle,
  PlusCircle
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

export default function IndicatorsDatabase() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedGoalFilter, setSelectedGoalFilter] = useState("all");
  
  // Keep track of which indicators are expanded
  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>(() => {
    // Expand the first indicator by default for a friendly welcoming state
    if (OFFICIAL_INDICATORS.length > 0) {
      return { [OFFICIAL_INDICATORS[0].id]: true };
    }
    return {};
  });

  // Handle filtering
  const filteredIndicators = useMemo(() => {
    return OFFICIAL_INDICATORS.filter((ind) => {
      const matchSearch =
        ind.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ind.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ind.definition.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (ind.calculation && ind.calculation.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchGoal = selectedGoalFilter === "all" || ind.goalCode === selectedGoalFilter;
      return matchSearch && matchGoal;
    });
  }, [searchQuery, selectedGoalFilter]);

  // Toggle expansion for single indicator
  const toggleIndicator = (id: string) => {
    setExpandedIds(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  // Expand all filtered indicators
  const expandAll = () => {
    const nextState: Record<string, boolean> = {};
    filteredIndicators.forEach(ind => {
      nextState[ind.id] = true;
    });
    setExpandedIds(nextState);
  };

  // Collapse all indicators
  const collapseAll = () => {
    setExpandedIds({});
  };

  return (
    <div className="space-y-4 sm:space-y-5 lg:space-y-6">
      {/* Control row with search, filter and external document link */}
      <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200/90 shadow-2xs flex flex-col md:flex-row items-stretch md:items-center gap-3">
        <div className="relative flex-1">
          <input
            type="text"
            placeholder="ค้นหาชื่อตัวชี้วัด คำอธิบาย หรือสูตรคำนวณ..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full text-xs pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none placeholder:text-slate-400 font-medium text-slate-800"
          />
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
        </div>

        <div className="flex items-center space-x-2 w-full md:w-80">
          <label className="text-xs font-bold text-slate-500 whitespace-nowrap">เป้าหมายหลัก:</label>
          <select
            value={selectedGoalFilter}
            onChange={(e) => setSelectedGoalFilter(e.target.value)}
            className="w-full text-xs px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none font-semibold text-slate-700 cursor-pointer"
          >
            <option value="all">แสดงทั้งหมดทุกด้าน (34 ตัวชี้วัด)</option>
            {KOPODOT_GOALS.map((g) => (
              <option key={g.id} value={g.code}>
                {g.code}: {g.title.length > 35 ? g.title.substring(0, 35) + "..." : g.title}
              </option>
            ))}
          </select>
        </div>

        <a
          href="https://drive.google.com/file/d/15CrFOOk4eO2N8kn--myqZ21jIjm0cC-n/view?usp=sharing"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs shadow-2xs transition-all active:scale-95 shrink-0"
        >
          <FileText className="w-3.5 h-3.5 text-slate-950 shrink-0" />
          <span>เอกสารตัวชี้วัดแผน (Google Drive)</span>
          <ExternalLink className="w-3 h-3 text-slate-950 shrink-0" />
        </a>
      </div>

      {/* Accordion List Toolbar (Expand / Collapse actions) */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-100/80 px-4 py-3 rounded-xl border border-slate-200/60 shadow-2xs">
        <div className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
          <Compass className="w-4 h-4 text-indigo-600 shrink-0" />
          <span>พบเครื่องชี้วัดทั้งสิ้น <strong className="text-indigo-700 font-black">{filteredIndicators.length}</strong> รายการ</span>
        </div>
        
        {filteredIndicators.length > 0 && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={expandAll}
              className="inline-flex items-center gap-1 px-3 py-1.5 bg-white hover:bg-indigo-50 border border-slate-250 hover:border-indigo-200 rounded-lg text-xs font-extrabold text-slate-700 hover:text-indigo-700 transition cursor-pointer active:scale-95"
            >
              <PlusCircle className="w-3.5 h-3.5 text-indigo-600" />
              <span>ขยายทั้งหมด</span>
            </button>
            <button
              type="button"
              onClick={collapseAll}
              className="inline-flex items-center gap-1 px-3 py-1.5 bg-white hover:bg-rose-50 border border-slate-250 hover:border-rose-200 rounded-lg text-xs font-extrabold text-slate-700 hover:text-rose-600 transition cursor-pointer active:scale-95"
            >
              <MinusCircle className="w-3.5 h-3.5 text-rose-600" />
              <span>ย่อทั้งหมด</span>
            </button>
          </div>
        )}
      </div>

      {/* Collapsible/Accordion Stack of Indicators */}
      <div className="space-y-4">
        {filteredIndicators.map((ind) => {
          const goal = KOPODOT_GOALS.find(g => g.code === ind.goalCode);
          const isOpen = !!expandedIds[ind.id];
          
          return (
            <div 
              key={ind.id}
              className={`bg-white rounded-2xl border transition-all duration-300 shadow-2xs ${
                isOpen 
                  ? "border-indigo-400 ring-2 ring-indigo-500/10 shadow-sm" 
                  : "border-slate-200/90 hover:border-slate-350 hover:shadow-xs"
              }`}
            >
              {/* Accordion Trigger Header */}
              <button
                type="button"
                onClick={() => toggleIndicator(ind.id)}
                className="w-full text-left p-4 sm:p-5 flex items-start justify-between gap-3 cursor-pointer outline-none select-none"
              >
                <div className="flex items-start gap-3 sm:gap-4 min-w-0 flex-1">
                  <div 
                    className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 font-extrabold text-xs sm:text-sm shadow-2xs"
                    style={{ 
                      backgroundColor: `${goal?.color}15`, 
                      color: goal?.color || "#475569" 
                    }}
                  >
                    {ind.code.replace("ตัวชี้วัดที่ ", "")}
                  </div>

                  <div className="space-y-1.5 min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[10px] sm:text-xs font-bold text-slate-450 tracking-wider">
                        {ind.code} ({ind.goalCode})
                      </span>
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-100 text-[9.5px] font-bold">
                        {goal?.code}: {goal?.title.length > 25 ? goal?.title.substring(0, 25) + "..." : goal?.title}
                      </span>
                    </div>
                    <h3 className="text-sm sm:text-base font-bold text-slate-900 leading-snug">
                      {ind.name}
                    </h3>
                    <p className="text-xs sm:text-sm text-slate-500 font-normal leading-relaxed truncate max-w-2xl">
                      {ind.definition}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 self-center pl-1">
                  <span className="text-[11px] text-slate-400 font-extrabold hidden sm:inline">
                    {isOpen ? "คลิกเพื่อย่อปิด" : "คลิกเพื่อย่อขยายรายละเอียด"}
                  </span>
                  <div className={`w-7 h-7 rounded-lg bg-slate-50 flex items-center justify-center border border-slate-200/80 transition-all ${isOpen ? "bg-indigo-50 border-indigo-200" : ""}`}>
                    <ChevronDown className={`w-4 h-4 text-slate-500 transition-transform duration-300 ${isOpen ? "rotate-180 text-indigo-600" : ""}`} />
                  </div>
                </div>
              </button>

              {/* Accordion Collapsible Detail Panel */}
              <AnimatePresence initial={false}>
                {isOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25, ease: "easeInOut" }}
                    className="overflow-hidden"
                  >
                    <div className="px-4 pb-5 sm:px-6 sm:pb-6 border-t border-slate-100 bg-slate-50/20 pt-5 space-y-6">
                      
                      {/* 1. Goal Info Card */}
                      <div className="p-4 bg-slate-50 border border-slate-150 rounded-xl flex gap-3.5 items-start">
                        <div className="w-1.5 h-10 bg-indigo-600 rounded-full shrink-0" />
                        <div className="space-y-1 text-xs sm:text-sm">
                          <p className="font-extrabold text-slate-800">สอดคล้องกับเป้าหมายแผน กพด. ฉบับที่ 5 (พ.ศ. 2560-2569):</p>
                          <p className="text-slate-600 font-medium leading-relaxed">
                            {goal?.title}
                          </p>
                        </div>
                      </div>

                      {/* 2. Definition details */}
                      <div className="space-y-2 text-xs sm:text-sm">
                        <h4 className="font-extrabold text-slate-850 flex items-center gap-2">
                          <HelpCircle className="w-4 h-4 text-indigo-500 shrink-0" />
                          <span>คำนิยามและความหมายของตัววัด</span>
                        </h4>
                        <p className="bg-white p-4 border border-slate-200/90 rounded-2xl text-slate-700 font-normal leading-relaxed shadow-3xs">
                          {ind.definition}
                        </p>
                      </div>

                      {/* 3. Formula section */}
                      {ind.calculation && (
                        <div className="space-y-2 text-xs sm:text-sm">
                          <h4 className="font-extrabold text-slate-850 flex items-center gap-2">
                            <Activity className="w-4 h-4 text-indigo-500 shrink-0" />
                            <span>หลักเกณฑ์ / สูตรและวิธีการประเมินผลคำนวณ</span>
                          </h4>
                          <div className="bg-indigo-50/25 border border-indigo-100 p-4 rounded-2xl font-mono text-indigo-900 leading-relaxed font-bold shadow-3xs">
                            {ind.calculation}
                          </div>
                        </div>
                      )}

                      {/* 4. Criteria & Targets */}
                      {ind.criteria && ind.criteria.length > 0 && (
                        <div className="space-y-2 text-xs sm:text-sm">
                          <h4 className="font-extrabold text-slate-850 flex items-center gap-2">
                            <Award className="w-4 h-4 text-indigo-500 shrink-0" />
                            <span>หลักเกณฑ์ในการประเมินและพฤติกรรมเป้าหมาย ({ind.criteria.filter(c => !c.startsWith(" -") && !c.includes("เกณฑ์")).length} ประเด็นหลัก)</span>
                          </h4>
                          <div className="p-4 sm:p-5 bg-emerald-50/15 border border-emerald-100 rounded-2xl space-y-3 shadow-3xs">
                            <p className="text-[10px] sm:text-xs text-emerald-800 font-extrabold uppercase tracking-wide flex items-center gap-1">
                              <Sparkles className="w-3.5 h-3.5 text-emerald-600 animate-pulse" />
                              <span>รายการพฤติกรรม / ขอบเขตประเด็นประเมินผลตามข้อกำหนด:</span>
                            </p>
                            <ul className="grid grid-cols-1 md:grid-cols-2 gap-2.5 text-slate-700">
                              {ind.criteria.map((c, i) => {
                                const isHeader = c.includes("เกณฑ์") || c.startsWith(" -");
                                return (
                                  <li 
                                    key={i} 
                                    className={`flex items-start gap-2 ${
                                      isHeader 
                                        ? "col-span-full font-black text-slate-900 pt-1.5 border-t border-emerald-100/50 mt-1.5 text-xs sm:text-sm" 
                                        : "font-medium text-xs sm:text-sm"
                                    }`}
                                  >
                                    {!isHeader && <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />}
                                    <span className="leading-normal">{c}</span>
                                  </li>
                                );
                              })}
                            </ul>
                          </div>
                        </div>
                      )}

                      {/* 5. Method, Frequency & Case Utilization Row */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs sm:text-sm">
                        {ind.collectionMethod && (
                          <div className="space-y-2">
                            <h4 className="font-extrabold text-slate-850">วิธีการจัดเก็บรวบรวมข้อมูล</h4>
                            <p className="p-4 bg-white border border-slate-200/90 rounded-2xl text-slate-650 font-medium leading-relaxed shadow-3xs">
                              {ind.collectionMethod}
                            </p>
                          </div>
                        )}

                        {ind.collectionFrequency && (
                          <div className="space-y-2">
                            <h4 className="font-extrabold text-slate-850 flex items-center gap-1.5">
                              <Clock className="w-4 h-4 text-indigo-500" />
                              <span>ความถี่และระยะเวลากำหนดส่งรายงาน</span>
                            </h4>
                            <div className="p-4 bg-white border border-slate-200/90 rounded-2xl text-slate-650 space-y-2 font-medium shadow-3xs">
                              <p><strong className="text-slate-800 font-extrabold">รอบเก็บรวบรวมข้อมูล:</strong> {ind.collectionFrequency}</p>
                              {ind.reportingDeadline && (
                                <p><strong className="text-slate-800 font-extrabold">รอบกำหนดการส่งเล่มรายงาน:</strong> {ind.reportingDeadline}</p>
                              )}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* 6. Utilization context */}
                      {ind.useCase && (
                        <div className="space-y-2 pt-3 border-t border-slate-100 text-xs sm:text-sm">
                          <h4 className="font-extrabold text-slate-850">คุณค่าและการใช้ประโยชน์เชิงนโยบาย/สาธารณสุขอนามัย</h4>
                          <p className="text-slate-600 font-medium leading-relaxed bg-white p-4 border border-slate-200/90 rounded-2xl shadow-3xs">
                            {ind.useCase}
                          </p>
                        </div>
                      )}

                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}

        {filteredIndicators.length === 0 && (
          <div className="text-center py-16 bg-white border border-slate-200 rounded-2xl max-w-md mx-auto shadow-2xs space-y-3">
            <Compass className="w-12 h-12 mx-auto text-slate-300 animate-spin" style={{ animationDuration: '4s' }} />
            <div className="space-y-1">
              <h3 className="typo-app-h3 text-slate-800">ไม่พบรหัสหรือคำนิยามที่ค้นหา</h3>
              <p className="typo-app-subtext text-slate-500">
                กรุณาลองปรับคำค้นหา เช่น ระบุตัวเลขดัชนี หรือกรองเฉพาะเป้าหมายที่ต้องการ
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
