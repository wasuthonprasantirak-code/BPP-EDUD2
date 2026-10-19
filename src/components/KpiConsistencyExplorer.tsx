import React, { useState, useMemo } from "react";
import { 
  ActivityReport, 
  ReportStatus, 
  KOPODOT_GOALS, 
  getGoalIdFromCode, 
  normalizeGoalCode 
} from "../types";
import { OFFICIAL_INDICATORS } from "../data/indicatorsData";
import { OFFICIAL_TARGET_SCHOOLS, isSchoolMatch } from "../data/schoolsData";
import { 
  Search, 
  Compass, 
  Clock, 
  Activity, 
  Calculator, 
  ChevronUp, 
  ChevronDown, 
  Sparkles, 
  CheckCircle2, 
  AlertTriangle, 
  FileText, 
  ExternalLink,
  List,
  X,
  User,
  MapPin,
  Calendar,
  Briefcase
} from "lucide-react";
import { toThaiNumerals, extractReportParticipantCount } from "../lib/safeDateUtils";

interface KpiConsistencyExplorerProps {
  reports: ActivityReport[];
  onSelectReport: (id: string) => void;
}

export default function KpiConsistencyExplorer({ reports, onSelectReport }: KpiConsistencyExplorerProps) {
  const [selectedGoalId, setSelectedGoalId] = useState<number>(1);
  const [indicatorSearch, setIndicatorSearch] = useState<string>("");
  const [activeIndicatorId, setActiveIndicatorId] = useState<string>("KPI-1-1");
  const [calcCustomNumerator, setCalcCustomNumerator] = useState<string>("");
  const [calcCustomDenominator, setCalcCustomDenominator] = useState<string>("");
  const [calcCustomTarget, setCalcCustomTarget] = useState<string>("80");
  const [showAllGoalReports, setShowAllGoalReports] = useState<boolean>(false);
  const [previewReport, setPreviewReport] = useState<ActivityReport | null>(null);

  // Selected Goal for the Interactive Explorer
  const selectedGoal = useMemo(() => {
    return KOPODOT_GOALS.find((g) => g.id === selectedGoalId) || KOPODOT_GOALS[0];
  }, [selectedGoalId]);

  // Reports corresponding to the selected Goal
  const selectedGoalReports = useMemo(() => {
    return reports.filter((r) => getGoalIdFromCode(r.goalCode) === selectedGoal.id);
  }, [reports, selectedGoal]);

  // Indicators corresponding to the selected Goal in the Explorer
  const selectedGoalIndicators = useMemo(() => {
    return OFFICIAL_INDICATORS.filter(
      (ind) => ind.goalId === selectedGoalId && 
      (indicatorSearch === "" || 
       ind.name.toLowerCase().includes(indicatorSearch.toLowerCase()) ||
       ind.code.toLowerCase().includes(indicatorSearch.toLowerCase()) ||
       ind.id.toLowerCase().includes(indicatorSearch.toLowerCase()))
    );
  }, [selectedGoalId, indicatorSearch]);

  // Active Indicator selected within the selected Goal
  const activeIndicator = useMemo(() => {
    if (selectedGoalIndicators.length === 0) return null;
    const found = selectedGoalIndicators.find((ind) => ind.id === activeIndicatorId);
    return found || selectedGoalIndicators[0];
  }, [selectedGoalIndicators, activeIndicatorId]);

  // Statistics for selected Goal
  const selectedGoalStats = useMemo(() => {
    const schoolsSet = new Set<string>();
    selectedGoalReports.forEach((r) => {
      const canonicalSchool = OFFICIAL_TARGET_SCHOOLS.find((s) => isSchoolMatch(r.schoolName, s.name))?.name || r.schoolName;
      if (canonicalSchool) schoolsSet.add(canonicalSchool);
    });
    const totalParticipants = selectedGoalReports.reduce((acc, r) => acc + extractReportParticipantCount(r), 0);

    return {
      count: selectedGoalReports.length,
      participants: totalParticipants,
      schools: schoolsSet.size,
    };
  }, [selectedGoalReports]);

  return (
    <div className="space-y-6">
      {/* Grid: Goals Selector on Left (or Top) & Evaluation Workspace */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        
        {/* Left Column: 8 Goals List (xl:col-span-4) */}
        <div className="xl:col-span-4 space-y-4">
          <div className="app-card-surface space-y-3">
            <div className="border-b border-slate-100 pb-3">
              <h3 className="typo-app-h3 font-black text-slate-900">
                เป้าหมายแผนงาน (1 - 8 ด้าน)
              </h3>
              <p className="typo-app-subtext">
                เลือกเป้าหมายเพื่อตรวจสอบดัชนีชี้วัดและประมวลผลสถิติกิจกรรม
              </p>
            </div>

            <div className="flex flex-col gap-2">
              {KOPODOT_GOALS.map((goal) => {
                const isSelected = goal.id === selectedGoalId;
                const matches = reports.filter((r) => getGoalIdFromCode(r.goalCode) === goal.id).length;
                const primaryIndicator = OFFICIAL_INDICATORS.find((ind) => ind.goalId === goal.id);

                return (
                  <button
                    key={goal.id}
                    type="button"
                    onClick={() => {
                      setSelectedGoalId(goal.id);
                      setIndicatorSearch("");
                      // Auto-select first indicator of the selected goal
                      const firstInd = OFFICIAL_INDICATORS.find((ind) => ind.goalId === goal.id);
                      if (firstInd) {
                        setActiveIndicatorId(firstInd.id);
                      }
                      setCalcCustomNumerator("");
                      setCalcCustomDenominator("");
                    }}
                    className={`relative text-left p-3.5 rounded-xl border transition-all duration-150 flex flex-col gap-2 w-full select-none cursor-pointer group ${
                      isSelected 
                        ? "bg-gradient-to-br from-indigo-900 via-indigo-950 to-slate-900 text-white border-indigo-600 shadow-sm ring-2 ring-indigo-500/30 scale-[1.01]" 
                        : "bg-white border-slate-200/90 hover:border-indigo-300 hover:shadow-xs text-slate-900 hover:bg-slate-50/80"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 w-full">
                      <span className={`font-black text-[11px] uppercase tracking-wider ${isSelected ? "text-white" : "text-slate-500"}`}>
                        เป้าหมายที่ {toThaiNumerals(goal.id)}
                      </span>
                      <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black border ${
                        isSelected 
                          ? "bg-indigo-850 text-amber-300 border-indigo-700/50" 
                          : "bg-slate-100 text-slate-700 border-slate-200"
                      }`}>
                        {toThaiNumerals(matches)} รายงาน
                      </span>
                    </div>

                    <p className={`font-extrabold text-xs sm:text-sm leading-snug ${
                      isSelected ? "text-white" : "text-slate-900 group-hover:text-indigo-950"
                    }`}>
                      {goal.title}
                    </p>

                    <div className="text-[10.5px] truncate pt-1 border-t border-slate-100/10 text-slate-400">
                      ตัวชี้วัดหลัก: {primaryIndicator ? primaryIndicator.code + " " + primaryIndicator.name : "-"}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column: Active Workspace & Statistics (xl:col-span-8) */}
        <div className="xl:col-span-8 space-y-6">
          
          {/* Goal Summary Statistics */}
          <div className="app-card-surface space-y-4">
            <div className="p-4 rounded-xl bg-gradient-to-br from-slate-50 via-indigo-50/40 to-white text-slate-900 border border-indigo-100/90 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-indigo-100/80">
                <div className="space-y-0.5">
                  <span className="bg-indigo-600 text-white font-black text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider">
                    เป้าหมายที่ {toThaiNumerals(selectedGoal.id)}
                  </span>
                  <h3 className="typo-app-h2 text-slate-900 font-extrabold leading-snug !text-base sm:!text-lg">
                    {selectedGoal.title}
                  </h3>
                </div>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="bg-white p-3 rounded-xl border border-indigo-100/80 space-y-1 shadow-2xs">
                  <span className="typo-app-subtext text-slate-500 font-bold block">รายงานกิจกรรมรวม</span>
                  <p className="text-lg sm:text-xl font-black text-indigo-950">
                    {toThaiNumerals(selectedGoalStats.count)} <span className="text-[10px] font-semibold text-slate-500">กิจกรรม</span>
                  </p>
                </div>
                <div className="bg-white p-3 rounded-xl border border-indigo-100/80 space-y-1 shadow-2xs">
                  <span className="typo-app-subtext text-slate-500 font-bold block">สถานศึกษาที่ส่งงาน</span>
                  <p className="text-lg sm:text-xl font-black text-emerald-700">
                    {toThaiNumerals(selectedGoalStats.schools)} <span className="text-[10px] font-semibold text-slate-500">/ 53 แห่ง</span>
                  </p>
                </div>
                <div className="bg-white p-3 rounded-xl border border-indigo-100/80 space-y-1 shadow-2xs">
                  <span className="typo-app-subtext text-slate-500 font-bold block">ผู้ได้รับการพัฒนาสะสม</span>
                  <p className="text-lg sm:text-xl font-black text-amber-600">
                    {toThaiNumerals(selectedGoalStats.participants.toLocaleString())} <span className="text-[10px] font-semibold text-slate-500">คน</span>
                  </p>
                </div>
                <div className="bg-white p-3 rounded-xl border border-indigo-100/80 space-y-1 shadow-2xs">
                  <span className="typo-app-subtext text-slate-500 font-bold block">งานเสร็จสิ้นสำเร็จ</span>
                  <p className="text-lg sm:text-xl font-black text-cyan-700">
                    {toThaiNumerals(selectedGoalReports.filter(r => r.status === ReportStatus.COMPLETED).length)} <span className="text-[10px] font-semibold text-slate-500">รายงาน</span>
                  </p>
                </div>
              </div>
            </div>

            {/* Selector of specific indicators within selected goal */}
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-1 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-indigo-50 text-indigo-700 rounded-lg border border-indigo-200/60">
                    <Compass className="w-4 h-4" />
                  </div>
                  <h4 className="typo-app-h3 text-slate-900 font-bold !text-sm">
                    ตัวชี้วัดประจำเป้าหมาย กพด.5
                  </h4>
                </div>

                {/* Simple Search */}
                <div className="relative w-full sm:w-64">
                  <input
                    type="text"
                    placeholder="ค้นหาชื่อหรือรหัสตัวชี้วัด..."
                    value={indicatorSearch}
                    onChange={(e) => setIndicatorSearch(e.target.value)}
                    className="w-full text-xs pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none font-medium transition"
                  />
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" />
                </div>
              </div>

              {/* Indicator Pills Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {selectedGoalIndicators.map((ind) => {
                  const isCurrent = activeIndicator?.id === ind.id;
                  return (
                    <button
                      key={ind.id}
                      onClick={() => {
                        setActiveIndicatorId(ind.id);
                        setCalcCustomNumerator("");
                        setCalcCustomDenominator("");
                      }}
                      className={`p-3 rounded-xl text-left text-xs font-bold transition-all border flex items-center gap-2.5 cursor-pointer shadow-2xs ${
                        isCurrent
                          ? "bg-indigo-600 text-white border-indigo-600 shadow-sm ring-2 ring-indigo-400/30"
                          : "bg-white hover:bg-slate-50 text-slate-700 border-slate-200 hover:border-slate-300"
                      }`}
                    >
                      <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black shrink-0 ${
                        isCurrent ? "bg-indigo-900 text-amber-300 border border-indigo-700/50" : "bg-slate-100 text-slate-700 border border-slate-200"
                      }`}>
                        {ind.code}
                      </span>
                      <span className="truncate flex-1 font-semibold text-[11.5px]">{ind.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Active Indicator Calculation Details */}
            {activeIndicator ? (
              <div className="app-card-surface border-slate-200 shadow-2xs space-y-4 p-5 bg-slate-50/50">
                <div className="pb-3 border-b border-slate-200 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="bg-indigo-100 text-indigo-900 text-[10.5px] font-black px-2.5 py-0.5 rounded-full border border-indigo-200">
                      {activeIndicator.code} ({activeIndicator.id})
                    </span>
                    <span className="bg-emerald-100 text-emerald-900 text-[10.5px] font-black px-2.5 py-0.5 rounded-full border border-emerald-200">
                      {activeIndicator.goalCode}
                    </span>
                    {activeIndicator.collectionFrequency && (
                      <span className="bg-white text-slate-700 text-[10.5px] font-bold px-2.5 py-0.5 rounded-full border border-slate-200 flex items-center gap-1">
                        <Clock className="w-3 h-3 text-slate-400" />
                        <span>ความถี่: {activeIndicator.collectionFrequency}</span>
                      </span>
                    )}
                  </div>

                  <h3 className="typo-app-h3 text-slate-900 font-extrabold !text-sm sm:!text-base">
                    {activeIndicator.name}
                  </h3>

                  <div className="bg-white p-3.5 rounded-xl border border-slate-200 text-[11.5px] text-slate-600 leading-relaxed shadow-2xs">
                    <strong className="text-slate-800 font-bold block mb-1">คำนิยามดัชนีชี้วัด (Definition):</strong>
                    {activeIndicator.definition}
                  </div>
                </div>

                {/* Calculator + Formula Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
                  
                  {/* Left: Formula (lg:col-span-5) */}
                  <div className="lg:col-span-5 bg-white rounded-xl p-4 border border-slate-200/90 shadow-2xs flex flex-col justify-between gap-3">
                    <div className="space-y-3">
                      <div className="flex items-center gap-1.5 pb-2 border-b border-slate-150">
                        <Activity className="w-4 h-4 text-indigo-600" />
                        <h4 className="text-xs font-black text-slate-900">สูตรคำนวณหลักเกณฑ์</h4>
                      </div>

                      <div className="space-y-1">
                        <span className="text-[10px] font-bold text-slate-500">สูตรอย่างเป็นทางการ:</span>
                        <div className="bg-slate-900 text-emerald-400 p-3 rounded-lg font-mono text-[11px] font-bold leading-relaxed break-words shadow-inner border border-slate-800">
                          {activeIndicator.calculation || "(จำนวนที่บรรลุเกณฑ์ / จำนวนกลุ่มเป้าหมายทั้งหมด) × 100"}
                        </div>
                      </div>

                      {activeIndicator.collectionMethod && (
                        <div className="space-y-0.5 text-[11px] text-slate-600">
                          <span className="font-bold text-slate-800 block">📋 วิธีการจัดเก็บข้อมูล:</span>
                          <p className="leading-relaxed">{activeIndicator.collectionMethod}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right: Live Interactive Engine (lg:col-span-7) */}
                  <div className="lg:col-span-7 bg-slate-900 text-white p-4.5 rounded-xl shadow-md border border-slate-800 flex flex-col justify-between gap-3">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                        <div className="flex items-center gap-1.5">
                          <Calculator className="w-4 h-4 text-emerald-400" />
                          <h4 className="text-xs font-black text-white">เครื่องคำนวณและประเมินผลตัวชี้วัดสด</h4>
                        </div>
                        <span className="text-[9.5px] bg-emerald-950 text-emerald-400 border border-emerald-800/80 font-black px-2 py-0.5 rounded-full">
                          Simulation Engine
                        </span>
                      </div>

                      {/* Manual Inputs Form */}
                      <div className="grid grid-cols-3 gap-2">
                        <div className="bg-slate-800/80 p-2 rounded-lg border border-slate-700/80 flex flex-col justify-between gap-1">
                          <label className="text-[9px] font-bold text-emerald-300">ตัวตั้งสำเร็จ [A]</label>
                          <input
                            type="number"
                            placeholder={String(selectedGoalReports.filter(r => r.status === ReportStatus.COMPLETED).length || 0)}
                            value={calcCustomNumerator}
                            onChange={(e) => setCalcCustomNumerator(e.target.value)}
                            className="w-full h-8 text-[11px] px-2 bg-slate-900 border border-slate-700 rounded-md text-white font-mono font-bold focus:ring-2 focus:ring-emerald-500"
                          />
                          <button
                            type="button"
                            onClick={() => setCalcCustomNumerator(String(selectedGoalReports.filter(r => r.status === ReportStatus.COMPLETED).length || 0))}
                            className="text-[9px] text-emerald-400 hover:underline font-bold text-left truncate"
                          >
                            ⚡ ดึงจริง ({toThaiNumerals(selectedGoalReports.filter(r => r.status === ReportStatus.COMPLETED).length)})
                          </button>
                        </div>

                        <div className="bg-slate-800/80 p-2 rounded-lg border border-slate-700/80 flex flex-col justify-between gap-1">
                          <label className="text-[9px] font-bold text-cyan-300">ตัวหารกลุ่ม [B]</label>
                          <input
                            type="number"
                            placeholder={String(selectedGoalReports.length || 53)}
                            value={calcCustomDenominator}
                            onChange={(e) => setCalcCustomDenominator(e.target.value)}
                            className="w-full h-8 text-[11px] px-2 bg-slate-900 border border-slate-700 rounded-md text-white font-mono font-bold focus:ring-2 focus:ring-cyan-500"
                          />
                          <button
                            type="button"
                            onClick={() => setCalcCustomDenominator("53")}
                            className="text-[9px] text-cyan-400 hover:underline font-bold text-left"
                          >
                            ⚡ 53 รร.เป้าหมาย
                          </button>
                        </div>

                        <div className="bg-slate-800/80 p-2 rounded-lg border border-slate-700/80 flex flex-col justify-between gap-1">
                          <label className="text-[9px] font-bold text-amber-300">เกณฑ์เป้าหมาย %</label>
                          <input
                            type="number"
                            value={calcCustomTarget}
                            onChange={(e) => setCalcCustomTarget(e.target.value)}
                            className="w-full h-8 text-[11px] px-2 bg-slate-900 border border-slate-700 rounded-md text-amber-300 font-mono font-bold focus:ring-2 focus:ring-amber-500"
                          />
                          <span className="text-[9px] text-slate-400 block font-semibold">ทั่วไป: 80%</span>
                        </div>
                      </div>

                      {/* Calculation Outcome Display */}
                      {(() => {
                        const numVal = calcCustomNumerator !== "" ? parseFloat(calcCustomNumerator) : selectedGoalReports.filter(r => r.status === ReportStatus.COMPLETED).length;
                        const denVal = calcCustomDenominator !== "" ? parseFloat(calcCustomDenominator) : (selectedGoalReports.length || 53);
                        const targetVal = parseFloat(calcCustomTarget) || 80;
                        const calculatedPct = denVal > 0 ? (numVal / denVal) * 100 : 0;

                        const isPassed = calculatedPct >= targetVal;
                        const isWarning = calculatedPct >= targetVal - 15 && !isPassed;

                        return (
                          <div className={`p-3.5 rounded-xl border space-y-2.5 ${
                            isPassed 
                              ? "bg-emerald-950/60 border-emerald-700/60 text-emerald-100" 
                              : isWarning 
                              ? "bg-amber-950/60 border-amber-700/60 text-amber-100" 
                              : "bg-rose-950/60 border-rose-700/60 text-rose-100"
                          }`}>
                            <div className="flex items-center justify-between flex-wrap gap-2">
                              <div>
                                <span className="text-[9.5px] uppercase tracking-wider text-slate-300 font-black block">ผลคำนวณและวิเคราะห์สด</span>
                                <div className="flex items-baseline gap-1.5 mt-0.5">
                                  <span className="text-2xl font-black font-mono text-white">
                                    {toThaiNumerals(calculatedPct.toFixed(1))}%
                                  </span>
                                  <span className="text-xs text-slate-300 font-bold">
                                    ({toThaiNumerals(numVal)} / {toThaiNumerals(denVal)})
                                  </span>
                                </div>
                              </div>

                              <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black flex items-center gap-1 ${
                                isPassed ? "bg-emerald-500 text-slate-950" : isWarning ? "bg-amber-400 text-slate-950" : "bg-rose-600 text-white"
                              }`}>
                                {isPassed ? "บรรลุเป้าหมายดีเยี่ยม" : isWarning ? "ผ่านเกณฑ์ใกล้เคียงเป้าหมาย" : "ต่ำกว่าเกณฑ์การประเมิน"}
                              </span>
                            </div>

                            {/* Progress bar */}
                            <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden relative">
                              <div 
                                className={`h-full transition-all duration-300 ${
                                  isPassed ? "bg-emerald-400" : isWarning ? "bg-amber-400" : "bg-rose-500"
                                }`}
                                style={{ width: `${Math.min(100, Math.max(0, calculatedPct))}%` }}
                              />
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                </div>

                {/* Criteria Checklist */}
                {activeIndicator.criteria && activeIndicator.criteria.length > 0 && (
                  <div className="pt-4 border-t border-slate-200 space-y-2.5">
                    <h4 className="typo-app-h3 text-slate-900 font-bold flex items-center gap-2 !text-xs">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>หลักเกณฑ์การประเมิน ({toThaiNumerals(activeIndicator.criteria.length)} ประเด็น)</span>
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 bg-white p-3 rounded-xl border border-slate-200">
                      {activeIndicator.criteria.map((crit, idx) => (
                        <div key={idx} className="flex items-start gap-2 p-2 rounded-lg hover:bg-slate-50 transition text-[11.5px] text-slate-700">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                          <span className="leading-relaxed">{crit}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : null}
          </div>

          {/* Related Activity Reports Table */}
          <div className="app-card-surface space-y-3.5">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
              <div className="space-y-0.5">
                <h4 className="typo-app-h3 text-slate-900 font-bold flex items-center gap-2">
                  <FileText className="w-4 h-4 text-indigo-600" />
                  <span>รายงานกิจกรรมที่สอดคล้องกับเป้าหมายนี้ ({toThaiNumerals(selectedGoalReports.length)} กิจกรรม)</span>
                </h4>
                <p className="typo-app-subtext">รายการรายงานความคืบหน้าของโรงเรียน ตชด. ที่ตรงกับเป้าหมายแผน กพด. ฉบับที่ 5 ด้านนี้</p>
              </div>

              {selectedGoalReports.length > 5 && (
                <button
                  type="button"
                  onClick={() => setShowAllGoalReports(!showAllGoalReports)}
                  className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border border-indigo-200 rounded-xl text-xs font-bold cursor-pointer transition-all flex items-center gap-1.5"
                >
                  <List className="w-3.5 h-3.5 text-indigo-600" />
                  <span>{showAllGoalReports ? "ย่อแสดงเพียง 5 รายงาน" : `ดูทั้งหมด (${toThaiNumerals(selectedGoalReports.length)} รายงาน)`}</span>
                  {showAllGoalReports ? <ChevronUp className="w-3.5 h-3.5 text-indigo-600" /> : <ChevronDown className="w-3.5 h-3.5 text-indigo-600" />}
                </button>
              )}
            </div>

            {selectedGoalReports.length > 0 ? (
              <div className="overflow-x-auto rounded-2xl border border-slate-200/90 shadow-2xs">
                <table className="w-full text-xs text-left text-slate-700">
                  <thead className="bg-slate-100/90 text-slate-900 font-extrabold uppercase border-b border-slate-200">
                    <tr>
                      <th className="px-3.5 py-3">โรงเรียน / สังกัด</th>
                      <th className="px-3.5 py-3">ชื่อกิจกรรมโครงการ</th>
                      <th className="px-3.5 py-3">วันที่ดำเนินงาน</th>
                      <th className="px-3.5 py-3 text-center">ผู้เข้าร่วม</th>
                      <th className="px-3.5 py-3 text-center">สถานะ</th>
                      <th className="px-3.5 py-3 text-right">การจัดการและเอกสาร A4</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {(showAllGoalReports ? selectedGoalReports : selectedGoalReports.slice(0, 5)).map((rep) => (
                      <tr 
                        key={rep.id} 
                        onClick={() => setPreviewReport(rep)}
                        className="hover:bg-indigo-50/50 transition-colors cursor-pointer"
                        title="คลิกเพื่อดูรายละเอียดอย่างย่อด่วน"
                      >
                        <td className="px-3.5 py-3 font-bold text-slate-900 whitespace-nowrap">
                          {rep.schoolName}
                        </td>
                        <td className="px-3.5 py-3 font-semibold text-slate-800 max-w-[200px] truncate" title={rep.activityName}>
                          {rep.activityName}
                        </td>
                        <td className="px-3.5 py-3 text-slate-500 whitespace-nowrap">
                          {rep.dateString}
                        </td>
                        <td className="px-3.5 py-3 text-center font-bold text-slate-900 whitespace-nowrap">
                          {toThaiNumerals(extractReportParticipantCount(rep))} คน
                        </td>
                        <td className="px-3.5 py-3 text-center whitespace-nowrap">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] sm:text-xs font-black shadow-2xs ${
                            rep.status === ReportStatus.COMPLETED 
                              ? "bg-emerald-100 text-emerald-800 border border-emerald-200" 
                              : "bg-amber-100 text-amber-800 border border-amber-200"
                          }`}>
                            {rep.status === ReportStatus.COMPLETED ? "เสร็จสิ้น" : "อยู่ระหว่างทำ"}
                          </span>
                        </td>
                        <td className="px-3.5 py-3 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => onSelectReport(rep.id)}
                              className="px-3 py-1.5 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white rounded-xl text-xs font-extrabold cursor-pointer transition-all shadow-2xs hover:shadow-xs inline-flex items-center gap-1.5"
                              title="คลิกสลับไปที่หน้ารายงานกระดาษเอสี่"
                            >
                              <FileText className="w-3.5 h-3.5" />
                              <span>ดูรายงาน A4</span>
                              <ExternalLink className="w-3 h-3 text-indigo-200" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-8 text-center text-slate-400 bg-slate-50 rounded-2xl border border-slate-200 text-xs sm:text-sm font-medium">
                ยังไม่มีการส่งรายงานกิจกรรมในด้านเป้าหมายนี้
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Detail Modal Pop-up (Instant Over-layer Preview) */}
      {previewReport && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in no-print" onClick={() => setPreviewReport(null)}>
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[85vh] overflow-y-auto shadow-2xl border border-slate-200/90 p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="typo-app-h3 font-black text-slate-900">
                    รายละเอียดกิจกรรมอย่างย่อ
                  </h3>
                  <p className="typo-app-subtext">ประมวลผลด่วนจากฐานข้อมูลระบบ</p>
                </div>
              </div>
              <button 
                type="button" 
                onClick={() => setPreviewReport(null)}
                className="p-1.5 hover:bg-slate-100 rounded-xl transition text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="space-y-4 text-slate-700">
              <div className="p-4 bg-slate-50 rounded-2xl space-y-2.5 border border-slate-200">
                <span className="text-[10px] font-black uppercase text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-100">
                  เป้าหมายแผนงาน: {previewReport.goalCode || "-"}
                </span>
                <h4 className="font-extrabold text-slate-900 text-base leading-snug">
                  {previewReport.activityName}
                </h4>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="flex items-center gap-2.5 bg-slate-50 p-3 rounded-xl border border-slate-150 text-xs">
                  <MapPin className="w-4 h-4 text-slate-400 shrink-0" />
                  <div>
                    <span className="text-slate-400 block font-bold">โรงเรียน / สังกัด</span>
                    <strong className="text-slate-800 font-extrabold">{previewReport.schoolName}</strong>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 bg-slate-50 p-3 rounded-xl border border-slate-150 text-xs">
                  <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
                  <div>
                    <span className="text-slate-400 block font-bold">วันที่ดำเนินงาน</span>
                    <strong className="text-slate-800 font-extrabold">{previewReport.dateString}</strong>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 bg-slate-50 p-3 rounded-xl border border-slate-150 text-xs">
                  <User className="w-4 h-4 text-slate-400 shrink-0" />
                  <div>
                    <span className="text-slate-400 block font-bold">ผู้รายงาน / ตชด.</span>
                    <strong className="text-slate-800 font-extrabold">{previewReport.reportedBy || "ไม่ระบุ"}</strong>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 bg-slate-50 p-3 rounded-xl border border-slate-150 text-xs">
                  <Briefcase className="w-4 h-4 text-slate-400 shrink-0" />
                  <div>
                    <span className="text-slate-400 block font-bold">กลุ่มผู้เข้าร่วมและจำนวน</span>
                    <strong className="text-slate-800 font-extrabold">
                      {previewReport.targetGroup || "ประชาชน/นักเรียน"} ({toThaiNumerals(extractReportParticipantCount(previewReport))} คน)
                    </strong>
                  </div>
                </div>
              </div>

              {previewReport.details && (
                <div className="space-y-1.5 p-4 bg-white border border-slate-200 rounded-2xl shadow-2xs">
                  <span className="text-xs font-black text-slate-900 block">📝 รายละเอียดกิจกรรมโครงการ:</span>
                  <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-line">{previewReport.details}</p>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setPreviewReport(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-extrabold text-xs rounded-xl transition"
              >
                ปิดหน้าต่าง
              </button>
              <button
                type="button"
                onClick={() => {
                  setPreviewReport(null);
                  onSelectReport(previewReport.id);
                }}
                className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white font-black text-xs rounded-xl shadow-xs hover:shadow-sm transition flex items-center gap-1.5"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>เปิดดูเต็มรูปแบบ (รายงาน A4)</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
