import { createSignal } from 'solid-js';
import * as THREE from 'three';
import type { IFCElement, ParameterInfo } from '@/types/ifc';
import type { SphericalCoords } from '@/types/viewer';

import * as ifcStore from './ifc-store';
import * as viewer from './viewer-store';
import * as selection from './selection-store';
import * as player from './player-store';
import * as uiStore from './ui-store';
import { closeModel } from '@/services/ifc-service';

// --- Types ---

export interface DocumentSnapshot {
  // ifc-store signals
  fileName: string;
  hasFile: boolean;
  modelId: number | null;
  parameterOptions: [string, ParameterInfo][];
  selectedParameter: string;
  uniqueValuesCount: string;
  objectsWithParamCount: string;
  currentParamLabel: string;
  valuesHeaderText: string;
  // ifc-store non-reactive
  elements: IFCElement[];
  elementProperties: Map<number, Record<string, any>>;
  allParameters: Map<string, ParameterInfo>;
  // viewer-store
  meshes: Map<number, THREE.Mesh[]>;
  allMeshes: THREE.Mesh[];
  // camera
  cameraTarget: THREE.Vector3;
  cameraSpherical: SphericalCoords;
  // selection-store
  selectedExpressIds: Set<number>;
  hiddenExpressIds: Set<number>;
  isolatedExpressIds: Set<number>;
  selectedValueIndices: Set<number>;
  lastClickedIndex: number | null;
  // player-store
  currentIndex: number;
  isPlaying: boolean;
  speed: number;
  sortedValues: string[];
  valueGroups: Map<string, number[]>;
  controlsEnabled: boolean;
}

export interface DocumentTab {
  id: string;
  fileName: string;
  snapshot: DocumentSnapshot;
}

// --- Signals ---

export const [documents, setDocuments] = createSignal<DocumentTab[]>([]);
export const [activeDocumentId, setActiveDocumentId] = createSignal<string | null>(null);

// --- Snapshot helpers ---

function captureSnapshot(): DocumentSnapshot {
  const cc = viewer.cameraController;
  return {
    // ifc-store signals
    fileName: ifcStore.fileName(),
    hasFile: ifcStore.hasFile(),
    modelId: ifcStore.modelId(),
    parameterOptions: ifcStore.parameterOptions(),
    selectedParameter: ifcStore.selectedParameter(),
    uniqueValuesCount: ifcStore.uniqueValuesCount(),
    objectsWithParamCount: ifcStore.objectsWithParamCount(),
    currentParamLabel: ifcStore.currentParamLabel(),
    valuesHeaderText: ifcStore.valuesHeaderText(),
    // ifc-store non-reactive
    elements: ifcStore.elements,
    elementProperties: ifcStore.elementProperties,
    allParameters: ifcStore.allParameters,
    // viewer-store
    meshes: viewer.meshes,
    allMeshes: viewer.allMeshes,
    // camera
    cameraTarget: cc ? cc.target.clone() : new THREE.Vector3(),
    cameraSpherical: cc ? { ...cc.spherical } : { theta: Math.PI / 4, phi: Math.PI / 4, radius: 50 },
    // selection-store
    selectedExpressIds: new Set(selection.selectedExpressIds()),
    hiddenExpressIds: new Set(selection.hiddenExpressIds()),
    isolatedExpressIds: new Set(selection.isolatedExpressIds()),
    selectedValueIndices: new Set(selection.selectedValueIndices()),
    lastClickedIndex: selection.lastClickedIndex(),
    // player-store
    currentIndex: player.currentIndex(),
    isPlaying: player.isPlaying(),
    speed: player.speed(),
    sortedValues: player.sortedValues(),
    valueGroups: player.valueGroups(),
    controlsEnabled: player.controlsEnabled(),
  };
}

