import express from "express";
import path from "path";
import fs from "fs";
import compression from "compression";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";
import realSheetDataJson from "./src/data/realSheetData.json";
import { BASE_OFFICIAL_TARGET_SCHOOLS, isSchoolMatch } from "./src/data/schoolsData";
import {
  isStitchConfigured,
  listStitchProjects,
  createStitchProject,
  listStitchScreens,
  getStitchScreenDetails,
  generateStitchScreen,
  editStitchScreen,
} from "./server/stitchService";

dotenv.config();

const app = express();
const PORT = 3000;

// Enable HTTP compression for super fast data transfers
app.use(compression({
  level: 6,
  threshold: 1024, // Compress anything larger than 1KB
}));

// Set up server parsing
app.use(express.json({ limit: "5mb" }));
app.use(express.urlencoded({ extended: true, limit: "5mb" }));

// In-Memory Fast Cache for Parsed Real Reports Dataset
let inMemoryReportsCache: any[] | null = Array.isArray(realSheetDataJson) ? realSheetDataJson : null;
let inMemoryRawJsonCache: string | null = realSheetDataJson ? JSON.stringify(realSheetDataJson) : null;

function getCachedRealReports(): { reports: any[]; rawJson: string } {
  if (inMemoryReportsCache && inMemoryRawJsonCache) {
    return { reports: inMemoryReportsCache, rawJson: inMemoryRawJsonCache };
  }
  const distDataPath = path.join(process.cwd(), "dist", "data", "realSheetData.json");
  const srcDataPath = path.join(process.cwd(), "src", "data", "realSheetData.json");
  const filePath = fs.existsSync(distDataPath) ? distDataPath : srcDataPath;
  if (fs.existsSync(filePath)) {
    try {
      const raw = fs.readFileSync(filePath, "utf-8");
      const parsed = JSON.parse(raw);
      inMemoryReportsCache = parsed;
      inMemoryRawJsonCache = raw;
      return { reports: parsed, rawJson: raw };
    } catch (e) {
      console.warn("Failed to parse realSheetData.json on server:", e);
    }
  }
  const defaultReports = Array.isArray(realSheetDataJson) ? (realSheetDataJson as any[]) : [];
  const defaultRaw = JSON.stringify(defaultReports);
  inMemoryReportsCache = defaultReports;
  inMemoryRawJsonCache = defaultRaw;
  return { reports: defaultReports, rawJson: defaultRaw };
}

// In-Memory Fast TTL Cache for Live Google Sheet Fetching (3-minute TTL)
let liveSheetCache: { csvText: string; source: string; timestamp: number } | null = null;
const LIVE_SHEET_CACHE_TTL_MS = 3 * 60 * 1000; // 3 minutes

// Initialize Gemini Client with standard User-Agent header for AI Studio telemetry
const apiKey = process.env.GEMINI_API_KEY;
let ai: GoogleGenAI | null = null;

if (apiKey) {
  ai = new GoogleGenAI({
    apiKey: apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      }
    }
  });
}

// Recommended Modern AI Studio Models
const PRIMARY_GEMINI_MODEL = "gemini-3.8-flash";
const FALLBACK_GEMINI_MODEL = "gemini-3.1-flash-lite";

// In-Memory Caches for AI Endpoints to conserve quota and deliver instantaneous responses
const executiveSynthesisCache = new Map<string, { data: any; timestamp: number }>();
const anomalyAnalysisCache = new Map<string, { data: any; timestamp: number }>();
const predictiveTrendsCache = new Map<string, { data: any; timestamp: number }>();
const AI_CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes TTL

// Intelligent Cascade Gemini Generator:
// Tries primary model (gemini-3.8-flash), on quota/rate-limit seamlessly falls back to gemini-3.1-flash-lite
async function generateGeminiContentWithCascade(
  buildOptions: (modelName: string) => any
): Promise<any> {
  if (!ai) return null;

  try {
    const opts = buildOptions(PRIMARY_GEMINI_MODEL);
    const response = await ai.models.generateContent(opts);
    return response;
  } catch (primaryErr: any) {
    const msg = String(primaryErr?.message || "");
    const isRateOrQuota =
      primaryErr?.status === 429 ||
      primaryErr?.code === 429 ||
      msg.includes("429") ||
      msg.includes("RESOURCE_EXHAUSTED") ||
      msg.includes("quota") ||
      msg.includes("Quota exceeded") ||
      primaryErr?.status === 503 ||
      primaryErr?.code === 503;

    if (isRateOrQuota) {
      console.warn(`[Gemini API] Primary model (${PRIMARY_GEMINI_MODEL}) rate/quota limit reached. Seamlessly switching to fallback (${FALLBACK_GEMINI_MODEL})...`);
      try {
        const fallbackOpts = buildOptions(FALLBACK_GEMINI_MODEL);
        const response = await ai.models.generateContent(fallbackOpts);
        return response;
      } catch (fallbackErr: any) {
        throw fallbackErr;
      }
    }
    throw primaryErr;
  }
}

// Resilient Gemini Generate Content Wrapper with Exponential Backoff & Retry
async function callGeminiWithRetry<T>(fn: () => Promise<T>, maxRetries = 2, delayMs = 800): Promise<T> {
  let lastError: any = null;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err: any) {
      lastError = err;
      const isTransient =
        err?.status === 429 ||
        err?.status === 503 ||
        err?.code === 503 ||
        err?.message?.includes("429") ||
        err?.message?.includes("503") ||
        err?.message?.includes("RESOURCE_EXHAUSTED") ||
        err?.message?.includes("UNAVAILABLE") ||
        err?.message?.includes("high demand") ||
        err?.message?.includes("quota");
      if (attempt < maxRetries && isTransient) {
        const waitTime = delayMs * Math.pow(1.5, attempt) + Math.random() * 200;
        await new Promise((resolve) => setTimeout(resolve, waitTime));
      } else {
        break;
      }
    }
  }
  throw lastError;
}

// API & Health Routes
app.get("/api/health", (req, res) => {
  res.json({ status: "healthy", time: new Date().toISOString() });
});

const BANNERS_CONFIG_FILE_SRC = path.join(process.cwd(), "src", "data", "pageBannersConfig.json");
const BANNERS_CONFIG_FILE_DIST = path.join(process.cwd(), "dist", "data", "pageBannersConfig.json");
const DEFAULT_BANNERS_FILE_SRC = path.join(process.cwd(), "src", "data", "defaultPageBanners.json");
const DEFAULT_BANNERS_FILE_DIST = path.join(process.cwd(), "dist", "data", "defaultPageBanners.json");

function getStoredPageBanners(): Record<string, string> {
  const filePath = fs.existsSync(BANNERS_CONFIG_FILE_DIST) ? BANNERS_CONFIG_FILE_DIST : BANNERS_CONFIG_FILE_SRC;
  if (fs.existsSync(filePath)) {
    try {
      const data = JSON.parse(fs.readFileSync(filePath, "utf-8"));
      return data.banners || data || {};
    } catch (e) {
      console.warn("Failed to read pageBannersConfig.json:", e);
    }
  }
  return {};
}

function saveStoredPageBanners(banners: Record<string, string>) {
  const payload = {
    updatedAt: new Date().toISOString(),
    banners,
  };
  const jsonStr = JSON.stringify(payload, null, 2);
  const defaultBannersJsonStr = JSON.stringify(banners, null, 2);
  
  try {
    const srcDir = path.dirname(BANNERS_CONFIG_FILE_SRC);
    if (!fs.existsSync(srcDir)) fs.mkdirSync(srcDir, { recursive: true });
    fs.writeFileSync(BANNERS_CONFIG_FILE_SRC, jsonStr, "utf-8");
    fs.writeFileSync(DEFAULT_BANNERS_FILE_SRC, defaultBannersJsonStr, "utf-8");
  } catch (e) {
    console.warn("Could not save to src/data banner config files:", e);
  }
  
  try {
    const distDir = path.dirname(BANNERS_CONFIG_FILE_DIST);
    if (!fs.existsSync(distDir)) fs.mkdirSync(distDir, { recursive: true });
    fs.writeFileSync(BANNERS_CONFIG_FILE_DIST, jsonStr, "utf-8");
    fs.writeFileSync(DEFAULT_BANNERS_FILE_DIST, defaultBannersJsonStr, "utf-8");
  } catch (e) {
    // Ignore if dist doesn't exist yet
  }
}

function saveBannerBase64Image(dataUrl: string, filenamePrefix: string): string {
  try {
    const matches = dataUrl.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    if (!matches || matches.length !== 3) return dataUrl;
    
    const ext = matches[1].includes("png") ? "png" : matches[1].includes("webp") ? "webp" : "jpg";
    const filename = `${filenamePrefix}_${Date.now()}.${ext}`;
    const buffer = Buffer.from(matches[2], "base64");
    
    const publicUploadsDir = path.join(process.cwd(), "public", "uploads");
    if (!fs.existsSync(publicUploadsDir)) fs.mkdirSync(publicUploadsDir, { recursive: true });
    fs.writeFileSync(path.join(publicUploadsDir, filename), buffer);
    
    const distUploadsDir = path.join(process.cwd(), "dist", "uploads");
    if (fs.existsSync(path.join(process.cwd(), "dist"))) {
      if (!fs.existsSync(distUploadsDir)) fs.mkdirSync(distUploadsDir, { recursive: true });
      fs.writeFileSync(path.join(distUploadsDir, filename), buffer);
    }
    
    // Also synchronize dashboard-banner.jpg if saving for all pages or dashboard
    if (filenamePrefix.includes("all") || filenamePrefix.includes("dashboard")) {
      try {
        fs.writeFileSync(path.join(process.cwd(), "public", "dashboard-banner.jpg"), buffer);
        fs.writeFileSync(path.join(process.cwd(), "src", "assets", "dashboard-banner.jpg"), buffer);
        if (fs.existsSync(path.join(process.cwd(), "dist"))) {
          fs.writeFileSync(path.join(process.cwd(), "dist", "dashboard-banner.jpg"), buffer);
        }
      } catch (err) {
        console.warn("Notice: could not update dashboard-banner.jpg alias:", err);
      }
    }
    
    return `/uploads/${filename}`;
  } catch (e) {
    console.error("Error saving base64 banner image:", e);
    return dataUrl;
  }
}

// Explicit static handlers for uploads & assets before API / Vite
app.use("/uploads", express.static(path.join(process.cwd(), "public", "uploads")));
if (fs.existsSync(path.join(process.cwd(), "dist", "uploads"))) {
  app.use("/uploads", express.static(path.join(process.cwd(), "dist", "uploads")));
}
app.use(express.static(path.join(process.cwd(), "public")));

app.get("/api/page-banners", (req, res) => {
  try {
    const banners = getStoredPageBanners();
    res.json({ success: true, banners, updatedAt: new Date().toISOString() });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message });
  }
});

function convertBannerLinkToDirect(rawUrl: string): string {
  if (!rawUrl || typeof rawUrl !== "string") return rawUrl;
  let url = rawUrl.trim().replace(/^[<"'\(\[]+/, "").replace(/[>"'\)\]]+$/, "").trim();
  
  const mdMatch = url.match(/\[.*?\]\((https?:\/\/[^\s\)]+)\)/);
  if (mdMatch && mdMatch[1]) url = mdMatch[1].trim();

  // Google Drive
  const driveFileMatch = url.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/i);
  if (driveFileMatch && driveFileMatch[1]) {
    return `https://drive.google.com/thumbnail?id=${driveFileMatch[1]}&sz=w2560`;
  }
  const driveOpenMatch = url.match(/drive\.google\.com\/open\?(?:.*&)?id=([a-zA-Z0-9_-]+)/i);
  if (driveOpenMatch && driveOpenMatch[1]) {
    return `https://drive.google.com/thumbnail?id=${driveOpenMatch[1]}&sz=w2560`;
  }
  const driveUcMatch = url.match(/(?:drive|docs)\.google\.com\/uc\?(?:.*&)?id=([a-zA-Z0-9_-]+)/i);
  if (driveUcMatch && driveUcMatch[1]) {
    return `https://drive.google.com/thumbnail?id=${driveUcMatch[1]}&sz=w2560`;
  }
  if (url.includes("drive.google.com/thumbnail")) {
    const thumbIdMatch = url.match(/id=([a-zA-Z0-9_-]+)/i);
    if (thumbIdMatch && thumbIdMatch[1]) {
      return `https://drive.google.com/thumbnail?id=${thumbIdMatch[1]}&sz=w2560`;
    }
  }

  // Dropbox
  if (url.includes("dropbox.com")) {
    if (url.includes("dl=0")) return url.replace("dl=0", "raw=1");
    if (!url.includes("raw=1") && !url.includes("dl=1")) {
      const sep = url.includes("?") ? "&" : "?";
      return `${url}${sep}raw=1`;
    }
  }

  // Imgur
  const imgurMatch = url.match(/imgur\.com\/([a-zA-Z0-9]{5,8})$/i);
  if (imgurMatch && imgurMatch[1]) {
    return `https://i.imgur.com/${imgurMatch[1]}.jpg`;
  }

  return url;
}

