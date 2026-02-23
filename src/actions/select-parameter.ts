import { allParameters } from '@/state/ifc-store';
import * as ifcStore from '@/state/ifc-store';
import * as playerStore from '@/state/player-store';
import { setSelectedValueIndices, setIsolatedExpressIds } from '@/state/selection-store';
import { naturalSort } from '@/utils/value-sorter';
import { t } from '@/state/locale-store';

export function selectParameter(path: string): void {
  playerStore.setIsPlaying(false);
  playerStore.setCurrentIndex(-1);
  setSelectedValueIndices(new Set<number>());
  setIsolatedExpressIds(new Set<number>());

  const param = allParameters.get(path);
  if (!param) {
    playerStore.setControlsEnabled(false);
    return;
  }

  ifcStore.setUniqueValuesCount(String(param.values.size));

  let totalObjects = 0;
  for (const ids of param.objectIds.values()) totalObjects += ids.length;
  ifcStore.setObjectsWithParamCount(String(totalObjects));

  const paramName = path.split(' \u2192 ').pop() || path;
  ifcStore.setCurrentParamLabel(`${t('ifc.currentParam')} ${paramName}`);
  ifcStore.setValuesHeaderText(`${paramName} ${t('ifc.paramValues')}`);

  playerStore.setValueGroups(param.objectIds);
  const sorted = Array.from(param.values).sort(naturalSort);
  playerStore.setSortedValues(sorted);
  playerStore.setControlsEnabled(true);
}
