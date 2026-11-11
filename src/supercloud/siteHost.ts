/**
 * The OpenAEC SuperCloud workplace (contract: OpenAEC-Blueprint, docs/supercloud-koppeling.md).
 *
 * In the workplace the page around the app sets `window.openaecHost` before the app starts: Open reads an IFC file
 * from Docs instead of the file system. The viewer never writes, so it does not use `save`. The assistant of the
 * SuperCloud reads and drives the viewer through `window.__OPDS_APP__`. Without a host (desktop) nothing here is active.
 */
export type HostFileRef = { id: string; name: string; version: string | number };

export type SiteHost = {
  taal?: string;
  thema?: string;
  initialFileId?: string;
  open(id: string, version?: string | number): Promise<HostFileRef & { readOnly: boolean; bytes: ArrayBuffer | Uint8Array }>;
  save(bytes: Uint8Array, options: { id?: string; name?: string; expectedVersion?: string | number }): Promise<HostFileRef>;
  list(): Promise<{ id: string; name: string; modified: string }[]>;
};

export type WorkplaceTool = {
  name: string;
  description: string;
  inputSchema: object;
  bevestigen?: boolean;
  run(args: Record<string, unknown>): unknown | Promise<unknown>;
};

declare global {
  interface Window {
    openaecHost?: SiteHost;
    __OPDS_APP__?: {
      tools(): Promise<string[]>;
      definitions(): Promise<Omit<WorkplaceTool, 'run'>[]>;
      run(name: string, args?: Record<string, unknown>): Promise<unknown>;
    };
  }
}

export const IFC_EXTENSIONS = ['.ifc', '.ifczip'];

export function getSiteHost(): SiteHost | null {
  if (typeof window === 'undefined') return null;
  const host = window.openaecHost;
  return host && typeof host.open === 'function' && typeof host.list === 'function' ? host : null;
}

export function isIfc(name: string): boolean {
  const lower = name.toLowerCase();
  return IFC_EXTENSIONS.some((ext) => lower.endsWith(ext));
}

/** Choose an IFC file from the Docs folder of this app (null: cancelled or none). */
export async function chooseFromDocs(host: SiteHost, promptText: string, noneText: string): Promise<HostFileRef | null> {
  const files = (await host.list()).filter((file) => isIfc(file.name));
  if (!files.length) {
    window.alert(noneText);
    return null;
  }
  const answer = window.prompt(`${promptText}\n\n${files.map((file, index) => `${index + 1}. ${file.name}`).join('\n')}`, '1');
  const number = answer ? Number.parseInt(answer, 10) : Number.NaN;
  if (!Number.isInteger(number) || number < 1 || number > files.length) return null;
  const file = files[number - 1];
  return { id: file.id, name: file.name, version: '' };
}

/** `window.__OPDS_APP__` over the given tools. */
export function installWorkplaceApp(tools: WorkplaceTool[]): () => void {
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
  return () => { delete window.__OPDS_APP__; };
}
