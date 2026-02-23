import { useThreeCanvas } from '@/hooks/useThreeCanvas';
import { useFileDrop } from '@/hooks/useFileDrop';
import { loadFile } from '@/actions/load-file';
import DropZone from './DropZone';
import LoadingOverlay from './LoadingOverlay';
import SelectionInfo from './SelectionInfo';
import ViewerControls from './ViewerControls';
import PropertyPanel from './PropertyPanel';
import ContextMenu from './ContextMenu';
import styles from '@/styles/components/ViewerContainer.module.css';

export default function ThreeCanvas() {
  let canvasRef: HTMLCanvasElement | undefined;
  let containerRef: HTMLDivElement | undefined;

  const { zoomFit, resetView } = useThreeCanvas(
    () => canvasRef,
    () => containerRef,
  );

  useFileDrop(() => containerRef, (file) => loadFile(file));

  return (
    <div ref={containerRef} class={styles.viewerContainer}>
      <canvas ref={canvasRef} class={styles.viewerCanvas} />
      <DropZone />
      <LoadingOverlay />
      <SelectionInfo />
      <ViewerControls onZoomFit={zoomFit} onResetView={resetView} />
      <PropertyPanel />
      <ContextMenu />
    </div>
  );
}
