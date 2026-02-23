import { createSignal, onMount, onCleanup, Show, For } from 'solid-js';
import { theme, setTheme, THEME_OPTIONS, type Theme } from '@/state/theme-store';
import { t } from '@/state/locale-store';
import type { TranslationKey } from '@/i18n/translations';
import styles from '@/styles/components/ThemeSelector.module.css';

export default function ThemeSelector() {
  const [open, setOpen] = createSignal(false);
  let containerRef!: HTMLDivElement;

  const handleClickOutside = (e: MouseEvent) => {
    if (open() && !containerRef.contains(e.target as Node)) {
      setOpen(false);
    }
  };

  onMount(() => {
    document.addEventListener('mousedown', handleClickOutside);
  });

  onCleanup(() => {
    document.removeEventListener('mousedown', handleClickOutside);
  });

  return (
    <div ref={containerRef} style={{ position: 'relative', height: '100%' }}>
      <button
        class={styles.trigger}
        onClick={() => setOpen((v) => !v)}
        title={t('theme.change')}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="5" />
          <line x1="12" y1="1" x2="12" y2="3" />
          <line x1="12" y1="21" x2="12" y2="23" />
          <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
          <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
          <line x1="1" y1="12" x2="3" y2="12" />
          <line x1="21" y1="12" x2="23" y2="12" />
          <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
          <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
        </svg>
      </button>

      <Show when={open()}>
        <div class={styles.popover}>
          <div class={styles.popoverTitle}>{t('theme.title')}</div>
          <For each={THEME_OPTIONS}>
            {(opt) => (
              <button
                class={styles.option}
                onClick={() => {
                  setTheme(opt.id);
                  setOpen(false);
                }}
              >
                <span class={styles.swatch} style={{ background: opt.swatch }} />
                <span class={styles.label}>{t(opt.labelKey as TranslationKey)}</span>
                <Show when={theme() === opt.id}>
                  <svg class={styles.check} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </Show>
              </button>
            )}
          </For>
        </div>
      </Show>
    </div>
  );
}
