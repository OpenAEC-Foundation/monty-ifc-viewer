import { Show } from 'solid-js';
import {
  contextMenuVisible, setContextMenuVisible,
  contextMenuPos, contextMenuTarget,
  setPropertyPanelOpen, setPropertyPanelData,
} from '@/state/ui-store';
import {
  selectedExpressIds, setSelectedExpressIds,
  setIsolatedExpressIds, setHiddenExpressIds,
  hiddenExpressIds,
} from '@/state/selection-store';
import { elementProperties } from '@/state/ifc-store';
import { t } from '@/state/locale-store';
import styles from '@/styles/components/ContextMenu.module.css';

export default function ContextMenu() {
  function contextShowProperties() {
    const target = contextMenuTarget();
    if (target !== null) {
      const props = elementProperties.get(target);
      setPropertyPanelData(props || null);
      setPropertyPanelOpen(true);
    }
    setContextMenuVisible(false);
  }

  function contextIsolate() {
    const sel = selectedExpressIds();
    if (sel.size > 0) {
      setIsolatedExpressIds(new Set(sel));
    }
    setContextMenuVisible(false);
  }

  function contextHide() {
    const sel = selectedExpressIds();
    if (sel.size > 0) {
      const hidden = new Set(hiddenExpressIds());
      for (const id of sel) hidden.add(id);
      setHiddenExpressIds(hidden);
      setSelectedExpressIds(new Set<number>());
    }
    setContextMenuVisible(false);
  }

  function contextShowAll() {
    setHiddenExpressIds(new Set<number>());
    setIsolatedExpressIds(new Set<number>());
    setContextMenuVisible(false);
  }

  return (
    <div
      data-context-menu
      class={`${styles.contextMenu} ${contextMenuVisible() ? styles.visible : ''}`}
      style={{ left: `${contextMenuPos().x}px`, top: `${contextMenuPos().y}px` }}
    >
      <div class={styles.contextMenuItem} onClick={contextShowProperties}>
        <span class={styles.icon}>{'\u{1F4CB}'}</span>
        <span>{t('context.properties')}</span>
      </div>
      <div class={styles.contextMenuItem} onClick={contextIsolate}>
        <span class={styles.icon}>{'\u{1F3AF}'}</span>
        <span>{t('context.isolate')}</span>
      </div>
      <div class={styles.contextMenuItem} onClick={contextHide}>
        <span class={styles.icon}>{'\u{1F441}\u200D\u{1F5E8}'}</span>
        <span>{t('context.hide')}</span>
      </div>
      <div class={styles.contextMenuDivider} />
      <div class={styles.contextMenuItem} onClick={contextShowAll}>
        <span class={styles.icon}>{'\u{1F441}'}</span>
        <span>{t('context.showAll')}</span>
      </div>
    </div>
  );
}
