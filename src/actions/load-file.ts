import { initIFC, openModel, getIfcApi } from '@/services/ifc-service';
import { extractGeometry } from '@/services/geometry-service';
import { extractAllProperties, sortParameters } from '@/services/property-service';
import * as ifcStore from '@/state/ifc-store';
import * as uiStore from '@/state/ui-store';
import * as viewer from '@/state/viewer-store';
import { selectParameter } from './select-parameter';
import { prepareForNewDocument, addDocument } from '@/state/document-store';
import { t } from '@/state/locale-store';

let ifcInitialized = false;

async function ensureIfcInit(): Promise<void> {
  if (!ifcInitialized) {
    await initIFC();
    ifcInitialized = true;
  }
}

export async function loadFile(file: File): Promise<void> {
  uiStore.setShowDropZone(false);
  uiStore.showLoading(t('loading.file'));

  try {
    await ensureIfcInit();
    prepareForNewDocument();

    const buffer = await file.arrayBuffer();
    const data = new Uint8Array(buffer);

    uiStore.showLoading(t('loading.parse'));
    const modelId = openModel(data);
    ifcStore.setModelId(modelId);

    ifcStore.setFileName(file.name);
    ifcStore.setHasFile(true);

    uiStore.showLoading(t('loading.geometry'));
    const result = extractGeometry(modelId, viewer.scene!);
    viewer.setMeshes(result.meshes);
    viewer.setAllMeshes(result.allMeshes);

    uiStore.showLoading(t('loading.properties'));
    const propResult = extractAllProperties(modelId, result.meshes);
    ifcStore.setElements(propResult.elements);
    ifcStore.setElementProperties(propResult.elementProperties);
    ifcStore.setAllParameters(propResult.allParameters);

    const sorted = sortParameters(propResult.allParameters);
    ifcStore.setParameterOptions(sorted);

    // Auto-select 'Mark' parameter if available
    const markParam = sorted.find(([p]) => p.toLowerCase().includes('mark'));
    if (markParam) {
      ifcStore.setSelectedParameter(markParam[0]);
      selectParameter(markParam[0]);
    }

    uiStore.hideLoading();
    uiStore.showStatus(`${propResult.elements.length} ${t('status.loaded')}`, 'success');
    uiStore.setShowStatusBar(true);
    uiStore.setShowViewerControls(true);
    addDocument(file.name);

  } catch (error: any) {
    console.error('Error loading IFC:', error);
    uiStore.showStatus(t('status.error') + error.message, 'error');
    uiStore.hideLoading();
    uiStore.setShowDropZone(true);
  }
}

export async function loadFromUrl(url: string, fileName?: string): Promise<void> {
  uiStore.setShowDropZone(false);
  uiStore.showLoading(t('loading.download'));

  try {
    await ensureIfcInit();
    prepareForNewDocument();

    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const buffer = await response.arrayBuffer();
    const data = new Uint8Array(buffer);

    uiStore.showLoading(t('loading.parse'));
    const modelId = openModel(data);
    ifcStore.setModelId(modelId);

    ifcStore.setFileName(fileName || url.split('/').pop() || 'model.ifc');
    ifcStore.setHasFile(true);

    uiStore.showLoading(t('loading.geometry'));
    const result = extractGeometry(modelId, viewer.scene!);
    viewer.setMeshes(result.meshes);
    viewer.setAllMeshes(result.allMeshes);

    uiStore.showLoading(t('loading.properties'));
    const propResult = extractAllProperties(modelId, result.meshes);
    ifcStore.setElements(propResult.elements);
    ifcStore.setElementProperties(propResult.elementProperties);
    ifcStore.setAllParameters(propResult.allParameters);

    const sorted = sortParameters(propResult.allParameters);
    ifcStore.setParameterOptions(sorted);

    const markParam = sorted.find(([p]) => p.toLowerCase().includes('mark'));
    if (markParam) {
      ifcStore.setSelectedParameter(markParam[0]);
      selectParameter(markParam[0]);
    }

    uiStore.hideLoading();
    uiStore.showStatus(`${propResult.elements.length} ${t('status.loaded')}`, 'success');
    uiStore.setShowStatusBar(true);
    uiStore.setShowViewerControls(true);
    addDocument(fileName || url.split('/').pop() || 'model.ifc');

  } catch (error: any) {
    console.error('Error loading IFC from URL:', error);
    uiStore.showStatus(t('status.error') + error.message, 'error');
    uiStore.hideLoading();
    uiStore.setShowDropZone(true);
  }
}
