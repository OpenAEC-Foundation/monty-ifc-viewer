import { isPlaying, controlsEnabled } from '@/state/player-store';
import { t } from '@/state/locale-store';
import styles from '@/styles/components/PlayerControls.module.css';

interface Props {
  onFirst: () => void;
  onPrev: () => void;
  onTogglePlay: () => void;
  onNext: () => void;
  onLast: () => void;
}

export default function PlayerControls(props: Props) {
  const disabled = () => !controlsEnabled();

  return (
    <div class={styles.playerControls}>
      <button class={styles.playerBtn} disabled={disabled()} onClick={props.onFirst} title={t('player.first')}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M6 6h2v12H6zm3.5 6l8.5 6V6z"/></svg>
      </button>
      <button class={styles.playerBtn} disabled={disabled()} onClick={props.onPrev} title={t('player.prev')}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/></svg>
      </button>
      <button
        class={`${styles.playerBtn} ${styles.playBtn} ${isPlaying() ? styles.playing : ''}`}
        disabled={disabled()}
        onClick={props.onTogglePlay}
        title={t('player.play')}
      >
        {isPlaying() ? (
          <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor">
            <rect x="6" y="4" width="4" height="16"/>
            <rect x="14" y="4" width="4" height="16"/>
          </svg>
        ) : (
          <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor">
            <path d="M8 5v14l11-7z"/>
          </svg>
        )}
      </button>
      <button class={styles.playerBtn} disabled={disabled()} onClick={props.onNext} title={t('player.next')}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/></svg>
      </button>
      <button class={styles.playerBtn} disabled={disabled()} onClick={props.onLast} title={t('player.last')}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z"/></svg>
      </button>
    </div>
  );
}
