import { closeModel } from '@/services/ifc-service';
import { modelId } from '@/state/ifc-store';
import { resetIfcStore } from '@/state/ifc-store';
import { clearAllSelection } from '@/state/selection-store';
import { resetPlayerStore } from '@/state/player-store';
import { resetViewerStore } from '@/state/viewer-store';
import * as uiStore from '@/state/ui-store';

export function resetAll(): void {
  const mid = modelId();
  if (mid !== null) {
    closeModel(mid);
  }

  resetViewerStore();
  resetIfcStore();
  clearAllSelection();
  resetPlayerStore();

  uiStore.setShowDropZone(true);
  uiStore.setShowStatusBar(false);
  uiStore.setShowViewerControls(false);
  uiStore.setPropertyPanelOpen(false);
  uiStore.setContextMenuVisible(false);
}
