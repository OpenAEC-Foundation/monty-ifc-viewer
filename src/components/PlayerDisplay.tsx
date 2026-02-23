import { currentParamLabel } from '@/state/ifc-store';
import { currentIndex, sortedValues, valueGroups } from '@/state/player-store';
import { t } from '@/state/locale-store';
import styles from '@/styles/components/PlayerDisplay.module.css';

export default function PlayerDisplay() {
  const currentValue = () => {
    const idx = currentIndex();
    const vals = sortedValues();
    return idx >= 0 && idx < vals.length ? vals[idx] : '-';
  };

  const subtitle = () => {
    const idx = currentIndex();
    if (idx < 0) return t('player.pressPlay');
    const val = currentValue();
    const count = valueGroups().get(val)?.length || 0;
    return `${count} ${t('player.elements')}`;
  };

  return (
    <div class={styles.playerDisplay}>
      <div class={styles.playerLabel}>{currentParamLabel() || t('ifc.currentValue')}</div>
      <div class={styles.playerValue}>{currentValue()}</div>
      <div class={styles.playerSubtitle}>{subtitle()}</div>
    </div>
  );
}
