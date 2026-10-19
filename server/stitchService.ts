import dotenv from "dotenv";

dotenv.config();

export interface StitchProjectItem {
  id: string;
  name: string;
  title: string;
  createTime?: string;
  updateTime?: string;
  thumbnailUrl?: string;
  designTheme?: any;
}

export interface StitchScreenSummary {
  id: string;
  projectId: string;
  title: string;
  deviceType?: string;
  createTime?: string;
  updateTime?: string;
  thumbnailUrl?: string;
}

export interface StitchDesignTokens {
  colorMode?: string;
  font?: string;
  roundness?: string;
  customColor?: string;
  saturation?: number;
  [key: string]: any;
}

export interface StitchScreenFullResult {
  id: string;
  projectId: string;
  title: string;
  deviceType: string;
  imageUrl: string;
  htmlDownloadUrl: string;
  htmlCode: string;
  designTokens: StitchDesignTokens;
  metadata: Record<string, any>;
}

export interface GenerateScreenOptions {
  prompt: string;
  projectId?: string;
  projectTitle?: string;
  deviceType?: "MOBILE" | "DESKTOP" | "TABLET" | "AGNOSTIC";
  modelId?: "GEMINI_3_PRO" | "GEMINI_3_FLASH" | "GEMINI_3_1_PRO";
}

export interface EditScreenOptions {
  prompt: string;
  projectId: string;
  screenId: string;
  deviceType?: "MOBILE" | "DESKTOP" | "TABLET" | "AGNOSTIC";
  modelId?: "GEMINI_3_PRO" | "GEMINI_3_FLASH" | "GEMINI_3_1_PRO";
}

let stitchInstance: any = null;
let stitchClientInstance: any = null;

// Safe dynamic importer that avoids esbuild CommonJS compile-time issues with pure ESM packages
async function getStitchSDK() {
  const dynamicImport = new Function("specifier", "return import(specifier)");
  return await dynamicImport("@google/stitch-sdk");
}

export function isStitchConfigured(): boolean {
  const key = process.env.STITCH_API_KEY?.trim();
  return Boolean(key && key.length > 5);
}

export async function getStitch(): Promise<{ stitch: any; client: any }> {
  const apiKey = process.env.STITCH_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("STITCH_API_KEY is not configured in environment variables (.env).");
  }

  if (stitchInstance && stitchClientInstance) {
    return { stitch: stitchInstance, client: stitchClientInstance };
  }

  const { Stitch, StitchToolClient } = await getStitchSDK();
  stitchClientInstance = new StitchToolClient({ apiKey });
  stitchInstance = new Stitch(stitchClientInstance);

  return { stitch: stitchInstance, client: stitchClientInstance };
}

/**
 * List all Stitch projects owned or accessible with this API key
 */
export async function listStitchProjects(): Promise<StitchProjectItem[]> {
  const { stitch } = await getStitch();
  const rawProjects = await stitch.projects();

  return rawProjects.map((p: any) => ({
    id: p.id || p.projectId,
    name: p.data?.name || `projects/${p.id}`,
    title: p.data?.title || `Project ${p.id}`,
    createTime: p.data?.createTime,
    updateTime: p.data?.updateTime,
    thumbnailUrl: p.data?.thumbnailScreenshot?.downloadUrl || "",
    designTheme: p.data?.designTheme || {},
  }));
}

/**
 * Create a new Stitch project
 */
export async function createStitchProject(title: string): Promise<StitchProjectItem> {
  const { stitch } = await getStitch();
  const project = await stitch.createProject(title);

  return {
    id: project.id || project.projectId,
    name: project.data?.name || `projects/${project.id}`,
    title: project.data?.title || title,
    createTime: project.data?.createTime,
    updateTime: project.data?.updateTime,
    thumbnailUrl: project.data?.thumbnailScreenshot?.downloadUrl || "",
    designTheme: project.data?.designTheme || {},
  };
}

/**
 * List all screens for a given Stitch project
 */
export async function listStitchScreens(projectId: string): Promise<StitchScreenSummary[]> {
  const { stitch } = await getStitch();
  const project = stitch.project(projectId);
  const screens = await project.screens();

  return screens.map((s: any) => ({
    id: s.id || s.screenId,
    projectId: projectId,
    title: s.data?.title || "Untitled Screen",
    deviceType: s.data?.deviceType || "DESKTOP",
    createTime: s.data?.createTime,
    updateTime: s.data?.updateTime,
    thumbnailUrl: s.data?.thumbnailScreenshot?.downloadUrl || "",
  }));
}

/**
 * Helper to fetch raw HTML text from a download URL
 */
async function fetchHtmlContent(downloadUrl: string): Promise<string> {
  if (!downloadUrl) return "";
  try {
    const res = await fetch(downloadUrl);
    if (!res.ok) {
      console.warn(`[Stitch Service] Failed to fetch HTML from ${downloadUrl}: ${res.status} ${res.statusText}`);
      return "";
    }
    return await res.text();
  } catch (err) {
    console.warn("[Stitch Service] Error fetching HTML content:", err);
    return "";
  }
}

