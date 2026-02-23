import type { MaterialType } from '@/types/ifc';

export function classifyMaterial(materialName: string): MaterialType {
  const matLower = materialName.toLowerCase();

  if (
    matLower.includes('holz') || matLower.includes('wood') || matLower.includes('hout') ||
    matLower.includes('timber') || matLower.includes('clt') || matLower.includes('glulam') ||
    matLower === 'isi'
  ) {
    return 'wood';
  }
  if (matLower === 'nsi') return 'nsi';
  if (matLower.includes('beton') || matLower.includes('concrete')) return 'concrete';
  if (matLower.includes('stahl') || matLower.includes('steel') || matLower.includes('staal')) return 'steel';
  if (matLower.includes('glas') || matLower.includes('glass')) return 'glass';
  return 'default';
}
