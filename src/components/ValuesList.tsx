import { For, Show } from 'solid-js';
import { sortedValues, valueGroups } from '@/state/player-store';
import {
  selectedValueIndices, setSelectedValueIndices,
  setIsolatedExpressIds, setSelectedExpressIds,
  lastClickedIndex, setLastClickedIndex,
  setHiddenExpressIds,
} from '@/state/selection-store';
import { setPropertyPanelOpen } from '@/state/ui-store';
import { valuesHeaderText } from '@/state/ifc-store';
import { t } from '@/state/locale-store';
import styles from '@/styles/components/ValuesList.module.css';

export default function ValuesList() {
  const vals = () => sortedValues();
  const groups = () => valueGroups();

  function clearHighlightMode() {
    setSelectedValueIndices(new Set<number>());
    setSelectedExpressIds(new Set<number>());
    setIsolatedExpressIds(new Set<number>());
    setHiddenExpressIds(new Set<number>());
    setLastClickedIndex(null);
    setPropertyPanelOpen(false);
  }

  function handleClick(index: number, event: MouseEvent) {
    const selected = selectedValueIndices();
    const isAlreadySelected = selected.has(index);

    if (isAlreadySelected && !event.ctrlKey && !event.metaKey && !event.shiftKey) {
      clearHighlightMode();
      return;
    }

    let newSelection: Set<number>;

    if (event.shiftKey && lastClickedIndex() !== null) {
      const start = Math.min(lastClickedIndex()!, index);
      const end = Math.max(lastClickedIndex()!, index);

      newSelection = event.ctrlKey || event.metaKey ? new Set(selected) : new Set<number>();
      for (let i = start; i <= end; i++) newSelection.add(i);
    } else if (event.ctrlKey || event.metaKey) {
      newSelection = new Set(selected);
      if (newSelection.has(index)) {
        newSelection.delete(index);
      } else {
        newSelection.add(index);
      }
      setLastClickedIndex(index);
    } else {
      newSelection = new Set([index]);
      setLastClickedIndex(index);
    }

    setSelectedValueIndices(newSelection);

    // Build isolation set from selected values
    const isoIds = new Set<number>();
    const currentVals = vals();
    const currentGroups = groups();
    for (const idx of newSelection) {
      const value = currentVals[idx];
      const ids = currentGroups.get(value) || [];
      ids.forEach(id => isoIds.add(id));
    }
    setIsolatedExpressIds(isoIds);
  }

  return (
    <div class={styles.valuesSection}>
      <div class={styles.valuesHeader}>
        <h3>{valuesHeaderText() || t('ifc.values')}</h3>
        <span class={styles.valuesCount}>{vals().length}</span>
      </div>
      <div class={styles.valuesList}>
        <Show when={vals().length > 0} fallback={
          <div class={styles.emptyState}>
            <div class={styles.emptyStateIcon}>{'\u{1F4C1}'}</div>
            <p>{t('values.loadFile')}</p>
          </div>
        }>
          <For each={vals()}>
            {(val, i) => {
              const count = () => groups().get(val)?.length || 0;
              const isSelected = () => selectedValueIndices().has(i());

              return (
                <div
                  class={`${styles.valueItem} ${isSelected() ? styles.selected : ''}`}
                  onClick={(e) => handleClick(i(), e)}
                >
                  <div class={styles.valueIcon}>{i() + 1}</div>
                  <div class={styles.valueInfo}>
                    <div class={styles.valueName} title={val}>{val}</div>
                    <div class={styles.valueMeta}>{count()} {count() !== 1 ? t('selection.elements') : t('selection.element')}</div>
                  </div>
                  <div class={styles.valueStatus} />
                </div>
              );
            }}
          </For>
        </Show>
      </div>
    </div>
  );
}