app.post("/api/page-banners", (req, res) => {
  try {
    const { pageKey, bannerUrl, banners: bulkBanners } = req.body;
    let currentBanners = getStoredPageBanners();
    
    if (bulkBanners && typeof bulkBanners === "object") {
      const processed: Record<string, string> = {};
      for (const [key, val] of Object.entries(bulkBanners)) {
        if (typeof val === "string") {
          if (val.startsWith("data:image/")) {
            processed[key] = saveBannerBase64Image(val, `banner_${key}`);
          } else {
            processed[key] = convertBannerLinkToDirect(val);
          }
        }
      }
      currentBanners = { ...currentBanners, ...processed };
    } else if (pageKey && bannerUrl) {
      let finalUrl = bannerUrl;
      if (typeof bannerUrl === "string" && bannerUrl.startsWith("data:image/")) {
        finalUrl = saveBannerBase64Image(bannerUrl, `banner_${pageKey}`);
      } else if (typeof bannerUrl === "string") {
        finalUrl = convertBannerLinkToDirect(bannerUrl);
      }
      if (pageKey === "all" || pageKey === "master" || pageKey === "brand") {
        for (const key of Object.keys(currentBanners)) {
          currentBanners[key] = finalUrl;
        }
        currentBanners["dashboard"] = finalUrl;
        currentBanners["_global"] = finalUrl;
        currentBanners["_master"] = finalUrl;
      } else {
        currentBanners[pageKey] = finalUrl;
      }
    }
    
    saveStoredPageBanners(currentBanners);
    res.json({ success: true, banners: currentBanners });
  } catch (err: any) {
    console.error("Error saving page banners:", err);
    res.status(500).json({ success: false, error: err?.message });
  }
});

// Internal Control Plane Health / Status Endpoints
app.get(["/__aistudio_internal_control_plane/dev/status", "/__aistudio_internal_control_plane/status", "/healthz"], (req, res) => {
  res.json({ status: "ok", time: new Date().toISOString() });
});

// Endpoint to fetch essential / critical reports first (< 10ms response time)
app.get("/api/reports/essential", (req, res) => {
  try {
    const { reports } = getCachedRealReports();
    const limit = Math.min(parseInt(req.query.limit as string) || 120, 500);
    const essentialSlice = reports.slice(0, limit);
    
    res.setHeader("Content-Type", "application/json");
    res.setHeader("Cache-Control", "public, max-age=300");
    return res.json({
      success: true,
      totalCount: reports.length,
      limit,
      essentialReports: essentialSlice,
      timestamp: new Date().toISOString()
    });
  } catch (err: any) {
    return res.status(500).json({ error: "Failed to read essential reports", details: err.message });
  }
});

// Endpoint to fetch real data with optional limit/offset or full dataset
app.get("/api/real-reports", (req, res) => {
  try {
    const { reports, rawJson } = getCachedRealReports();
    const limitParam = req.query.limit as string;
    const offsetParam = req.query.offset as string;

    res.setHeader("Content-Type", "application/json");
    res.setHeader("Cache-Control", "public, max-age=180");

    if (limitParam || offsetParam) {
      const offset = parseInt(offsetParam) || 0;
      const limit = parseInt(limitParam) || reports.length;
      const sliced = reports.slice(offset, offset + limit);
      return res.json(sliced);
    }

    // Send the pre-cached raw string directly (ultra-fast)
    return res.send(rawJson);
  } catch (err: any) {
    return res.status(500).json({ error: "Failed to read real sheet data", details: err.message });
  }
});

// Endpoint to upload and persist custom dashboard banner image
app.post("/api/upload-banner", (req, res) => {
  try {
    const { dataUrl } = req.body;
    if (!dataUrl || typeof dataUrl !== "string") {
      return res.status(400).json({ error: "Missing dataUrl parameter" });
    }
    const matches = dataUrl.match(/^data:([A-Za-z0-9-+\/]+);base64,(.+)$/);
    if (!matches || matches.length !== 3) {
      return res.status(400).json({ error: "Invalid dataUrl format" });
    }
    const buffer = Buffer.from(matches[2], "base64");
    
    // Ensure public/images directory exists
    const publicImagesDir = path.join(process.cwd(), "public", "images");
    if (!fs.existsSync(publicImagesDir)) {
      fs.mkdirSync(publicImagesDir, { recursive: true });
    }
    const targetFile = path.join(publicImagesDir, "dashboard-banner.jpg");
    fs.writeFileSync(targetFile, buffer);

    // Also write to dist/images if dist folder exists
    const distImagesDir = path.join(process.cwd(), "dist", "images");
    if (fs.existsSync(distImagesDir)) {
      fs.writeFileSync(path.join(distImagesDir, "dashboard-banner.jpg"), buffer);
    }

    return res.json({ success: true, url: "/images/dashboard-banner.jpg?t=" + Date.now() });
  } catch (err: any) {
    console.error("[Upload Banner] Error:", err);
    return res.status(500).json({ error: "Failed to save banner image", details: err.message });
  }
});

// Check if banner image exists
app.get("/api/banner-info", (req, res) => {
  const publicFile = path.join(process.cwd(), "public", "images", "dashboard-banner.jpg");
  const exists = fs.existsSync(publicFile);
  res.json({
    hasCustomBanner: exists,
    url: exists ? "/images/dashboard-banner.jpg" : null,
  });
});

// Endpoint to proxy fetch Google Sheets CSV directly server-side with in-memory caching
app.get("/api/fetch-live-sheet", async (req, res) => {
  const customUrl = (req.query.url as string) || "https://docs.google.com/spreadsheets/d/1K6SK3N7KffCNJ8C6A8mogRompCcXiweuxBHZCjnR8kI/export?format=csv";
  const force = req.query.force === "1" || req.query.force === "true";
  
  let targetUrl = customUrl.trim();
  if (targetUrl.includes("docs.google.com/spreadsheets") && !targetUrl.includes("export?format=csv") && !targetUrl.includes("output=csv")) {
    const match = targetUrl.match(/\/d\/([a-zA-Z0-9-_]+)/);
    if (match && match[1]) {
      targetUrl = `https://docs.google.com/spreadsheets/d/${match[1]}/export?format=csv`;
    }
  }

  // Check TTL cache if not forced
  const now = Date.now();
  if (!force && liveSheetCache && liveSheetCache.source === targetUrl && (now - liveSheetCache.timestamp < LIVE_SHEET_CACHE_TTL_MS)) {
    res.setHeader("X-Cache", "HIT");
    res.setHeader("Cache-Control", "public, max-age=180");
    return res.json({ 
      success: true, 
      csvText: liveSheetCache.csvText, 
      source: targetUrl, 
      cached: true, 
      cacheAgeSeconds: Math.round((now - liveSheetCache.timestamp) / 1000) 
    });
  }

  try {
    const response = await fetch(targetUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
      }
    });

    if (!response.ok) {
      throw new Error(`Google Sheets returned HTTP ${response.status}`);
    }

    const csvText = await response.text();
    
    // Store in TTL memory cache
    liveSheetCache = {
      csvText,
      source: targetUrl,
      timestamp: now
    };

    res.setHeader("X-Cache", "MISS");
    res.setHeader("Cache-Control", "public, max-age=180");
    return res.json({ success: true, csvText, source: targetUrl, cached: false });
  } catch (err: any) {
    console.warn("Server side live sheet fetch error:", err.message);
    // If live fetch fails but we have stale cache, serve stale cache gracefully
    if (liveSheetCache && liveSheetCache.source === targetUrl) {
      return res.json({ 
        success: true, 
        csvText: liveSheetCache.csvText, 
        source: targetUrl, 
        stale: true 
      });
    }
    return res.status(500).json({ success: false, error: err.message });
  }
});

// Endpoint to proxy PDF documents server-side (bypassing browser cross-origin & X-Frame-Options blocks)
app.get("/api/pdf-proxy", async (req, res) => {
  const targetUrl = (req.query.url as string) || "https://www.psproject.org/wp-content/uploads/2026/04/reportchild-dev-69.pdf";
  try {
    const pdfResponse = await fetch(targetUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        "Accept": "application/pdf,*/*",
        "Referer": "https://www.psproject.org/"
      }
    });

    if (!pdfResponse.ok) {
      return res.status(pdfResponse.status).send(`Failed to fetch PDF: HTTP ${pdfResponse.status}`);
    }

    const arrayBuffer = await pdfResponse.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", 'inline; filename="reportchild-dev-69.pdf"');
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Cache-Control", "public, max-age=86400");
    // Explicitly allow embedding
    res.removeHeader("X-Frame-Options");
    return res.send(buffer);
  } catch (err: any) {
    console.warn("Server side PDF proxy error:", err.message);
    return res.status(500).json({ error: "Failed to proxy PDF", details: err.message });
  }
});

// ==========================================
// Google Stitch AI UI Design Service Endpoints
// ==========================================

// 1. Status & connection check
app.get("/api/stitch/status", async (req, res) => {
  try {
    const configured = isStitchConfigured();
    if (!configured) {
      return res.json({
        configured: false,
        message: "STITCH_API_KEY is not configured",
      });
    }
    const projects = await listStitchProjects();
    return res.json({
      configured: true,
      projectsCount: projects.length,
      sampleProjects: projects.slice(0, 5),
    });
  } catch (err: any) {
    return res.status(500).json({
      configured: isStitchConfigured(),
      error: err?.message || "Failed to check Stitch status",
    });
  }
});

// 2. List all projects
app.get("/api/stitch/projects", async (req, res) => {
  try {
    const projects = await listStitchProjects();
    return res.json({ success: true, projects });
  } catch (err: any) {
    console.error("[Stitch API] Error listing projects:", err);
    return res.status(500).json({ success: false, error: err?.message || "Failed to list Stitch projects" });
  }
});

// 3. Create a project
app.post("/api/stitch/projects", async (req, res) => {
  try {
    const { title } = req.body;
    if (!title?.trim()) {
      return res.status(400).json({ success: false, error: "Project title is required" });
    }
    const project = await createStitchProject(title.trim());
    return res.json({ success: true, project });
  } catch (err: any) {
    console.error("[Stitch API] Error creating project:", err);
    return res.status(500).json({ success: false, error: err?.message || "Failed to create Stitch project" });
  }
});

// 4. List screens for a project
app.get("/api/stitch/projects/:projectId/screens", async (req, res) => {
  try {
    const { projectId } = req.params;
    const screens = await listStitchScreens(projectId);
    return res.json({ success: true, projectId, screens });
  } catch (err: any) {
    console.error(`[Stitch API] Error listing screens for project ${req.params.projectId}:`, err);
    return res.status(500).json({ success: false, error: err?.message || "Failed to list screens" });
  }
});

// 5. Get full screen details (HTML, preview image, design tokens)
app.get("/api/stitch/screen/:projectId/:screenId", async (req, res) => {
  try {
    const { projectId, screenId } = req.params;
    const details = await getStitchScreenDetails(projectId, screenId);
    return res.json({ success: true, screen: details });
  } catch (err: any) {
    console.error(`[Stitch API] Error getting screen ${req.params.screenId}:`, err);
    return res.status(500).json({ success: false, error: err?.message || "Failed to get screen details" });
  }
});

// 6. Generate a new screen from text prompt
app.post("/api/stitch/generate", async (req, res) => {
  try {
    const { prompt, projectId, projectTitle, deviceType, modelId } = req.body;
    if (!prompt?.trim()) {
      return res.status(400).json({ success: false, error: "Prompt is required" });
    }

    const result = await generateStitchScreen({
      prompt: prompt.trim(),
      projectId,
      projectTitle,
      deviceType,
      modelId,
    });

    return res.json({
      success: true,
      screen: result,
    });
  } catch (err: any) {
    console.error("[Stitch API] Error generating screen:", err);
    return res.status(500).json({
      success: false,
      error: err?.message || "Failed to generate screen with Google Stitch",
    });
  }
});

// 7. Edit an existing screen with an updated prompt
app.post("/api/stitch/edit", async (req, res) => {
  try {
    const { prompt, projectId, screenId, deviceType, modelId } = req.body;
    if (!prompt?.trim() || !projectId || !screenId) {
      return res.status(400).json({ success: false, error: "prompt, projectId, and screenId are required" });
    }

    const result = await editStitchScreen({
      prompt: prompt.trim(),
      projectId,
      screenId,
      deviceType,
      modelId,
    });

    return res.json({
      success: true,
      screen: result,
    });
  } catch (err: any) {
    console.error("[Stitch API] Error editing screen:", err);
    return res.status(500).json({
      success: false,
      error: err?.message || "Failed to edit screen with Google Stitch",
    });
  }
});

