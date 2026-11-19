import { For, Show, createSignal, onCleanup, onMount } from 'solid-js';
import { showProjects, setShowProjects, setShowDropZone } from '@/state/ui-store';
import { hasFile } from '@/state/ifc-store';
import { loadSpeckleProject } from '@/actions/load-speckle';
import { getSiteHost, type SpeckleProject } from '@/supercloud/siteHost';
import { t } from '@/state/locale-store';
import styles from '@/styles/components/ProjectBrowser.module.css';

const PREVIEWS_AT_ONCE = 3;

/** The projects of the Speckle server of the environment: search, a picture per project, a click opens the model. */
export default function ProjectBrowser() {
  const host = getSiteHost();
  const speckle = host?.speckle;
  const [projects, setProjects] = createSignal<SpeckleProject[]>([]);
  const [total, setTotal] = createSignal(0);
  const [cursor, setCursor] = createSignal<string | null>(null);
  const [busy, setBusy] = createSignal(false);
  const [failed, setFailed] = createSignal('');
  const [previews, setPreviews] = createSignal<Record<string, string | null>>({});

  let query = '';
  let request = 0;
  let searchTimer: number | undefined;
  let observer: IntersectionObserver | undefined;
  const waiting: SpeckleProject[] = [];
  const asked = new Set<string>();
  let running = 0;

  const nextPreview = () => {
    while (speckle && running < PREVIEWS_AT_ONCE && waiting.length) {
      const project = waiting.shift()!;
      const version = project.models[0]?.version;
      if (!version) continue;
      running++;
      speckle
        .preview(project.id, version)
        .catch(() => null)
        .then((picture) => {
          setPreviews((old) => ({ ...old, [project.id]: picture }));
          running--;
          nextPreview();
        });
    }
  };

  const watch = (element: HTMLElement, project: SpeckleProject) => {
    (element as any).__project = project;
    observer?.observe(element);
  };

  const load = async (more: boolean) => {
    if (!speckle) return;
    const mine = ++request;
    setBusy(true);
    setFailed('');
    try {
      const page = await speckle.projects({ query, cursor: more ? cursor() ?? undefined : undefined });
      if (mine !== request) return;
      setProjects(more ? [...projects(), ...page.projects] : page.projects);
      setTotal(page.total);
      setCursor(page.cursor);
    } catch (error: any) {
      if (mine === request) setFailed(error?.message || t('projects.failed'));
    } finally {
      if (mine === request) setBusy(false);
    }
  };

  const search = (value: string) => {
    query = value.trim();
    window.clearTimeout(searchTimer);
    searchTimer = window.setTimeout(() => load(false), 300);
  };

  onMount(() => {
    if (!speckle) return;
    observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        const project = (entry.target as any).__project as SpeckleProject | undefined;
        if (!entry.isIntersecting || !project || asked.has(project.id)) continue;
        asked.add(project.id);
        observer?.unobserve(entry.target);
        waiting.push(project);
      }
      nextPreview();
    });
    load(false);
  });
  onCleanup(() => {
    observer?.disconnect();
    window.clearTimeout(searchTimer);
  });

  const toFile = () => {
    setShowProjects(false);
    if (!hasFile()) setShowDropZone(true);
  };

  return (
    <Show when={speckle && showProjects()}>
      <div class={styles.browser}>
        <div class={styles.bar}>
          <h2 class={styles.title}>{t('projects.title')}</h2>
          <input
            class={styles.search}
            type="search"
            placeholder={t('projects.search')}
            onInput={(e) => search(e.currentTarget.value)}
          />
          <span class={styles.count}>
            <Show when={total() > 0}>{projects().length} / {total()}</Show>
          </span>
          <button class={styles.barBtn} onClick={toFile}>
            {hasFile() ? t('projects.close') : t('projects.openFile')}
          </button>
        </div>
        <Show when={failed()}>
          <p class={styles.message}>{failed()}</p>
        </Show>
        <Show when={!failed() && !busy() && projects().length === 0}>
          <p class={styles.message}>{t('projects.none')}</p>
        </Show>
        <div class={styles.grid}>
          <For each={projects()}>
            {(project) => (
              <button
                class={styles.card}
                ref={(element) => watch(element, project)}
                disabled={!project.models.length}
                onClick={() => host && loadSpeckleProject(host, project.id)}
              >
                <div class={styles.picture}>
                  <Show when={previews()[project.id]} fallback={<span class={styles.placeholder}>{'\u{1F3E0}'}</span>}>
                    <img src={previews()[project.id]!} alt="" loading="lazy" />
                  </Show>
                </div>
                <div class={styles.cardText}>
                  <div class={styles.cardName}>{project.name}</div>
                  <div class={styles.cardDescription}>{project.description}</div>
                </div>
              </button>
            )}
          </For>
        </div>
        <Show when={cursor() && !busy()}>
          <button class={styles.more} onClick={() => load(true)}>{t('projects.more')}</button>
        </Show>
        <Show when={busy()}>
          <p class={styles.message}>{t('projects.loading')}</p>
        </Show>
      </div>
    </Show>
  );
}
