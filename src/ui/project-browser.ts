import type { HostProject, SpeckleHost } from "../core/host";

const PREVIEWS_AT_ONCE = 3;

/**
 * The projects of the Speckle server of the environment (SuperCloud workplace): search, a picture per project, a click
 * opens the model.
 */
export function createProjectBrowser(speckle: SpeckleHost, open: (projectId: string) => void): HTMLElement {
  const root = document.createElement("div");
  root.id = "project-browser";
  root.innerHTML = `
    <div class="pb-bar">
      <h1 class="pb-title">Projecten</h1>
      <input class="pb-search" type="search" placeholder="Zoek op projectnummer of naam" />
      <span class="pb-count"></span>
    </div>
    <p class="pb-message"></p>
    <div class="pb-grid"></div>
    <button class="pb-more" hidden>Meer laden</button>`;
  const search = root.querySelector<HTMLInputElement>(".pb-search")!;
  const count = root.querySelector<HTMLElement>(".pb-count")!;
  const message = root.querySelector<HTMLElement>(".pb-message")!;
  const grid = root.querySelector<HTMLElement>(".pb-grid")!;
  const more = root.querySelector<HTMLButtonElement>(".pb-more")!;

  let query = "";
  let cursor: string | null = null;
  let shown = 0;
  let request = 0;
  let timer: number | undefined;

  // Pictures only for the cards in view, a few at a time: the preview service renders them on request.
  const waiting: Array<{ project: HostProject; picture: HTMLElement }> = [];
  let running = 0;
  const nextPreview = (): void => {
    while (running < PREVIEWS_AT_ONCE && waiting.length) {
      const { project, picture } = waiting.shift()!;
      const version = project.models[0]?.version;
      if (!version || !picture.isConnected) continue;
      running++;
      speckle
        .preview(project.id, version)
        .catch(() => null)
        .then((data) => {
          if (data && picture.isConnected) {
            const img = document.createElement("img");
            img.alt = "";
            img.src = data;
            picture.replaceChildren(img);
          }
          running--;
          nextPreview();
        });
    }
  };
  const observer = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      observer.unobserve(entry.target);
      const project = cards.get(entry.target);
      if (project) waiting.push({ project, picture: entry.target.querySelector<HTMLElement>(".pb-picture")! });
    }
    nextPreview();
  });
  const cards = new WeakMap<Element, HostProject>();

  const card = (project: HostProject): HTMLElement => {
    const button = document.createElement("button");
    button.className = "pb-card";
    button.disabled = project.models.length === 0;
    const picture = document.createElement("div");
    picture.className = "pb-picture";
    const text = document.createElement("div");
    text.className = "pb-text";
    const name = document.createElement("div");
    name.className = "pb-name";
    name.textContent = project.name;
    const description = document.createElement("div");
    description.className = "pb-description";
    description.textContent = project.description;
    text.append(name, description);
    button.append(picture, text);
    button.addEventListener("click", () => open(project.id));
    cards.set(button, project);
    observer.observe(button);
    return button;
  };

  const load = async (append: boolean): Promise<void> => {
    const mine = ++request;
    message.textContent = "Projecten laden...";
    more.hidden = true;
    try {
      const page = await speckle.projects({ query, cursor: append && cursor ? cursor : undefined });
      if (mine !== request) return;
      if (!append) {
        grid.replaceChildren();
        waiting.length = 0;
        shown = 0;
      }
      grid.append(...page.projects.map(card));
      shown += page.projects.length;
      cursor = page.cursor;
      count.textContent = page.total > 0 ? `${shown} van ${page.total}` : "";
      message.textContent = shown === 0 ? "Geen projecten gevonden." : "";
      more.hidden = !cursor;
    } catch (error) {
      if (mine !== request) return;
      message.textContent = (error as Error)?.message || "De projecten konden niet geladen worden.";
    }
  };

  search.addEventListener("input", () => {
    query = search.value.trim();
    window.clearTimeout(timer);
    timer = window.setTimeout(() => void load(false), 300);
  });
  more.addEventListener("click", () => void load(true));
  void load(false);
  return root;
}
