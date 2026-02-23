import { For } from 'solid-js';
import { parameterOptions, selectedParameter, setSelectedParameter, uniqueValuesCount, objectsWithParamCount } from '@/state/ifc-store';
import { selectParameter } from '@/actions/select-parameter';
import { t } from '@/state/locale-store';
import styles from '@/styles/components/ParameterSelect.module.css';
import sidebarStyles from '@/styles/components/Sidebar.module.css';

export default function ParameterSelect() {
  const handleChange = (e: Event) => {
    const val = (e.target as HTMLSelectElement).value;
    setSelectedParameter(val);
    if (val) selectParameter(val);
  };

  return (
    <div class={sidebarStyles.section}>
      <h3 class={sidebarStyles.sectionTitle}>{t('param.title')}</h3>
      <div class={styles.paramSelectWrapper}>
        <select
          class={styles.paramSelect}
          value={selectedParameter()}
          onChange={handleChange}
          disabled={parameterOptions().length === 0}
        >
          <option value="">
            {parameterOptions().length === 0 ? t('param.noFile') : t('param.select')}
          </option>
          <For each={parameterOptions()}>
            {([path, info]) => (
              <option value={path}>{path} ({info.values.size} {t('param.values')})</option>
            )}
          </For>
        </select>
      </div>
      <div class={styles.paramStats}>
        <div class={styles.paramStat}>
          <span>{t('param.uniqueValues')}</span>
          <strong>{uniqueValuesCount()}</strong>
        </div>
        <div class={styles.paramStat}>
          <span>{t('param.elements')}</span>
          <strong>{objectsWithParamCount()}</strong>
        </div>
      </div>
    </div>
  );
}
