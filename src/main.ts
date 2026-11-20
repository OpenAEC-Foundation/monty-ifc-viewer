import { initViewer, type ViewerInstance } from "./core/viewer-setup";
import { parseStreamParams, loadStream, loadObjects, type StreamParams, type LoadedModel } from "./core/stream-loader";
import { getHost, readIntent, restartWith, installWorkplaceTools, type SiteHost, type WorkplaceTool } from "./core/host";
import { createProjectBrowser } from "./ui/project-browser";
import type { IViewer } from "@speckle/viewer";
import { parseRoute, landingPath } from "./core/route";
import { createToolbar } from "./ui/toolbar";
import { createPropertyPanel, setPropertyPanelMapping } from "./ui/property-panel";
import { createModelPanel } from "./ui/model-panel";
import {
  createContextMenu, setContextMenuMapping, setMultiSelectMode,
  isolateSelected, hideSelected, resetFilters
} from "./ui/context-menu";
import { createFilterPanel } from "./ui/filter-panel";
import { parseMarks, PhaseManager, createTimelineUI } from "./addons/bouwvolgorde";
import { setFilterStateMapping } from "./core/filter-state";
import "./style.css";

type Load = (viewer: IViewer, onProgress: (progress: number) => void) => Promise<LoadedModel[]>;

async function main(): Promise<void> {
  const host = getHost();
  if (host) return startWorkplace(host);

  const legacyClient = new URLSearchParams(window.location.search).get("client");
  if (legacyClient) {
    window.location.href = landingPath(legacyClient);
    return;
  }

  // Resolve project: prefer path-based route (/{client}/pr{n}); fall back to legacy ?project=/?url=
  const route = parseRoute();
  let streamParams: StreamParams | null = null;
  let backTarget: string | null = null;

  if (route.project) {
    streamParams = { projectId: route.project.id };
    backTarget = landingPath(route.clientSlug);
  } else if (route.config && !route.project) {
    // /{client}/ without project — go to that client's landing
    window.location.href = landingPath(route.clientSlug);
    return;
  } else {
    streamParams = parseStreamParams();
    const search = new URLSearchParams(window.location.search);
    if (!streamParams) {
      const hasModelQuery = search.has("project") || search.has("url");
      if (!hasModelQuery) {
        window.location.href = "/landing/";
        return;
      }
      showMessage(
        "Geen model opgegeven. Gebruik /{client}/pr{n} of ?project=..."
      );
      return;
    }
    const fromSlug = search.get("from");
    if (fromSlug) backTarget = landingPath(fromSlug);
    // Scrub legacy params from the URL bar after load
    if (search.has("project") || search.has("url") || search.has("model") || search.has("object") || search.has("from")) {
      window.history.replaceState({}, "", window.location.pathname);
    }
  }

  const params = streamParams;
  const target = backTarget;
  await startViewer(
    (viewer, onProgress) => loadStream(viewer, params, onProgress),
    params.projectId,
    target
      ? () => {
          const ref = document.referrer;
          const sameOrigin = ref && new URL(ref).origin === location.origin;
          if (sameOrigin && history.length > 1) history.back();
          else location.href = target;
        }
      : null
  );
}

