import { isLoading, loadingText } from '@/state/ui-store';
import styles from '@/styles/components/LoadingOverlay.module.css';

export default function LoadingOverlay() {
  return (
    <div class={`${styles.loadingOverlay} ${!isLoading() ? styles.hidden : ''}`}>
      <div class={styles.loader} />
      <div class={styles.loaderText}>{loadingText()}</div>
      <div class={styles.loaderProgress} />
    </div>
  );
}
