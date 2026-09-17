export interface Project {
  id: string;
  title: string;
  description: string;
  type: string;
  phase: string;
  updated: string;
  elements: number;
  active: boolean;
  location?: string;
  lat?: number;
  lng?: number;
  speckleBase: string;
}

export type Plan = "demo" | "paid";

export interface MontyConfig {
  client: string;
  freeLimit: number;
  projects: Project[];
  plan?: Plan;
}

export const PHASE_STYLES: Record<string, { bg: string; color: string; border: string }> = {
  "Uitvoering": { bg: "#ECFDF5", color: "#065F46", border: "rgba(5,150,105,.2)" },
  "DO":         { bg: "#F5F3FF", color: "#4C1D95", border: "rgba(124,58,237,.2)" },
  "VO":         { bg: "#FFFBEB", color: "#78350F", border: "rgba(245,158,11,.25)" },
  "AO":         { bg: "#F1F5F9", color: "#334155", border: "rgba(100,116,139,.2)" },
  "Gemonteerd": { bg: "#F0FDF4", color: "#14532D", border: "rgba(22,163,74,.2)" },
};

// Project available on the OpenAEC Speckle server.
const EXAMPLE: Project = {
  id: "5e0fe816a2",
  title: "2690 CLT as built",
  description: "PR235078 CLT Woning — IFC voorbeeldmodel",
  type: "wonen",
  phase: "Gemonteerd",
  updated: "2026-09-17",
  elements: 0,
  active: true,
  location: "Rotterdam",
  speckleBase: "https://speckle.open-aec.com",
};

export const CLIENT_CONFIGS: Record<string, MontyConfig> = {
  jm: {
    client: "JM Concepten",
    freeLimit: 3,
    projects: [EXAMPLE],
  },
  domera: {
    client: "Domera",
    freeLimit: 3,
    projects: [EXAMPLE],
  },
  demo: {
    client: "OpenAEC Demo",
    freeLimit: 3,
    plan: "paid",
    projects: [EXAMPLE],
  },
};

export const PROJECTS: Project[] = CLIENT_CONFIGS.demo.projects;
export const DEFAULT_CONFIG: MontyConfig = CLIENT_CONFIGS.demo;