/** Start the viewer with its tools and load the models that `load` brings. */
async function startViewer(load: Load, projectId: string, back: (() => void) | null): Promise<void> {
  const container = document.getElementById("viewer-container");
  const loadingIndicator = document.getElementById("loading-indicator");
  if (!container) throw new Error("Viewer container element not found");

  // Initialize Speckle viewer
  let instance: ViewerInstance;
  try {
    instance = await initViewer(container);
  } catch (error) {
    console.error("Viewer init failed:", error);
    showMessage("Viewer kon niet worden gestart.");
    return;
  }

  // Back button to project overview (if we know where to go back to)
  const overlay = document.getElementById("overlay");
  if (back && overlay) {
    const backBtn = document.createElement("button");
    backBtn.id = "back-to-projects";
    backBtn.title = "Terug naar projecten";
    backBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="20" height="20"><polyline points="15 18 9 12 15 6"/></svg>`;
    backBtn.addEventListener("click", back);
    overlay.appendChild(backBtn);
  }

  // Add toolbar + property panel
  const toolbar = createToolbar(instance);
  overlay?.appendChild(toolbar);
  const { panel: propertyPanel, infoBtn } = createPropertyPanel(instance);
  overlay?.appendChild(propertyPanel);
  const contextMenu = createContextMenu(instance);
  overlay?.appendChild(contextMenu);

  // Load model(s)
  try {
    const models = await load(instance.viewer, (progress) => {
      if (loadingIndicator) {
        const pct = Math.round(progress * 100);
        loadingIndicator.textContent = `Model laden... ${pct}%`;
      }
    });

    // Hide loading indicator
    if (loadingIndicator) {
      loadingIndicator.style.display = "none";
    }

    // Zoom to fit after loading
    instance.camera.setCameraView([], true);

    // Left toolbar (model toggle + filter button in one bar)
    const leftToolbar = document.createElement("div");
    leftToolbar.id = "left-toolbar";

    // Info button for touch devices (property panel toggle)
    leftToolbar.appendChild(infoBtn);

    // Multi-select toggle + action panel
    {
      const multiBtn = document.createElement("button");
      multiBtn.className = "left-tb-btn";
      multiBtn.id = "multi-select-btn";
      multiBtn.title = "Multi-selectie";
      multiBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="20" height="20"><path d="M8 3H5a2 2 0 0 0-2 2v3"/><path d="M21 8V5a2 2 0 0 0-2-2h-3"/><path d="M3 16v3a2 2 0 0 0 2 2h3"/><path d="M16 21h3a2 2 0 0 0 2-2v-3"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>`;

      // Side panel (like filter panel)
      const msPanel = document.createElement("div");
      msPanel.id = "multi-select-panel";
      msPanel.classList.add("hidden");

      const msHeader = document.createElement("div");
      msHeader.className = "mp-header";
      msHeader.innerHTML = `<span class="mp-title">Multi-selectie</span>`;
      const msClose = document.createElement("button");
      msClose.className = "mp-close";
      msClose.innerHTML = "&times;";
      msClose.addEventListener("click", () => {
        multiBtn.classList.remove("active");
        setMultiSelectMode(false);
        msPanel.classList.add("hidden");
      });
      msHeader.appendChild(msClose);
      msPanel.appendChild(msHeader);

      const msBody = document.createElement("div");
      msBody.className = "ms-body";

      const ICONS = {
        add: `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18"><line x1="10" y1="4" x2="10" y2="16"/><line x1="4" y1="10" x2="16" y2="10"/></svg>`,
        remove: `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18"><line x1="4" y1="10" x2="16" y2="10"/></svg>`,
        isolate: `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" width="18" height="18"><circle cx="10" cy="10" r="7"/><circle cx="10" cy="10" r="3"/></svg>`,
        hide: `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" width="18" height="18"><path d="M3 10s3-6 7-6 7 6 7 6-3 6-7 6-7-6-7-6z"/><line x1="4" y1="16" x2="16" y2="4"/></svg>`,
        reset: `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" width="18" height="18"><path d="M3 10a7 7 0 0 1 12.9-3.8"/><path d="M17 10a7 7 0 0 1-12.9 3.8"/><polyline points="3 4 3 10 9 10"/></svg>`,
      };

      // Mode buttons (+ and −) — toggle between add/remove mode
      const addBtn = document.createElement("button");
      addBtn.className = "ms-action-btn active";
      addBtn.innerHTML = `${ICONS.add}<span>Toevoegen</span>`;

      const removeBtn = document.createElement("button");
      removeBtn.className = "ms-action-btn";
      removeBtn.innerHTML = `${ICONS.remove}<span>Verwijderen</span>`;

      addBtn.addEventListener("click", () => {
        addBtn.classList.add("active");
        removeBtn.classList.remove("active");
        setMultiSelectMode("add");
      });

      removeBtn.addEventListener("click", () => {
        removeBtn.classList.add("active");
        addBtn.classList.remove("active");
        setMultiSelectMode("remove");
      });

      msBody.appendChild(addBtn);
      msBody.appendChild(removeBtn);

      // Divider
      const divider = document.createElement("div");
      divider.style.cssText = "height:1px;background:var(--border-subtle);margin:4px 0;";
      msBody.appendChild(divider);

      // Action buttons
      const actionItems = [
        { icon: ICONS.isolate, label: "Isoleer", action: () => isolateSelected() },
        { icon: ICONS.hide, label: "Verberg", action: () => hideSelected() },
        { icon: ICONS.reset, label: "Reset", action: () => resetFilters() },
      ];

      for (const { icon, label, action } of actionItems) {
        const btn = document.createElement("button");
        btn.className = "ms-action-btn";
        btn.innerHTML = `${icon}<span>${label}</span>`;
        btn.addEventListener("click", action);
        msBody.appendChild(btn);
      }

      msPanel.appendChild(msBody);

      multiBtn.addEventListener("click", () => {
        if (multiBtn.classList.contains("active")) {
          // Deactivate multi-select
          multiBtn.classList.remove("active");
          setMultiSelectMode(false);
          msPanel.classList.add("hidden");
        } else {
          // Activate multi-select + show panel
          multiBtn.classList.add("active");
          setMultiSelectMode("add");
          addBtn.classList.add("active");
          removeBtn.classList.remove("active");
          document.getElementById("model-panel")?.classList.add("hidden");
          document.getElementById("filter-panel")?.classList.add("hidden");
          msPanel.classList.remove("hidden");
        }
      });

      leftToolbar.appendChild(multiBtn);
      overlay?.appendChild(msPanel);
    }

    if (models.length > 1) {
      const { button, panel } = createModelPanel(instance, models);
      leftToolbar.appendChild(button);
      overlay?.appendChild(panel);
    }

    overlay?.appendChild(leftToolbar);

    // Expose for debugging
    (window as unknown as Record<string, unknown>).__instance = instance;

    console.log("Model loaded successfully");

    // Initialize bouwvolgorde player + filter panel
    initBouwvolgorde(instance, projectId, overlay, leftToolbar);
  } catch (error) {
    console.error("Model load failed:", error);
    showMessage(getHost() ? "Model kon niet worden geladen." : "Model kon niet worden geladen. Controleer de stream URL.");
  }
}



