import React, { useEffect, useRef, useState, useMemo, useCallback } from "react";
import L from "leaflet";
import { Search, RotateCcw, MapPin, CheckCircle2, AlertTriangle, Clock, XCircle, Layers, Maximize2, Minimize2, Compass, Filter, X, FileText, ExternalLink, School, Sparkles, ChevronDown } from "lucide-react";
import { OFFICIAL_TARGET_SCHOOLS, TargetSchool, isSchoolMatch, SCHOOL_COORDINATES_MAP } from "../data/schoolsData";
import { toThaiNumerals } from "../types";

// Inject Leaflet CSS dynamically if not present
const ensureLeafletCSS = () => {
  if (typeof document === "undefined") return;
  const existing = document.getElementById("leaflet-css-cdn");
  if (!existing) {
    const link = document.createElement("link");
    link.id = "leaflet-css-cdn";
    link.rel = "stylesheet";
    link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
    document.head.appendChild(link);
  }
};

// Helper to get valid image URLs
const getValidImages = (imageUrl?: string): string[] => {
  if (!imageUrl) return [];
  return imageUrl
    .split(/[\n,;]+|\s+(?=https?:\/\/)/)
    .map((url) => url.trim())
    .filter((url) => url && url.startsWith("http"));
};

const getGoogleDriveId = (url: string): string => {
  if (!url) return "";
  if (url.includes("lh3.googleusercontent.com/d/")) {
    const match = url.match(/lh3\.googleusercontent\.com\/d\/([a-zA-Z0-9-_]+)/);
    if (match && match[1]) return match[1];
  } else if (url.includes("drive.google.com/thumbnail")) {
    const match = url.match(/id=([a-zA-Z0-9-_]+)/);
    if (match && match[1]) return match[1];
  } else if (url.includes("drive.google.com/file/d/")) {
    const match = url.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9-_]+)/);
    if (match && match[1]) return match[1];
  } else if (url.includes("drive.google.com/open")) {
    const match = url.match(/id=([a-zA-Z0-9-_]+)/);
    if (match && match[1]) return match[1];
  } else if (url.includes("docs.google.com/uc")) {
    const match = url.match(/id=([a-zA-Z0-9-_]+)/);
    if (match && match[1]) return match[1];
  }
  return "";
};

const getGisImageSrc = (url: string): string => {
  const fileId = getGoogleDriveId(url);
  if (fileId) {
    return `https://drive.google.com/thumbnail?id=${fileId}&sz=w400`;
  }
  return url;
};

interface GISMapCardProps {
  reports: any[];
  onSelectSchoolFilter?: (schoolName: string) => void;
  onFilterDashboardSchool?: (schoolName: string) => void;
  selectedSchoolFilter?: string;
  onOpenSchoolDirectoryModal?: (schoolName?: string) => void;
}

type FilterStatus = "all" | "normal" | "late" | "problem" | "missing";
type MapTileStyle = "google" | "google_terrain" | "satellite" | "osm";