// Gemini Report Analyzer Route
app.post("/api/gemini/analyze-report", async (req, res) => {
  const { 
    projectName, 
    activityName, 
    objectives, 
    details, 
    quantitativeOutcome, 
    qualitativeOutcome, 
    problems, 
    suggestions 
  } = req.body;

  const buildFallbackAnalysis = () => ({
    mappedGoalCode: "ด้านที่ 1",
    goalExplanation: "กิจกรรมนี้มุ่งเน้นการส่งเสริมคุณภาพชีวิต สุขภาพ และการพัฒนาศักยภาพผู้เรียนตามแนวทางแผนพัฒนาเด็กและเยาวชนในถิ่นทุรกันดาร (กพด.๕)",
    bureaucraticSummary: `ผลการดำเนินกิจกรรม ${activityName || 'ตามแผนงาน'}: ได้ดำเนินงานตามวัตถุประสงค์โดยมีผู้เรียนและกลุ่มเป้าหมายเข้าร่วมอย่างพร้อมเพรียง สามารถส่งเสริมทักษะและยกระดับคุณภาพการเรียนรู้ตามเป้าหมายของโครงการพระราชดำริฯ ได้อย่างมีประสิทธิภาพ`,
    strengths: [
      "ดำเนินงานบรรลุวัตถุประสงค์ที่กำหนดไว้อย่างเป็นรูปธรรม",
      "ผู้เรียนและชุมชนมีส่วนร่วมในการขับเคลื่อนกิจกรรม"
    ],
    suggestions: [
      "ควรติดตามและประเมินผลสัมฤทธิ์อย่างต่อเนื่องในระยะยาว",
      "ขยายผลและถอดบทเรียนเพื่อปรับใช้ในรอบการประเมินถัดไป"
    ],
    confidenceScore: 88,
    isFallback: true
  });

  if (!ai) {
    return res.json(buildFallbackAnalysis());
  }

  try {
    const systemInstruction = `คุณเป็นผู้เชี่ยวชาญระดับสูงด้านการติดตามและประเมินผลแผนพัฒนาเด็กและเยาวชนในถิ่นทุรกันดาร (กพด. ฉบับที่ 5) ตามพระราชดำริฯ และมีทักษะระดับมืออาชีพในการเขียนรายงานและหนังสือราชการไทย (ภาษาทางการ/ราชการ)

หน้าที่ของคุณคือวิเคราะห์ข้อมูลดิบของกิจกรรมที่ส่งเข้ามา เพื่อประเมินประเด็นต่อไปนี้:
1. จัดประเภทกิจกรรมให้สอดคล้องกับเป้าหมาย 8 ด้าน ของแผน กพด. ฉบับที่ 5 ที่ดีที่สุดและอธิบายเหตุผลสั้นๆ โดยเป้าหมาย 8 ด้านประกอบด้วย:
- ด้านที่ 1: โภชนาการ สุขภาพอนามัย และคุณภาพชีวิต
- ด้านที่ 2: การศึกษาและโอกาสทางการเรียนรู้
- ด้านที่ 3: ทักษะทางวิชาการและการเรียนรู้ตลอดชีวิต
- ด้านที่ 4: ทักษะอาชีพและการพัฒนาผลิตภัณฑ์ชุมชน
- ด้านที่ 5: การอนุรักษ์ทรัพยากรธรรมชาติและสิ่งแวดล้อม
- ด้านที่ 6: วัฒนธรรม ภูมิปัญญาท้องถิ่น และความมั่นคง
- ด้านที่ 7: คุณธรรม จริยธรรม และสิทธิเด็ก
- ด้านที่ 8: ความเข้มแข็งของชุมชนและโรงเรียน

2. เรียบเรียงสรุปผลการดำเนินกิจกรรมใหม่อย่างเป็นทางการและสละสลวยในรูปแบบภาษาหนังสือราชการ (Bureaucratic/Official Thai) เพื่อนำไปแปะในรายงาน A4 ได้อย่างสมบูรณ์แบบ
3. ประเมินจุดเด่นและข้อเสนอแนะเชิงกลยุทธ์ เพื่อเป็นประโยชน์ในการยื่นเสนอแผนงานรอบถัดไป`;

    const userPrompt = `โปรดวิเคราะห์กิจกรรมการเรียนรู้ต่อไปนี้:
- ชื่อโครงการ: ${projectName || "ไม่ได้ระบุ"}
- ชื่อกิจกรรม: ${activityName || "ไม่ได้ระบุ"}
- วัตถุประสงค์: ${objectives || "ไม่ได้ระบุ"}
- รายละเอียดดำเนินงาน: ${details || "ไม่ได้ระบุ"}
- ผลเชิงปริมาณ: ${quantitativeOutcome || "ไม่ได้ระบุ"}
- ผลเชิงคุณภาพ: ${qualitativeOutcome || "ไม่ได้ระบุ"}
- ปัญหา/อุปสรรค: ${problems || "ไม่ได้ระบุ"}
- ข้อเสนอแนะเบื้องต้น: ${suggestions || "ไม่ได้ระบุ"}`;

    const response = await generateGeminiContentWithCascade((model) => ({
      model,
      contents: userPrompt,
      config: {
        systemInstruction: systemInstruction,
        temperature: 0.2,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            mappedGoalCode: {
              type: Type.STRING,
              description: "เลือกด้านที่สอดคล้องที่สุด โดยต้องเขียนตรงตัวเป๊ะๆ เช่น 'ด้านที่ 1', 'ด้านที่ 2', 'ด้านที่ 3', 'ด้านที่ 4', 'ด้านที่ 5', 'ด้านที่ 6', 'ด้านที่ 7', 'ด้านที่ 8'"
            },
            goalExplanation: {
              type: Type.STRING,
              description: "อธิบายเหตุผลความเชื่อมโยงกับเป้าหมาย กพด. ด้านที่เลือก สั้นๆ (ภาษาไทย ไม่เกิน 3 บรรทัด)"
            },
            bureaucraticSummary: {
              type: Type.STRING,
              description: "สรุปผลการดำเนินงานแบบเรียบเรียงใหม่เป็นภาษาทางการ ไม่เกิน 4 บรรทัด"
            },
            strengths: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "จุดเด่นของกิจกรรม 2 ข้อ"
            },
            suggestions: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "ข้อเสนอแนะ 2 ข้อ"
            },
            confidenceScore: {
              type: Type.INTEGER,
              description: "ความมั่นใจในการวิเคราะห์ 0-100"
            }
          },
          required: ["mappedGoalCode", "goalExplanation", "bureaucraticSummary", "strengths", "suggestions", "confidenceScore"]
        }
      }
    }));

    const resultText = response?.text;
    if (!resultText) {
      return res.json(buildFallbackAnalysis());
    }

    return res.json(JSON.parse(resultText.trim()));

  } catch (error: any) {
    console.warn("[Gemini API] analyze-report: utilizing smart domain fallback (quota limit/offline)");
    return res.json(buildFallbackAnalysis());
  }
});

// Gemini Executive Synthesis Route (3 Core Strengths & 2 Key Support Needs)
app.post("/api/gemini/executive-synthesis", async (req, res) => {
  const { region = "ALL", periodText = "ประจำสัปดาห์/ประจำเดือน", stats, sampleSummaries = [] } = req.body;

  const cacheKey = `${region}_${periodText}`;
  const cached = executiveSynthesisCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < AI_CACHE_TTL_MS) {
    return res.json(cached.data);
  }

  const buildFallbackSynthesis = () => {
    const isAll = region === "ALL";
    const regionName = isAll ? "กองบังคับการตำรวจตระเวนชายแดนภาค ๒ (๕๓ โรงเรียน)" : region;

    return {
      executiveOverview: `สรุปภาพรวมเชิงบริหารสำหรับการนำเสนอในที่ประชุม (${regionName}): การดำเนินงานตามแผนพัฒนาเด็กและเยาวชนในถิ่นทุรกันดาร (กพด. ฉบับที่ ๕) ประจำรอบ ${periodText} มีความก้าวหน้าตามเป้าหมายตัวชี้วัดหลักอย่างเป็นรูปธรรม โดยสถานศึกษาในสังกัดได้ขับเคลื่อนกิจกรรมครบทั้ง ๘ ด้านอย่างต่อเนื่อง เน้นหนักด้านโภชนาการและสุขอนามัยนักเรียน การยกระดับผลสัมฤทธิ์ทางการเรียนวิชาการพื้นฐาน และการฝึกทักษะอาชีพตามหลักปรัชญาของเศรษฐกิจพอเพียง ทั้งนี้ การดำเนินงานได้รับความร่วมมืออย่างดียิ่งจากคณะกรรมการสถานศึกษา ผู้ปกครอง ชุมชน และหน่วยงานภาคีเครือข่าย ส่งผลให้นักเรียนในถิ่นทุรกันดารได้รับโอกาสทางการศึกษาและพัฒนาการสมวัยอย่างทั่วถึงและยั่งยืน`,
      strengths: [
        `ความต่อเนื่องและมีประสิทธิภาพในการขับเคลื่อนโครงการเกษตรเพื่ออาหารกลางวันและโภชนาการ ส่งผลให้นักเรียนในพื้นที่ ${regionName} ได้รับสารอาหารครบถ้วนตามหลักโภชนาการและมีสุขอนามัยที่สมบูรณ์แข็งแรง`,
        `การสร้างเครือข่ายความร่วมมืออันเข้มแข็งระหว่างครู ตชด. คณะกรรมการสถานศึกษา องค์กรปกครองส่วนท้องถิ่น และผู้ปกครอง ในการสนับสนุนกิจกรรมพัฒนาทักษะอาชีพและการอนุรักษ์ทรัพยากรธรรมชาติและสิ่งแวดล้อม`,
        `การขยายผลการเรียนรู้เทคโนโลยีดิจิทัลและวิชาการพื้นฐานอย่างเป็นระบบ ส่งเสริมให้ผู้เรียนในถิ่นทุรกันดารมีโอกาสเข้าถึงแหล่งเรียนรู้ที่ทันสมัย ลดความเหลื่อมล้ำทางการศึกษาเทียบเท่าโรงเรียนส่วนกลาง`
      ],
      improvements: [
        `ควรได้รับการสนับสนุนงบประมาณและอุปกรณ์ซ่อมบำรุงโครงสร้างพื้นฐานเพิ่มเติม โดยเฉพาะระบบพลังงานแสงอาทิตย์ (โซลาร์เซลล์) ระบบกรองน้ำดื่มสะอาด และอุปกรณ์เชื่อมต่อสื่อสารดิจิทัลในโรงเรียนพื้นที่ห่างไกล`,
        `ควรส่งเสริมการจัดอบรมเชิงปฏิบัติการพัฒนาทักษะครู ตชด. ด้านการจัดการเรียนรู้เทคโนโลยีดิจิทัลสมัยใหม่ และเทคโนโลยีการแปรรูปผลผลิตทางการเกษตรเพื่อเพิ่มมูลค่าผลิตภัณฑ์และสร้างรายได้แก่โรงเรียน`
      ],
      confidenceScore: 96,
      isFallback: true
    };
  };

  if (!ai) {
    return res.json(buildFallbackSynthesis());
  }

  try {
    const systemInstruction = `คุณคือผู้เชี่ยวชาญระดับสูงด้านการวิเคราะห์และประเมินผลแผนพัฒนาเด็กและเยาวชนในถิ่นทุรกันดาร (กพด. ฉบับที่ 5) ตามพระราชดำริ สมเด็จพระกนิษฐาธิราชเจ้า กรมสมเด็จพระเทพรัตนราชสุดาฯ สยามบรมราชกุมารี ประจำกองบังคับการตำรวจตระเวนชายแดนภาค 2

หน้าที่ของคุณคืออ่านข้อมูลสถิติ ผลลัพธ์เชิงปริมาณ/เชิงคุณภาพ และบริบทพื้นที่ เพื่อสังเคราะห์ "บทสรุปภาพรวมเชิงบริหารสำหรับผู้บังคับบัญชานำเสนอในที่ประชุม" อย่างละเอียด ครบถ้วน รัดกุม ถูกต้องตามแบบแผนภาษาราชการชั้นสูง (ความยาว 5-7 บรรทัด มีความลึกซึ้งและพร้อมนำไปใช้อ่านแถลงหรือบรรยายสรุปในที่ประชุมได้ทันที)

ให้ส่งคืน JSON ที่ประกอบด้วย:
1. executiveOverview: ข้อความสรุปภาพรวมสำหรับผู้บังคับบัญชานำเสนอในที่ประชุมอย่างละเอียดและเป็นทางการ (ประมาณ 5-7 บรรทัด ครอบคลุมผลสัมฤทธิ์ 8 ด้าน โภชนาการ วิชาการ อาชีพ การมีส่วนร่วมของชุมชน และความยั่งยืน)
2. strengths: อาร์เรย์ความยาวตรง 3 ข้อ แสดง 3 จุดเด่นสำคัญเชิงประจักษ์
3. improvements: อาร์เรย์ความยาวตรง 2 ข้อ แสดง 2 จุดที่ควรได้รับการสนับสนุนงบประมาณ/นโยบายเพิ่มเติม
4. confidenceScore: ตัวเลขความเชื่อมั่น 0-100`;

    const userPrompt = `โปรดสังเคราะห์บทสรุปภาพรวมเชิงบริหารระดับผู้บังคับบัญชาสำหรับการนำเสนอในที่ประชุม กพด.๕:
- ขอบเขตพื้นที่: ${region}
- ช่วงเวลาประเมิน: ${periodText}
- ข้อมูลสถิติรวม: ${JSON.stringify(stats || {})}
- ตัวอย่างผลการดำเนินงานกิจกรรม: ${JSON.stringify(sampleSummaries.slice(0, 15))}`;

    const response = await generateGeminiContentWithCascade((model) => ({
      model,
      contents: userPrompt,
      config: {
        systemInstruction,
        temperature: 0.2,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            executiveOverview: {
              type: Type.STRING,
              description: "ข้อสรุปภาพรวมสำหรับผู้บังคับบัญชา ภาษาทางการ ไม่เกิน 4 บรรทัด"
            },
            strengths: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "อาร์เรย์ความยาวตรง 3 ข้อ แสดง 3 จุดเด่นสำคัญ"
            },
            improvements: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "อาร์เรย์ความยาวตรง 2 ข้อ แสดง 2 จุดที่ควรได้รับการสนับสนุนเพิ่มเติม"
            },
            confidenceScore: {
              type: Type.INTEGER,
              description: "ความมั่นใจในการวิเคราะห์ 0-100"
            }
          },
          required: ["executiveOverview", "strengths", "improvements", "confidenceScore"]
        }
      }
    }));

    const resultText = response?.text;
    if (!resultText) {
      return res.json(buildFallbackSynthesis());
    }

    const payload = { ...JSON.parse(resultText.trim()), isFallback: false };
    executiveSynthesisCache.set(cacheKey, { data: payload, timestamp: Date.now() });
    return res.json(payload);

  } catch (error: any) {
    console.warn("[Gemini API] executive-synthesis: utilizing smart domain synthesis fallback (quota limit/offline)");
    const fallback = buildFallbackSynthesis();
    executiveSynthesisCache.set(cacheKey, { data: fallback, timestamp: Date.now() - AI_CACHE_TTL_MS + (3 * 60 * 1000) });
    return res.json(fallback);
  }
});