function restoreSnapshot(snap: DocumentSnapshot): void {
  // ifc-store signals
  ifcStore.setFileName(snap.fileName);
  ifcStore.setHasFile(snap.hasFile);
  ifcStore.setModelId(snap.modelId);
  ifcStore.setParameterOptions(snap.parameterOptions);
  ifcStore.setSelectedParameter(snap.selectedParameter);
  ifcStore.setUniqueValuesCount(snap.uniqueValuesCount);
  ifcStore.setObjectsWithParamCount(snap.objectsWithParamCount);
  ifcStore.setCurrentParamLabel(snap.currentParamLabel);
  ifcStore.setValuesHeaderText(snap.valuesHeaderText);
  // ifc-store non-reactive
  ifcStore.setElements(snap.elements);
  ifcStore.setElementProperties(snap.elementProperties);
  ifcStore.setAllParameters(snap.allParameters);
  // viewer-store
  viewer.setMeshes(snap.meshes);
  viewer.setAllMeshes(snap.allMeshes);
  viewer.setHoveredMesh(null);
  // camera
  const cc = viewer.cameraController;
  if (cc) {
    cc.target.copy(snap.cameraTarget);
    cc.spherical.theta = snap.cameraSpherical.theta;
    cc.spherical.phi = snap.cameraSpherical.phi;
    cc.spherical.radius = snap.cameraSpherical.radius;
    cc.updateCamera();
  }
  // selection-store
  selection.setSelectedExpressIds(snap.selectedExpressIds);
  selection.setHiddenExpressIds(snap.hiddenExpressIds);
  selection.setIsolatedExpressIds(snap.isolatedExpressIds);
  selection.setSelectedValueIndices(snap.selectedValueIndices);
  selection.setLastClickedIndex(snap.lastClickedIndex);
  // player-store
  player.setCurrentIndex(snap.currentIndex);
  player.setIsPlaying(snap.isPlaying);
  player.setSpeed(snap.speed);
  player.setSortedValues(snap.sortedValues);
  player.setValueGroups(snap.valueGroups);
  player.setControlsEnabled(snap.controlsEnabled);
}

function setMeshesVisible(snap: DocumentSnapshot, visible: boolean): void {
  for (const mesh of snap.allMeshes) {
    mesh.visible = visible;
  }
}

// --- Public API ---

let nextId = 0;

/**
 * Called BEFORE a new file load starts writing to stores.
 * Snapshots the current active doc and hides its meshes.
 */
export function prepareForNewDocument(): void {
  const activeId = activeDocumentId();
  if (!activeId) return;

  const docs = documents();
  const active = docs.find(d => d.id === activeId);
  if (active) {
    active.snapshot = captureSnapshot();
    setMeshesVisible(active.snapshot, false);
    setDocuments([...docs]);
  }
}

/**
 * Called AFTER a new file has finished loading into the stores.
 * Registers the new document and makes it active.
 */
export function addDocument(fileName: string): void {
  const id = `doc-${++nextId}`;
  const snapshot = captureSnapshot();
  const tab: DocumentTab = { id, fileName, snapshot };
  setDocuments([...documents(), tab]);
  setActiveDocumentId(id);
}

/**
 * Switch to a different open document.
 */
export function switchDocument(id: string): void {
  const activeId = activeDocumentId();
  if (activeId === id) return;

  const docs = documents();
  const current = docs.find(d => d.id === activeId);
  const target = docs.find(d => d.id === id);
  if (!target) return;

  // Snapshot & hide current
  if (current) {
    current.snapshot = captureSnapshot();
    setMeshesVisible(current.snapshot, false);
  }

  // Restore & show target
  restoreSnapshot(target.snapshot);
  setMeshesVisible(target.snapshot, true);

  setDocuments([...docs]);
  setActiveDocumentId(id);
}

/**
 * Close a document tab. Disposes its meshes and removes it.
 */
export function closeDocument(id: string): void {
  const docs = documents();
  const idx = docs.findIndex(d => d.id === id);
  if (idx === -1) return;

  const doc = docs[idx];
  const isActive = activeDocumentId() === id;

  // Dispose meshes from scene
  const scene = viewer.scene;
  if (scene) {
    for (const mesh of doc.snapshot.allMeshes) {
      scene.remove(mesh);
      mesh.geometry.dispose();
      if (Array.isArray(mesh.material)) {
        mesh.material.forEach(m => m.dispose());
      } else {
        mesh.material.dispose();
      }
    }
  }

  // Close the IFC model
  if (doc.snapshot.modelId !== null) {
    closeModel(doc.snapshot.modelId);
  }

  // Remove from list
  const remaining = docs.filter(d => d.id !== id);
  setDocuments(remaining);

  if (isActive) {
    if (remaining.length > 0) {
      // Switch to neighbor: prefer the tab at the same index, else the previous one
      const nextIdx = Math.min(idx, remaining.length - 1);
      const next = remaining[nextIdx];
      setActiveDocumentId(next.id);
      restoreSnapshot(next.snapshot);
      setMeshesVisible(next.snapshot, true);
    } else {
      // No documents left — reset to empty state
      setActiveDocumentId(null);
      ifcStore.resetIfcStore();
      selection.clearAllSelection();
      player.resetPlayerStore();
      viewer.setMeshes(new Map());
      viewer.setAllMeshes([]);
      viewer.setHoveredMesh(null);

      uiStore.setShowDropZone(true);
      uiStore.setShowStatusBar(false);
      uiStore.setShowViewerControls(false);
      uiStore.setPropertyPanelOpen(false);
      uiStore.setContextMenuVisible(false);
    }
  }
}
