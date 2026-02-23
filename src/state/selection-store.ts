import { createSignal } from 'solid-js';

export const [selectedExpressIds, setSelectedExpressIds] = createSignal<Set<number>>(new Set());
export const [hiddenExpressIds, setHiddenExpressIds] = createSignal<Set<number>>(new Set());
export const [isolatedExpressIds, setIsolatedExpressIds] = createSignal<Set<number>>(new Set());
export const [selectedValueIndices, setSelectedValueIndices] = createSignal<Set<number>>(new Set());
export const [lastClickedIndex, setLastClickedIndex] = createSignal<number | null>(null);

export function clearAllSelection(): void {
  setSelectedExpressIds(new Set<number>());
  setHiddenExpressIds(new Set<number>());
  setIsolatedExpressIds(new Set<number>());
  setSelectedValueIndices(new Set<number>());
  setLastClickedIndex(null);
}

export function hasResetAction(): boolean {
  return (
    selectedExpressIds().size > 0 ||
    isolatedExpressIds().size > 0 ||
    hiddenExpressIds().size > 0 ||
    selectedValueIndices().size > 0
  );
}
