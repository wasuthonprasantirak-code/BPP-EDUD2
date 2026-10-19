import React, { useState, useEffect } from 'react';
import { ActivityReport, KOPODOT_GOALS } from '../types';
import {
  X,
  Play,
  Pause,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Tv,
  Users,
  Building2,
  FileCheck2,
  Award,
  Sparkles,
  BarChart2,
  CheckCircle2,
  Clock
} from 'lucide-react';

interface ExecutivePresentationModalProps {
  reports: ActivityReport[];
  isOpen: boolean;
  onClose: () => void;
  toThaiNumerals: (num: number | string) => string;
}

export const ExecutivePresentationModal: React.FC<ExecutivePresentationModalProps> = ({
  reports,
  isOpen,
  onClose,
  toThaiNumerals,
}) => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [slideInterval, setSlideInterval] = useState(8); // seconds

  const totalSlides = 4;

  // Auto-play slideshow timer
  useEffect(() => {
    if (!isOpen || !isPlaying) return;

    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % totalSlides);
    }, slideInterval * 1000);

    return () => clearInterval(timer);
  }, [isOpen, isPlaying, slideInterval, totalSlides]);

  // Aggregate Stats
  const stats = React.useMemo(() => {
    const totalReports = reports.length;
    const totalParticipants = reports.reduce((acc, curr) => acc + (curr.participantsCount || 0), 0);
    const schoolsSet = new Set(reports.map((r) => r.schoolName));
    const activeSchools = schoolsSet.size;

    // Goals breakdown
    const goalBreakdown = KOPODOT_GOALS.map((g) => {
      const matchCount = reports.filter((r) => r.goalCode.includes(`ด้านที่ ${g.id}`) || r.goalCode === `ด้านที่ ${g.id}`).length;
      return { ...g, count: matchCount };
    });

    // Top schools
    const schoolCounts: Record<string, number> = {};
    reports.forEach((r) => {
      if (r.schoolName) {
        schoolCounts[r.schoolName] = (schoolCounts[r.schoolName] || 0) + 1;
      }
    });

    const rankedSchools = Object.entries(schoolCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6);

    return {
      totalReports,
      totalParticipants,
      activeSchools,
      goalBreakdown,
      rankedSchools,
    };
  }, [reports]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950 text-white flex flex-col justify-between overflow-hidden select-none font-sans no-print">
      
      {/* Top TV Bar */}
      <div className="px-6 py-4 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between shrink-0">
        <div className="flex items-center space-x-3 min-w-0 flex-1 mr-2">
          <div className="p-2 bg-gradient-to-br from-amber-400 to-amber-600 text-slate-950 rounded-xl font-black shadow-lg shadow-amber-500/20 shrink-0">
            <Tv className="w-5 h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <h1 
              className="text-xs sm:text-sm md:text-base font-black tracking-tight text-white flex items-center gap-2 whitespace-nowrap overflow-hidden text-ellipsis"
              title="โหมดการนำเสนอสำหรับผู้บริหาร (Executive TV Dashboard)"
            >
              <span className="whitespace-nowrap overflow-hidden text-ellipsis">โหมดการนำเสนอสำหรับผู้บริหาร (Executive TV Dashboard)</span>
              <span className="px-2 py-0.5 bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] rounded-full font-extrabold uppercase shrink-0 hidden sm:inline-block">
                LIVE SLIDESHOW
              </span>
            </h1>
            <p 
              className="text-[11px] sm:text-xs text-slate-400 font-medium whitespace-nowrap overflow-hidden text-ellipsis"
              title="แผนพัฒนาเด็กและเยาวชนในถิ่นทุรกันดาร ตามพระราชดำริฯ ฉบับที่ 5 (พ.ศ. 2560 - 2569)"
            >
              แผนพัฒนาเด็กและเยาวชนในถิ่นทุรกันดาร ตามพระราชดำริฯ ฉบับที่ 5 (พ.ศ. 2560 - 2569)
            </p>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center space-x-3">
          <div className="flex items-center bg-slate-800 border border-slate-700 rounded-xl p-1 text-xs">
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className={`px-3 py-1.5 rounded-lg font-extrabold flex items-center gap-1.5 transition cursor-pointer ${
                isPlaying ? "bg-amber-500 text-slate-950" : "bg-slate-700 text-slate-200"
              }`}
            >
              {isPlaying ? <Pause className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current" />}
              <span>{isPlaying ? "เล่นอัตโนมัติ" : "หยุดชั่วคราว"}</span>
            </button>

            <select
              value={slideInterval}
              onChange={(e) => setSlideInterval(Number(e.target.value))}
              className="bg-transparent text-slate-300 font-bold px-2 py-1 text-xs focus:outline-none cursor-pointer"
            >
              <option value={5} className="bg-slate-900">5 วินาที/สไลด์</option>
              <option value={8} className="bg-slate-900">8 วินาที/สไลด์</option>
              <option value={12} className="bg-slate-900">12 วินาที/สไลด์</option>
            </select>
          </div>

          <div className="flex items-center space-x-1">
            <button
              onClick={() => setCurrentSlide((prev) => (prev - 1 + totalSlides) % totalSlides)}
              className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition cursor-pointer border border-slate-700"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={() => setCurrentSlide((prev) => (prev + 1) % totalSlides)}
              className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition cursor-pointer border border-slate-700"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          <button
            onClick={onClose}
            className="p-2.5 bg-rose-600/20 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-500/40 rounded-xl transition cursor-pointer"
            title="ปิดโหมดพรีเซนเทชัน"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Main Slide Viewer */}
      <div className="flex-1 p-6 md:p-10 overflow-y-auto flex items-center justify-center bg-gradient-to-b from-slate-950 via-slate-900 to-indigo-950/40">
        
        {/* SLIDE 1: Executive Key Performance Summary */}
        {currentSlide === 0 && (
          <div className="w-full max-w-6xl space-y-8 animate-in fade-in duration-500">
            <div className="text-center space-y-2">
              <div className="inline-flex items-center gap-2 px-3.5 py-1 bg-amber-500/10 border border-amber-500/30 text-amber-300 rounded-full text-xs font-black">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>กองบังคับการตำรวจตระเวนชายแดนภาค 2 (บก.ตชด.ภาค 2) • 4 กก.ตชด.21-24 (53 โรงเรียน)</span>
              </div>
              <h2 className="text-3xl md:text-4xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-white to-indigo-200">
                สรุปสถิติและผลการดำเนินงานตามแผน กพด. ฉบับที่ 5 (พ.ศ. 2560-2569)
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-slate-900/90 border border-indigo-500/30 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-3 relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-6 text-indigo-500/10 group-hover:text-indigo-500/20 transition">
                  <FileCheck2 className="w-28 h-28" />
                </div>
                <div className="p-3 bg-indigo-500/20 text-indigo-400 rounded-2xl w-fit border border-indigo-500/30">
                  <FileCheck2 className="w-7 h-7 sm:w-8 sm:h-8" />
                </div>
                <div>
                  <p className="text-xs sm:text-sm font-bold text-slate-400">จำนวนรายงานผลงานทั้งหมด</p>
                  <div className="flex items-baseline flex-wrap gap-x-2 gap-y-0.5 mt-1.5">
                    <span className="text-3xl sm:text-4xl xl:text-5xl font-black text-white tracking-tight whitespace-nowrap tabular-nums">
                      {toThaiNumerals(stats.totalReports.toLocaleString())}
                    </span>
                    <span className="text-base sm:text-lg font-bold text-indigo-400 whitespace-nowrap">กิจกรรม</span>
                  </div>
                </div>
                <p className="text-xs text-slate-400 font-medium pt-2 border-t border-slate-800">
                  ครอบคลุมตัวชี้วัด กพด. 34 ดัชนี
                </p>
              </div>

              <div className="bg-slate-900/90 border border-amber-500/30 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-3 relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-6 text-amber-500/10 group-hover:text-amber-500/20 transition">
                  <Users className="w-28 h-28" />
                </div>
                <div className="p-3 bg-amber-500/20 text-amber-400 rounded-2xl w-fit border border-amber-500/30">
                  <Users className="w-7 h-7 sm:w-8 sm:h-8" />
                </div>
                <div>
                  <p className="text-xs sm:text-sm font-bold text-slate-400">จำนวนกลุ่มเป้าหมายผู้เข้าร่วมรวม</p>
                  <div className="flex items-baseline flex-wrap gap-x-2 gap-y-0.5 mt-1.5">
                    <span className="text-3xl sm:text-4xl xl:text-5xl font-black text-amber-300 tracking-tight whitespace-nowrap tabular-nums">
                      {toThaiNumerals(stats.totalParticipants.toLocaleString())}
                    </span>
                    <span className="text-base sm:text-lg font-bold text-amber-400 whitespace-nowrap">คน</span>
                  </div>
                </div>
                <p className="text-xs text-slate-400 font-medium pt-2 border-t border-slate-800">
                  นักเรียน เยาวชน และประชาชนในพื้นที่
                </p>
              </div>

              <div className="bg-slate-900/90 border border-emerald-500/30 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-3 relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-6 text-emerald-500/10 group-hover:text-emerald-500/20 transition">
                  <Building2 className="w-28 h-28" />
                </div>
                <div className="p-3 bg-emerald-500/20 text-emerald-400 rounded-2xl w-fit border border-emerald-500/30">
                  <Building2 className="w-7 h-7 sm:w-8 sm:h-8" />
                </div>
                <div>
                  <p className="text-xs sm:text-sm font-bold text-slate-400">จำนวนโรงเรียน ตชด. ที่ส่งรายงานแล้ว</p>
                  <div className="flex items-baseline flex-wrap gap-x-2 gap-y-0.5 mt-1.5">
                    <span className="text-3xl sm:text-4xl xl:text-5xl font-black text-emerald-300 tracking-tight whitespace-nowrap tabular-nums">
                      {toThaiNumerals(stats.activeSchools)}
                    </span>
                    <span className="text-base sm:text-lg font-bold text-emerald-400 whitespace-nowrap">แห่ง</span>
                  </div>
                </div>
                <p className="text-xs text-slate-400 font-medium pt-2 border-t border-slate-800">
                  จากสถานศึกษาเป้าหมาย 53 แห่ง (บก.ตชด.ภาค 2)
                </p>
              </div>
            </div>
          </div>
        )}

        {/* SLIDE 2: 8 Royal Goals Progress */}
        {currentSlide === 1 && (
          <div className="w-full max-w-6xl space-y-6 animate-in fade-in duration-500">
            <div className="text-center space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 rounded-full text-xs font-bold">
                <BarChart2 className="w-3.5 h-3.5" />
                <span>ยุทธศาสตร์การพัฒนา 8 เป้าหมายหลัก</span>
              </div>
              <h2 className="text-2xl md:text-3xl font-black text-white">
                การกระจายตัวกิจกรรมตามเป้าหมายพระราชดำริฯ
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {stats.goalBreakdown.map((g) => {
                const pct = stats.totalReports > 0 ? Math.round((g.count / stats.totalReports) * 100) : 0;
                return (
                  <div key={g.id} className="bg-slate-900/90 border border-slate-800 hover:border-indigo-500/40 p-4 rounded-2xl flex items-center space-x-4">
                    <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-amber-300 font-black text-lg shrink-0">
                      {toThaiNumerals(g.id)}
                    </div>
                    <div className="flex-1 space-y-1">
                      <div className="flex justify-between items-center text-xs font-bold">
                        <span className="text-slate-200 truncate max-w-[280px]">{g.title}</span>
                        <span className="text-amber-400 font-black">{toThaiNumerals(g.count)} กิจกรรม ({toThaiNumerals(pct)}%)</span>
                      </div>
                      <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-indigo-500 to-amber-400 rounded-full" style={{ width: `${pct}%` }}></div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* SLIDE 3: School Top Performers */}
        {currentSlide === 2 && (
          <div className="w-full max-w-5xl space-y-6 animate-in fade-in duration-500">
            <div className="text-center space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-500/10 border border-amber-500/30 text-amber-300 rounded-full text-xs font-bold">
                <Award className="w-3.5 h-3.5" />
                <span>จัดอันดับโรงเรียนที่มีรายงานสูงสุด</span>
              </div>
              <h2 className="text-2xl md:text-3xl font-black text-white">
                โรงเรียน ตชด. ที่มีความก้าวหน้าและขับเคลื่อนโครงการดีเยี่ยม
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {stats.rankedSchools.map(([schoolName, count], idx) => (
                <div key={schoolName} className="bg-slate-900/90 border border-slate-800 p-5 rounded-2xl flex items-center space-x-4">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-lg shrink-0 border ${
                    idx === 0 ? "bg-amber-500/20 text-amber-300 border-amber-500/40" :
                    idx === 1 ? "bg-slate-300/20 text-slate-200 border-slate-300/40" :
                    idx === 2 ? "bg-amber-700/20 text-amber-500 border-amber-700/40" :
                    "bg-slate-800 text-slate-400 border-slate-700"
                  }`}>
                    {toThaiNumerals(idx + 1)}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-extrabold text-slate-100 text-sm truncate">{schoolName}</h3>
                    <p className="text-xs text-slate-400">สังกัด กองกำกับการตำรวจตระเวนชายแดน</p>
                  </div>
                  <div className="text-right">
                    <span className="text-lg font-black text-amber-300">{toThaiNumerals(count)}</span>
                    <span className="text-xs text-slate-400 block font-bold">รายงาน</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* SLIDE 4: Recent Executive Activity Highlights */}
        {currentSlide === 3 && (
          <div className="w-full max-w-5xl space-y-6 animate-in fade-in duration-500">
            <div className="text-center space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 rounded-full text-xs font-bold">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>ตัวอย่างรายงานผลการดำเนินงานล่าสุด</span>
              </div>
              <h2 className="text-2xl md:text-3xl font-black text-white">
                กิจกรรมที่มีผู้เข้าร่วมสูงและผ่านการรับรองแล้ว
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {reports.slice(0, 4).map((r) => (
                <div key={r.id} className="bg-slate-900/90 border border-slate-800 p-5 rounded-2xl space-y-3">
                  <div className="flex justify-between items-start gap-2">
                    <span className="px-2.5 py-1 bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-[11px] font-extrabold rounded-lg">
                      {r.goalCode}
                    </span>
                    <span className="text-xs text-slate-400 font-bold flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-slate-500" />
                      {toThaiNumerals(r.dateString)}
                    </span>
                  </div>
                  <h3 className="font-extrabold text-sm text-amber-200 line-clamp-2">{r.activityName}</h3>
                  <div className="flex justify-between text-xs text-slate-400 pt-2 border-t border-slate-800">
                    <span className="font-bold text-slate-300 truncate max-w-[200px]">{r.schoolName}</span>
                    <span className="font-black text-emerald-400">{toThaiNumerals(r.participantsCount)} คนเข้าร่วม</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>

      {/* Bottom Navigation Dots */}
      <div className="px-6 py-4 bg-slate-900/90 border-t border-slate-800 flex items-center justify-between shrink-0">
        <span className="text-xs text-slate-400 font-bold">
          สไลด์ที่ <span className="text-amber-400 font-black">{toThaiNumerals(currentSlide + 1)}</span> จาก <span className="text-white font-black">{toThaiNumerals(totalSlides)}</span>
        </span>

        <div className="flex items-center space-x-2">
          {Array.from({ length: totalSlides }).map((_, idx) => (
            <button
              key={idx}
              onClick={() => setCurrentSlide(idx)}
              className={`h-2.5 rounded-full transition-all cursor-pointer ${
                currentSlide === idx ? "w-8 bg-amber-400 shadow-md shadow-amber-400/50" : "w-2.5 bg-slate-700 hover:bg-slate-600"
              }`}
            />
          ))}
        </div>

        <button
          onClick={onClose}
          className="text-xs font-extrabold text-slate-400 hover:text-white transition cursor-pointer"
        >
          ออกจากโหมดพรีเซนเทชัน (ESC)
        </button>
      </div>

    </div>
  );
};