export default function GISMapCard({
  reports,
  onSelectSchoolFilter,
  onFilterDashboardSchool,
  selectedSchoolFilter,
  onOpenSchoolDirectoryModal
}: GISMapCardProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const markersMapRef = useRef<Map<string | number, L.Marker>>(new Map());

  const [activeFilter, setActiveFilter] = useState<FilterStatus>("all");
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [tileStyle, setTileStyle] = useState<MapTileStyle>("google");
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const [showLayerMenu, setShowLayerMenu] = useState<boolean>(false);
  const [selectedSchoolName, setSelectedSchoolName] = useState<string>(selectedSchoolFilter || "");

  useEffect(() => {
    ensureLeafletCSS();
  }, []);

  // Sync external selectedSchoolFilter
  useEffect(() => {
    if (selectedSchoolFilter !== undefined) {
      setSelectedSchoolName(selectedSchoolFilter);
    }
  }, [selectedSchoolFilter]);

  // Compute status for all 53 official target schools
  const schoolsStatusList = useMemo(() => {
    return OFFICIAL_TARGET_SCHOOLS.map((school, index) => {
      const schoolReports = reports.filter((r) => isSchoolMatch(r.schoolName, school.name));
      const reportCount = schoolReports.length;

      // Determine status
      let status: "normal" | "late" | "problem" | "missing" = "missing";
      if (reportCount > 0) {
        const hasIssue = schoolReports.some(
          (r) =>
            r.problemCategory ||
            (r.statusEvaluation && (r.statusEvaluation.includes("ปรับปรุง") || r.statusEvaluation.includes("พอใช้")))
        );
        const hasLate = schoolReports.some(
          (r) => r.isOverdue || r.submissionStatus === "OVERDUE" || (r.statusEvaluation && r.statusEvaluation.includes("ล่าช้า"))
        );
        if (hasIssue) {
          status = "problem";
        } else if (hasLate) {
          status = "late";
        } else {
          status = "normal";
        }
      }

      let gps = SCHOOL_COORDINATES_MAP[school.id] || [15.5, 103.8];
      if (school.latitude && school.longitude) {
        const lat = parseFloat(school.latitude);
        const lng = parseFloat(school.longitude);
        if (!isNaN(lat) && !isNaN(lng)) {
          gps = [lat, lng];
        }
      }

      return {
        school,
        index: index + 1,
        reportCount,
        status,
        gps,
        latestReport: schoolReports[0]
      };
    });
  }, [reports]);

  // Counts for top bar
  const counts = useMemo(() => {
    const normal = schoolsStatusList.filter((s) => s.status === "normal").length;
    const late = schoolsStatusList.filter((s) => s.status === "late").length;
    const problem = schoolsStatusList.filter((s) => s.status === "problem").length;
    const missing = schoolsStatusList.filter((s) => s.status === "missing").length;
    return { normal, late, problem, missing, total: schoolsStatusList.length };
  }, [schoolsStatusList]);

  // Selected school object (if any)
  const currentSelectedSchool = useMemo(() => {
    if (!selectedSchoolName) return null;
    return schoolsStatusList.find((s) => isSchoolMatch(s.school.name, selectedSchoolName) || s.school.name === selectedSchoolName) || null;
  }, [schoolsStatusList, selectedSchoolName]);

  // Filtered schools according to activeFilter & search
  const filteredSchools = useMemo(() => {
    return schoolsStatusList.filter((item) => {
      // Filter by status
      if (activeFilter !== "all" && item.status !== activeFilter) {
        return false;
      }
      // Filter by search
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase().trim();
        const matchName = item.school.name.toLowerCase().includes(term);
        const matchProv = item.school.province.toLowerCase().includes(term);
        const matchGroup = item.school.groupName.toLowerCase().includes(term);
        return matchName || matchProv || matchGroup;
      }
      return true;
    });
  }, [schoolsStatusList, activeFilter, searchTerm]);

  // Switch Tile Layer
  const setTileLayer = useCallback((style: MapTileStyle) => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (tileLayerRef.current) {
      map.removeLayer(tileLayerRef.current);
      tileLayerRef.current = null;
    }

    let url = "https://mt{s}.google.com/vt/lyrs=m&hl=th&x={x}&y={y}&z={z}";
    let attribution = '&copy; Google Maps / OSM';
    let maxZoom = 20;
    let subdomains: string | string[] = ["0", "1", "2", "3"];

    if (style === "google_terrain") {
      url = "https://mt{s}.google.com/vt/lyrs=p&hl=th&x={x}&y={y}&z={z}";
      attribution = "&copy; Google Maps Terrain / OSM";
      maxZoom = 20;
      subdomains = ["0", "1", "2", "3"];
    } else if (style === "satellite") {
      url = "https://mt{s}.google.com/vt/lyrs=y&hl=th&x={x}&y={y}&z={z}";
      attribution = "&copy; Google Maps Satellite / OSM";
      maxZoom = 20;
      subdomains = ["0", "1", "2", "3"];
    } else if (style === "osm") {
      url = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
      attribution = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';
      maxZoom = 19;
      subdomains = "abc";
    }

    const newTileLayer = L.tileLayer(url, {
      maxZoom,
      subdomains,
      attribution
    }).addTo(map);

    tileLayerRef.current = newTileLayer;
    setTileStyle(style);
    setShowLayerMenu(false);
  }, []);

  // Handler to select and filter school via map pin / dropdown
  const handleSelectSchool = useCallback((schoolName: string, zoomToPin: boolean = true) => {
    setSelectedSchoolName(schoolName);
    
    // Notify parent filters
    if (onFilterDashboardSchool) {
      onFilterDashboardSchool(schoolName);
    }

    // Zoom and open popup on the map
    if (zoomToPin) {
      const match = schoolsStatusList.find((s) => isSchoolMatch(s.school.name, schoolName) || s.school.name === schoolName);
      if (match && mapInstanceRef.current) {
        mapInstanceRef.current.flyTo(match.gps, 12, { duration: 1.0 });
        const marker = markersMapRef.current.get(match.school.id);
        if (marker) {
          setTimeout(() => marker.openPopup(), 400);
        }
      }
    }
  }, [schoolsStatusList, onFilterDashboardSchool]);

  // Handler to clear selected school filter
  const handleClearSchoolFilter = useCallback(() => {
    setSelectedSchoolName("");
    if (onFilterDashboardSchool) {
      onFilterDashboardSchool("");
    }
    if (mapInstanceRef.current) {
      mapInstanceRef.current.flyTo([16.20, 103.80], 7, { duration: 1.0 });
    }
  }, [onFilterDashboardSchool]);

  // Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: [16.20, 103.80],
        zoom: 7,
        zoomControl: true,
        attributionControl: false
      });

      // Default to Google Maps
      const initialTileLayer = L.tileLayer("https://mt{s}.google.com/vt/lyrs=m&hl=th&x={x}&y={y}&z={z}", {
        maxZoom: 20,
        subdomains: ["0", "1", "2", "3"]
      }).addTo(map);

      tileLayerRef.current = initialTileLayer;

      L.control.attribution({ position: "bottomright" })
        .addAttribution('&copy; Google Maps / OSM')
        .addTo(map);

      markersLayerRef.current = L.layerGroup().addTo(map);
      mapInstanceRef.current = map;

      // Invalidate size once after mounting
      setTimeout(() => {
        if (mapInstanceRef.current) {
          mapInstanceRef.current.invalidateSize();
        }
      }, 250);
    }

    // ResizeObserver to automatically update Leaflet canvas size with RAF debounce
    let mapRafId: number | null = null;
    let resizeObserver: ResizeObserver | null = null;

    if (typeof ResizeObserver !== "undefined") {
      resizeObserver = new ResizeObserver(() => {
        if (mapRafId) cancelAnimationFrame(mapRafId);
        mapRafId = requestAnimationFrame(() => {
          if (mapInstanceRef.current) {
            mapInstanceRef.current.invalidateSize({ pan: false });
          }
        });
      });
      resizeObserver.observe(mapContainerRef.current);
    }

    return () => {
      if (mapRafId) cancelAnimationFrame(mapRafId);
      if (resizeObserver) resizeObserver.disconnect();
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Update Markers when filteredSchools or selectedSchoolName change
  useEffect(() => {
    const map = mapInstanceRef.current;
    const markersLayer = markersLayerRef.current;
    if (!map || !markersLayer) return;

    markersLayer.clearLayers();
    markersMapRef.current.clear();

    filteredSchools.forEach((item) => {
      const [lat, lng] = item.gps;
      const isSelected = selectedSchoolName && (isSchoolMatch(item.school.name, selectedSchoolName) || item.school.name === selectedSchoolName);

      // Dynamic status badge background and halo glow according to school status
      let badgeBg = "#10b981"; // normal = Emerald Green
      let haloColor = "rgba(16, 185, 129, 0.45)";

      if (item.status === "problem") {
        badgeBg = "#f43f5e"; // problem = Rose
        haloColor = "rgba(244, 63, 94, 0.45)";
      } else if (item.status === "late") {
        badgeBg = "#f59e0b"; // late = Amber
        haloColor = "rgba(245, 158, 11, 0.45)";
      } else if (item.status === "missing") {
        badgeBg = "#dc2626"; // missing = Red
        haloColor = "rgba(220, 38, 38, 0.45)";
      }

      // If this pin is currently selected as active filter, give it prominent golden glow & border
      const markerSize = isSelected ? 34 : 28;
      const markerAnchor = isSelected ? 17 : 14;
      const selectedRing = isSelected ? `box-shadow: 0 0 0 4px #fbbf24, 0 0 0 8px rgba(245, 158, 11, 0.5), 0 4px 12px rgba(0,0,0,0.35); transform: scale(1.15);` : `box-shadow: 0 0 0 3.5px ${haloColor}, 0 2px 6px rgba(0, 0, 0, 0.25);`;

      const customIcon = L.divIcon({
        className: `custom-gis-marker ${isSelected ? "selected-active-pin" : ""}`,
        html: `
          <div style="
            position: relative;
            display: flex;
            align-items: center;
            justify-content: center;
            width: ${markerSize}px;
            height: ${markerSize}px;
            background-color: ${isSelected ? "#4f46e5" : badgeBg};
            border: ${isSelected ? "3px solid #ffffff" : "2px solid #ffffff"};
            border-radius: 9999px;
            color: #ffffff;
            font-weight: 900;
            font-size: ${isSelected ? "12px" : "11px"};
            font-family: 'Prompt', sans-serif;
            ${selectedRing}
            cursor: pointer;
            transition: all 0.25s ease;
          " class="gis-marker-badge" title="${item.school.name} (คลิกเพื่อเลือก/กรองโรงเรียนนี้)">
            ${isSelected ? `★` : item.index}
          </div>
        `,
        iconSize: [markerSize, markerSize],
        iconAnchor: [markerAnchor, markerAnchor],
        popupAnchor: [0, -markerAnchor - 2]
      });

      const marker = L.marker([lat, lng], { 
        icon: customIcon,
        zIndexOffset: isSelected ? 1000 : 0
      });

      const statusThai =
        item.status === "normal"
          ? "ส่งครบถ้วน (ปกติ)"
          : item.status === "problem"
          ? "พบปัญหา / ปรับปรุง"
          : item.status === "late"
          ? "ค้างส่งบางคาบ"
          : "ค้างส่งทั้งวัน";

      // 1. Generate Teaching Stats HTML
      const statsHtml = `
        <div style="display: grid; grid-template-columns: 110px 1fr; gap: 4px; background-color: #f8fafc; border: 1px solid #e2e8f0; padding: 6px 10px; border-radius: 8px; margin-bottom: 8px; font-size: 11.5px;">
          <div>
            <span style="color: #64748b; font-weight: 600;">ส่งรายงานสะสม:</span>
          </div>
          <div style="text-align: right; font-weight: 800; color: #1e293b;">
            ${item.reportCount} ฉบับ
          </div>
          <div>
            <span style="color: #64748b; font-weight: 600;">อัปเดตล่าสุด:</span>
          </div>
          <div style="text-align: right; font-weight: 700; color: #4f46e5; font-size: 10.5px;">
            ${item.latestReport ? (item.latestReport.timeString || item.latestReport.date || "ปกติ") : "-"}
          </div>
        </div>
      `;

      // 2. Generate Real-time Photos HTML
      let photoHtml = "";
      if (item.latestReport && item.latestReport.imageUrl) {
        const images = getValidImages(item.latestReport.imageUrl);
        if (images.length > 0) {
          const originalSrc = images[0];
          const gisSrc = getGisImageSrc(originalSrc);
          const fileId = getGoogleDriveId(originalSrc);

          photoHtml = `
            <div style="margin-top: 6px; border-radius: 8px; overflow: hidden; border: 1px solid #e2e8f0; position: relative; height: 105px; background: #f1f5f9; box-sizing: border-box;">
              <img 
                src="${gisSrc}" 
                alt="ภาพกิจกรรมการสอนจริง" 
                referrerpolicy="no-referrer"
                style="width: 100%; height: 100%; object-fit: cover; display: block;"
                onerror="this.onerror=null; if('${fileId}') { this.src='https://lh3.googleusercontent.com/d/${fileId}'; } else { const p = this.parentElement; p.innerHTML = '<div style=&quot;padding: 35px 10px; text-align: center; font-size: 10px; color: #64748b; background: #f8fafc; font-weight: bold;&quot;>📂 สื่อภาพกิจกรรม ตชด.</div>'; }"
              />
              <div style="position: absolute; bottom: 0; left: 0; right: 0; background: linear-gradient(to top, rgba(0,0,0,0.85), transparent); padding: 4px 8px; font-size: 9.5px; color: white; font-weight: bold; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                📷 ${item.latestReport.activityName || "การจัดการเรียนการสอน"}
              </div>
            </div>
          `;
        }
      }

      if (!photoHtml) {
        photoHtml = `
          <div style="margin-top: 6px; border-radius: 8px; border: 1px dashed #cbd5e1; padding: 12px; text-align: center; font-size: 10.5px; color: #64748b; background-color: #f8fafc; box-sizing: border-box;">
            📂 ไม่มีภาพกิจกรรมการเรียนการสอนล่าสุด
          </div>
        `;
      }

      const popupHtml = `
        <div style="font-family: 'Prompt', sans-serif; padding: 3px; min-width: 260px; max-width: 280px; box-sizing: border-box;">
          <div style="font-weight: 850; font-size: 14px; color: #0f172a; margin-bottom: 3px; line-height: 1.3;">
            ${item.index}. ${item.school.name}
          </div>
          <div style="font-size: 11px; color: #475569; margin-bottom: 8px; line-height: 1.4;">
            ${item.school.groupName} &bull; จ.${item.school.province}
          </div>
          
          <div style="display: inline-flex; align-items: center; padding: 3px 10px; border-radius: 9999px; font-size: 10.5px; font-weight: 800; color: white; background-color: ${badgeBg}; margin-bottom: 8px; box-shadow: 0 2px 5px ${haloColor};">
            สถานะ: ${statusThai}
          </div>

          ${statsHtml}

          <div style="font-size: 11px; font-weight: 800; color: #1e293b; margin-top: 6px; margin-bottom: 3px;">
            📸 ภาพถ่ายกิจกรรมจากสถานที่จริง
          </div>
          ${photoHtml}

          <div style="margin-top: 10px; border-top: 1px solid #e2e8f0; padding-top: 8px; display: flex; flex-direction: column; gap: 6px; box-sizing: border-box;">
            <button
              id="btn-school-profile-${item.school.id}"
              style="width: 100%; padding: 8px 12px; background: linear-gradient(135deg, #1e1b4b, #312e81); color: #ffffff; border: 1px solid #4338ca; border-radius: 8px; font-size: 11.5px; font-weight: 850; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 6px; box-shadow: 0 2px 6px rgba(30, 27, 75, 0.3); box-sizing: border-box; transition: all 0.15s ease;"
              onmouseover="this.style.opacity='0.9'"
              onmouseout="this.style.opacity='1'"
            >
              🏫 แสดงหน้าต่างลอยข้อมูลโรงเรียนนี้
            </button>

            <button
              id="btn-filter-dashboard-${item.school.id}"
              style="width: 100%; padding: 7.5px 12px; background-color: #4f46e5; color: #ffffff; border: none; border-radius: 8px; font-size: 11px; font-weight: 800; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 6px; box-shadow: 0 2px 5px rgba(79, 70, 229, 0.25); box-sizing: border-box; transition: background-color 0.15s ease;"
              onmouseover="this.style.backgroundColor='#4338ca'"
              onmouseout="this.style.backgroundColor='#4f46e5'"
            >
              🎯 กรองข้อมูลแดชบอร์ดเฉพาะโรงเรียนนี้
            </button>
            
            <button
              id="btn-select-school-${item.school.id}"
              style="width: 100%; padding: 7px 12px; background-color: #f8fafc; color: #1e293b; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 10.5px; font-weight: 800; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 6px; box-shadow: 0 1px 3px rgba(0,0,0,0.05); box-sizing: border-box; transition: all 0.15s ease;"
              onmouseover="this.style.backgroundColor='#e2e8f0'; this.style.borderColor='#94a3b8'"
              onmouseout="this.style.backgroundColor='#f8fafc'; this.style.borderColor='#cbd5e1'"
            >
              📄 เปิดเอกสารรายงาน A4 (${item.reportCount} ฉบับ)
            </button>
          </div>
        </div>
      `;

      marker.bindPopup(popupHtml);

      // Tooltip on hover
      marker.bindTooltip(`<b>${item.index}. ${item.school.name}</b><br/><span style="font-size:10px; color:#475569;">${statusThai} &bull; ${item.reportCount} ฉบับ</span>`, {
        direction: "top",
        offset: [0, -14],
        opacity: 0.95
      });

      marker.on("click", () => {
        // When clicking pin, also update selected school name locally
        setSelectedSchoolName(item.school.name);
      });

      marker.on("popupopen", () => {
        const attachListeners = () => {
          const btnProfile = document.getElementById(`btn-school-profile-${item.school.id}`);
          if (btnProfile) {
            btnProfile.onclick = (e) => {
              e.stopPropagation();
              if (onOpenSchoolDirectoryModal) {
                onOpenSchoolDirectoryModal(item.school.name);
              }
            };
          }

          const btnFilter = document.getElementById(`btn-filter-dashboard-${item.school.id}`);
          if (btnFilter) {
            btnFilter.onclick = (e) => {
              e.stopPropagation();
              handleSelectSchool(item.school.name, false);
            };
          }

          const btnA4 = document.getElementById(`btn-select-school-${item.school.id}`);
          if (btnA4) {
            btnA4.onclick = (e) => {
              e.stopPropagation();
              if (onSelectSchoolFilter) {
                onSelectSchoolFilter(item.school.name);
              }
            };
          }
        };

        attachListeners();
        setTimeout(attachListeners, 60);
      });

      markersLayer.addLayer(marker);
      markersMapRef.current.set(item.school.id, marker);
    });
  }, [filteredSchools, selectedSchoolName, onSelectSchoolFilter, handleSelectSchool, onOpenSchoolDirectoryModal]);

  // Focus on searched school if 1 match found
  useEffect(() => {
    if (searchTerm.trim() && filteredSchools.length === 1) {
      const match = filteredSchools[0];
      const map = mapInstanceRef.current;
      if (map) {
        map.flyTo(match.gps, 12, { duration: 1.2 });
        const marker = markersMapRef.current.get(match.school.id);
        if (marker) {
          setTimeout(() => marker.openPopup(), 400);
        }
      }
    }
  }, [searchTerm, filteredSchools]);

  // Reset Center function
  const handleResetCenter = () => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.flyTo([16.20, 103.80], 7, { duration: 1.2 });
    }
    setActiveFilter("all");
    setSearchTerm("");
    handleClearSchoolFilter();
  };

  // Toggle expanded view
  const handleToggleExpand = () => {
    setIsExpanded((prev) => !prev);
    setTimeout(() => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.invalidateSize();
      }
    }, 200);
  };

  return (
    <div className="app-card-surface bg-white rounded-2xl border border-slate-200/90 shadow-2xs hover:shadow-xs transition-all duration-200 p-4 sm:p-5 md:p-6 space-y-4 font-sans">
      {/* Active School Filter Banner (If a school is selected via Pin or Dropdown) */}
      {currentSelectedSchool && (
        <div className="bg-gradient-to-r from-indigo-900 via-indigo-800 to-slate-900 text-white p-3 sm:p-3.5 rounded-xl shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 animate-in fade-in slide-in-from-top-2 duration-200 border border-indigo-700/60">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="p-2 bg-amber-400 text-slate-950 rounded-lg shrink-0 font-black text-xs shadow-xs">
              ★ {currentSelectedSchool.index}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-extrabold text-white text-xs sm:text-sm tracking-tight truncate">
                  กำลังกรองหมุด: {currentSelectedSchool.school.name}
                </span>
                <span className={`px-2 py-0.5 rounded-md text-[10.5px] font-black ${
                  currentSelectedSchool.status === "normal"
                    ? "bg-emerald-500 text-white"
                    : currentSelectedSchool.status === "problem"
                    ? "bg-rose-500 text-white"
                    : currentSelectedSchool.status === "late"
                    ? "bg-amber-500 text-slate-950"
                    : "bg-red-600 text-white"
                }`}>
                  {currentSelectedSchool.status === "normal" ? "ส่งครบถ้วน" : currentSelectedSchool.status === "problem" ? "พบปัญหา" : currentSelectedSchool.status === "late" ? "ค้างส่งบางคาบ" : "ค้างส่งทั้งวัน"}
                </span>
              </div>
              <p className="text-indigo-200 text-[11px] font-medium truncate">
                {currentSelectedSchool.school.groupName} &bull; จ.{currentSelectedSchool.school.province} &bull; ส่งรายงานแล้ว {toThaiNumerals(currentSelectedSchool.reportCount)} ฉบับ
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
            {onSelectSchoolFilter && (
              <button
                type="button"
                onClick={() => onSelectSchoolFilter(currentSelectedSchool.school.name)}
                className="px-3 py-1.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-extrabold text-xs rounded-lg transition shadow-xs flex items-center gap-1 cursor-pointer"
                title="เปิดดูรายงาน A4 ฉบับเต็มของโรงเรียนนี้"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>เปิดเอกสาร A4</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleClearSchoolFilter}
              className="px-2.5 py-1.5 bg-white/15 hover:bg-white/25 text-white font-bold text-xs rounded-lg transition flex items-center gap-1 cursor-pointer"
              title="ล้างตัวกรองโรงเรียนและแสดงทั้งหมด"
            >
              <X className="w-3.5 h-3.5" />
              <span>ล้างตัวกรอง</span>
            </button>
          </div>
        </div>
      )}

      {/* 2. Filter Pills & Search Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-slate-50/90 p-2.5 rounded-xl border border-slate-200/80">
        {/* Status Filter Badges */}
        <div className="flex flex-nowrap lg:flex-wrap items-center gap-1.5 sm:gap-2 text-xs font-bold py-0.5 w-full lg:w-auto overflow-x-auto lg:overflow-x-visible pb-2 lg:pb-0 no-scrollbar">
          <button
            type="button"
            onClick={() => setActiveFilter("all")}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border transition cursor-pointer whitespace-nowrap shrink-0 ${
              activeFilter === "all"
                ? "bg-slate-800 text-white border-slate-900 shadow-xs"
                : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
            }`}
          >
            <span className="whitespace-nowrap">ทั้งหมด ({toThaiNumerals(counts.total)})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveFilter("normal")}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border transition cursor-pointer whitespace-nowrap shrink-0 ${
              activeFilter === "normal"
                ? "bg-emerald-600 text-white border-emerald-700 shadow-xs"
                : "bg-white text-emerald-700 border-emerald-200 hover:bg-emerald-50"
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
            <span className="whitespace-nowrap">ส่งครบถ้วน ({toThaiNumerals(counts.normal)})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveFilter("late")}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border transition cursor-pointer whitespace-nowrap shrink-0 ${
              activeFilter === "late"
                ? "bg-amber-600 text-white border-amber-700 shadow-xs"
                : "bg-white text-amber-700 border-amber-200 hover:bg-amber-50"
            }`}
          >
            <Clock className="w-3.5 h-3.5 text-amber-500 shrink-0" />
            <span className="whitespace-nowrap">ค้างส่งบางคาบ ({toThaiNumerals(counts.late)})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveFilter("problem")}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border transition cursor-pointer whitespace-nowrap shrink-0 ${
              activeFilter === "problem"
                ? "bg-rose-600 text-white border-rose-700 shadow-xs"
                : "bg-white text-rose-700 border-rose-200 hover:bg-rose-50"
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5 text-rose-500 shrink-0" />
            <span className="whitespace-nowrap">พบปัญหา ({toThaiNumerals(counts.problem)})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveFilter("missing")}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border transition cursor-pointer whitespace-nowrap shrink-0 ${
              activeFilter === "missing"
                ? "bg-red-600 text-white border-red-700 shadow-xs"
                : "bg-white text-red-700 border-red-200 hover:bg-red-50"
            }`}
          >
            <XCircle className="w-3.5 h-3.5 text-red-500 shrink-0" />
            <span className="whitespace-nowrap">ค้างส่งทั้งวัน ({toThaiNumerals(counts.missing)})</span>
          </button>
        </div>

        {/* Search Input Box */}
        <div className="relative w-full md:w-72 shrink-0">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="ค้นหาโรงเรียนบนแผนที่..."
            className="w-full h-9 pl-9 pr-3 text-xs bg-white border border-slate-300 rounded-lg font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
          />
        </div>
      </div>

      {/* 3. GIS Interactive Map Canvas */}
      <div 
        className={`relative w-full ${
          isExpanded ? "h-[580px] sm:h-[640px]" : "h-[420px] sm:h-[480px] md:h-[520px]"
        } rounded-2xl border border-slate-200/90 overflow-hidden shadow-inner bg-slate-100 z-0 transition-all duration-300`}
      >
        <div ref={mapContainerRef} className="w-full h-full z-0" />

        {/* Reset Center Button Overlaid on Top Right of Map */}
        <button
          type="button"
          onClick={handleResetCenter}
          className="absolute top-3.5 right-3.5 z-[1000] inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white/95 hover:bg-white text-slate-800 text-xs font-bold transition shadow-md cursor-pointer active:scale-95 border border-slate-200/90 backdrop-blur-xs"
          title="รีเซ็ตศูนย์กลางแผนที่ภาคตะวันออกเฉียงเหนือ"
        >
          <Compass className="w-4 h-4 text-blue-600" />
          <span>รีเซ็ตศูนย์กลาง</span>
        </button>

        {/* Legend Overlay on Bottom Left */}
        <div className="absolute bottom-2.5 left-2.5 sm:bottom-3 sm:left-3 z-[1000] bg-white/95 backdrop-blur-sm px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl shadow-md border border-slate-200/90 text-[10.5px] sm:text-[11px] font-bold text-slate-700 flex flex-wrap items-center gap-2 sm:gap-3.5 max-w-[calc(100%-1.5rem)]">
          <span className="flex items-center gap-1.5 shrink-0">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block border border-emerald-700 shadow-2xs"></span> ส่งครบถ้วน
          </span>
          <span className="flex items-center gap-1.5 shrink-0">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block border border-amber-700 shadow-2xs"></span> ค้างส่งบางคาบ
          </span>
          <span className="flex items-center gap-1.5 shrink-0">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block border border-rose-700 shadow-2xs"></span> พบปัญหา
          </span>
          <span className="flex items-center gap-1.5 shrink-0">
            <span className="w-2.5 h-2.5 rounded-full bg-red-600 inline-block border border-red-800 shadow-2xs"></span> ค้างส่งทั้งวัน
          </span>
        </div>
      </div>
    </div>
  );
}


