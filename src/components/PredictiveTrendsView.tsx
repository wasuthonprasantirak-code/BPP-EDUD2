import React, { useState, useEffect, useMemo, useCallback } from "react";
import { ActivityReport, KOPODOT_GOALS } from "../types";
import { OFFICIAL_TARGET_SCHOOLS } from "../data/schoolsData";
import { ROYAL_EMBLEM_IMAGE } from "../data/emblemLogo";

function formatThaiDate(dateInput?: string | Date): string {
  if (!dateInput) return "";
  try {
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return String(dateInput);
    const day = d.getDate();
    const months = [
      "ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.",
      "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."
    ];
    const month = months[d.getMonth()] || "";
    const year = d.getFullYear() > 2400 ? d.getFullYear() : d.getFullYear() + 543;
    return `${day} ${month} ${year}`;
  } catch {
    return String(dateInput);
  }
}

import {
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  ShieldAlert,
  CheckCircle2,
  Clock,
  Sparkles,
  RefreshCw,
  Copy,
  Check,
  Search,
  Filter,
  Calendar,
  ArrowUpRight,
  Target,
  ChevronRight,
  Printer,
  Building2,
  Activity,
  Layers,
  HelpCircle,
  Eye,
  Info
} from "lucide-react";

export interface SystemicRiskFactor {
  title: string;
  description: string;
  impactLevel: "HIGH" | "MEDIUM" | "LOW";
}

export interface SeasonalForecastItem {
  season: string;
  period: string;
  forecastDetails: string;
  keyFocusGoal: string;
}

export interface VulnerableIndicator {
  code: string;
  name: string;
  vulnerableSchoolCount: number;
  riskReason: string;
}

export interface SchoolPredictionItem {
  schoolId: string;
  schoolName: string;
  groupName: string;
  province: string;
  totalReports: number;
  lastReportDate: string;
  daysSinceLastReport: number;
  goalsCoveredCount: number;
  uncoveredGoals: string[];
  problemReportsCount: number;
  riskScore: number;
  riskLevel: "HIGH_RISK" | "MODERATE_RISK" | "ON_TRACK";
  riskLevelLabel: string;
  trendDirection: "DECLINING" | "STABLE" | "IMPROVING";
  topRiskFactor?: string;
  predictedObstacles?: string[];
  proactiveInterventions?: string[];
  keyVulnerableIndicators?: string[];
}

export interface PredictiveTrendsResponse {
  success: boolean;
  analyzedAt: string;
  totalSchoolsAnalyzed: number;
  highRiskCount: number;
  moderateRiskCount: number;
  onTrackCount: number;
  executiveStrategicSummary: string;
  systemicRiskFactors: SystemicRiskFactor[];
  seasonalForecast: SeasonalForecastItem[];
  topVulnerableIndicators: VulnerableIndicator[];
  schoolPredictions: SchoolPredictionItem[];
  isFallback: boolean;
}

interface PredictiveTrendsViewProps {
  reports: ActivityReport[];
  onSelectSchool?: (schoolName: string) => void;
  onNavigateToDocument?: (schoolName: string) => void;
}

