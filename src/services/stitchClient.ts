/**
 * Client-side interface to call Google Stitch AI UI design service via our secure server-side API proxy.
 */

export interface StitchProjectSummary {
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

export interface StitchScreenResult {
  id: string;
  projectId: string;
  title: string;
  deviceType: string;
  imageUrl: string;
  htmlDownloadUrl: string;
  htmlCode: string;
  designTokens: {
    colorMode?: string;
    font?: string;
    roundness?: string;
    customColor?: string;
    saturation?: number;
    [key: string]: any;
  };
  metadata: Record<string, any>;
}

export interface GenerateScreenParams {
  prompt: string;
  projectId?: string;
  projectTitle?: string;
  deviceType?: "MOBILE" | "DESKTOP" | "TABLET" | "AGNOSTIC";
  modelId?: "GEMINI_3_PRO" | "GEMINI_3_FLASH" | "GEMINI_3_1_PRO";
}

export interface EditScreenParams {
  prompt: string;
  projectId: string;
  screenId: string;
  deviceType?: "MOBILE" | "DESKTOP" | "TABLET" | "AGNOSTIC";
  modelId?: "GEMINI_3_PRO" | "GEMINI_3_FLASH" | "GEMINI_3_1_PRO";
}

export async function checkStitchStatus(): Promise<{
  configured: boolean;
  projectsCount?: number;
  sampleProjects?: StitchProjectSummary[];
  error?: string;
}> {
  const res = await fetch("/api/stitch/status");
  return await res.json();
}

export async function listStitchProjects(): Promise<StitchProjectSummary[]> {
  const res = await fetch("/api/stitch/projects");
  const data = await res.json();
  if (!data.success) throw new Error(data.error || "Failed to list Stitch projects");
  return data.projects || [];
}

export async function createStitchProject(title: string): Promise<StitchProjectSummary> {
  const res = await fetch("/api/stitch/projects", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title }),
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.error || "Failed to create project");
  return data.project;
}

export async function listStitchScreens(projectId: string): Promise<StitchScreenSummary[]> {
  const res = await fetch(`/api/stitch/projects/${encodeURIComponent(projectId)}/screens`);
  const data = await res.json();
  if (!data.success) throw new Error(data.error || "Failed to list screens");
  return data.screens || [];
}

export async function getStitchScreen(projectId: string, screenId: string): Promise<StitchScreenResult> {
  const res = await fetch(`/api/stitch/screen/${encodeURIComponent(projectId)}/${encodeURIComponent(screenId)}`);
  const data = await res.json();
  if (!data.success) throw new Error(data.error || "Failed to get screen details");
  return data.screen;
}

export async function generateStitchScreen(params: GenerateScreenParams): Promise<StitchScreenResult> {
  const res = await fetch("/api/stitch/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.error || "Failed to generate screen with Stitch");
  return data.screen;
}

export async function editStitchScreen(params: EditScreenParams): Promise<StitchScreenResult> {
  const res = await fetch("/api/stitch/edit", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.error || "Failed to edit screen with Stitch");
  return data.screen;
}