/**
 * The SuperCloud workplace: the projects of the Speckle server of the environment, or the IFC file from Docs the
 * workplace was opened with. Another model starts the viewer afresh (see `restartWith`).
 */
async function startWorkplace(host: SiteHost): Promise<void> {
  const intent = readIntent();
  const speckle = host.speckle;
  const fileId = intent ? intent.file : host.initialFileId;
  const toProjects = speckle ? () => restartWith({ overview: true }) : null;

  const tools: WorkplaceTool[] = [];
  if (speckle) {
    tools.push(
      {
        name: "monty_list_projects",
        description: "De projecten op de Speckle-server van de omgeving (id, naam, omschrijving); query zoekt in de naam, cursor geeft de volgende bladzijde.",
        inputSchema: { type: "object", properties: { query: { type: "string" }, cursor: { type: "string" } }, additionalProperties: false },
        run: async (args) => {
          const page = await speckle.projects({ query: String(args.query ?? ""), cursor: args.cursor ? String(args.cursor) : undefined });
          return { total: page.total, cursor: page.cursor, projects: page.projects.map(({ id, name, description }) => ({ id, name, description })) };
        },
      },
      {
        name: "monty_open_project",
        description: "Open een project van de Speckle-server in de viewer (alleen lezen). De viewer start opnieuw met dat project.",
        inputSchema: { type: "object", required: ["id"], properties: { id: { type: "string" } }, additionalProperties: false },
        run: (args) => {
          window.setTimeout(() => restartWith({ project: String(args.id) }), 0);
          return { opening: String(args.id) };
        },
      }
    );
  }
  tools.push({
    name: "monty_list_models",
    description: "De IFC-bestanden in de Docs-map van de viewer (id en naam).",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
    run: async () => (await host.list()).filter((file) => /\.(ifc|ifczip)$/i.test(file.name)),
  });
  tools.push({
    name: "monty_open_model",
    description: "Open een IFC-bestand uit Docs in de viewer (alleen lezen; het bestand verandert niet). De viewer start opnieuw met dat bestand.",
    inputSchema: { type: "object", required: ["id"], properties: { id: { type: "string" } }, additionalProperties: false },
    run: (args) => {
      window.setTimeout(() => restartWith({ file: String(args.id) }), 0);
      return { opening: String(args.id) };
    },
  });
  installWorkplaceTools(tools);

  // After a reload the intent decides; on the first start a link to a project (`initialProject`) opens it directly.
  const projectId = intent ? intent.project : speckle?.initialProject;
  if (projectId && speckle) {
    const id = projectId;
    await startViewer(
      async (viewer, onProgress) => {
        const project = await speckle.model(id);
        document.title = project.name;
        return loadObjects(viewer, project.models.map((model) => ({ name: model.name, objectId: model.object })), project.objects, onProgress);
      },
      id,
      toProjects
    );
    return;
  }

  if (fileId) {
    await startViewer(
      async (viewer, onProgress) => {
        const file = await host.open(fileId);
        document.title = file.name;
        const { ifcToObjects } = await import("./core/ifc-convert");
        const bytes = file.bytes instanceof Uint8Array ? file.bytes : new Uint8Array(file.bytes);
        const { rootId, objects } = await ifcToObjects(bytes, file.name);
        return loadObjects(viewer, [{ name: file.name, objectId: rootId }], objects, onProgress);
      },
      "",
      toProjects
    );
    return;
  }

  document.getElementById("loading-indicator")?.remove();
  if (speckle) {
    document.body.appendChild(createProjectBrowser(speckle, (id) => restartWith({ project: id })));
  } else {
    showMessage("Open een IFC-bestand uit Docs om het hier te bekijken.");
  }
}