// Gemini Data Anomaly Audit & Deep Dive Endpoint
app.post("/api/gemini/analyze-anomaly", async (req, res) => {
  const { region, stats, anomaliesSummary, sampleAnomalies } = req.body;

  const cacheKey = `${region || "ALL"}`;
  const cached = anomalyAnalysisCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < AI_CACHE_TTL_MS) {
    return res.json(cached.data);
  }

  const buildFallbackAnomalyAnalysis = () => ({
    rootCauseAnalysis: `จากการตรวจสอบและวิเคราะห์ความผิดปกติของข้อมูลรายงานกิจกรรม กพด.๕ ในสังกัด ${region || "บก.ตชด.ภาค ๒"}:
๑. ความซ้ำซ้อนของข้อมูล (Duplicates): มีสาเหตุหลักจากความไม่เสถียรของสัญญาณอินเทอร์เน็ตในพื้นที่ทุรกันดาร ทำให้ครูผู้รับผิดชอบกดส่งแบบฟอร์มซ้ำมากกว่า ๑ ครั้ง หรือส่งรายงานแก้ไขโดยไม่ได้ลบฉบับเดิม
๒. ค่าตัวเลขผิดปกติ (Outliers): เกิดจากการระบุจำนวนผู้เข้าร่วมกิจกรรมเป็นยอดสะสมทั้งโรงเรียน/ชุมชนแทนจำนวนผู้ร่วมกิจกรรมเฉพาะรอบนั้น หรือการพิมพ์ตัวเลขผิดพลาด
๓. ข้อมูลสำคัญไม่ครบถ้วน (Missing Fields): ส่วนใหญ่ขาดภาพถ่ายกิจกรรมและรายละเอียดผลเชิงคุณภาพที่ชัดเจน เกิดจากข้อจำกัดในการแนบไฟล์ภาพภาคสนาม`,
    actionableRecommendations: [
      "กำหนดมาตรการตรวจสอบข้อมูลระดับสถานศึกษา (School-level Pre-check) โดยให้ครูใหญ่หรือครูวิชาการตรวจทานความถูกต้องก่อนส่งเข้าระบบ",
      "จัดทำแนวปฏิบัติและตัวอย่างการกรอกจำนวนผู้เข้าร่วมที่ถูกต้อง (เช่น นับเฉพาะผู้เรียนที่เข้าร่วมกิจกรรมในวันนั้นจริง)",
      "เปิดฟังก์ชันลบหรือรวมข้อมูลรายงานที่ซ้ำซ้อนในระบบเพื่อปรับปรุงความถูกต้องของฐานข้อมูลให้เป็น ๑๐๐%",
      "จัดสรรการสนับสนุนด้านการบีบอัดภาพถ่ายและส่งรายงานในโหมดออฟไลน์เพื่อลดปัญหาการส่งซ้ำเมื่อสัญญาณเน็ตขัดข้อง"
    ],
    dataIntegrityScore: 88,
    isFallback: true
  });

  if (!ai) {
    return res.json(buildFallbackAnomalyAnalysis());
  }

  try {
    const systemInstruction = `คุณคือผู้เชี่ยวชาญการตรวจสอบความสมบูรณ์ของข้อมูล (Data Auditor & Quality Specialist) และที่ปรึกษาเชิงระบบของกองบังคับการตำรวจตระเวนชายแดนภาค 2 (บก.ตชด.ภาค ๒)
หน้าที่ของคุณคือวิเคราะห์รายงานความผิดปกติของข้อมูล (Data Anomalies) ที่ตรวจพบในระบบรายงานผล กพด. ฉบับที่ ๕ เช่น รายงานซ้ำซ้อน, ตัวเลขผิดปกติ (Outliers), ข้อมูลไม่สมบูรณ์
เพื่อค้นหาสาเหตุเชิงลึก (Root Cause Analysis) และเสนอแนวทางแก้ไขเชิงปฏิบัติการ (Actionable Recommendations) สำหรับผู้บริหารและครูใหญ่

ให้ส่งออกผลลัพธ์เป็น JSON โครงสร้างดังนี้:
1. rootCauseAnalysis: คำอธิบายสาเหตุเชิงลึกของปัญหาความผิดปกติที่พบ (ภาษาทางการ อ่านง่าย 3-4 ประเด็น)
2. actionableRecommendations: อาร์เรย์ข้อเสนอแนะเชิงบริหารและแนวทางป้องกัน 3-4 ข้อ
3. dataIntegrityScore: คะแนนความสมบูรณ์ของข้อมูลประเมินโดย AI (0-100)`;

    const userPrompt = `โปรดวิเคราะห์ความผิดปกติของข้อมูลรายงาน กพด.๕:
- พื้นที่/สังกัด: ${region || "ภาพรวม บก.ตชด.ภาค ๒"}
- สรุปสถิติความผิดปกติ: ${JSON.stringify(stats || {})}
- สรุปประเภทข้อผิดพลาด: ${JSON.stringify(anomaliesSummary || {})}
- ตัวอย่างรายการที่ตรวจพบความผิดปกติ: ${JSON.stringify((sampleAnomalies || []).slice(0, 10))}`;

    const response = await generateGeminiContentWithCascade((model) => ({
      model,
      contents: userPrompt,
      config: {
        systemInstruction,
        temperature: 0.2,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            rootCauseAnalysis: {
              type: Type.STRING,
              description: "บทวิเคราะห์สาเหตุเชิงลึกของความผิดปกติในภาษาหนังสือราชการ"
            },
            actionableRecommendations: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "อาร์เรย์คำแนะนำเชิงยุทธศาสตร์และการแก้ไข 3-4 ข้อ"
            },
            dataIntegrityScore: {
              type: Type.INTEGER,
              description: "คะแนนความสมบูรณ์และน่าเชื่อถือของข้อมูล 0-100"
            }
          },
          required: ["rootCauseAnalysis", "actionableRecommendations", "dataIntegrityScore"]
        }
      }
    }));

    const resultText = response?.text;
    if (!resultText) {
      return res.json(buildFallbackAnomalyAnalysis());
    }

    const payload = { ...JSON.parse(resultText.trim()), isFallback: false };
    anomalyAnalysisCache.set(cacheKey, { data: payload, timestamp: Date.now() });
    return res.json(payload);
  } catch (error: any) {
    console.warn("[Gemini API] analyze-anomaly: utilizing smart domain fallback (quota limit/offline)");
    const fallback = buildFallbackAnomalyAnalysis();
    anomalyAnalysisCache.set(cacheKey, { data: fallback, timestamp: Date.now() - AI_CACHE_TTL_MS + (3 * 60 * 1000) });
    return res.json(fallback);
  }
});

