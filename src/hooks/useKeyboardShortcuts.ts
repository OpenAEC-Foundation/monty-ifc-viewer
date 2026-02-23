import { onMount, onCleanup } from 'solid-js';
import {
  selectedExpressIds, hiddenExpressIds,
  setSelectedExpressIds, setHiddenExpressIds,
  setIsolatedExpressIds, setSelectedValueIndices,
  setLastClickedIndex,
} from '@/state/selection-store';
import { setPropertyPanelOpen, setContextMenuVisible } from '@/state/ui-store';

interface KeyboardActions {
  togglePlay: () => void;
  goToPrev: () => void;
  goToNext: () => void;
  goToFirst: () => void;
  goToLast: () => void;
}

export function useKeyboardShortcuts(actions: KeyboardActions) {
  const handleKeyDown = (e: KeyboardEvent) => {
    if ((e.target as HTMLElement).tagName === 'INPUT' || (e.target as HTMLElement).tagName === 'SELECT') return;

    if (e.key === ' ') {
      e.preventDefault();
      actions.togglePlay();
    } else if (e.key === 'ArrowLeft') {
      actions.goToPrev();
    } else if (e.key === 'ArrowRight') {
      actions.goToNext();
    } else if (e.key === 'Home') {
      actions.goToFirst();
    } else if (e.key === 'End') {
      actions.goToLast();
    } else if (e.key === 'Escape') {
      // Clear all highlight modes
      setSelectedValueIndices(new Set<number>());
      setSelectedExpressIds(new Set<number>());
      setIsolatedExpressIds(new Set<number>());
      setHiddenExpressIds(new Set<number>());
      setLastClickedIndex(null);
      setPropertyPanelOpen(false);
      setContextMenuVisible(false);
    } else if (e.key === 'Delete' || e.key === 'Backspace') {
      const sel = selectedExpressIds();
      if (sel.size > 0) {
        const hidden = new Set(hiddenExpressIds());
        for (const id of sel) hidden.add(id);
        setHiddenExpressIds(hidden);
        setSelectedExpressIds(new Set<number>());
        setContextMenuVisible(false);
      }
    }
  };

  onMount(() => {
    document.addEventListener('keydown', handleKeyDown);
  });

  onCleanup(() => {
    document.removeEventListener('keydown', handleKeyDown);
  });
}
