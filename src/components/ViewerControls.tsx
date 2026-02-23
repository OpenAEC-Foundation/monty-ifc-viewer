import { Show } from 'solid-js';
import { showViewerControls } from '@/state/ui-store';
import { hasResetAction, setSelectedExpressIds, setSelectedValueIndices, setIsolatedExpressIds, setHiddenExpressIds, setLastClickedIndex } from '@/state/selection-store';
import { setPropertyPanelOpen } from '@/state/ui-store';
import { t } from '@/state/locale-store';
import styles from '@/styles/components/ViewerControls.module.css';

interface Props {
  onZoomFit: () => void;
  onResetView: () => void;
}

export default function ViewerControls(props: Props) {
  function clearHighlightMode() {
    setSelectedValueIndices(new Set<number>());
    setSelectedExpressIds(new Set<number>());
    setIsolatedExpressIds(new Set<number>());
    setHiddenExpressIds(new Set<number>());
    setLastClickedIndex(null);
    setPropertyPanelOpen(false);
  }

  return (
    <Show when={showViewerControls()}>
      <div class={styles.viewerControls}>
        <button onClick={props.onZoomFit} title={t('viewer.zoomAll')}>{'\u{1F50D}'}</button>
        <button onClick={props.onResetView} title={t('viewer.resetCamera')}>{'\u{1F3E0}'}</button>
        <button
          class={hasResetAction() ? styles.hasReset : ''}
          onClick={clearHighlightMode}
          title={t('viewer.resetView')}
        >{'\u21A9\uFE0F'}</button>
      </div>
    </Show>
  );
}