// Gemini Predictive Trends & Early Warning Analysis Endpoint
app.post("/api/gemini/predictive-trends", async (req, res) => {
  const { division = "ALL", schoolFilter = "", forceRefresh = false } = req.body;
  const cacheKey = `${division}_${schoolFilter || "ALL"}`;

  if (!forceRefresh) {
    const cached = predictiveTrendsCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < AI_CACHE_TTL_MS) {
      return res.json(cached.data);
    }
  }

  // Helper date parser
  function parseDateToTimestamp(dateStr?: string): number {
    if (!dateStr) return 0;
    try {
      const t = new Date(dateStr).getTime();
      if (!isNaN(t) && t > 0) return t;
      const slashParts = dateStr.trim().split("/");
      if (slashParts.length === 3) {
        const d = parseInt(slashParts[0], 10);
        const m = parseInt(slashParts[1], 10) - 1;
        let y = parseInt(slashParts[2], 10);
        if (y > 2400) y -= 543;
        const dt = new Date(y, m, d).getTime();
        if (!isNaN(dt)) return dt;
      }
      const dashParts = dateStr.trim().split("-");
      if (dashParts.length === 3) {
        let y = parseInt(dashParts[0], 10);
        if (y > 2400) y -= 543;
        const m = parseInt(dashParts[1], 10) - 1;
        const d = parseInt(dashParts[2], 10);
        const dt = new Date(y, m, d).getTime();
        if (!isNaN(dt)) return dt;
      }
    } catch {}
    return 0;
  }

  // 1. Gather historical reports
  const allReports = getCachedRealReports().reports || [];

  // Filter schools by division if specified
  let targetSchools = BASE_OFFICIAL_TARGET_SCHOOLS;
  if (division && division !== "ALL") {
    targetSchools = targetSchools.filter(s => s.groupName.includes(division) || division.includes(s.groupName.replace(/\D/g, '')));
  }
  if (schoolFilter) {
    targetSchools = targetSchools.filter(s => isSchoolMatch(s.name, schoolFilter));
  }

  // Goal dictionary
  const GOAL_TITLES: Record<number, string> = {
    1: "โภชนาการ สุขภาพอนามัย และคุณภาพชีวิต",
    2: "การศึกษาและโอกาสทางการเรียนรู้",
    3: "ทักษะทางวิชาการและจริยธรรม",
    4: "ทักษะอาชีพและการพัฒนาผลิตภัณฑ์ชุมชน",
    5: "การอนุรักษ์ทรัพยากรธรรมชาติและสิ่งแวดล้อม",
    6: "วัฒนธรรม ภูมิปัญญาท้องถิ่น และความมั่นคง",
    7: "ระบบสหกรณ์และคุณธรรมความซื่อสัตย์",
    8: "การพัฒนาศักยภาพผู้เรียนสู่ความเป็นเลิศ"
  };

  const now = Date.now();

  // 2. Statistical calculation for each school
  const schoolCalculations = targetSchools.map(school => {
    const schoolReports = allReports.filter(r => isSchoolMatch(r.schoolName || "", school.name));
    const totalReports = schoolReports.length;

    // Latest report timestamp
    let latestTs = 0;
    let latestDateStr = "";
    schoolReports.forEach(r => {
      const ts = parseDateToTimestamp(r.date || r.createdAt);
      if (ts > latestTs) {
        latestTs = ts;
        latestDateStr = r.date || r.createdAt || "";
      }
    });

    const daysSinceLastReport = latestTs > 0 ? Math.max(1, Math.round((now - latestTs) / (1000 * 60 * 60 * 24))) : 90;

    // Goals coverage
    const coveredGoalsSet = new Set<number>();
    let problemReportsCount = 0;
    schoolReports.forEach(r => {
      const gMatch = (r.goalCode || "").match(/\d+/);
      if (gMatch) {
        coveredGoalsSet.add(parseInt(gMatch[0], 10));
      }
      if (r.problems && r.problems.trim().length > 4 && !r.problems.includes("ไม่มี") && r.problems !== "-") {
        problemReportsCount++;
      }
    });

    const uncoveredGoals: string[] = [];
    for (let g = 1; g <= 8; g++) {
      if (!coveredGoalsSet.has(g)) {
        uncoveredGoals.push(`ด้านที่ ${g} (${GOAL_TITLES[g] || ''})`);
      }
    }

    // Heuristic Risk Calculation (0-100)
    let riskScore = 15; // baseline

    // Factor A: Days since last report
    if (daysSinceLastReport > 45) riskScore += 30;
    else if (daysSinceLastReport > 25) riskScore += 18;
    else if (daysSinceLastReport > 14) riskScore += 8;

    // Factor B: Missing Goals
    if (uncoveredGoals.length >= 4) riskScore += 30;
    else if (uncoveredGoals.length >= 2) riskScore += 18;
    else if (uncoveredGoals.length >= 1) riskScore += 8;

    // Factor C: Total reporting volume
    if (totalReports < 35) riskScore += 25;
    else if (totalReports < 70) riskScore += 14;
    else if (totalReports < 100) riskScore += 6;

    // Factor D: Unresolved obstacles
    if (problemReportsCount >= 4) riskScore += 12;
    else if (problemReportsCount >= 2) riskScore += 6;

    riskScore = Math.min(96, Math.max(12, riskScore));

    let riskLevel: "HIGH_RISK" | "MODERATE_RISK" | "ON_TRACK" = "ON_TRACK";
    let riskLevelLabel = "ปกติ (ดำเนินงานต่อเนื่อง)";
    let trendDirection: "DECLINING" | "STABLE" | "IMPROVING" = "STABLE";

    if (riskScore >= 65) {
      riskLevel = "HIGH_RISK";
      riskLevelLabel = "เสี่ยงสูง (ต้องการการสนับสนุนเร่งด่วน)";
      trendDirection = "DECLINING";
    } else if (riskScore >= 40) {
      riskLevel = "MODERATE_RISK";
      riskLevelLabel = "เฝ้าระวัง (เริ่มมีช่วงว่างของกิจกรรม)";
      trendDirection = daysSinceLastReport > 20 ? "DECLINING" : "STABLE";
    } else {
      trendDirection = totalReports > 120 ? "IMPROVING" : "STABLE";
    }

    return {
      schoolId: school.id,
      schoolName: school.name,
      groupName: school.groupName,
      province: school.province,
      totalReports,
      lastReportDate: latestDateStr || "ไม่มีข้อมูลล่าสุด",
      daysSinceLastReport,
      goalsCoveredCount: coveredGoalsSet.size,
      uncoveredGoals,
      problemReportsCount,
      riskScore,
      riskLevel,
      riskLevelLabel,
      trendDirection
    };
  });

  // Sort descending by risk score
  schoolCalculations.sort((a, b) => b.riskScore - a.riskScore);

  const highRiskList = schoolCalculations.filter(s => s.riskLevel === "HIGH_RISK");
  const moderateRiskList = schoolCalculations.filter(s => s.riskLevel === "MODERATE_RISK");
  const onTrackList = schoolCalculations.filter(s => s.riskLevel === "ON_TRACK");

  // Fallback builder
  const buildFallbackPredictiveData = () => {
    return {
      success: true,
      analyzedAt: new Date().toISOString(),
      totalSchoolsAnalyzed: schoolCalculations.length,
      highRiskCount: highRiskList.length,
      moderateRiskCount: moderateRiskList.length,
      onTrackCount: onTrackList.length,
      executiveStrategicSummary: `จากประวัติการรายงานผล กพด.๕ ทั้งสิ้น ${allReports.length.toLocaleString('th-TH')} กิจกรรม พบว่าโรงเรียนส่วนใหญ่ในสังกัด บก.ตชด.ภาค 2 มีความสม่ำเสมอดีเยี่ยม แต่มีสถานศึกษา ${highRiskList.length} แห่ง ที่มีแนวโน้มชะลอตัวในการรายงาน หรือขาดช่วงกิจกรรมในเป้าหมายสำคัญ โดยเฉพาะด้านสิ่งแวดล้อม (ด้านที่ ๕) และงานอนุรักษ์วัฒนธรรม (ด้านที่ ๖) ซึ่งต้องการการประสานงานสนับสนุนจากฝ่ายอำนวยการเชิงรุก`,
      systemicRiskFactors: [
        {
          title: "ภาวะสภาพภูมิอากาศและความแห้งแล้งตามฤดูกาล",
          description: "ช่วงเปลี่ยนฤดูส่งผลกระทบต่อกิจกรรมแปลงเกษตรเพื่ออาหารกลางวัน (ด้านที่ ๔) ทำให้ผลผลิตไม่เป็นไปตามเกณฑ์ และโรงเรียนขาดน้ำอุปโภคบริโภค",
          impactLevel: "HIGH"
        },
        {
          title: "ช่วงว่างของการรายงานระหว่างสัปดาห์ตรวจราชการ",
          description: "โรงเรียนในพื้นที่ทุรกันดารห่างไกลมักรายงานกระจุกตัวเฉพาะช่วงใกล้กำหนดตรวจ ทำให้ขาดความต่อเนื่องของข้อมูลตัวชี้วัดรายสัปดาห์",
          impactLevel: "MEDIUM"
        },
        {
          title: "การขาดแคลนครูผู้รับผิดชอบงานโครงการพระราชดำริเฉพาะด้าน",
          description: "โรงเรียนขนาดเล็กมีภาระงานสอนสูง ทำให้เป้าหมายด้านการอนุรักษ์ทรัพยากรธรรมชาติและสหกรณ์ (ด้านที่ ๕ และ ๗) ถูกพักไว้ชั่วคราว",
          impactLevel: "MEDIUM"
        }
      ],
      seasonalForecast: [
        {
          season: "ไตรมาส 1 (มิ.ย. - ส.ค.)",
          period: "ช่วงต้นปีการศึกษา",
          forecastDetails: "อัตราการรายงานพุ่งสูงในด้านสุขภาพอนามัยและการศึกษา (ด้าน ๑ และ ๒) มีความต่อเนื่องดี",
          keyFocusGoal: "เป้าหมายที่ ๑ และ ๒"
        },
        {
          season: "ไตรมาส 2 (ก.ย. - พ.ย.)",
          period: "ช่วงฤดูฝนและปลายภาคเรียนที่ 1",
          forecastDetails: "มีความเสี่ยงน้ำหลาก เส้นทางคมนาคมชำรุด และสัญญาณอินเทอร์เน็ตขัดข้องในพื้นที่ชายแดน",
          keyFocusGoal: "เป้าหมายที่ ๔ (เกษตร) และ ๕ (สิ่งแวดล้อม)"
        },
        {
          season: "ไตรมาส 3 (ธ.ค. - ก.พ.)",
          period: "ช่วงฤดูแล้งและตรวจเยี่ยมประจำปี",
          forecastDetails: "ผลผลิตการเกษตรเริ่มขาดแคลนน้ำ แนะนำสนับสนุนระบบน้ำบาดาลและแปลงเพาะเห็ดปิด",
          keyFocusGoal: "เป้าหมายที่ ๔ และ ๗ (สหกรณ์)"
        },
        {
          season: "ไตรมาส 4 (มี.ค. - พ.ค.)",
          period: "ช่วงปิดภาคเรียนและประเมินผลสัมฤทธิ์",
          forecastDetails: "โรงเรียนอาจขาดการรายงานต่อเนื่องระหว่างปิดภาคเรียน ควรวางระบบเวรครูดูแลแปลงเกษตร",
          keyFocusGoal: "เป้าหมายที่ ๓ (วิชาการ) และ ๘ (ศักยภาพผู้เรียน)"
        }
      ],
      topVulnerableIndicators: [
        {
          code: "กพด. ๔.๑",
          name: "การผลิตอาหารปลอดภัยและผลผลิตเกษตรเพื่ออาหารกลางวัน",
          vulnerableSchoolCount: Math.min(14, highRiskList.length + 6),
          riskReason: "สภาพอากาศและแหล่งน้ำไม่เพียงพอในหน้าแล้ง"
        },
        {
          code: "กพด. ๕.๒",
          name: "การดำเนินงานสวนพฤกษศาสตร์โรงเรียนและการอนุรักษ์พันธุกรรมพืช",
          vulnerableSchoolCount: Math.min(18, highRiskList.length + 8),
          riskReason: "ขาดครูผู้รับผิดชอบงานพฤกษศาสตร์โดยตรง ทำให้ไม่มีรายงานต่อเนื่อง"
        },
        {
          code: "กพด. ๗.๑",
          name: "การจัดกิจกรรมสหกรณ์นักเรียนและการทำบัญชีรับ-จ่าย",
          vulnerableSchoolCount: Math.min(11, highRiskList.length + 4),
          riskReason: "ขาดการบันทึกรายงานระบบบัญชีสหกรณ์ลงสู่แฟ้มกิจกรรมดิจิทัล"
        }
      ],
      schoolPredictions: schoolCalculations.map(s => {
        let topRiskFactor = "ดำเนินงานได้ตามเกณฑ์มาตรฐาน ไม่มีปัจจัยเสี่ยงมีนัยสำคัญ";
        let predictedObstacles = ["ไม่มีประเด็นข้อขัดข้องสำคัญ"];
        let proactiveInterventions = ["รักษามาตรฐานการรายงานสม่ำเสมอ"];
        let keyVulnerableIndicators = ["ทุกตัวชี้วัดอยู่ในเกณฑ์ปกติ"];

        if (s.riskLevel === "HIGH_RISK") {
          topRiskFactor = `ขาดรายงานต่อเนื่องนานกว่า ${s.daysSinceLastReport} วัน และยังขาดกิจกรรมใน ${s.uncoveredGoals.length} เป้าหมายหลัก`;
          predictedObstacles = [
            `มีแนวโน้มตกเกณฑ์การประเมินใน ${s.uncoveredGoals.slice(0, 2).join(', ') || 'เป้าหมายหลัก'}`,
            "สัญญาณอินเทอร์เน็ตหรืออุปกรณ์บันทึกข้อมูลในพื้นที่อาจมีปัญหา",
            "ภาระงานครูผู้รับผิดชอบโครงการพระราชดำริสูงจนไม่สามารถรวบรวมเอกสารได้ทัน"
          ];
          proactiveInterventions = [
            "ส่งชุดวิทยากร/ครูพี่เลี้ยงจาก กก.ตชด. เข้าสนับสนุนการบันทึกข้อมูลภาคสนาม",
            "ประสานงานครูใหญ่เพื่อจัดสรรผู้รับผิดชอบรายงานสำรอง",
            "สนับสนุนอุปกรณ์ซิมการ์ดสัญญาณดาวเทียมหรือจุดรับส่งสัญญาณอินเทอร์เน็ต"
          ];
          keyVulnerableIndicators = ["ตัวชี้วัดความต่อเนื่องรายเดือน", ...s.uncoveredGoals.slice(0, 2)];
        } else if (s.riskLevel === "MODERATE_RISK") {
          topRiskFactor = `เริ่มมีช่วงว่างการรายงาน (${s.daysSinceLastReport} วัน) และยังไม่ครอบคลุม ${s.uncoveredGoals.length} เป้าหมาย`;
          predictedObstacles = [
            "กิจกรรมบางด้านอาจล่าช้ากว่าแผนปฏิบัติการประจำปีการศึกษา",
            "การกระจายตัวของ 8 เป้าหมายยังไม่สมดุล"
          ];
          proactiveInterventions = [
            "ฝ่ายอำนวยการส่งข้อความแจ้งเตือนผ่านกลุ่ม LINE เพื่อติดตามความก้าวหน้า",
            "กระตุ้นให้เริ่มดำเนินกิจกรรมในด้านที่ยังไม่มีข้อมูล"
          ];
          keyVulnerableIndicators = s.uncoveredGoals.slice(0, 2);
        }

        return {
          ...s,
          topRiskFactor,
          predictedObstacles,
          proactiveInterventions,
          keyVulnerableIndicators
        };
      }),
      isFallback: true
    };
  };

  // If Gemini client not available, return rule-based fallback
  if (!ai) {
    const fallback = buildFallbackPredictiveData();
    predictiveTrendsCache.set(cacheKey, { data: fallback, timestamp: Date.now() });
    return res.json(fallback);
  }

  try {
    const summaryPromptData = {
      totalSchools: schoolCalculations.length,
      highRiskCount: highRiskList.length,
      moderateRiskCount: moderateRiskList.length,
      onTrackCount: onTrackList.length,
      topVulnerableSample: highRiskList.slice(0, 5).map(s => ({
        name: s.schoolName,
        group: s.groupName,
        daysIdle: s.daysSinceLastReport,
        missingGoalsCount: s.uncoveredGoals.length,
        missingGoalsSample: s.uncoveredGoals.slice(0, 2),
        totalReports: s.totalReports
      }))
    };

    const response = await generateGeminiContentWithCascade((modelName) => ({
      model: modelName,
      contents: [
        {
          role: "user",
          parts: [
            {
              text: `คุณคือสถาปนิกปัญญาประดิษฐ์และผู้เชี่ยวชาญด้านการวางแผนยุทธศาสตร์และประเมินผล แผนพัฒนาเด็กและเยาวชนในถิ่นทุรกันดาร (กพด. ฉบับที่ 5) กองบังคับการตำรวจตระเวนชายแดนภาค 2 (บก.ตชด.ภาค 2)
              
จากข้อมูลสถิติประวัติการส่งรายงานของโรงเรียน ตชด. ทั้ง 53 แห่งในสังกัด (สรุปผลข้อมูล: ${JSON.stringify(summaryPromptData)})

จงวิเคราะห์แนวโน้มเชิงคาดการณ์ (Predictive Trends & Early Warning Analysis) ในระดับผู้บริหาร:
1. สรุปภาพรวมเชิงยุทธศาสตร์ (executiveStrategicSummary) ภาษาทางการราชการ ชี้ให้เห็นแนวโน้มและข้อสังเกตสำคัญ
2. ปัจจัยเสี่ยงเชิงระบบ (systemicRiskFactors) 3 ข้อสำคัญ พร้อมระบุผลกระทบ (HIGH / MEDIUM / LOW)
3. การพยากรณ์ความเสี่ยงตามฤดูกาลและไตรมาส (seasonalForecast) 4 ไตรมาส
4. ตัวชี้วัดที่มีความเสี่ยงตกเกณฑ์สูงสุด 3 ตัวชี้วัด (topVulnerableIndicators) พร้อมเหตุผลเชิงประจักษ์`
            }
          ]
        }
      ],
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            executiveStrategicSummary: {
              type: Type.STRING,
              description: "บทสรุปเชิงยุทธศาสตร์สำหรับผู้บังคับบัญชา ภาษาทางการ ไม่เกิน 5 บรรทัด"
            },
            systemicRiskFactors: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING },
                  description: { type: Type.STRING },
                  impactLevel: { type: Type.STRING, enum: ["HIGH", "MEDIUM", "LOW"] }
                },
                required: ["title", "description", "impactLevel"]
              }
            },
            seasonalForecast: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  season: { type: Type.STRING },
                  period: { type: Type.STRING },
                  forecastDetails: { type: Type.STRING },
                  keyFocusGoal: { type: Type.STRING }
                },
                required: ["season", "period", "forecastDetails", "keyFocusGoal"]
              }
            },
            topVulnerableIndicators: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  code: { type: Type.STRING },
                  name: { type: Type.STRING },
                  vulnerableSchoolCount: { type: Type.INTEGER },
                  riskReason: { type: Type.STRING }
                },
                required: ["code", "name", "vulnerableSchoolCount", "riskReason"]
              }
            }
          },
          required: ["executiveStrategicSummary", "systemicRiskFactors", "seasonalForecast", "topVulnerableIndicators"]
        }
      }
    }));

    const resultText = response?.text;
    if (!resultText) {
      const fallback = buildFallbackPredictiveData();
      predictiveTrendsCache.set(cacheKey, { data: fallback, timestamp: Date.now() });
      return res.json(fallback);
    }

    const aiParsed = JSON.parse(resultText.trim());
    const fallbackBase = buildFallbackPredictiveData();

    const fullResult = {
      ...fallbackBase,
      ...aiParsed,
      isFallback: false
    };

    predictiveTrendsCache.set(cacheKey, { data: fullResult, timestamp: Date.now() });
    return res.json(fullResult);

  } catch (error) {
    console.warn("[Gemini API] predictive-trends error, returning intelligent fallback:", error);
    const fallback = buildFallbackPredictiveData();
    predictiveTrendsCache.set(cacheKey, { data: fallback, timestamp: Date.now() });
    return res.json(fallback);
  }
});

