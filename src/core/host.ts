/**
 * The OpenAEC SuperCloud workplace (contract: OpenAEC-Blueprint, docs/supercloud-koppeling.md).
 *
 * In the workplace the page around the viewer sets `window.openaecHost` before the viewer starts. The viewer runs in a
 * sandboxed frame without network access of its own: `openaecHost.speckle` lists and reads the projects of the Speckle
 * server of the environment, and `openaecHost.open` reads an IFC file from Docs. Without a host (the public website)
 * nothing here is active and the viewer reads from the Speckle server itself.
 */
export type SpeckleObject = { id: string; speckle_type?: string; [key: string]: unknown };
export type HostModel = { id: string; name: string; version: string; object: string; message: string; created: string | null };
export type HostProject = { id: string; name: string; description: string; updated: string | null; models: HostModel[] };

export type SpeckleHost = {
  projects(options?: { query?: string; cursor?: string }): Promise<{ total: number; cursor: string | null; projects: HostProject[] }>;
  model(id: string): Promise<HostProject & { objects: SpeckleObject[] }>;
  preview(id: string, version: string): Promise<string | null>;
};

export type SiteHost = {
  taal?: string;
  thema?: string;
  initialFileId?: string;
  open(id: string, version?: string | number): Promise<{ id: string; name: string; bytes: ArrayBuffer | Uint8Array }>;
  list(): Promise<{ id: string; name: string; modified: string }[]>;
  speckle?: SpeckleHost;
};

export type WorkplaceTool = {
  name: string;
  description: string;
  inputSchema: object;
  run(args: Record<string, unknown>): unknown | Promise<unknown>;
};

declare global {
  interface Window {
    openaecHost?: SiteHost;
    __OPDS_APP__?: {
      tools(): Promise<string[]>;
      definitions(): Promise<Omit<WorkplaceTool, "run">[]>;
      run(name: string, args?: Record<string, unknown>): Promise<unknown>;
    };
  }
}

export function getHost(): SiteHost | null {
  if (typeof window === "undefined") return null;
  const host = window.openaecHost;
  return host && typeof host.open === "function" && typeof host.list === "function" ? host : null;
}

/** `window.__OPDS_APP__` over the given tools: how the assistant of the SuperCloud reads and drives the viewer. */
export function installWorkplaceTools(tools: WorkplaceTool[]): void {
  const byName = new Map(tools.map((tool) => [tool.name, tool]));
  window.__OPDS_APP__ = {
    tools: async () => [...byName.keys()],
    definitions: async () => tools.map(({ run: _run, ...definition }) => definition),
    run: async (name, args = {}) => {
      const tool = byName.get(name);
      if (!tool) throw new Error(`niet_in_browser: ${name}`);
      return tool.run(args);
    },
  };
}

/**
 * What to show after the page reloads. Opening another model starts the viewer afresh (a reload), and a sandboxed
 * frame has no storage: `window.name` survives the reload.
 */
export type Intent = { project?: string; file?: string; overview?: boolean };
const INTENT = "monty:";

export function readIntent(): Intent | null {
  try {
    return window.name.startsWith(INTENT) ? (JSON.parse(window.name.slice(INTENT.length)) as Intent) : null;
  } catch {
    return null;
  }
}

export function restartWith(intent: Intent): void {
  window.name = INTENT + JSON.stringify(intent);
  window.location.reload();
}
