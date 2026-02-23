import ParameterSelect from './ParameterSelect';
import PlayerDisplay from './PlayerDisplay';
import PlayerControls from './PlayerControls';
import ProgressBar from './ProgressBar';
import SpeedControl from './SpeedControl';
import ValuesList from './ValuesList';
import { usePlayer } from '@/hooks/usePlayer';
import styles from '@/styles/components/Sidebar.module.css';

export default function Sidebar() {
  const player = usePlayer();

  return (
    <aside class={styles.sidebar}>
      <ParameterSelect />

      <div class={styles.section}>
        <PlayerDisplay />
        <PlayerControls
          onFirst={player.goToFirst}
          onPrev={player.goToPrev}
          onTogglePlay={player.togglePlay}
          onNext={player.goToNext}
          onLast={player.goToLast}
        />
        <ProgressBar onSeek={player.goToValue} />
        <SpeedControl />
      </div>

      <ValuesList />
    </aside>
  );
}