export const PredictiveTrendsView: React.FC<PredictiveTrendsViewProps> = ({
  reports,
  onSelectSchool,
  onNavigateToDocument
}) => {
  // State variables
  const [divisionFilter, setDivisionFilter] = useState<string>("ALL");
  const [riskTabFilter, setRiskTabFilter] = useState<"ALL" | "HIGH_RISK" | "MODERATE_RISK" | "ON_TRACK">("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [data, setData] = useState<PredictiveTrendsResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedSchool, setSelectedSchool] = useState<SchoolPredictionItem | null>(null);
  const [isCopied, setIsCopied] = useState<boolean>(false);

  // Fetch Predictive Trends Analysis
  const fetchPredictiveData = useCallback(async (forceRefresh = false) => {
    if (forceRefresh) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }
    setError(null);

    try {
      const response = await fetch("/api/gemini/predictive-trends", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          division: divisionFilter,
          schoolFilter: searchQuery,
          forceRefresh
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP Error ${response.status}`);
      }

      const result: PredictiveTrendsResponse = await response.json();
      setData(result);
    } catch (err: any) {
      console.error("[PredictiveTrends] Failed to fetch data:", err);
      setError("ไม่สามารถดึงข้อมูลการวิเคราะห์เชิงคาดการณ์ได้ โปรดลองอีกครั้ง");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [divisionFilter, searchQuery]);

  // Initial fetch and on division filter change
  useEffect(() => {
    fetchPredictiveData(false);
  }, [fetchPredictiveData]);

  // Filtered schools based on tab and search
  const filteredSchools = useMemo(() => {
    if (!data?.schoolPredictions) return [];
    return data.schoolPredictions.filter((item) => {
      // Risk Tab Filter
      if (riskTabFilter !== "ALL" && item.riskLevel !== riskTabFilter) {
        return false;
      }
      // Search Filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const matchName = item.schoolName.toLowerCase().includes(query);
        const matchGroup = item.groupName.toLowerCase().includes(query);
        const matchProvince = item.province.toLowerCase().includes(query);
        if (!matchName && !matchGroup && !matchProvince) {
          return false;
        }
      }
      return true;
    });
  }, [data?.schoolPredictions, riskTabFilter, searchQuery]);

  // Copy Executive Briefing to Clipboard
  const handleCopyExecutiveBriefing = () => {
    if (!data) return;

    const summaryText = `【รายงานวิเคราะห์เชิงคาดการณ์ & ระบบเตือนภัยล่วงหน้า (Predictive Trends AI)】
หน่วยงาน: กองบังคับการตำรวจตระเวนชายแดนภาค 2 (บก.ตชด.ภาค 2)
ข้อมูล ณ วันที่: ${formatThaiDate(data.analyzedAt || new Date().toISOString())}
จำนวนโรงเรียนที่วิเคราะห์: ${data.totalSchoolsAnalyzed} แห่ง

📊 สรุปสถานะความเสี่ยง:
- กลุ่มเสี่ยงสูง (ต้องการสนับสนุนเร่งด่วน): ${data.highRiskCount} แห่ง
- กลุ่มเฝ้าระวัง (มีแนวโน้มชะลอตัว): ${data.moderateRiskCount} แห่ง
- กลุ่มปกติ (ดำเนินงานต่อเนื่องตามเกณฑ์): ${data.onTrackCount} แห่ง

📌 บทสรุปเชิงยุทธศาสตร์:
${data.executiveStrategicSummary}

⚠️ ปัจจัยเสี่ยงเชิงระบบที่สำคัญ (Systemic Risk Factors):
${data.systemicRiskFactors.map((f, i) => `${i + 1}. [ระดับผลกระทบ: ${f.impactLevel}] ${f.title}\n   - ${f.description}`).join("\n")}

🎯 ตัวชี้วัดที่มีความเสี่ยงตกเกณฑ์สูงสุด:
${data.topVulnerableIndicators.map((v, i) => `${i + 1}. ${v.code} ${v.name} (โรงเรียนกลุ่มเสี่ยง ${v.vulnerableSchoolCount} แห่ง) - สาเหตุ: ${v.riskReason}`).join("\n")}

(สร้างโดยระบบ AI สังเคราะห์แผนพัฒนาเด็กและเยาวชนในถิ่นทุรกันดาร กพด. ฉบับที่ 5)`;

    navigator.clipboard.writeText(summaryText);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2500);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300 pb-16">
      {/* 1. Header Bar with Controls */}
      <div className="app-card-surface flex flex-col md:flex-row md:items-center justify-between gap-4 border-l-4 border-l-indigo-600">
        <div className="flex items-start gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-600 to-purple-700 text-white flex items-center justify-center shrink-0 shadow-sm shadow-indigo-200">
            <Sparkles className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="typo-app-h1 text-xl sm:text-2xl text-slate-900">
                ระบบวิเคราะห์เชิงคาดการณ์ (Predictive Trends AI)
              </h1>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-100 text-purple-800 border border-purple-200">
                <Sparkles className="w-3 h-3 text-purple-600" />
                Gemini 3.8 Intelligence
              </span>
              {data?.isFallback && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200" title="ประมวลผลด้วยสถิติเชิงปริมาณสำรองอัจฉริยะ">
                  สถิติเชิงวิเคราะห์
                </span>
              )}
            </div>
            <p className="typo-app-body text-xs sm:text-sm text-slate-600 mt-0.5">
              วิเคราะห์แนวโน้มล่วงหน้า เตือนภัยสถานศึกษาที่อาจติดปัญหาในการดำเนินโครงการ กพด.๕ และสังเคราะห์ข้อเสนอแนะเชิงป้องกันล่วงหน้า
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 self-start md:self-auto shrink-0 flex-wrap">
          <button
            onClick={handleCopyExecutiveBriefing}
            disabled={!data || isLoading}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-indigo-600 transition-all shadow-2xs disabled:opacity-50"
            title="คัดลอกข้อสรุปการคาดการณ์ไปใช้งานในที่ประชุม"
          >
            {isCopied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                <span className="text-emerald-700">คัดลอกแล้ว</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>คัดลอกสรุปผู้บริหาร</span>
              </>
            )}
          </button>

          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-indigo-600 transition-all shadow-2xs no-print"
            title="พิมพ์หน้ารายงานสรุปการคาดการณ์"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>พิมพ์รายงาน</span>
          </button>

          <button
            onClick={() => fetchPredictiveData(true)}
            disabled={isRefreshing || isLoading}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-xs font-bold hover:from-indigo-700 hover:to-purple-700 transition-all shadow-xs disabled:opacity-60"
            title="ให้ AI ประมวลผลและวิเคราะห์แนวโน้มใหม่แบบเรียลไทม์"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
            <span>{isRefreshing ? "กำลังวิเคราะห์..." : "วิเคราะห์ใหม่ด้วย AI"}</span>
          </button>
        </div>
      </div>

      {/* 2. Statistical KPI Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Analyzed Schools */}
        <div className="app-card-surface border-slate-200 flex flex-col justify-between p-4 sm:p-5">
          <div className="flex items-center justify-between">
            <span className="typo-app-subtext font-semibold text-slate-500">โรงเรียนที่วิเคราะห์ทั้งหมด</span>
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-700 flex items-center justify-center">
              <Building2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="typo-app-h1 text-2xl sm:text-3xl font-black text-slate-900">
              {isLoading ? "..." : (data?.totalSchoolsAnalyzed || 53)}
            </div>
            <p className="typo-app-subtext text-slate-500 mt-0.5">สถานศึกษา ตชด. ภาค 2</p>
          </div>
        </div>

        {/* High Risk Early Warning */}
        <div className="app-card-surface border-rose-200 bg-gradient-to-br from-white to-rose-50/30 flex flex-col justify-between p-4 sm:p-5">
          <div className="flex items-center justify-between">
            <span className="typo-app-subtext font-bold text-rose-700">กลุ่มเสี่ยงสูง (เร่งด่วน)</span>
            <div className="w-8 h-8 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center">
              <ShieldAlert className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="typo-app-h1 text-2xl sm:text-3xl font-black text-rose-600">
              {isLoading ? "..." : (data?.highRiskCount || 0)}
              <span className="text-xs font-medium text-slate-500 ml-1.5">แห่ง</span>
            </div>
            <p className="typo-app-subtext text-rose-600/80 mt-0.5">ต้องการการสนับสนุนเชิงรุก</p>
          </div>
        </div>

        {/* Moderate Risk */}
        <div className="app-card-surface border-amber-200 bg-gradient-to-br from-white to-amber-50/30 flex flex-col justify-between p-4 sm:p-5">
          <div className="flex items-center justify-between">
            <span className="typo-app-subtext font-bold text-amber-700">กลุ่มเฝ้าระวัง (ติดตาม)</span>
            <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="typo-app-h1 text-2xl sm:text-3xl font-black text-amber-600">
              {isLoading ? "..." : (data?.moderateRiskCount || 0)}
              <span className="text-xs font-medium text-slate-500 ml-1.5">แห่ง</span>
            </div>
            <p className="typo-app-subtext text-amber-600/80 mt-0.5">เริ่มมีช่วงว่างของกิจกรรม</p>
          </div>
        </div>

        {/* On Track */}
        <div className="app-card-surface border-emerald-200 bg-gradient-to-br from-white to-emerald-50/30 flex flex-col justify-between p-4 sm:p-5">
          <div className="flex items-center justify-between">
            <span className="typo-app-subtext font-bold text-emerald-700">กลุ่มดำเนินงานปกติ</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="typo-app-h1 text-2xl sm:text-3xl font-black text-emerald-600">
              {isLoading ? "..." : (data?.onTrackCount || 0)}
              <span className="text-xs font-medium text-slate-500 ml-1.5">แห่ง</span>
            </div>
            <p className="typo-app-subtext text-emerald-600/80 mt-0.5">สม่ำเสมอตามเกณฑ์มาตรฐาน</p>
          </div>
        </div>
      </div>

      {/* 3. Executive Strategic AI Summary Card */}
      {data && (
        <div className="app-card-surface bg-gradient-to-br from-indigo-50/90 via-white to-purple-50/60 p-5 sm:p-6 border border-indigo-200/90 shadow-2xs hover:shadow-xs transition-all duration-200">
          <div className="flex items-center gap-2 mb-3">
            <div className="p-1.5 rounded-lg bg-indigo-100 text-indigo-700 border border-indigo-200/80 shadow-3xs">
              <Sparkles className="w-4 h-4 text-indigo-600" />
            </div>
            <h2 className="typo-app-h2 text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
              บทสรุปเชิงยุทธศาสตร์และการคาดการณ์ AI สำหรับผู้บังคับบัญชา
            </h2>
          </div>
          <p className="typo-app-body text-slate-800 leading-relaxed text-sm sm:text-base font-normal">
            {data.executiveStrategicSummary}
          </p>
          <div className="mt-4 pt-3 border-t border-indigo-100/80 flex items-center justify-between flex-wrap gap-2 text-xs text-slate-500">
            <span className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-indigo-600" />
              <span className="font-medium text-slate-600">วิเคราะห์ล่าสุด: {formatThaiDate(data.analyzedAt || new Date().toISOString())}</span>
            </span>
            <span className="text-indigo-700/90 font-semibold bg-indigo-50/80 px-2.5 py-0.5 rounded-md border border-indigo-100">
              อัลกอริทึม: Multi-Factor Heuristic Risk Model + Gemini Generative Reasoning
            </span>
          </div>
        </div>
      )}

      {/* 4. Strategic Deep Dive: Systemic Risk Factors & Seasonal Forecast */}
      {data && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 4.1 ปัจจัยเสี่ยงเชิงระบบ (Systemic Risk Factors) */}
          <div className="app-card-surface flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="p-1.5 rounded-lg bg-rose-50 text-rose-600">
                  <AlertTriangle className="w-4 h-4" />
                </div>
                <h3 className="typo-app-h3 text-base sm:text-lg font-bold text-slate-900">
                  ปัจจัยเสี่ยงเชิงระบบที่ต้องเฝ้าระวัง (Systemic Risk Factors)
                </h3>
              </div>
              <div className="space-y-3">
                {data.systemicRiskFactors?.map((factor, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 rounded-xl border border-slate-200/90 bg-slate-50/60 hover:bg-white hover:border-slate-300 transition-all"
                  >
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <span className="font-bold text-sm text-slate-900">
                        {idx + 1}. {factor.title}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-md text-[11px] font-bold shrink-0 ${
                          factor.impactLevel === "HIGH"
                            ? "bg-rose-100 text-rose-700 border border-rose-200"
                            : factor.impactLevel === "MEDIUM"
                            ? "bg-amber-100 text-amber-700 border border-amber-200"
                            : "bg-blue-100 text-blue-700 border border-blue-200"
                        }`}
                      >
                        ผลกระทบ {factor.impactLevel === "HIGH" ? "สูง" : factor.impactLevel === "MEDIUM" ? "ปานกลาง" : "ต่ำ"}
                      </span>
                    </div>
                    <p className="typo-app-body text-xs text-slate-600 leading-relaxed">
                      {factor.description}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* 4.2 การพยากรณ์ความเสี่ยงตามฤดูกาลและไตรมาส (Seasonal Forecast) */}
          <div className="app-card-surface flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600">
                  <Calendar className="w-4 h-4" />
                </div>
                <h3 className="typo-app-h3 text-base sm:text-lg font-bold text-slate-900">
                  การพยากรณ์ความเสี่ยงตามฤดูกาล (Seasonal & Quarterly Forecast)
                </h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {data.seasonalForecast?.map((season, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 rounded-xl border border-indigo-100 bg-indigo-50/20 hover:bg-white hover:shadow-2xs transition-all flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-1 mb-1">
                        <span className="text-xs font-black text-indigo-900">{season.season}</span>
                      </div>
                      <span className="typo-app-subtext text-[11px] text-slate-500 block mb-2 font-medium">
                        {season.period}
                      </span>
                      <p className="typo-app-body text-xs text-slate-700 leading-relaxed mb-3">
                        {season.forecastDetails}
                      </p>
                    </div>
                    <div className="pt-2 border-t border-indigo-100/80">
                      <span className="text-[10px] font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md inline-block">
                        🎯 โฟกัส: {season.keyFocusGoal}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 5. Top Vulnerable Indicators Matrix */}
      {data && data.topVulnerableIndicators?.length > 0 && (
        <div className="app-card-surface">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-purple-50 text-purple-600">
                <Target className="w-4 h-4" />
              </div>
              <div>
                <h3 className="typo-app-h3 text-base sm:text-lg font-bold text-slate-900">
                  ตัวชี้วัดที่มีความเสี่ยงตกเกณฑ์สูงสุด (Top Vulnerable Indicators)
                </h3>
                <p className="typo-app-subtext text-slate-500">
                  กิจกรรมตามพระราชดำริที่มีแนวโน้มขาดช่วงหรือดำเนินงานได้ต่ำกว่าเกณฑ์เป้าหมาย
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {data.topVulnerableIndicators.map((item, idx) => (
              <div
                key={idx}
                className="p-4 rounded-xl border border-slate-200/90 bg-white hover:border-purple-300 hover:shadow-xs transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="px-2.5 py-1 rounded-lg bg-purple-100 text-purple-900 font-black text-xs">
                      {item.code}
                    </span>
                    <span className="text-xs font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-100">
                      เสี่ยง {item.vulnerableSchoolCount} แห่ง
                    </span>
                  </div>
                  <h4 className="font-bold text-sm text-slate-900 leading-snug mb-2">
                    {item.name}
                  </h4>
                  <p className="typo-app-body text-xs text-slate-600 leading-relaxed">
                    <span className="font-semibold text-slate-700">สาเหตุสำคัญ: </span>
                    {item.riskReason}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 6. Filter Controls for School Early Warning Matrix */}
      <div className="app-card-surface space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <h2 className="typo-app-h2 text-lg sm:text-xl font-bold text-slate-900">
              ตารางเฝ้าระวังและวิเคราะห์แนวโน้มรายสถานศึกษา (Early Warning Matrix)
            </h2>
            <p className="typo-app-subtext text-slate-500">
              จัดอันดับความเสี่ยงจากประวัติการส่งรายงาน ความสม่ำเสมอ และความครอบคลุม 8 เป้าหมาย
            </p>
          </div>

          {/* Division Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full">
            {["ALL", "21", "22", "23", "24"].map((div) => (
              <button
                key={div}
                onClick={() => setDivisionFilter(div)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
                  divisionFilter === div
                    ? "bg-indigo-600 text-white shadow-2xs"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {div === "ALL" ? "ภาพรวมทั้งหมด" : `กก.ตชด. ${div}`}
              </button>
            ))}
          </div>
        </div>

        {/* Search and Risk Level Filters */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2 border-t border-slate-100">
          {/* Search box */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ค้นหาชื่อโรงเรียน, สังกัด หรือจังหวัด..."
              className="w-full pl-9 pr-3.5 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
              >
                ✕
              </button>
            )}
          </div>

          {/* Risk Tab Filters */}
          <div className="flex items-center gap-1.5 overflow-x-auto">
            <button
              onClick={() => setRiskTabFilter("ALL")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shrink-0 ${
                riskTabFilter === "ALL"
                  ? "bg-slate-900 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              ทั้งหมด ({data?.schoolPredictions?.length || 0})
            </button>
            <button
              onClick={() => setRiskTabFilter("HIGH_RISK")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shrink-0 ${
                riskTabFilter === "HIGH_RISK"
                  ? "bg-rose-600 text-white"
                  : "bg-rose-50 text-rose-700 hover:bg-rose-100"
              }`}
            >
              เสี่ยงสูง ({data?.highRiskCount || 0})
            </button>
            <button
              onClick={() => setRiskTabFilter("MODERATE_RISK")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shrink-0 ${
                riskTabFilter === "MODERATE_RISK"
                  ? "bg-amber-600 text-white"
                  : "bg-amber-50 text-amber-700 hover:bg-amber-100"
              }`}
            >
              เฝ้าระวัง ({data?.moderateRiskCount || 0})
            </button>
            <button
              onClick={() => setRiskTabFilter("ON_TRACK")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shrink-0 ${
                riskTabFilter === "ON_TRACK"
                  ? "bg-emerald-600 text-white"
                  : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
              }`}
            >
              ปกติ ({data?.onTrackCount || 0})
            </button>
          </div>
        </div>

        {/* 7. Early Warning School Cards Grid */}
        {isLoading ? (
          <div className="py-16 text-center">
            <RefreshCw className="w-8 h-8 text-indigo-600 animate-spin mx-auto mb-3" />
            <p className="typo-app-body font-semibold text-slate-700">กำลังประมวลผลการวิเคราะห์เชิงคาดการณ์ด้วย AI...</p>
            <p className="typo-app-subtext text-slate-500 mt-1">คำนวณความเสี่ยงสถิติประวัติการส่งรายงาน 53 โรงเรียน</p>
          </div>
        ) : filteredSchools.length === 0 ? (
          <div className="py-16 text-center bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
            <HelpCircle className="w-8 h-8 text-slate-400 mx-auto mb-2" />
            <p className="typo-app-body font-semibold text-slate-700">ไม่พบโรงเรียนที่ตรงกับเงื่อนไขการค้นหา</p>
            <p className="typo-app-subtext text-slate-500 mt-0.5">ลองปรับตัวกรองสังกัดหรือคำค้นหา</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
            {filteredSchools.map((item) => {
              const isHighRisk = item.riskLevel === "HIGH_RISK";
              const isModerateRisk = item.riskLevel === "MODERATE_RISK";

              return (
                <div
                  key={item.schoolId}
                  className={`rounded-2xl p-4 sm:p-5 border transition-all duration-200 flex flex-col justify-between ${
                    isHighRisk
                      ? "bg-white border-rose-200 shadow-2xs hover:border-rose-400 hover:shadow-xs"
                      : isModerateRisk
                      ? "bg-white border-amber-200 shadow-2xs hover:border-amber-400 hover:shadow-xs"
                      : "bg-white border-slate-200/90 shadow-2xs hover:border-indigo-300 hover:shadow-xs"
                  }`}
                >
                  <div>
                    {/* Header: School Name & Risk Badge */}
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-[11px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                            {item.groupName}
                          </span>
                          <span className="text-[11px] text-slate-400">จ.{item.province}</span>
                        </div>
                        <h4 className="typo-app-h3 text-sm sm:text-base font-bold text-slate-900 mt-1 truncate">
                          {item.schoolName}
                        </h4>
                      </div>

                      {/* Risk Gauge Badge */}
                      <div className="text-right shrink-0">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-black ${
                            isHighRisk
                              ? "bg-rose-100 text-rose-700 border border-rose-200"
                              : isModerateRisk
                              ? "bg-amber-100 text-amber-700 border border-amber-200"
                              : "bg-emerald-100 text-emerald-700 border border-emerald-200"
                          }`}
                        >
                          {isHighRisk && <ShieldAlert className="w-3 h-3 text-rose-600" />}
                          {isModerateRisk && <AlertTriangle className="w-3 h-3 text-amber-600" />}
                          {!isHighRisk && !isModerateRisk && <CheckCircle2 className="w-3 h-3 text-emerald-600" />}
                          ดัชนี {item.riskScore}/100
                        </span>
                      </div>
                    </div>

                    {/* Status Subtitle */}
                    <div className="flex items-center gap-2 mb-3 text-xs">
                      <span
                        className={`font-semibold ${
                          isHighRisk ? "text-rose-600" : isModerateRisk ? "text-amber-600" : "text-emerald-600"
                        }`}
                      >
                        {item.riskLevelLabel}
                      </span>
                      <span className="text-slate-300">•</span>
                      <span className="text-slate-500 flex items-center gap-1">
                        {item.trendDirection === "DECLINING" && (
                          <span className="text-rose-500 font-bold flex items-center">
                            <TrendingDown className="w-3.5 h-3.5 mr-0.5" /> ชะลอตัว
                          </span>
                        )}
                        {item.trendDirection === "STABLE" && <span>แนวโน้มคงที่</span>}
                        {item.trendDirection === "IMPROVING" && (
                          <span className="text-emerald-500 font-bold flex items-center">
                            <TrendingUp className="w-3.5 h-3.5 mr-0.5" /> ก้าวหน้าดี
                          </span>
                        )}
                      </span>
                    </div>

                    {/* Progress Metrics Pill Box */}
                    <div className="grid grid-cols-2 gap-2 p-2.5 rounded-xl bg-slate-50/80 border border-slate-100 mb-3 text-xs">
                      <div>
                        <span className="text-slate-400 block text-[10px]">รายงานทั้งหมด</span>
                        <span className="font-extrabold text-slate-800 text-sm">{item.totalReports} กิจกรรม</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px]">เว้นว่างล่าสุด</span>
                        <span className={`font-extrabold text-sm ${item.daysSinceLastReport > 30 ? "text-rose-600" : "text-slate-700"}`}>
                          {item.daysSinceLastReport} วัน
                        </span>
                      </div>
                      <div className="col-span-2 pt-1 border-t border-slate-200/60">
                        <div className="flex items-center justify-between text-[11px] mb-1">
                          <span className="text-slate-500">ความครอบคลุมเป้าหมาย:</span>
                          <span className="font-bold text-slate-800">{item.goalsCoveredCount} / 8 ด้าน</span>
                        </div>
                        {/* Progress bar */}
                        <div className="w-full h-1.5 rounded-full bg-slate-200 overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              item.goalsCoveredCount >= 7
                                ? "bg-emerald-500"
                                : item.goalsCoveredCount >= 5
                                ? "bg-amber-500"
                                : "bg-rose-500"
                            }`}
                            style={{ width: `${(item.goalsCoveredCount / 8) * 100}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Uncovered goals tags */}
                    {item.uncoveredGoals && item.uncoveredGoals.length > 0 && (
                      <div className="mb-3">
                        <span className="text-[10px] font-semibold text-slate-400 block mb-1">
                          เป้าหมายที่ยังไม่มีการรายงาน:
                        </span>
                        <div className="flex flex-wrap gap-1">
                          {item.uncoveredGoals.slice(0, 3).map((g, gIdx) => (
                            <span
                              key={gIdx}
                              className="text-[10px] bg-rose-50 text-rose-700 px-1.5 py-0.5 rounded border border-rose-100 truncate max-w-full"
                            >
                              {g}
                            </span>
                          ))}
                          {item.uncoveredGoals.length > 3 && (
                            <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded">
                              +{item.uncoveredGoals.length - 3}
                            </span>
                          )}
                        </div>
                      </div>
                    )}

                    {/* AI Predicted Obstacles */}
                    {item.predictedObstacles && item.predictedObstacles.length > 0 && (
                      <div className="p-2.5 rounded-xl bg-amber-50/40 border border-amber-200/60 mb-3">
                        <span className="text-[11px] font-bold text-amber-900 flex items-center gap-1 mb-1">
                          <Sparkles className="w-3 h-3 text-amber-600" />
                          AI คาดการณ์ประเด็นข้อขัดข้อง:
                        </span>
                        <p className="typo-app-body text-[11px] text-amber-800 leading-relaxed">
                          • {item.predictedObstacles[0]}
                        </p>
                      </div>
                    )}

                    {/* AI Proactive Interventions */}
                    {item.proactiveInterventions && item.proactiveInterventions.length > 0 && (
                      <div className="p-2.5 rounded-xl bg-indigo-50/40 border border-indigo-200/60 mb-3">
                        <span className="text-[11px] font-bold text-indigo-900 flex items-center gap-1 mb-1">
                          <Target className="w-3 h-3 text-indigo-600" />
                          ข้อเสนอแนะเชิงป้องกันล่วงหน้า:
                        </span>
                        <p className="typo-app-body text-[11px] text-indigo-800 leading-relaxed">
                          • {item.proactiveInterventions[0]}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Actions footer */}
                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                    <button
                      onClick={() => setSelectedSchool(item)}
                      className="inline-flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-800 p-1"
                    >
                      <Info className="w-3.5 h-3.5" />
                      <span>ดูรายละเอียดเชิงลึก</span>
                    </button>

                    {onNavigateToDocument && (
                      <button
                        onClick={() => onNavigateToDocument(item.schoolName)}
                        className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 transition-colors"
                        title="ดูรายงาน A4 ของโรงเรียนนี้"
                      >
                        <span>รายงาน A4</span>
                        <ChevronRight className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 8. Detailed School Predictive Modal */}
      {selectedSchool && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-slate-200">
            {/* Modal Header */}
            <div className="p-5 sm:p-6 border-b border-slate-200 flex items-center justify-between sticky top-0 bg-white z-10">
              <div className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                    selectedSchool.riskLevel === "HIGH_RISK"
                      ? "bg-rose-100 text-rose-700"
                      : selectedSchool.riskLevel === "MODERATE_RISK"
                      ? "bg-amber-100 text-amber-700"
                      : "bg-emerald-100 text-emerald-700"
                  }`}
                >
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="typo-app-h2 text-lg sm:text-xl font-bold text-slate-900">
                    {selectedSchool.schoolName}
                  </h3>
                  <p className="typo-app-subtext text-slate-500">
                    {selectedSchool.groupName} • จ.{selectedSchool.province}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedSchool(null)}
                className="w-8 h-8 rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200 flex items-center justify-center text-sm font-bold"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 sm:p-6 space-y-5">
              {/* Risk Status Highlight */}
              <div
                className={`p-4 rounded-2xl border flex items-center justify-between ${
                  selectedSchool.riskLevel === "HIGH_RISK"
                    ? "bg-rose-50 border-rose-200 text-rose-900"
                    : selectedSchool.riskLevel === "MODERATE_RISK"
                    ? "bg-amber-50 border-amber-200 text-amber-900"
                    : "bg-emerald-50 border-emerald-200 text-emerald-900"
                }`}
              >
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider block">ระดับการประเมินความเสี่ยง</span>
                  <div className="text-base font-black mt-0.5">{selectedSchool.riskLevelLabel}</div>
                </div>
                <div className="text-right">
                  <span className="text-2xl font-black">{selectedSchool.riskScore}</span>
                  <span className="text-xs font-medium block">คะแนนความเสี่ยง / 100</span>
                </div>
              </div>

              {/* Statistical Metrics */}
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="text-[11px] text-slate-500 block">รายงานสะสม</span>
                  <span className="text-lg font-black text-slate-900">{selectedSchool.totalReports}</span>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="text-[11px] text-slate-500 block">ว่างเว้นรายงาน</span>
                  <span className="text-lg font-black text-rose-600">{selectedSchool.daysSinceLastReport} วัน</span>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="text-[11px] text-slate-500 block">ครอบคลุมเป้าหมาย</span>
                  <span className="text-lg font-black text-indigo-600">{selectedSchool.goalsCoveredCount}/8 ด้าน</span>
                </div>
              </div>

              {/* Obstacles Forecast List */}
              <div>
                <h4 className="typo-app-h3 text-sm font-bold text-slate-900 mb-2 flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  ข้อขัดข้องและอุปสรรคที่คาดว่าจะเกิดขึ้น (Predicted Obstacles)
                </h4>
                <div className="space-y-2">
                  {selectedSchool.predictedObstacles?.map((obs, idx) => (
                    <div key={idx} className="p-3 rounded-xl bg-amber-50/50 border border-amber-200/70 text-xs text-amber-900 leading-relaxed">
                      • {obs}
                    </div>
                  ))}
                </div>
              </div>

              {/* Proactive Interventions List */}
              <div>
                <h4 className="typo-app-h3 text-sm font-bold text-slate-900 mb-2 flex items-center gap-1.5">
                  <Target className="w-4 h-4 text-indigo-600" />
                  มาตรการสนับสนุนและข้อเสนอแนะเชิงป้องกันล่วงหน้า (Proactive Interventions)
                </h4>
                <div className="space-y-2">
                  {selectedSchool.proactiveInterventions?.map((inv, idx) => (
                    <div key={idx} className="p-3 rounded-xl bg-indigo-50/50 border border-indigo-200/70 text-xs text-indigo-900 leading-relaxed">
                      ✓ {inv}
                    </div>
                  ))}
                </div>
              </div>

              {/* Uncovered Goals List */}
              {selectedSchool.uncoveredGoals?.length > 0 && (
                <div>
                  <h4 className="typo-app-h3 text-sm font-bold text-slate-900 mb-2">
                    เป้าหมายที่ยังไม่มีรายงาน ({selectedSchool.uncoveredGoals.length} ด้าน)
                  </h4>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedSchool.uncoveredGoals.map((g, idx) => (
                      <span key={idx} className="text-xs bg-slate-100 text-slate-700 px-2.5 py-1 rounded-lg border border-slate-200">
                        {g}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 sm:p-5 border-t border-slate-200 bg-slate-50 rounded-b-3xl flex items-center justify-between">
              <button
                onClick={() => setSelectedSchool(null)}
                className="px-4 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-100"
              >
                ปิดหน้าต่าง
              </button>

              {onNavigateToDocument && (
                <button
                  onClick={() => {
                    const schoolName = selectedSchool.schoolName;
                    setSelectedSchool(null);
                    onNavigateToDocument(schoolName);
                  }}
                  className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 shadow-2xs"
                >
                  ไปยังเอกสารรายงาน A4 ของโรงเรียนนี้
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default PredictiveTrendsView;
