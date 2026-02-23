import { selectedExpressIds } from '@/state/selection-store';
import { t } from '@/state/locale-store';
import styles from '@/styles/components/SelectionInfo.module.css';

export default function SelectionInfo() {
  const count = () => selectedExpressIds().size;

  return (
    <div class={`${styles.selectionInfo} ${count() > 0 ? styles.visible : ''}`}>
      <div class={styles.selectionInfoText}>
        <span class={styles.icon}>{'\u{1F3AF}'}</span>
        <span>{count()} {count() !== 1 ? t('selection.elements') : t('selection.element')} {t('selection.selected')}</span>
      </div>
    </div>
  );
}
