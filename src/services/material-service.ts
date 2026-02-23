import * as THREE from 'three';
import type { MaterialType } from '@/types/ifc';
import { classifyMaterial } from '@/utils/material-classifier';

export const baseMaterials = {
  default: new THREE.MeshLambertMaterial({ color: 0x94A3B8, side: THREE.DoubleSide }),
  wood: new THREE.MeshLambertMaterial({ color: 0xC4A574, side: THREE.DoubleSide }),
  nsi: new THREE.MeshLambertMaterial({ color: 0x8B7355, side: THREE.DoubleSide }),
  concrete: new THREE.MeshLambertMaterial({ color: 0x9CA3AF, side: THREE.DoubleSide }),
  steel: new THREE.MeshLambertMaterial({ color: 0x6B7280, side: THREE.DoubleSide }),
  glass: new THREE.MeshLambertMaterial({ color: 0x93C5FD, transparent: true, opacity: 0.4, side: THREE.DoubleSide }),
} as const;

export const visibleColors: Record<MaterialType, number> = {
  wood: 0xD4A574, nsi: 0x9B8365, concrete: 0xADB5BD,
  steel: 0x7B8794, glass: 0xA3D5FD, default: 0x94A3B8,
};

export const activeColors: Record<MaterialType, number> = {
  wood: 0xE8C088, nsi: 0xAB9375, concrete: 0xBDC5CD,
  steel: 0x8B98A4, glass: 0xB3E5FD, default: 0x10B981,
};

export const SELECTED_COLOR = 0xFBBF24;

export function getBaseMaterial(materialName: string): THREE.MeshLambertMaterial {
  const type = classifyMaterial(materialName);
  return baseMaterials[type];
}

export interface VisibilityState {
  hiddenExpressIds: Set<number>;
  selectedExpressIds: Set<number>;
  isolatedExpressIds: Set<number>;
  currentIndex: number;
  sortedValues: string[];
  valueGroups: Map<string, number[]>;
}

export function updateMeshVisibility(
  meshes: Map<number, THREE.Mesh[]>,
  state: VisibilityState,
): void {
  const { hiddenExpressIds, selectedExpressIds, isolatedExpressIds, currentIndex, sortedValues, valueGroups } = state;

  const hasIsolation = isolatedExpressIds.size > 0;

  const allParameterIds = new Set<number>();
  for (const ids of valueGroups.values()) {
    ids.forEach(id => allParameterIds.add(id));
  }

  const playerVisibleIds = new Set<number>();
  for (let i = 0; i <= currentIndex && i < sortedValues.length; i++) {
    const ids = valueGroups.get(sortedValues[i]) || [];
    ids.forEach(id => playerVisibleIds.add(id));
  }

  for (const [expressId, meshList] of meshes) {
    const isHidden = hiddenExpressIds.has(expressId);
    const isSelected = selectedExpressIds.has(expressId);
    const isIsolated = hasIsolation && isolatedExpressIds.has(expressId);
    const isInParameter = allParameterIds.has(expressId);
    const isPlayerVisible = playerVisibleIds.has(expressId);

    for (const mesh of meshList) {
      const mat = mesh.material as THREE.MeshLambertMaterial;
      if (isHidden) {
        mesh.visible = false;
        continue;
      }

      mesh.visible = true;
      const matName = (mesh.userData.materialName || '').toLowerCase();
      const matType = classifyMaterial(matName);

      if (hasIsolation) {
        if (isIsolated) {
          mat.color.setHex(isSelected ? SELECTED_COLOR : activeColors[matType]);
          mat.transparent = matType === 'glass';
          mat.opacity = matType === 'glass' ? 0.6 : 1;
        } else {
          mat.color.setHex(0x475569);
          mat.transparent = true;
          mat.opacity = 0.08;
        }
      } else if (isSelected) {
        mat.color.setHex(SELECTED_COLOR);
        mat.transparent = false;
        mat.opacity = 1;
      } else if (currentIndex >= 0) {
        if (!isInParameter) {
          mat.color.setHex(0x475569);
          mat.transparent = true;
          mat.opacity = 0.1;
        } else if (isPlayerVisible) {
          mat.color.setHex(activeColors[matType]);
          mat.transparent = matType === 'glass';
          mat.opacity = matType === 'glass' ? 0.6 : 1;
        } else {
          mat.color.setHex(0x64748B);
          mat.transparent = true;
          mat.opacity = 0.15;
        }
      } else {
        mat.color.setHex(visibleColors[matType]);
        mat.transparent = matType === 'glass';
        mat.opacity = matType === 'glass' ? 0.4 : 1;
      }
    }
  }
}
