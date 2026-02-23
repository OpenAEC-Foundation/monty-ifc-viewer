import { currentIndex, sortedValues, valueGroups } from '@/state/player-store';
import { t } from '@/state/locale-store';
import styles from '@/styles/components/ProgressBar.module.css';

interface Props {
  onSeek: (index: number) => void;
}

export default function ProgressBar(props: Props) {
  const total = () => sortedValues().length;
  const current = () => currentIndex() + 1;

  const visibleCount = () => {
    let count = 0;
    const vals = sortedValues();
    const groups = valueGroups();
    for (let i = 0; i <= currentIndex() && i < vals.length; i++) {
      count += groups.get(vals[i])?.length || 0;
    }
    return count;
  };

  const totalObjects = () => {
    let count = 0;
    for (const ids of valueGroups().values()) count += ids.length;
    return count;
  };

  const progressPercent = () => total() ? `${(current() / total()) * 100}%` : '0%';

  const handleClick = (e: MouseEvent) => {
    if (sortedValues().length === 0) return;
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const percent = (e.clientX - rect.left) / rect.width;
    props.onSeek(Math.floor(percent * sortedValues().length) - 1);
  };

  return (
    <div class={styles.progressSection}>
      <div class={styles.progressBar} onClick={handleClick}>
        <div class={styles.progressFill} style={{ width: progressPercent() }} />
      </div>
      <div class={styles.progressStats}>
        <span><span>{visibleCount()}</span> {t('progress.visible')}</span>
        <span><span>{totalObjects()}</span> {t('progress.total')}</span>
      </div>
    </div>
  );
}
