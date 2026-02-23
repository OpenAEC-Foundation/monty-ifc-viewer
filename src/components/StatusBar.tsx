import { Show } from 'solid-js';
import { showStatusBar, statusText, statusType } from '@/state/ui-store';
import { t } from '@/state/locale-store';
import styles from '@/styles/components/StatusBar.module.css';

export default function StatusBar() {
  const dotClass = () => {
    const type = statusType();
    if (type === 'loading') return `${styles.statusDot} ${styles.loading}`;
    if (type === 'error') return `${styles.statusDot} ${styles.error}`;
    return styles.statusDot;
  };

  const displayText = () => statusText() || t('status.ready');

  return (
    <div class={styles.statusBar}>
      <Show when={showStatusBar()}>
        <div class={dotClass()} />
        <span>{displayText()}</span>
      </Show>
    </div>
  );
}
