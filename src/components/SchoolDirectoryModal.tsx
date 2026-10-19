import React, { useState, useMemo } from "react";
import { 
  X, 
  Search, 
  School, 
  MapPin, 
  UserCheck, 
  Phone, 
  Mail, 
  Users, 
  GraduationCap, 
  Zap, 
  Wifi, 
  Compass, 
  Plane, 
  Building2, 
  FileText, 
  Layers, 
  ChevronRight,
  ExternalLink,
  Download,
  CheckCircle2,
  AlertCircle
} from "lucide-react";
import { ALL_53_SCHOOLS_PROFILE, type SchoolProfile, getSchoolsDatabaseStats } from "../data/schoolsFullProfile";

interface SchoolDirectoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectSchool?: (schoolName: string) => void;
  onBookSchool?: (schoolName: string) => void;
  isEmbedded?: boolean;
  initialSchoolName?: string;
}

export default function SchoolDirectoryModal({
  isOpen,
  onClose,
  onSelectSchool,
  onBookSchool,
  isEmbedded = false,
  initialSchoolName = ""
}: SchoolDirectoryModalProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDivision, setSelectedDivision] = useState<string>("ALL");
  const [selectedSchool, setSelectedSchool] = useState<SchoolProfile | null>(null);

  // Auto-select school when initialSchoolName is passed
  React.useEffect(() => {
    if (initialSchoolName && (isOpen || isEmbedded)) {
      const q = initialSchoolName.trim().toLowerCase();
      const matched = ALL_53_SCHOOLS_PROFILE.find(
        (s) => s.name === initialSchoolName || s.name.toLowerCase().includes(q) || q.includes(s.name.toLowerCase())
      );
      if (matched) {
        setSelectedSchool(matched);
      }
    }
  }, [initialSchoolName, isOpen, isEmbedded]);

  // Lock body scroll when floating modal or detailed school modal is active
  React.useEffect(() => {
    if ((isOpen && !isEmbedded) || selectedSchool) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isOpen, isEmbedded, selectedSchool]);

  const stats = useMemo(() => getSchoolsDatabaseStats(), []);

  const filteredSchools = useMemo(() => {
    return ALL_53_SCHOOLS_PROFILE.filter(school => {
      const matchesDiv = selectedDivision === "ALL" || school.division === selectedDivision;
      if (!matchesDiv) return false;
      if (!searchQuery.trim()) return true;

      const q = searchQuery.toLowerCase().trim();
      return (
        school.name.toLowerCase().includes(q) ||
        school.shortName.toLowerCase().includes(q) ||
        school.code.includes(q) ||
        school.province.toLowerCase().includes(q) ||
        school.district.toLowerCase().includes(q) ||
        school.subdistrict.toLowerCase().includes(q) ||
        school.principal.name.toLowerCase().includes(q) ||
        school.id.toLowerCase().includes(q)
      );
    });
  }, [searchQuery, selectedDivision]);

  if (!isOpen && !isEmbedded) return null;

  const content = (
    <div 
      className={`bg-slate-50 w-full ${isEmbedded ? "rounded-2xl border border-slate-200/90 shadow-sm" : "max-w-6xl rounded-3xl shadow-2xl border border-slate-200"} flex flex-col ${isEmbedded ? "min-h-[calc(100vh-8rem)]" : "max-h-[92vh]"} overflow-hidden`}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Top Header */}
      <div className="bg-white px-5 sm:px-6 py-4 sm:py-5 border-b border-slate-200 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 sm:w-12 h-10 sm:h-12 rounded-2xl bg-gradient-to-br from-indigo-600 to-blue-700 flex items-center justify-center text-white shadow-md shadow-indigo-200 shrink-0">
            <School className="w-5 sm:w-6 h-5 sm:h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-lg sm:text-xl md:text-2xl font-black text-slate-900 tracking-tight">
                ฐานข้อมูลพื้นฐาน 53 โรงเรียน ตชด.
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-100 text-indigo-800 border border-indigo-200">
                บก.ตชด.ภาค 2
              </span>
            </div>
            <p className="text-xs sm:text-sm font-medium text-slate-500 mt-0.5">
              ข้อมูลสารสนเทศทางการศึกษา พิกัดทางทหาร บุคลากร ระบบสาธารณูปโภค และการคมนาคม
            </p>
          </div>
        </div>

        {!isEmbedded && (
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
            title="ปิดหน้าต่าง"
          >
            <X className="w-6 h-6" />
          </button>
        )}
      </div>

      {/* Quick KPI Strip */}
      <div className="bg-white/80 border-b border-slate-200 px-4 sm:px-6 py-3 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs sm:text-sm">
        <div className="flex items-center gap-2.5 bg-slate-50 p-2.5 rounded-xl border border-slate-200/70">
          <School className="w-4 h-4 text-indigo-600 shrink-0" />
          <div className="min-w-0">
            <div className="text-slate-500 text-xs truncate">โรงเรียนทั้งหมด</div>
            <div className="font-bold text-slate-800 truncate">{stats.totalSchools} โรงเรียน</div>
          </div>
        </div>
        <div className="flex items-center gap-2.5 bg-slate-50 p-2.5 rounded-xl border border-slate-200/70">
          <Users className="w-4 h-4 text-emerald-600 shrink-0" />
          <div className="min-w-0">
            <div className="text-slate-500 text-xs truncate">ยอดรวมนักเรียน</div>
            <div className="font-bold text-slate-800 truncate">{stats.totalStudents.toLocaleString()} คน</div>
          </div>
        </div>
        <div className="flex items-center gap-2.5 bg-slate-50 p-2.5 rounded-xl border border-slate-200/70">
          <GraduationCap className="w-4 h-4 text-blue-600 shrink-0" />
          <div className="min-w-0">
            <div className="text-slate-500 text-xs truncate">ครูและบุคลากร</div>
            <div className="font-bold text-slate-800 truncate">{stats.totalTeachers.toLocaleString()} ท่าน</div>
          </div>
        </div>
        <div className="flex items-center gap-2.5 bg-slate-50 p-2.5 rounded-xl border border-slate-200/70">
          <Zap className="w-4 h-4 text-amber-600 shrink-0" />
          <div className="min-w-0">
            <div className="text-slate-500 text-xs truncate">ติดตั้งโซลาร์เซลล์</div>
            <div className="font-bold text-slate-800 truncate">{stats.withSolarCount} โรงเรียน</div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-3 sm:p-5 bg-slate-100/70 border-b border-slate-200 flex flex-col md:flex-row gap-3 items-center justify-between">
        {/* Division Filter Tabs */}
        <div className="flex flex-wrap items-center gap-1.5 w-full md:w-auto">
          <button
            onClick={() => setSelectedDivision("ALL")}
            className={`px-3 py-1.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
              selectedDivision === "ALL"
                ? "bg-slate-900 text-white shadow-xs"
                : "bg-white text-slate-700 hover:bg-slate-200 border border-slate-200"
            }`}
          >
            ทั้งหมด (53)
          </button>
          <button
            onClick={() => setSelectedDivision("กก.ตชด.21")}
            className={`px-3 py-1.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
              selectedDivision === "กก.ตชด.21"
                ? "bg-indigo-600 text-white shadow-xs"
                : "bg-white text-slate-700 hover:bg-slate-200 border border-slate-200"
            }`}
          >
            กก.ตชด.๒๑ ({stats.div21Count})
          </button>
          <button
            onClick={() => setSelectedDivision("กก.ตชด.22")}
            className={`px-3 py-1.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
              selectedDivision === "กก.ตชด.22"
                ? "bg-indigo-600 text-white shadow-xs"
                : "bg-white text-slate-700 hover:bg-slate-200 border border-slate-200"
            }`}
          >
            กก.ตชด.๒๒ ({stats.div22Count})
          </button>
          <button
            onClick={() => setSelectedDivision("กก.ตชด.23")}
            className={`px-3 py-1.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
              selectedDivision === "กก.ตชด.23"
                ? "bg-indigo-600 text-white shadow-xs"
                : "bg-white text-slate-700 hover:bg-slate-200 border border-slate-200"
            }`}
          >
            กก.ตชด.๒๓ ({stats.div23Count})
          </button>
          <button
            onClick={() => setSelectedDivision("กก.ตชด.24")}
            className={`px-3 py-1.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
              selectedDivision === "กก.ตชด.24"
                ? "bg-indigo-600 text-white shadow-xs"
                : "bg-white text-slate-700 hover:bg-slate-200 border border-slate-200"
            }`}
          >
            กก.ตชด.๒๔ ({stats.div24Count})
          </button>
        </div>

        {/* Search Input */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="ค้นหาชื่อ รร., รหัส, ครูใหญ่, อำเภอ..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9.5 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-800 shadow-2xs"
          />
          {searchQuery && (
            <button 
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold cursor-pointer"
            >
              ล้าง
            </button>
          )}
        </div>
      </div>

      {/* Schools List Content */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredSchools.map((school) => (
            <div
              key={school.id}
              onClick={() => setSelectedSchool(school)}
              className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs hover:shadow-md hover:border-indigo-300 transition-all duration-200 p-4 sm:p-5 flex flex-col justify-between cursor-pointer group"
            >
              <div>
                {/* Badge Row */}
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="px-2 py-0.5 rounded-lg text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200">
                    {school.id}
                  </span>
                  <span className="px-2 py-0.5 rounded-lg text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-100">
                    {school.division}
                  </span>
                </div>

                {/* School Name */}
                <h3 className="text-base font-bold text-slate-900 group-hover:text-indigo-600 transition-colors line-clamp-1">
                  {school.name}
                </h3>
                
                {/* Address */}
                <div className="flex items-start gap-1.5 mt-2 text-xs text-slate-600">
                  <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                  <span className="line-clamp-1">
                    อ.{school.district} จ.{school.province} ({school.zipCode})
                  </span>
                </div>

                {/* Principal */}
                <div className="flex items-center gap-1.5 mt-1.5 text-xs text-slate-700 font-medium">
                  <UserCheck className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                  <span className="line-clamp-1">ครูใหญ่: {school.principal.name || "-"}</span>
                </div>
              </div>

              {/* Quick Indicators */}
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                <div className="flex items-center gap-3">
                  <span title="นักเรียนรวม" className="font-semibold text-slate-700 flex items-center gap-1">
                    <Users className="w-3.5 h-3.5 text-slate-400" />
                    {school.students.total} คน
                  </span>
                  <span title="ครูและบุคลากร" className="font-semibold text-slate-700 flex items-center gap-1">
                    <GraduationCap className="w-3.5 h-3.5 text-slate-400" />
                    {school.teachers.total} ท่าน
                  </span>
                </div>

                <span className="text-indigo-600 group-hover:translate-x-0.5 transition-transform flex items-center text-xs font-bold">
                  รายละเอียด <ChevronRight className="w-3.5 h-3.5" />
                </span>
              </div>
            </div>
          ))}
        </div>

        {filteredSchools.length === 0 && (
          <div className="text-center py-12 text-slate-400">
            <School className="w-12 h-12 mx-auto mb-2 opacity-40" />
            <div className="text-base font-bold text-slate-600">ไม่พบข้อมูลโรงเรียนตามที่ค้นหา</div>
            <div className="text-xs text-slate-400 mt-1">กรุณาลองเปลี่ยนคำค้นหา หรือเลือกสังกัดกองกำกับการอื่น</div>
          </div>
        )}
      </div>

      {/* Footer Strip */}
      <div className="bg-white px-5 sm:px-6 py-3.5 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
        <div>
          แสดงผล <strong className="text-slate-800">{filteredSchools.length}</strong> จากทั้งหมด 53 โรงเรียน
        </div>
        {!isEmbedded && (
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold transition-colors cursor-pointer"
          >
            ปิดหน้าต่าง
          </button>
        )}
      </div>
    </div>
  );

  return (
    <>
      {isEmbedded ? (
        <div className="w-full max-w-full">
          {content}
        </div>
      ) : (
        <div 
          className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 md:p-6 animate-in fade-in duration-200 overscroll-contain"
          onClick={onClose}
        >
          {content}
        </div>
      )}

      {/* Detailed Single School Modal */}
      {selectedSchool && (
        <div 
          className="fixed inset-0 z-60 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto"
          onClick={() => setSelectedSchool(null)}
        >
          <div 
            className="bg-white w-full max-w-4xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-slate-900 to-indigo-950 text-white p-6 relative">
              <button
                onClick={() => setSelectedSchool(null)}
                className="absolute top-5 right-5 p-2 rounded-xl text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
              
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-500/30 text-indigo-200 border border-indigo-400/30">
                  {selectedSchool.id}
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-white/20 text-white border border-white/20">
                  {selectedSchool.division} ร้อย {selectedSchool.company}
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/30 text-emerald-200 border border-emerald-400/30">
                  รร.ขนาด {selectedSchool.size}
                </span>
              </div>

              <h2 className="text-xl sm:text-2xl font-black tracking-tight">{selectedSchool.name}</h2>
              <p className="text-indigo-200 text-xs sm:text-sm mt-1">
                รหัสสถานศึกษา: {selectedSchool.code} | สังกัด {selectedSchool.eduArea}
              </p>
            </div>

            {/* Scrollable Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 text-slate-800 text-sm">
              {/* Grid 1: Basic & Location */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* ที่ตั้ง & พิกัด */}
                <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200">
                  <div className="flex items-center gap-2 text-indigo-900 font-bold mb-2">
                    <MapPin className="w-4 h-4 text-indigo-600" />
                    ที่ตั้งและพิกัดภูมิศาสตร์
                  </div>
                  <div className="space-y-1.5 text-xs">
                    <div><strong>ที่อยู่:</strong> หมู่ {selectedSchool.villageNo} บ้าน{selectedSchool.village} ต.{selectedSchool.subdistrict} อ.{selectedSchool.district} จ.{selectedSchool.province} {selectedSchool.zipCode}</div>
                    <div><strong>พิกัด GPS:</strong> {selectedSchool.lat.toFixed(6)}, {selectedSchool.lng.toFixed(6)}</div>
                    <div><strong>พิกัดทางทหาร (Grid):</strong> {selectedSchool.militaryGrid || "-"}</div>
                    <div><strong>วันจัดตั้ง:</strong> {selectedSchool.estDate || "-"}</div>
                    <div><strong>ระดับที่เปิดสอน:</strong> {selectedSchool.levels}</div>
                  </div>
                </div>

                {/* ข้อมูลครูใหญ่ */}
                <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200">
                  <div className="flex items-center gap-2 text-indigo-900 font-bold mb-2">
                    <UserCheck className="w-4 h-4 text-indigo-600" />
                    ข้อมูลผู้บริหาร / ครูใหญ่
                  </div>
                  <div className="space-y-2 text-xs">
                    <div>
                      <div className="text-slate-500">ชื่อครูใหญ่ปัจจุบัน:</div>
                      <div className="text-sm font-bold text-slate-900">{selectedSchool.principal.name || "ยังไม่ระบุ"}</div>
                    </div>
                    <div className="flex items-center gap-2 text-slate-700">
                      <Phone className="w-3.5 h-3.5 text-emerald-600" />
                      <span>{selectedSchool.principal.phone || "-"}</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-700">
                      <Mail className="w-3.5 h-3.5 text-blue-600" />
                      <span>{selectedSchool.principal.email || "-"}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Grid 2: นักเรียน & บุคลากร */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* ยอดนักเรียน */}
                <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2 text-indigo-900 font-bold">
                      <Users className="w-4 h-4 text-indigo-600" />
                      ยอดนักเรียนรวม {selectedSchool.students.total} คน
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs mb-2">
                    <div className="bg-white p-2 rounded-xl border border-slate-200 text-center">
                      <div className="text-slate-500">ชาย</div>
                      <div className="text-base font-black text-blue-600">{selectedSchool.students.male}</div>
                    </div>
                    <div className="bg-white p-2 rounded-xl border border-slate-200 text-center">
                      <div className="text-slate-500">หญิง</div>
                      <div className="text-base font-black text-pink-600">{selectedSchool.students.female}</div>
                    </div>
                  </div>
                  <div className="text-xs text-slate-500">
                    เชื้อชาติ: {selectedSchool.students.ethnicity} | ศาสนา: {selectedSchool.students.religion}
                  </div>
                </div>

                {/* ยอดครู & บุคลากร */}
                <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2 text-indigo-900 font-bold">
                      <GraduationCap className="w-4 h-4 text-indigo-600" />
                      ครูและบุคลากรรวม {selectedSchool.teachers.total} ท่าน
                    </div>
                  </div>
                  <div className="grid grid-cols-4 gap-1.5 text-xs text-center">
                    <div className="bg-white p-1.5 rounded-lg border border-slate-200">
                      <div className="text-slate-400 text-[10px]">ตชด.</div>
                      <div className="font-bold text-slate-800">{selectedSchool.teachers.bpp}</div>
                    </div>
                    <div className="bg-white p-1.5 rounded-lg border border-slate-200">
                      <div className="text-slate-400 text-[10px]">ผดด.</div>
                      <div className="font-bold text-slate-800">{selectedSchool.teachers.childCare}</div>
                    </div>
                    <div className="bg-white p-1.5 rounded-lg border border-slate-200">
                      <div className="text-slate-400 text-[10px]">สพฐ.</div>
                      <div className="font-bold text-slate-800">{selectedSchool.teachers.obec}</div>
                    </div>
                    <div className="bg-white p-1.5 rounded-lg border border-slate-200">
                      <div className="text-slate-400 text-[10px]">อื่นๆ/อบจ.</div>
                      <div className="font-bold text-slate-800">
                        {selectedSchool.teachers.sst + selectedSchool.teachers.pao + selectedSchool.teachers.sao + selectedSchool.teachers.other}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Grid 3: ที่ดิน สาธารณูปโภค คมนาคม */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* ที่ดิน */}
                <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 text-xs space-y-1.5">
                  <div className="flex items-center gap-1.5 text-indigo-900 font-bold mb-1">
                    <Building2 className="w-4 h-4 text-indigo-600" />
                    ข้อมูลที่ดิน
                  </div>
                  <div><strong>ประเภท:</strong> {selectedSchool.land.type || "-"}</div>
                  <div><strong>สถานะ:</strong> {selectedSchool.land.permission || "-"}</div>
                  <div><strong>เนื้อที่:</strong> {selectedSchool.land.rai} ไร่ {selectedSchool.land.ngan} งาน {selectedSchool.land.sqWa} ตร.ว.</div>
                </div>

                {/* สาธารณูปโภค & เน็ต */}
                <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 text-xs space-y-1.5">
                  <div className="flex items-center gap-1.5 text-indigo-900 font-bold mb-1">
                    <Wifi className="w-4 h-4 text-indigo-600" />
                    เน็ตและระบบไฟฟ้า
                  </div>
                  <div><strong>อินเทอร์เน็ต:</strong> {selectedSchool.internet.type} ({selectedSchool.internet.status})</div>
                  <div><strong>ไฟฟ้า กฟภ.:</strong> {selectedSchool.electricity.pea} ({selectedSchool.electricity.status})</div>
                  <div><strong>โซลาร์เซลล์:</strong> {selectedSchool.electricity.solar} ({selectedSchool.electricity.batteryKw} kW)</div>
                </div>

                {/* การเดินทาง */}
                <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 text-xs space-y-1.5">
                  <div className="flex items-center gap-1.5 text-indigo-900 font-bold mb-1">
                    <Plane className="w-4 h-4 text-indigo-600" />
                    การเดินทางคมนาคม
                  </div>
                  <div><strong>ฮ. จาก กก.:</strong> {selectedSchool.travel.heli}</div>
                  <div><strong>ทางบก:</strong> {selectedSchool.travel.distanceTime}</div>
                  <div><strong>สภาพเส้นทาง:</strong> {selectedSchool.travel.roadCondition}</div>
                </div>
              </div>
            </div>

            {/* Detailed Footer */}
            <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
              <button
                onClick={() => setSelectedSchool(null)}
                className="px-4 py-2 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 rounded-xl font-bold text-xs cursor-pointer"
              >
                กลับสู่รายการ
              </button>

              <div className="flex items-center gap-2">
                {onBookSchool && (
                  <button
                    onClick={() => {
                      onBookSchool(selectedSchool.name);
                      setSelectedSchool(null);
                      onClose();
                    }}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-black text-xs shadow-md shadow-blue-200 flex items-center gap-1.5 cursor-pointer"
                  >
                    <span>🔒 จอง / กรอกข้อมูลเฉพาะ รร.นี้</span>
                  </button>
                )}

                {onSelectSchool && (
                  <button
                    onClick={() => {
                      onSelectSchool(selectedSchool.name);
                      setSelectedSchool(null);
                      onClose();
                    }}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs shadow-md shadow-indigo-200 flex items-center gap-2 cursor-pointer"
                  >
                    เปิดรายงาน A4
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