// Gemini Smart Multi-Turn Chat Endpoint with Role-Based System Instructions
app.post("/api/gemini/smart-chat", async (req, res) => {
  const { messages, contextData, roleId = "general", taskType } = req.body;

  // Extract latest user query correctly from .text or .content
  const lastMsg = messages && messages.length > 0 ? messages[messages.length - 1] : null;
  const userQuery = lastMsg ? (lastMsg.text || lastMsg.content || "สวัสดีครับ ขอคำแนะนำแผน กพด.๕") : "สวัสดีครับ ขอคำแนะนำแผน กพด.๕";

  // Determine target Gemini Model based on task type / role:
  // - Complex tasks: gemini-3.1-pro-preview
  // - General tasks: gemini-3.5-flash
  // - Fast tasks: gemini-3.1-flash-lite
  let targetModel = "gemini-3.5-flash";
  if (taskType === "complex" || roleId === "strategic_analyst") {
    targetModel = "gemini-3.1-pro-preview";
  } else if (taskType === "fast" || roleId === "quick_assistant") {
    targetModel = "gemini-3.1-flash-lite";
  } else {
    targetModel = "gemini-3.5-flash";
  }

  // Construct Role-Specific System Instruction
  let systemInstruction = "";
  if (roleId === "strategic_analyst" || taskType === "complex") {
    systemInstruction = `คุณคือ "ผู้เชี่ยวชาญการวิเคราะห์ยุทธศาสตร์เชิงลึก กพด.๕" (Senior Strategic & KPI Diagnostic Specialist powered by Google Gemini 3.1 Pro Preview)
บทบาทหน้าที่เฉพาะของคุณ:
1. วิเคราะห์เชิงลึก ข้อมูลสถิติ กิจกรรม และตัวชี้วัด KPIs ของ 53 โรงเรียนตำรวจตระเวนชายแดน สังกัด บก.ตชด.ภาค 2
2. ประเมินช่องว่าง (Gap Analysis) วินิจฉัยความก้าวหน้าโครงการตาม 8 ด้านของแผนพัฒนาเด็กและเยาวชนในถิ่นทุรกันดาร (กพด. ฉบับที่ 5)
3. เสนอแนะเชิงกลยุทธ์ มาตรการแก้ไขปัญหา และข้อคิดเห็นระดับผู้บังคับบัญชาที่มีหลักฐานเชิงประจักษ์รองรับ
4. ตอบด้วยภาษาไทยทางการ ชัดเจน ลึกซึ้ง และมีโครงสร้าง Markdown ที่อ่านง่าย

บริบทข้อมูลปัจจุบันของระบบ:
${JSON.stringify(contextData || {}, null, 2)}`;
  } else if (roleId === "quick_assistant" || taskType === "fast") {
    systemInstruction = `คุณคือ "ผู้ช่วยตอบด่วน สรุปประเด็นฉับไว กพด.๕" (Rapid Response Officer powered by Google Gemini 3.1 Flash-Lite)
บทบาทหน้าที่เฉพาะของคุณ:
1. ตอบคำถามอย่างรวดเร็ว ตรงประเด็น กระชับ ไม่เยิ่นเย้อ ประหยัดเวลาของครูผู้ปฏิบัติงาน
2. สรุปขั้นตอนเร็ว (Step-by-step), สรุปนิยามตัวชี้วัด และสรุปตัวเลขสถิติอย่างฉับไว
3. ตอบด้วยภาษาไทยสุภาพ กระชับ ชัดเจน ใช้สัญลักษณ์หัวข้อย่อยเข้าใจง่าย

บริบทข้อมูลปัจจุบันของระบบ:
${JSON.stringify(contextData || {}, null, 2)}`;
  } else if (roleId === "official_drafter") {
    systemInstruction = `คุณคือ "ผู้เชี่ยวชาญการยกร่างภาษาหนังสือราชการ กพด.๕" (Official Thai Government Drafting Specialist powered by Google Gemini)
บทบาทหน้าที่เฉพาะของคุณ:
1. ช่วยยกร่างและขัดเกลาถ้อยคำในเอกสารรายงาน A4 บันทึกข้อความ วัตถุประสงค์ และผลการดำเนินงาน
2. ยึดถือระเบียบสำนักนายกรัฐมนตรีว่าด้วยงานสารบรรณ พ.ศ. ๒๕๒๖ และที่แก้ไขเพิ่มเติม
3. ใช้ถ้อยคำทางการ สละสลวย ถูกต้องตามแบบแผนราชการไทย สามารถนำไปคัดลอกลงในแบบฟอร์มเอกสารได้ทันที

บริบทข้อมูลปัจจุบันของระบบ:
${JSON.stringify(contextData || {}, null, 2)}`;
  } else {
    // General System Assistant
    systemInstruction = `คุณคือ "ผู้ช่วยอัจฉริยะระบบ กพด.๕" (General System Assistant powered by Google Gemini 3.5 Flash)
บทบาทหน้าที่เฉพาะของคุณ:
1. ให้คำแนะนำเกี่ยวกับการใช้งานทุกหน้าจอในระบบ ได้แก่ แดชบอร์ดหลัก, สถานีนำเสนอผู้บังคับบัญชา, แผนที่ GIS ตชด., เอกสารรายงาน A4, แฟ้มรายงานทั้งหมด, การวิเคราะห์รายสัปดาห์/เดือน, ติดตามการส่งรายงาน, และคลังภาพกิจกรรม
2. แนะนำเป้าหมาย 8 ด้านของแผนพัฒนาเด็กและเยาวชนในถิ่นทุรกันดาร (กพด. ฉบับที่ 5) ตามพระราชดำริฯ
3. อธิบายวิธีการบันทึกข้อมูล การกรองค้นหา และการส่งออกเอกสาร PDF/Excel
4. ตอบด้วยภาษาไทยที่สุภาพ เป็นมิตร ชัดเจน และมีโครงสร้าง Markdown สวยงาม

บริบทข้อมูลปัจจุบันของระบบ:
${JSON.stringify(contextData || {}, null, 2)}`;
  }

  // Intelligent Contextual Fallback Engine (when API key missing or quota exceeded)
  const getSmartFallback = (query: string): string => {
    const q = query.toLowerCase();
    
    if (q.includes("ด้านที่ 1") || q.includes("โภชนาการ") || q.includes("สุขภาพ") || q.includes("อาหารกลางวัน")) {
      return `📌 **เป้าหมาย กพด.๕ ด้านที่ ๑: เสริมสร้างโภชนาการ สุขภาพอนามัย และคุณภาพชีวิตผู้เรียน**\n\n` +
        `• **วัตถุประสงค์หลัก:** เพื่อให้นักเรียนในถิ่นทุรกันดารได้รับสารอาหารครบถ้วนตามโภชนาการ มีภาวะการเจริญเติบโตสมวัย และปลอดจากโรคติดต่อ\n` +
        `• **กิจกรรมแนะนำ:** โครงการเกษตรเพื่ออาหารกลางวัน, การเฝ้าระวังน้ำหนัก-ส่วนสูงประจำเดือน, การเสริมไอโอดีนและธาตุเหล็ก, กิจกรรมแปลงผักสวนครัวโรงเรียน\n` +
        `• **ตัวชี้วัด KPIs:** ร้อยละของนักเรียนที่มีภาวะโภชนาการตามเกณฑ์มาตรฐานกรมอนามัย (เป้าหมาย ≥ 85%) และการมีน้ำดื่มสะอาดปลอดภัยในโรงเรียน`;
    }
    
    if (q.includes("ด้านที่ 2") || q.includes("ด้านที่ 3") || q.includes("วิชาการ") || q.includes("การศึกษา") || q.includes("การเรียนรู้")) {
      return `📚 **เป้าหมาย กพด.๕ ด้านที่ ๒ & ๓: ยกระดับคุณภาพการศึกษา ทักษะทางวิชาการ และเทคโนโลยี**\n\n` +
        `• **วัตถุประสงค์หลัก:** ส่งเสริมศักยภาพการเรียนรู้ การอ่านออกเขียนได้ ภาษาไทย ภาษาอังกฤษ ทักษะ STEM/วิทยาศาสตร์ และเทคโนโลยีดิจิทัล\n` +
        `• **กิจกรรมแนะนำ:** กิจกรรมรักการอ่านยกระดับผลสัมฤทธิ์, ห้องเรียนอัจฉริยะไอซีที ตชด., ค่ายทักษะคณิตศาสตร์และวิทยาศาสตร์สร้างสรรค์\n` +
        `• **การลงบันทึก:** ระบุจำนวนนักเรียนที่ได้รับการพัฒนาเป็นรายชั้นเรียน พร้อมแนบภาพสื่อนวัตกรรมและผลงานเชิงประจักษ์`;
    }

    if (q.includes("ด้านที่ 4") || q.includes("อาชีพ") || q.includes("ผลิตภัณฑ์") || q.includes("สหกรณ์")) {
      return `🛠️ **เป้าหมาย กพด.๕ ด้านที่ ๔: การส่งเสริมทักษะอาชีพ และการพัฒนาผลิตภัณฑ์ชุมชน**\n\n` +
        `• **วัตถุประสงค์หลัก:** ปลูกฝังทักษะอาชีพตามหลักปรัชญาเศรษฐกิจพอเพียง การบริหารจัดการกิจกรรมสหกรณ์นักเรียน และการแปรรูปผลผลิตท้องถิ่น\n` +
        `• **กิจกรรมแนะนำ:** สหกรณ์นักเรียน ตชด., การแปรรูปสมุนไพรและผลผลิตเกษตร, งานหัตถกรรมพื้นบ้าน และการตลาดดิจิทัลชุมชน`;
    }

    if (q.includes("ภาษาราชการ") || q.includes("ยกร่าง") || q.includes("หนังสือราชการ") || q.includes("คำนำ") || q.includes("สรุปงาน")) {
      return `✍️ **ตัวอย่างการยกร่างภาษาหนังสือราชการ (Official Thai Draft)**\n\n` +
        `**เรื่อง:** รายงานผลการดำเนินกิจกรรมตามแผนพัฒนาเด็กและเยาวชนในถิ่นทุรกันดาร (กพด. ฉบับที่ ๕)\n\n` +
        `**เรียน:** ผู้บังคับบัญชา / ครูใหญ่ประจำสถานศึกษา\n\n` +
        `ด้วย โรงเรียนได้ดำเนินการขับเคลื่อนกิจกรรมการเรียนรู้บูรณาการตามแนวพระราชดำริฯ สอดคล้องกับวัตถุประสงค์ของโครงการ ในการนี้ ผลการดำเนินงานบรรลุตามเป้าหมายเชิงปริมาณและคุณภาพ โดยมีผู้เรียนเข้าร่วมกิจกรรมครบถ้วนร้อยละ ๑๐๐ ส่งผลให้ผู้เรียนเกิดทักษะการเรียนรู้เชิงประจักษ์ สามารถนำไปประยุกต์ใช้ในชีวิตประจำวันได้อย่างยั่งยืน\n\n` +
        `จึงเรียนมาเพื่อโปรดทราบและพิจารณาอนุมัติ`;
    }

    return `✨ **ระบบผู้ช่วยอัจฉริยะ AI กพด.๕ (powered by Google Gemini)**\n\n` +
      `ยินดีให้คำแนะนำและช่วยเหลือในประเด็นต่อไปนี้ครับ:\n` +
      `๑. **ตรวจสอบตัวชี้วัด กพด.๕:** ครอบคลุมเป้าหมาย ๘ ด้าน เช่น โภชนาการ วิชาการ สุขอนามัย ทักษะอาชีพ และสิ่งแวดล้อม\n` +
      `๒. **ช่วยยกร่างภาษาหนังสือราชการ:** สำหรับนำไปลงในแบบฟอร์มบันทึกรายงาน A4 และเอกสารสรุปโครงการ\n` +
      `๓. **วิเคราะห์สถิติมุมมองบริหาร:** สรุปภาพรวมความก้าวหน้าโครงการของแต่ละสถานศึกษา (๕๓ รร.ตชด.)\n\n` +
      `ท่านสามารถพิมพ์คำถามหรือระบุหัวข้อที่ต้องการให้ AI ช่วยเหลือได้ทันทีครับ`;
  };

  if (!ai) {
    return res.json({ reply: getSmartFallback(userQuery), modelUsed: "contextual-fallback", isFallback: true });
  }

  // Construct multi-turn messages array for Gemini API
  const contentsHistory = messages && Array.isArray(messages) && messages.length > 0
    ? messages.map((m: any) => ({
        role: m.role === "model" || m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.text || m.content || "" }]
      }))
    : [{ role: "user", parts: [{ text: userQuery }] }];

  // Cascade list of models to try
  const modelsToTry = [
    targetModel,
    targetModel !== "gemini-3.5-flash" ? "gemini-3.5-flash" : "gemini-3.8-flash",
    "gemini-3.1-flash-lite"
  ].filter((v, i, a) => a.indexOf(v) === i);

  let finalReply = "";
  let finalModelUsed = targetModel;

  for (const modelCandidate of modelsToTry) {
    try {
      const response = await ai.models.generateContent({
        model: modelCandidate,
        contents: contentsHistory,
        config: {
          systemInstruction,
          temperature: roleId === "strategic_analyst" ? 0.2 : roleId === "official_drafter" ? 0.3 : 0.4,
        }
      });

      const extracted = response?.text;
      if (extracted && extracted.trim().length > 0) {
        finalReply = extracted.trim();
        finalModelUsed = modelCandidate;
        break;
      }
    } catch (modelErr: any) {
      console.warn(`[Gemini API] smart-chat model candidate (${modelCandidate}) failed:`, modelErr?.message || modelErr);
      // Continue to next candidate model
    }
  }

  if (finalReply) {
    return res.json({ reply: finalReply, modelUsed: finalModelUsed, roleId });
  }

  // If all models failed or offline, return contextual intelligent fallback
  return res.json({
    reply: getSmartFallback(userQuery),
    modelUsed: "offline-fallback",
    roleId,
    isFallback: true
  });
});