/**
 * Get full screen details including preview image, HTML download link, and raw HTML content
 */
export async function getStitchScreenDetails(projectId: string, screenId: string): Promise<StitchScreenFullResult> {
  const { stitch } = await getStitch();
  const project = stitch.project(projectId);
  const screen = await project.getScreen(screenId);

  const [imageUrl, htmlDownloadUrl] = await Promise.all([
    screen.getImage().catch((err: any) => {
      console.warn(`[Stitch Service] Failed to get image for screen ${screenId}:`, err?.message || err);
      return screen.data?.thumbnailScreenshot?.downloadUrl || "";
    }),
    screen.getHtml().catch((err: any) => {
      console.warn(`[Stitch Service] Failed to get HTML URL for screen ${screenId}:`, err?.message || err);
      return screen.data?.htmlCode?.downloadUrl || "";
    }),
  ]);

  let htmlCode = "";
  if (htmlDownloadUrl) {
    htmlCode = await fetchHtmlContent(htmlDownloadUrl);
  }

  // Extract design tokens / theme
  const designTokens: StitchDesignTokens = {
    colorMode: screen.data?.designTheme?.colorMode || "LIGHT",
    font: screen.data?.designTheme?.font || "Inter",
    roundness: screen.data?.designTheme?.roundness || "MEDIUM",
    customColor: screen.data?.designTheme?.customColor || "#4f46e5",
    saturation: screen.data?.designTheme?.saturation ?? 0.8,
    ...(screen.data?.designTheme || {}),
  };

  return {
    id: screen.id || screenId,
    projectId,
    title: screen.data?.title || "Untitled Screen",
    deviceType: screen.data?.deviceType || "DESKTOP",
    imageUrl: imageUrl || "",
    htmlDownloadUrl: htmlDownloadUrl || "",
    htmlCode,
    designTokens,
    metadata: {
      createTime: screen.data?.createTime,
      updateTime: screen.data?.updateTime,
      width: screen.data?.width,
      height: screen.data?.height,
      sourceScreen: screen.data?.sourceScreen,
    },
  };
}

/**
 * Core Generation: Sends a prompt to Google Stitch API, generates a new UI screen,
 * and extracts screen layout, Tailwind/HTML code, Design Tokens, and preview image.
 */
export async function generateStitchScreen(opts: GenerateScreenOptions): Promise<StitchScreenFullResult> {
  const { stitch } = await getStitch();

  let targetProjectId = opts.projectId?.trim();

  // If no projectId is provided, try finding an appropriate project or create a dedicated one
  if (!targetProjectId) {
    try {
      const existingProjects = await stitch.projects();
      // Match relevant domain project if available (e.g. กพด.)
      const matched = existingProjects.find((p: any) =>
        p.data?.title?.includes("กพด.") || p.data?.title?.includes("Dashboard") || p.data?.title?.includes("Redesign")
      );
      if (matched) {
        targetProjectId = matched.id || matched.projectId;
      } else if (existingProjects.length > 0) {
        targetProjectId = existingProjects[0].id || existingProjects[0].projectId;
      } else {
        const newProj = await stitch.createProject(opts.projectTitle || "ระบบ กพด. ตชด. ภาค 2 - UI Redesign");
        targetProjectId = newProj.id || newProj.projectId;
      }
    } catch (e) {
      console.warn("[Stitch Service] Error listing projects, creating a fallback project:", e);
      const newProj = await stitch.createProject(opts.projectTitle || "กพด. ตชด. ภาค 2 UI Studio");
      targetProjectId = newProj.id || newProj.projectId;
    }
  }

  const project = stitch.project(targetProjectId!);
  const deviceType = opts.deviceType || "DESKTOP";
  const modelId = opts.modelId || "GEMINI_3_FLASH";

  console.log(`[Stitch Service] Generating screen in project "${targetProjectId}" with device "${deviceType}" and model "${modelId}"...`);
  console.log(`[Stitch Service] Prompt: "${opts.prompt.slice(0, 120)}..."`);

  const screen = await project.generate(opts.prompt, deviceType, modelId);
  const screenId = screen.id || screen.screenId;

  console.log(`[Stitch Service] Screen generated successfully! Screen ID: ${screenId}`);

  return await getStitchScreenDetails(targetProjectId!, screenId);
}

/**
 * Core Editing: Iterates on an existing screen with an updated prompt
 */
export async function editStitchScreen(opts: EditScreenOptions): Promise<StitchScreenFullResult> {
  const { stitch } = await getStitch();
  const project = stitch.project(opts.projectId);
  const screen = await project.getScreen(opts.screenId);

  const deviceType = opts.deviceType || "DESKTOP";
  const modelId = opts.modelId || "GEMINI_3_FLASH";

  console.log(`[Stitch Service] Editing screen "${opts.screenId}" in project "${opts.projectId}"...`);
  const updatedScreen = await screen.edit(opts.prompt, deviceType, modelId);
  const newScreenId = updatedScreen.id || updatedScreen.screenId || opts.screenId;

  return await getStitchScreenDetails(opts.projectId, newScreenId);
}
