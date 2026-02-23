import { Show, For } from 'solid-js';
import { propertyPanelOpen, setPropertyPanelOpen, propertyPanelData } from '@/state/ui-store';
import { t } from '@/state/locale-store';
import styles from '@/styles/components/PropertyPanel.module.css';

interface GroupedProps {
  [groupKey: string]: { label: () => string; props: Record<string, any> };
}

function groupProperties(data: Record<string, any>): GroupedProps {
  const groups: GroupedProps = {
    basic: { label: () => t('props.basic'), props: {} },
    type: { label: () => t('props.type'), props: {} },
    material: { label: () => t('props.material'), props: {} },
    dimensions: { label: () => t('props.dimensions'), props: {} },
    parameters: { label: () => t('props.parameters'), props: {} },
  };

  for (const [key, value] of Object.entries(data)) {
    if (value === null || value === undefined || value === '') continue;

    const lowerKey = key.toLowerCase();

    if (lowerKey.includes('name') || lowerKey.includes('tag') || lowerKey === 'ifc type' || lowerKey === 'expressid') {
      groups.basic.props[key] = value;
    } else if (lowerKey.includes('type')) {
      groups.type.props[key] = value;
    } else if (lowerKey.includes('material') || lowerKey.includes('materiaal')) {
      groups.material.props[key] = value;
    } else if (
      lowerKey.includes('length') || lowerKey.includes('width') || lowerKey.includes('height') ||
      lowerKey.includes('area') || lowerKey.includes('volume') || lowerKey.includes('count') ||
      lowerKey.includes('lengte') || lowerKey.includes('breedte') || lowerKey.includes('hoogte')
    ) {
      groups.dimensions.props[key] = value;
    } else {
      groups.parameters.props[key] = value;
    }
  }

  return groups;
}

function formatValue(value: any): string {
  if (typeof value === 'number') {
    return Number.isInteger(value) ? String(value) : value.toFixed(3);
  }
  return String(value);
}

export default function PropertyPanel() {
  const groups = () => {
    const data = propertyPanelData();
    if (!data) return null;
    return groupProperties(data);
  };

  const visibleGroups = () => {
    const g = groups();
    if (!g) return [];
    return Object.entries(g).filter(([, group]) => Object.keys(group.props).length > 0);
  };

  return (
    <div class={`${styles.propertyPanel} ${propertyPanelOpen() ? styles.open : ''}`}>
      <div class={styles.propertyPanelHeader}>
        <h3>{'\u{1F4CB}'} {t('props.title')}</h3>
        <button class={styles.propertyPanelClose} onClick={() => setPropertyPanelOpen(false)}>{'\u2715'}</button>
      </div>
      <div class={styles.propertyPanelContent}>
        <Show when={propertyPanelData()} fallback={
          <div class={styles.propertyEmpty}>
            <div class={styles.propertyEmptyIcon}>{'\u{1F446}'}</div>
            <p>{t('props.selectElement')}</p>
          </div>
        }>
          <Show when={visibleGroups().length > 0} fallback={
            <div class={styles.propertyEmpty}>
              <div class={styles.propertyEmptyIcon}>{'\u{1F4ED}'}</div>
              <p>{t('props.noProperties')}</p>
            </div>
          }>
            <For each={visibleGroups()}>
              {([, group]) => (
                <div class={styles.propertyGroup}>
                  <div class={styles.propertyGroupTitle}>{(group as any).label()}</div>
                  <For each={Object.entries((group as any).props as Record<string, any>)}>
                    {([key, value]) => (
                      <div class={styles.propertyRow}>
                        <span class={styles.propertyName}>{key.split(' \u2192 ').pop()}</span>
                        <span class={styles.propertyValue}>{formatValue(value)}</span>
                      </div>
                    )}
                  </For>
                </div>
              )}
            </For>
          </Show>
        </Show>
      </div>
    </div>
  );
}