// Gemini Executive School Summary Endpoint
app.post("/api/gemini/generate-school-summary", async (req, res) => {
  const { schoolName, reportsSummary } = req.body;

  const buildFallbackSchoolSummary = () => ({
    executiveSummary: `ภาพรวมการดำเนินงานของ ${schoolName || "สถานศึกษา"}: ได้ขับเคลื่อนโครงการและกิจกรรมการเรียนรู้ตามแผนพัฒนาเด็กและเยาวชนในถิ่นทุรกันดาร (กพด. ฉบับที่ ๕) อย่างต่อเนื่อง ครอบคลุมด้านสุขอนามัย โอกาสทางการศึกษา และทักษะอาชีพ`,
    keyStrengths: [
      "มีการจัดกิจกรรมการเรียนรู้สอดคล้องกับวัตถุประสงค์โครงการพระราชดำริฯ",
      "มีระบบการติดตามและลงบันทึกรายงานผลอย่างเป็นระบบ",
      "นักเรียนและชุมชนมีส่วนร่วมในกิจกรรมอย่างเข้มแข็ง"
    ],
    priorityAreasToImprove: [
      "การจัดเก็บภาพประกอบกิจกรรมเชิงประจักษ์ให้ครบถ้วนทุกหมวด",
      "การถอดบทเรียนเพื่อต่อยอดผลิตภัณฑ์และภูมิปัญญาท้องถิ่น",
      "การติดตามผลการพัฒนาเชิงคุณภาพอย่างต่อเนื่อง"
    ],
    recommendedNextAction: [
      "จัดทำปฏิทินปฏิบัติงานบูรณาการร่วมกับหน่วยงานต้นสังกัด",
      "ยกระดับการบันทึกรายงานผลผ่านระบบดิจิทัล"
    ],
    strategicScore: 88,
    isFallback: true
  });

  if (!ai) {
    return res.json(buildFallbackSchoolSummary());
  }

  try {
    const systemInstruction = `คุณเป็นผู้เชี่ยวชาญการประเมินผลแผนยุทธศาสตร์ กพด. ฉบับที่ 5
จงสรุปสังเคราะห์ภาพรวมการดำเนินงานเชิงบริหาร (Executive Strategic Summary) สำหรับสถานศึกษา: "${schoolName || "ภาพรวมทุกโรงเรียน"}"
เพื่อรายงานต่อผู้บังคับบัญชา และผู้ทรงคุณวุฒิ`;

    const prompt = `ข้อมูลรายงานกิจกรรมเบื้องต้นของสถานศึกษา:
${JSON.stringify(reportsSummary, null, 2)}

โปรดสรุปผลเชิงวิเคราะห์ในรูปแบบ JSON ดังนี้:
1. executiveSummary: ความเรียงสรุปภาพรวมเชิงบริหาร (ประมาณ 4-5 บรรทัด ภาษาทางการ)
2. keyStrengths: จุดเด่นสำคัญ 3 ประการ
3. priorityAreasToImprove: ประเด็นที่ควรเร่งรัดหรือส่งเสริมเพิ่มเติม 3 ประการ
4. recommendedNextAction: ข้อเสนอแนะเชิงยุทธศาสตร์สำหรับปีงบประมาณถัดไป (2-3 ข้อ)
5. strategicScore: คะแนนประเมินภาพรวม (0-100)`;

    const response = await generateGeminiContentWithCascade((model) => ({
      model,
      contents: prompt,
      config: {
        systemInstruction,
        temperature: 0.2,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            executiveSummary: { type: Type.STRING },
            keyStrengths: { type: Type.ARRAY, items: { type: Type.STRING } },
            priorityAreasToImprove: { type: Type.ARRAY, items: { type: Type.STRING } },
            recommendedNextAction: { type: Type.ARRAY, items: { type: Type.STRING } },
            strategicScore: { type: Type.INTEGER }
          },
          required: ["executiveSummary", "keyStrengths", "priorityAreasToImprove", "recommendedNextAction", "strategicScore"]
        }
      }
    }));

    const resultText = response?.text;
    if (!resultText) return res.json(buildFallbackSchoolSummary());
    return res.json(JSON.parse(resultText.trim()));

  } catch (error: any) {
    console.warn("[Gemini API] generate-school-summary: utilizing smart fallback (quota limit/offline)");
    return res.json(buildFallbackSchoolSummary());
  }
});

// Intelligent Deterministic Fallback Condenser for Thai Activity Details
function condenseThaiDetailsExtractive(rawText: string, maxChars = 220): string {
  if (!rawText) return "ดำเนินกิจกรรมพัฒนาเด็กและเยาวชนตามแผนงาน";
  const cleaned = rawText
    .replace(/\r\n/g, "\n")
    .replace(/\n+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (cleaned.length <= maxChars) return cleaned;

  // Split by common Thai conjunctions, punctuation, or steps while retaining original factual fragments
  const clauses = cleaned.split(/(?<=[.!?])\s+|(?<=\s[๑-๙1-9]\.\s)|(?=\s*๒\.\s*)|(?=\s*2\.\s*)|(?=\s*๓\.\s*)|(?=\s*3\.\s*)|(?<=\s*;\s*)/);
  let accumulated = "";
  for (const clause of clauses) {
    const trimmed = clause.trim();
    if (!trimmed) continue;
    if ((accumulated + (accumulated ? " " : "") + trimmed).length <= maxChars) {
      accumulated += (accumulated ? " " : "") + trimmed;
    } else {
      break;
    }
  }
  return accumulated || cleaned.slice(0, maxChars).trim();
}

// Dedicated High-Fidelity Activity Details Summarizer (100% Faithful, Zero Distortion)
app.post("/api/gemini/summarize-activity", async (req, res) => {
  const { originalText, activityName, schoolName, goalName, targetLength } = req.body;
  const rawText = (originalText || "").trim();

  if (!rawText) {
    return res.status(400).json({ error: "originalText is required" });
  }

  const fallback = condenseThaiDetailsExtractive(rawText, targetLength === "compact" ? 160 : 220);

  if (!ai) {
    return res.json({ result: fallback, isFallback: true });
  }

  try {
    const systemInstruction = `คุณเป็นผู้เชี่ยวชาญการสรุปย่อข้อความรายงานราชการระดับชาติ (กพด. ฉบับที่ ๕) 
มีหน้าที่สรุปย่อข้อความ "รายละเอียดการดำเนินกิจกรรม" ให้กระชับ รัดกุม ชัดเจน โดย "ต้องยึดถือข้อเท็จจริงเดิม 100% ห้ามแต่งเติม ห้ามบิดเบือน ห้ามเพี้ยนไปจากต้นฉบับเด็ดขาด"

กฎเหล็กในการสรุปย่อไม่ให้เพี้ยน (Faithful & Zero Hallucination Constraints):
1. ความถูกต้องแม่นยำ 100%: ต้องรักษาข้อเท็จจริงทั้งหมดจากข้อความต้นฉบับ เช่น บุคคลผู้เข้าร่วม, วันเวลา, สถานที่, ขั้นตอนการปฏิบัติงาน, ชนิดพืช/สัตว์/อุปกรณ์, วัตถุประสงค์เฉพาะ, ตัวเลขหรือสถิติ ต้องตรงกับต้นฉบับเท่านั้น
2. ห้าม Hallucination / ห้ามแต่งเติม: ห้ามใส่ข้อมูลที่ไม่มีในต้นฉบับเด็ดขาด ห้ามคาดเดา ห้ามเติมกิจกรรมที่ไม่ได้ทำจริง
3. ห้ามใช้คำกว้างๆ ลอยๆ: ห้ามแทนที่เนื้อหาจริงด้วยข้อความสำเร็จรูป เช่น "ดำเนินกิจกรรมบรรลุผลสำเร็จตามแผน" โดยตัดขั้นตอนจริงที่ทำทิ้ง
4. เทคนิคการย่อ:
   - ตัดคำฟุ่มเฟือยและคำซ้ำซ้อนออก
   - สรุปใจความสำคัญของแต่ละขั้นตอนให้กระชับ
   - ใช้ภาษาหนังสือราชการที่สุภาพ เป็นทางการ และอ่านเข้าใจง่าย
   - ความยาวที่เหมาะสม: ประมาณ 140 - 220 ตัวอักษร (ไม่เกิน 3-4 บรรทัด) เพื่อให้พอดีกับกรอบเอกสาร A4
5. รูปแบบผลลัพธ์: ให้ตอบเฉพาะเนื้อหาข้อความที่ย่อแล้วเท่านั้น ไม่ต้องใส่คำว่า "สรุป:" หรือคำชี้แจงอื่นใด`;

    const userPrompt = `กรุณาย่อสรุปข้อความรายละเอียดกิจกรรมต่อไปนี้ โดยคงข้อเท็จจริงและสาระสำคัญเดิมครบถ้วน 100% ห้ามเพี้ยนหรือแต่งเติม:
- ชื่อกิจกรรม: ${activityName || "กิจกรรมตามแผน กพด."}
- สถานศึกษา: ${schoolName || "โรงเรียนตำรวจตระเวนชายแดน"}
- เป้าหมาย: ${goalName || "การพัฒนาเด็กและเยาวชนในถิ่นทุรกันดาร"}

ข้อความต้นฉบับ:
"${rawText}"`;

    const response = await generateGeminiContentWithCascade((model) => ({
      model,
      contents: userPrompt,
      config: {
        systemInstruction,
        temperature: 0.1, // Low temperature for high factual consistency and zero hallucination
        topP: 0.8,
      }
    }));

    const resultText = (response?.text || "").trim();
    if (!resultText) {
      return res.json({ result: fallback, isFallback: true });
    }

    return res.json({ result: resultText });
  } catch (error: any) {
    console.warn("[Gemini API] summarize-activity: utilizing smart fallback (quota limit/offline)");
    return res.json({ result: fallback, isFallback: true });
  }
});

// Gemini Auto-Fill Smart Draft Endpoint
app.post("/api/gemini/smart-draft", async (req, res) => {
  const { prompt, activityName, projectName, schoolName } = req.body;

  const buildFallbackDraft = () => ({
    objectives: `1. เพื่อส่งเสริมการเรียนรู้และพัฒนาทักษะในกิจกรรม ${activityName || 'ตามแผนงาน'}\n2. เพื่อยกระดับคุณภาพชีวิตและศักยภาพของนักเรียนตามเป้าหมายแผน กพด.๕`,
    details: `1. ประชุมเตรียมการและจัดทำแผนปฏิบัติงาน\n2. ดำเนินการจัดกิจกรรม ${activityName || 'ตามกำหนดการ'}\n3. ประเมินผลการเรียนรู้และสรุปรายงานผล`,
    quantitativeOutcome: "ผู้เรียนและกลุ่มเป้าหมายเข้าร่วมกิจกรรมร้อยละ 100 ของแผนงานที่กำหนด",
    qualitativeOutcome: "ผู้เรียนมีความรู้ ทักษะ และเจตคติที่ดี สามารถนำไปประยุกต์ใช้ในชีวิตประจำวันได้อย่างเหมาะสม",
    problems: "การเดินทางและสภาพอากาศในพื้นที่เป็นอุปสรรคชั่วคราว",
    suggestions: "ควรจัดเตรียมแผนสำรองและประสานงานเครือข่ายล่วงหน้า",
    isFallback: true
  });

  if (!ai) {
    if (prompt) {
      const fallbackCondensed = condenseThaiDetailsExtractive(prompt);
      return res.json({ result: fallbackCondensed, isFallback: true });
    }
    return res.json(buildFallbackDraft());
  }

  try {
    if (prompt) {
      const systemInstruction = `คุณเป็นผู้เชี่ยวชาญการสรุปย่อข้อความรายงานราชการระดับชาติ (กพด. ฉบับที่ ๕)
มีหน้าที่สรุปย่อข้อความให้กระชับ รัดกุม ชัดเจน โดย "ต้องยึดถือข้อเท็จจริงเดิม 100% ห้ามแต่งเติม ห้ามบิดเบือน ห้ามเพี้ยนไปจากต้นฉบับเด็ดขาด"
- ตัดคำฟุ่มเฟือย รักษาสาระสำคัญ ลำดับขั้นตอน และตัวเลขสถิติเดิมทั้งหมด
- ตอบเฉพาะข้อความสรุปเท่านั้น ไม่ต้องมีคำเกริ่นนำ`;

      const response = await generateGeminiContentWithCascade((model) => ({
        model,
        contents: prompt,
        config: {
          systemInstruction,
          temperature: 0.1,
          topP: 0.8,
        }
      }));
      const resultText = (response?.text || "").trim();
      const finalResult = resultText || condenseThaiDetailsExtractive(prompt);
      return res.json({ result: finalResult });
    }

    const systemInstruction = `คุณเป็นผู้ช่วยยกร่างแบบฟอร์มรายงานกิจกรรมตามแผนพัฒนาเด็กและเยาวชนในถิ่นทุรกันดาร (กพด. ฉบับที่ 5) 
มีหน้าที่ช่วยเติมข้อความเนื้อหารายงานกิจกรรมให้อัตโนมัติ โดยใช้ภาษาหนังสือราชการไทยที่ถูกต้อง สละสลวย สมบูรณ์ และสอดคล้องกับสภาพจริงของโรงเรียนตำรวจตระเวนชายแดน`;

    const userPrompt = `ช่วยยกร่างข้อความรายงานกิจกรรมต่อไปนี้:
- ชื่อกิจกรรม: ${activityName}
- ชื่อโครงการหลัก: ${projectName || "โครงการส่งเสริมคุณภาพชีวิตและวิชาการนักเรียน ตชด."}
- สถานศึกษา: ${schoolName || "โรงเรียนตำรวจตระเวนชายแดน"}`;

    const response = await generateGeminiContentWithCascade((model) => ({
      model,
      contents: userPrompt,
      config: {
        systemInstruction,
        temperature: 0.3,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            objectives: { type: Type.STRING, description: "วัตถุประสงค์ของการจัดกิจกรรม (2-3 ข้อ)" },
            details: { type: Type.STRING, description: "ลำดับขั้นตอนดำเนินงานทีละข้อ (1, 2, 3...)" },
            quantitativeOutcome: { type: Type.STRING, description: "ผลผลิตเชิงปริมาณ พร้อมตัวเลขประมาณการ" },
            qualitativeOutcome: { type: Type.STRING, description: "ผลลัพธ์เชิงคุณภาพ ภาษาหนังสือราชการ" },
            problems: { type: Type.STRING, description: "ปัญหาและอุปสรรคที่พบบ่อยในพื้นที่ทุรกันดาร" },
            suggestions: { type: Type.STRING, description: "แนวทางแก้ไขและข้อเสนอแนะสำหรับการทำงานถัดไป" }
          },
          required: ["objectives", "details", "quantitativeOutcome", "qualitativeOutcome", "problems", "suggestions"]
        }
      }
    }));

    const resultText = response?.text;
    if (!resultText) return res.json(buildFallbackDraft());
    return res.json(JSON.parse(resultText.trim()));

  } catch (error: any) {
    console.warn("[Gemini API] smart-draft: utilizing smart fallback (quota limit/offline)");
    if (prompt) {
      const fallbackCondensed = condenseThaiDetailsExtractive(prompt);
      return res.json({ result: fallbackCondensed, isFallback: true });
    }
    return res.json(buildFallbackDraft());
  }
});

