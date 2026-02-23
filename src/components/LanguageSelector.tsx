import { createSignal, onMount, onCleanup, Show, For } from 'solid-js';
import { locale, changeLocale, LOCALE_OPTIONS, t } from '@/state/locale-store';
import styles from '@/styles/components/LanguageSelector.module.css';

export default function LanguageSelector() {
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
        title={t('lang.change')}
      >
        <span class={styles.triggerLabel}>{locale().toUpperCase()}</span>
      </button>

      <Show when={open()}>
        <div class={styles.popover}>
          <div class={styles.popoverTitle}>{t('lang.title')}</div>
          <For each={LOCALE_OPTIONS}>
            {(opt) => (
              <button
                class={styles.option}
                onClick={() => {
                  changeLocale(opt.id);
                  setOpen(false);
                }}
              >
                <span class={styles.flag}>{opt.flag}</span>
                <span class={styles.label}>{opt.label}</span>
                <Show when={locale() === opt.id}>
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
