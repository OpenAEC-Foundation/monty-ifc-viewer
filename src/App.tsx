import Header from '@/components/Header';
import Toolbar from '@/components/Toolbar';
import DocumentBar from '@/components/DocumentBar';
import Sidebar from '@/components/Sidebar';
import ThreeCanvas from '@/components/ThreeCanvas';
import StatusBar from '@/components/StatusBar';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { usePlayer } from '@/hooks/usePlayer';
import sidebarStyles from '@/styles/components/Sidebar.module.css';

export default function App() {
  const player = usePlayer();

  useKeyboardShortcuts({
    togglePlay: player.togglePlay,
    goToPrev: player.goToPrev,
    goToNext: player.goToNext,
    goToFirst: player.goToFirst,
    goToLast: player.goToLast,
  });

  return (
    <>
      <Header />
      <DocumentBar />
      <div class={sidebarStyles.mainContainer}>
        <Sidebar />
        <ThreeCanvas />
      </div>
      <StatusBar />
    </>
  );
}