// Endpoint 1: Analyze Educational Media Photo / Context
app.post("/api/gemini/analyze-educational-media", async (req, res) => {
  const { image, mimeType, topic, details, schoolName } = req.body;

  const buildFallbackAnalysis = () => ({
    category: "สื่อการสอนสร้างสรรค์และนวัตกรรม",
    mediaType: "บอร์ดนิทรรศการความรู้",
    topic: topic || "การประยุกต์ใช้วัสดุเหลือใช้เพื่อการเรียนรู้เชิงบูรณาการ",
    summary: `นวัตกรรมสื่อการสอนสอดคล้องกับสภาพจริงของชุมชน ตชด. ช่วยกระตุ้นความสนใจใฝ่รู้ของผู้เรียนและทำให้เห็นกระบวนการคิดเชื่อมโยงอย่างสร้างสรรค์`,
    innovationFeature: "การนำสิ่งรอบตัวและภูมิปัญญาท้องถิ่นในโรงเรียน ตชด. มาประยุกต์เป็นเครื่องมือส่งเสริมทักษะวิชาการ",
    implementationSteps: [
      "คุณครูผู้สอนแนะนำคอนเซปต์และสาธิตการทำงานร่วมกับนวัตกรรมจัดตั้งในมุมความรู้",
      "แบ่งกลุ่มนักเรียน 4-5 คน ดำเนินกิจกรรมเรียนรู้ผ่านฐานปฏิบัติการจริงเพื่อความเข้าใจ",
      "ให้นักเรียนสรุปประเด็นหลักลงในสมุดบันทึก และนำเสนอกลุ่มย่อยแลกเปลี่ยนความเห็นกัน"
    ],
    shareScore: 92,
    isFallback: true
  });

  if (!ai) {
    return res.json(buildFallbackAnalysis());
  }

  try {
    const parts: any[] = [];
    if (image && mimeType) {
      parts.push({
        inlineData: {
          data: image,
          mimeType: mimeType
        }
      });
    }

    const systemInstruction = `คุณเป็นผู้เชี่ยวชาญระดับสูงด้านการประเมินนวัตกรรมและการผลิตสื่อการสอน (Instructional Media Design Specialist) สำหรับโรงเรียนในถิ่นทุรกันดาร ตชด.
หน้าที่ของคุณคือวิเคราะห์ข้อมูลภาพถ่ายสื่อการสอนหรือรายละเอียดนวัตกรรมที่ส่งเข้ามา เพื่อประเมิน หมวดหมู่ ประเภท จุดเน่น และขั้นตอนนำไปใช้งานของสื่อนวัตกรรมนั้นๆ`;

    const userPrompt = `โปรดวิเคราะห์สื่อนวัตกรรมการสอนนี้:
- โรงเรียนต้นทาง: ${schoolName || "ไม่ระบุ"}
- หัวข้อหลักเบื้องต้น: ${topic || "ไม่ได้ระบุ"}
- รายละเอียดประกอบ: ${details || "ไม่ได้ระบุ"}`;

    parts.push({ text: userPrompt });

    const response = await generateGeminiContentWithCascade((model) => ({
      model,
      contents: parts,
      config: {
        systemInstruction,
        temperature: 0.2,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            category: { type: Type.STRING, description: "Category of the media. Must be one of: 'คณิตศาสตร์', 'วิทยาศาสตร์', 'ภาษาไทย', 'ภาษาอังกฤษ', 'สุขศึกษาและพลศึกษา', 'ทักษะอาชีพและการงานอาชีพ', 'การอนุรักษ์สิ่งแวดล้อม', 'สื่อการสอนสร้างสรรค์และนวัตกรรม'" },
            mediaType: { type: Type.STRING, description: "Type of media. Must be one of: 'บอร์ดนิทรรศการความรู้', 'สื่ออุปกรณ์ทำมือ', 'แผนผังความคิด/Mind Map', 'ใบงานประยุกต์และแบบฝึกหัด', 'โครงงาน/สิ่งประดิษฐ์นักเรียน'" },
            topic: { type: Type.STRING, description: "Core academic topic or lesson theme (Thai language, max 10 words)" },
            summary: { type: Type.STRING, description: "Brief academic summary of the educational value shown in the image/text (Thai, max 3 sentences)" },
            innovationFeature: { type: Type.STRING, description: "Key educational innovation of this media (Thai, 1 sentence)" },
            implementationSteps: { type: Type.ARRAY, items: { type: Type.STRING }, description: "3 structured steps for other teachers to deploy this in their classroom" },
            shareScore: { type: Type.INTEGER, description: "AI evaluation score of sharing value, range 80-100" }
          },
          required: ["category", "mediaType", "topic", "summary", "innovationFeature", "implementationSteps", "shareScore"]
        }
      }
    }));

    const resultText = response?.text;
    if (!resultText) return res.json(buildFallbackAnalysis());
    return res.json(JSON.parse(resultText.trim()));
  } catch (error: any) {
    console.warn("[Gemini API] analyze-educational-media: utilizing smart fallback (quota limit/offline)");
    return res.json(buildFallbackAnalysis());
  }
});

// Endpoint 2: Adapt Lesson Plan for target school & class context
app.post("/api/gemini/adapt-lesson-plan", async (req, res) => {
  const { mediaTopic, mediaCategory, targetSchool, targetGrade, classSize, duration } = req.body;

  const buildFallbackPlan = () => ({
    planTitle: `แผนการจัดการเรียนรู้นวัตกรรมอัจฉริยะ เรื่อง ${mediaTopic || "การส่งเสริมการเรียนรู้เชิงลึก"}`,
    objectives: [
      `ผู้เรียนเกิดความเข้าใจและสามารถอธิบายหลักการเรื่อง ${mediaTopic || "วิชาการหลัก"} ได้อย่างถูกต้อง`,
      `ผู้เรียนพัฒนาทักษะกระบวนการคิดวิเคราะห์และการแก้ปัญหาร่วมกันผ่านสื่อนวัตกรรมสร้างสรรค์`,
      `ผู้เรียนสามารถประยุกต์ใช้ความรู้จากกิจกรรมร่วมกับสภาพสังคมหรือวิถีชีวิตประจำวันของตนเองได้`
    ],
    materialsNeeded: [
      `สื่อนวัตกรรมการสอน เรื่อง ${mediaTopic || "สื่อหลัก"} (ปรับใช้จากวัสดุรีไซเคิลและแหล่งเรียนรู้ใน รร.ตชด. เพื่อลดค่าใช้จ่าย)`,
      `บอร์ดความรู้หรือแผนภาพสรุปย่อแบบโมบายเคลื่อนที่สำหรับกระตุ้นความสนใจ`,
      `แบบบันทึกกิจกรรมกลุ่มและใบประเมินตนเองของนักเรียน`
    ],
    activitiesSteps: [
      `ขั้นนำ (๑๐ นาที): กระตุ้นความสนใจด้วยเกมถามตอบสั้นๆ และเชื่อมโยงภาพสื่อนวัตกรรมจากเพื่อนครูเพื่อเร้าความสนใจก่อนเข้าสู่เนื้อหาหลัก`,
      `ขั้นสอน (๓๐ นาที): แบ่งกลุ่มนักเรียนกลุ่มละ ๔-๕ คน (รวม ${classSize || 20} คน) ร่วมกันสำรวจสื่อนวัตกรรม ลงมือปฏิบัติและวิเคราะห์ในใบกิจกรรมกลุ่ม`,
      `ขั้นสรุป (๒๐ นาที): แต่ละกลุ่มนำเสนอข้อค้นพบร่วมกัน ครูผู้สอนสรุปเนื้อหาหลักและมอบโจทย์ท้าทายเพื่อทบทวนความเข้าใจในบทเรียน`
    ],
    evaluationMethod: "ประเมินพฤติกรรมการมีส่วนร่วม ความร่วมมือในชั้นเรียน และตรวจผลงานในแบบบันทึกกิจกรรมหลังเรียนสำเร็จ",
    teacherTip: `คำแนะนำสำหรับครู รร.ตชด.: เนื่องจากชั้นเรียนมักมีสภาพควบชั้นเรียนและทรัพยากรจำกัด การใช้นวัตกรรมสื่อนวัตกรรมที่เพื่อนครูพัฒนาไว้จะช่วยให้จัดแบ่งโซนการเรียนรู้ด้วยตนเองแบบ Active Learning ได้เป็นอย่างดีในระหว่างที่คุณครูควบคุมอีกชั้นหนึ่ง`,
    isFallback: true
  });

  if (!ai) {
    return res.json(buildFallbackPlan());
  }

  try {
    const systemInstruction = `คุณเป็นศึกษานิเทศก์และผู้เชี่ยวชาญด้านการออกแบบหลักสูตรและการจัดการเรียนรู้เชิงรุก (Active Learning Plan Designer) สำหรับโรงเรียนตำรวจตระเวนชายแดน สังกัด บก.ตชด.ภาค 2
หน้าที่ของคุณคือรับคอนเซปต์สื่อนวัตกรรมการสอนเด่น และเรียบเรียงให้ออกมาเป็น "แผนการจัดการเรียนรู้ย่อย (Micro-Lesson Plan)" ที่มีประสิทธิภาพสูง สอดคล้องกับสภาพจริงของโรงเรียนเป้าหมาย ระดับชั้น และขนาดห้องเรียน`;

    const prompt = `โปรดช่วยปรับปรุงและแปลงสื่อนวัตกรรมการสอนนี้ให้เป็นแผนการสอนแบบเจาะจง:
- หัวข้อสื่อตั้งต้น: ${mediaTopic || "ไม่ระบุ"}
- หมวดหมู่วิชา: ${mediaCategory || "ไม่ระบุ"}
- โรงเรียนปลายฝันที่จะนำไปจัดสอน: ${targetSchool || "ไม่ระบุ"}
- กลุ่มนักเรียนเป้าหมาย: นักเรียนระดับชั้น ${targetGrade || "ประถมศึกษา"}
- จำนวนนักเรียนทั้งหมด: ประมาณ ${classSize || "20"} คน
- เวลาดำเนินกิจกรรม: ${duration || "1 ชั่วโมง"}`;

    const response = await generateGeminiContentWithCascade((model) => ({
      model,
      contents: prompt,
      config: {
        systemInstruction,
        temperature: 0.3,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            planTitle: { type: Type.STRING, description: "Title of the adapted Lesson Plan in Thai" },
            objectives: { type: Type.ARRAY, items: { type: Type.STRING }, description: "2-3 custom learning objectives" },
            materialsNeeded: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Adapted list of low-cost local BPP classroom materials" },
            activitiesSteps: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Step-by-step classroom activities with precise times" },
            evaluationMethod: { type: Type.STRING, description: "Assessment method description" },
            teacherTip: { type: Type.STRING, description: "Expert pedagogical tip for BPP teachers to handle resources and remote constraints" }
          },
          required: ["planTitle", "objectives", "materialsNeeded", "activitiesSteps", "evaluationMethod", "teacherTip"]
        }
      }
    }));

    const resultText = response?.text;
    if (!resultText) return res.json(buildFallbackPlan());
    return res.json(JSON.parse(resultText.trim()));
  } catch (error: any) {
    console.warn("[Gemini API] adapt-lesson-plan: utilizing smart fallback (quota limit/offline)");
    return res.json(buildFallbackPlan());
  }
});

// Configure Vite middleware or static routes depending on NODE_ENV
async function initServer() {
  if (process.env.NODE_ENV !== "production") {
    console.log("Starting server in DEVELOPMENT mode with Vite Middleware...");
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    console.log("Starting server in PRODUCTION mode with static file assets...");
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[กพด. 5 System Server] Running at http://localhost:${PORT}`);
  });
}

initServer().catch((err) => {
  console.error("Failed to start server:", err);
});
