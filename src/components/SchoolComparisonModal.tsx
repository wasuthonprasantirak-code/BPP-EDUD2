import React, { useState, useMemo } from 'react';
import { ActivityReport, ReportStatus, KOPODOT_GOALS } from '../types';
import { X, Scale, Building2, Users, FileText, CheckCircle2, TrendingUp, BarChart3 } from 'lucide-react';

interface SchoolComparisonModalProps {
  reports: ActivityReport[];
  isOpen: boolean;
  onClose: () => void;
  toThaiNumerals: (num: number | string) => string;
}

export const SchoolComparisonModal: React.FC<SchoolComparisonModalProps> = ({
  reports,
  isOpen,
  onClose,
  toThaiNumerals,
}) => {
  const [selectedSchools, setSelectedSchools] = useState<string[]>([]);
  const [selectedGoalFilter, setSelectedGoalFilter] = useState<string>("all");

  // Get list of unique school names
  const allSchools = useMemo(() => {
    const set = new Set<string>();
    reports.forEach((r) => {
      if (r.schoolName) set.add(r.schoolName);
    });
    return Array.from(set).sort();
  }, [reports]);

  // Set initial default selected schools if none selected
  React.useEffect(() => {
    if (allSchools.length > 1 && selectedSchools.length === 0) {
      setSelectedSchools([allSchools[0], allSchools[1]]);
    }
  }, [allSchools, selectedSchools]);

  const toggleSchool = (schoolName: string) => {
    if (selectedSchools.includes(schoolName)) {
      if (selectedSchools.length > 1) {
        setSelectedSchools(selectedSchools.filter((s) => s !== schoolName));
      }
    } else {
      if (selectedSchools.length < 4) {
        setSelectedSchools([...selectedSchools, schoolName]);
      }
    }
  };

  // Compare stats per selected school
  const comparisonData = useMemo(() => {
    return selectedSchools.map((schoolName) => {
      let schoolReports = reports.filter((r) => r.schoolName === schoolName);

      if (selectedGoalFilter !== "all") {
        schoolReports = schoolReports.filter((r) => r.goalCode === selectedGoalFilter);
      }

      const totalParticipants = schoolReports.reduce((acc, curr) => acc + (curr.participantsCount || 0), 0);
      const completedCount = schoolReports.filter((r) => r.status === ReportStatus.COMPLETED).length;

      // Count per goal (1 to 8)
      const goalCounts: Record<string, number> = {};
      KOPODOT_GOALS.forEach((g) => {
        goalCounts[g.id] = schoolReports.filter((r) => r.goalCode.includes(`ด้านที่ ${g.id}`) || r.goalCode === `ด้านที่ ${g.id}`).length;
      });

      return {
        schoolName,
        totalReports: schoolReports.length,
        totalParticipants,
        completedCount,
        goalCounts,
      };
    });
  }, [reports, selectedSchools, selectedGoalFilter]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto no-print">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-6xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex items-center justify-between shrink-0 border-b border-indigo-900/50">
          <div className="flex items-center space-x-3 min-w-0 flex-1 mr-2">
            <div className="p-2.5 bg-amber-500/20 text-amber-300 rounded-xl border border-amber-400/30 shrink-0">
              <Scale className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <h2 
                className="text-xs sm:text-sm md:text-base lg:text-lg font-black tracking-tight text-white flex items-center gap-2 whitespace-nowrap overflow-hidden text-ellipsis"
                title="เปรียบเทียบผลงานและยุทธศาสตร์โรงเรียน (School Multi-Comparison)"
              >
                เปรียบเทียบผลงานและยุทธศาสตร์โรงเรียน (School Multi-Comparison)
              </h2>
              <p 
                className="text-[11px] sm:text-xs text-indigo-200/80 font-medium whitespace-nowrap overflow-hidden text-ellipsis"
                title="เลือกเปรียบเทียบผลการดำเนินงานได้สูงสุด 4 โรงเรียนพร้อมกัน"
              >
                เลือกเปรียบเทียบผลการดำเนินงานได้สูงสุด 4 โรงเรียนพร้อมกัน
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-xl transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Area */}
        <div className="p-6 space-y-6 overflow-y-auto flex-1 bg-slate-50/50">
          
          {/* School Selector Pills */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
              <span className="text-xs font-black text-slate-800 flex items-center gap-2">
                <Building2 className="w-4 h-4 text-indigo-600" />
                เลือกโรงเรียนที่ต้องการเปรียบเทียบ (เลือกแล้ว {toThaiNumerals(selectedSchools.length)}/4 แห่ง):
              </span>

              {/* Goal Filter inside selector */}
              <select
                value={selectedGoalFilter}
                onChange={(e) => setSelectedGoalFilter(e.target.value)}
                className="text-xs font-extrabold bg-slate-100 border border-slate-200 text-slate-700 rounded-xl px-3 py-1.5 focus:ring-2 focus:ring-indigo-500"
              >
                <option value="all">ทุกเป้าหมายหลัก 8 ด้าน</option>
                {KOPODOT_GOALS.map((g) => (
                  <option key={g.id} value={`ด้านที่ ${g.id}`}>
                    เป้าหมายที่ {toThaiNumerals(g.id)}: {g.title}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-wrap gap-2 max-h-36 overflow-y-auto p-1">
              {allSchools.map((s) => {
                const isSelected = selectedSchools.includes(s);
                return (
                  <button
                    key={s}
                    onClick={() => toggleSchool(s)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition cursor-pointer border ${
                      isSelected
                        ? "bg-indigo-600 text-white border-indigo-600 shadow-xs"
                        : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    {s}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Comparison Cards Grid */}
          <div className={`grid grid-cols-1 ${selectedSchools.length === 2 ? 'md:grid-cols-2' : selectedSchools.length === 3 ? 'md:grid-cols-3' : 'md:grid-cols-2 lg:grid-cols-4'} gap-4`}>
            {comparisonData.map((data, idx) => (
              <div
                key={data.schoolName}
                className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden flex flex-col transition hover:shadow-md"
              >
                {/* School Header Badge */}
                <div className={`px-4 py-3 border-b flex items-center justify-between ${
                  idx === 0 ? "bg-indigo-50/80 border-indigo-100 text-indigo-950" :
                  idx === 1 ? "bg-amber-50/80 border-amber-100 text-amber-950" :
                  idx === 2 ? "bg-emerald-50/80 border-emerald-100 text-emerald-950" :
                  "bg-purple-50/80 border-purple-100 text-purple-950"
                }`}>
                  <div className="font-black text-sm truncate flex items-center gap-1.5">
                    <span className="w-6 h-6 rounded-lg bg-white shadow-2xs flex items-center justify-center text-xs font-black shrink-0 border border-slate-200">
                      {toThaiNumerals(idx + 1)}
                    </span>
                    <span className="truncate">{data.schoolName}</span>
                  </div>
                  {selectedSchools.length > 1 && (
                    <button
                      onClick={() => toggleSchool(data.schoolName)}
                      className="text-slate-400 hover:text-rose-600 p-1 rounded-lg transition"
                      title="เอาออกจากการเปรียบเทียบ"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Main Metrics */}
                <div className="p-4 space-y-3 border-b border-slate-100 bg-slate-50/30">
                  <div className="flex items-center justify-between p-2.5 bg-white rounded-xl border border-slate-100 shadow-2xs">
                    <div className="flex items-center space-x-2 text-slate-600 text-xs font-bold">
                      <FileText className="w-4 h-4 text-blue-600" />
                      <span>จำนวนกิจกรรมส่งแล้ว</span>
                    </div>
                    <span className="text-sm font-black text-slate-900">
                      {toThaiNumerals(data.totalReports)} งาน
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-2.5 bg-white rounded-xl border border-slate-100 shadow-2xs">
                    <div className="flex items-center space-x-2 text-slate-600 text-xs font-bold">
                      <Users className="w-4 h-4 text-indigo-600" />
                      <span>ผู้เข้าร่วมรวม</span>
                    </div>
                    <span className="text-sm font-black text-indigo-700">
                      {toThaiNumerals(data.totalParticipants.toLocaleString())} คน
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-2.5 bg-white rounded-xl border border-slate-100 shadow-2xs">
                    <div className="flex items-center space-x-2 text-slate-600 text-xs font-bold">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>อนุมัติเสร็จสมบูรณ์</span>
                    </div>
                    <span className="text-xs font-black text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                      {toThaiNumerals(data.completedCount)} งาน
                    </span>
                  </div>
                </div>

                {/* 8 Goals Distribution */}
                <div className="p-4 space-y-2 flex-1">
                  <h4 className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                    <BarChart3 className="w-3.5 h-3.5 text-indigo-600" />
                    การกระจายตัวตาม 8 เป้าหมาย
                  </h4>

                  <div className="space-y-1.5 pt-1">
                    {KOPODOT_GOALS.map((g) => {
                      const count = data.goalCounts[g.id] || 0;
                      const pct = data.totalReports > 0 ? Math.round((count / data.totalReports) * 100) : 0;
                      return (
                        <div key={g.id} className="text-xs space-y-0.5">
                          <div className="flex justify-between items-center text-[11px]">
                            <span className="text-slate-600 font-semibold truncate max-w-[170px]" title={g.title}>
                              เป้าที่ {toThaiNumerals(g.id)}: {g.title}
                            </span>
                            <span className="font-extrabold text-slate-900 shrink-0">
                              {toThaiNumerals(count)} งาน
                            </span>
                          </div>
                          <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-indigo-600 rounded-full transition-all duration-300"
                              style={{ width: `${pct}%` }}
                            ></div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

              </div>
            ))}
          </div>

        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-white border-t border-slate-200 flex justify-between items-center shrink-0">
          <p className="text-xs text-slate-500 font-medium">
            * ข้อมูลเปรียบเทียบประมวลผลสดจากรายงานในระบบ กพด. 5
          </p>
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs rounded-xl transition cursor-pointer shadow-2xs"
          >
            ปิดหน้าต่าง
          </button>
        </div>

      </div>
    </div>
  );
};
