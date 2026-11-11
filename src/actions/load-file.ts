import { initIFC, openModel } from '@/services/ifc-service';
import { extractGeometry } from '@/services/geometry-service';
import { extractAllProperties, sortParameters } from '@/services/property-service';
import * as ifcStore from '@/state/ifc-store';
import * as uiStore from '@/state/ui-store';
import * as viewer from '@/state/viewer-store';
import { selectParameter } from './select-parameter';
import { prepareForNewDocument, addDocument } from '@/state/document-store';
import { t } from '@/state/locale-store';
import { chooseFromDocs, getSiteHost, type SiteHost } from '@/supercloud/siteHost';

let ifcInitialized = false;

async function ensureIfcInit(): Promise<void> {
  if (!ifcInitialized) {
    await initIFC();
    ifcInitialized = true;
  }
}

/** Read an IFC model from bytes (a dropped file, a URL or Docs in the SuperCloud). */
export async function loadBytes(data: Uint8Array, name: string): Promise<void> {
  await ensureIfcInit();
  prepareForNewDocument();

  uiStore.showLoading(t('loading.parse'));
  const modelId = openModel(data);
  ifcStore.setModelId(modelId);

  ifcStore.setFileName(name);
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
  addDocument(name);
}

async function withErrors(message: string, read: () => Promise<{ data: Uint8Array; name: string }>): Promise<void> {
  uiStore.setShowDropZone(false);
  uiStore.showLoading(message);
  try {
    const { data, name } = await read();
    await loadBytes(data, name);
  } catch (error: any) {
    console.error('Error loading IFC:', error);
    uiStore.showStatus(t('status.error') + error.message, 'error');
    uiStore.hideLoading();
    uiStore.setShowDropZone(true);
  }
}

export function loadFile(file: File): Promise<void> {
  return withErrors(t('loading.file'), async () => ({ data: new Uint8Array(await file.arrayBuffer()), name: file.name }));
}

export function loadFromUrl(url: string, fileName?: string): Promise<void> {
  return withErrors(t('loading.download'), async () => {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return { data: new Uint8Array(await response.arrayBuffer()), name: fileName || url.split('/').pop() || 'model.ifc' };
  });
}

/** Open an IFC file from Docs (SuperCloud workplace). */
export function loadFromHost(host: SiteHost, id: string): Promise<void> {
  return withErrors(t('loading.file'), async () => {
    const file = await host.open(id);
    const data = file.bytes instanceof Uint8Array ? file.bytes : new Uint8Array(file.bytes);
    return { data, name: file.name };
  });
}

/** Open: in the workplace choose from Docs, otherwise the file dialog. */
export async function chooseFile(openDialog: () => void): Promise<void> {
  const host = getSiteHost();
  if (!host) {
    openDialog();
    return;
  }
  const file = await chooseFromDocs(host, t('docs.choose'), t('docs.none'));
  if (file) await loadFromHost(host, file.id);
}