async function initBouwvolgorde(
  instance: ViewerInstance,
  projectId: string,
  overlay: HTMLElement | null,
  leftToolbar: HTMLElement
): Promise<void> {
  try {
    console.log("Bouwvolgorde: parsing marks...");
    const mapping = await parseMarks(instance.viewer, projectId);

    if (mapping.phases.length === 0) {
      console.log("Bouwvolgorde: no Mark properties found, skipping player");
      return;
    }

    // Share mapping with property panel, context menu and filter-state
    setPropertyPanelMapping(mapping);
    setContextMenuMapping(mapping);
    setFilterStateMapping(mapping);

    const manager = new PhaseManager(instance, mapping);
    const timeline = createTimelineUI(manager);
    overlay?.appendChild(timeline);

    // Add bouwvolgorde toggle to left toolbar
    const bvToggle = document.createElement("button");
    bvToggle.className = "left-tb-btn";
    bvToggle.id = "bouwvolgorde-toggle";
    bvToggle.title = "Bouwvolgorde";
    bvToggle.classList.add("active");
    bvToggle.innerHTML = `<svg viewBox="0 0 20 20" fill="currentColor" width="20" height="20"><path d="M6.3 2.841A1.5 1.5 0 004 4.11v11.78a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z"/></svg>`;
    bvToggle.addEventListener("click", () => {
      const isVisible = !timeline.classList.contains("hidden");
      timeline.classList.toggle("hidden", isVisible);
      bvToggle.classList.toggle("active", !isVisible);
    });
    leftToolbar.appendChild(bvToggle);

    // Add filter button to left toolbar, panel to overlay
    const { button: filterBtn, panel: filterPanel } = createFilterPanel(instance, mapping);
    leftToolbar.appendChild(filterBtn);
    overlay?.appendChild(filterPanel);

    console.log(`Bouwvolgorde: player ready with ${mapping.phases.length} phases`);
  } catch (error) {
    console.error("Bouwvolgorde init failed:", error);
  }
}

function showMessage(text: string): void {
  const loading = document.getElementById("loading-indicator");
  if (loading) {
    loading.textContent = text;
    loading.classList.add("error");
  }
}

main();
