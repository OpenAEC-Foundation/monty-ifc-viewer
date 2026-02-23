import { speed, setSpeed } from '@/state/player-store';
import { t } from '@/state/locale-store';
import styles from '@/styles/components/SpeedControl.module.css';

export default function SpeedControl() {
  const handleInput = (e: InputEvent) => {
    setSpeed(parseInt((e.target as HTMLInputElement).value));
  };

  const displaySpeed = () => (speed() / 1000).toFixed(1) + 's';

  return (
    <div class={styles.speedControl}>
      <label>{t('speed.label')}</label>
      <input
        type="range"
        class={styles.speedSlider}
        min="200"
        max="3000"
        value={speed()}
        step="100"
        onInput={handleInput}
      />
      <span class={styles.speedValue}>{displaySpeed()}</span>
    </div>
  );
}
