import * as THREE from 'three';
import { readSpeckle, sequenceParameter, type SpeckleElement } from '@/services/speckle-service';
import { extractParams, sortParameters } from '@/services/property-service';
import { getBaseMaterial } from '@/services/material-service';
import * as ifcStore from '@/state/ifc-store';
import * as uiStore from '@/state/ui-store';
import * as viewer from '@/state/viewer-store';
import { selectParameter } from './select-parameter';
import { prepareForNewDocument, addDocument } from '@/state/document-store';
import { t } from '@/state/locale-store';
import type { ParameterInfo } from '@/types/ifc';
import type { SiteHost } from '@/supercloud/siteHost';

function addMeshes(elements: SpeckleElement[], scene: THREE.Scene) {
  const meshes = new Map<number, THREE.Mesh[]>();
  const allMeshes: THREE.Mesh[] = [];
  for (const element of elements) {
    const baseMaterial = getBaseMaterial(element.material);
    const list: THREE.Mesh[] = [];
    for (const part of element.meshes) {
      const indexed = new THREE.BufferGeometry();
      indexed.setAttribute('position', new THREE.BufferAttribute(part.positions, 3));
      indexed.setIndex(new THREE.BufferAttribute(part.indices, 1));
      // Own vertices per face: sharp edges on sawn timber instead of normals smoothed over the corners.
      const geometry = indexed.toNonIndexed();
      indexed.dispose();
      geometry.computeVertexNormals();
      const mesh = new THREE.Mesh(geometry, baseMaterial.clone());
      mesh.userData.expressId = element.id;
      mesh.userData.materialName = element.material;
      scene.add(mesh);
      allMeshes.push(mesh);
      list.push(mesh);
    }
    meshes.set(element.id, list);
  }
  return { meshes, allMeshes };
}

/** Open a project from the Speckle server of the environment (SuperCloud workplace). */
export async function loadSpeckleProject(host: SiteHost, projectId: string): Promise<void> {
  if (!host.speckle) return;
  uiStore.setShowDropZone(false);
  uiStore.setShowProjects(false);
  uiStore.showLoading(t('loading.project'));
  try {
    const project = await host.speckle.model(projectId);
    uiStore.showLoading(t('loading.geometry'));
    const elements = readSpeckle(project.objects, project.models.map((model) => model.object));
    if (!elements.length) throw new Error(t('projects.empty'));

    prepareForNewDocument();
    ifcStore.setModelId(null);
    ifcStore.setFileName(project.name);
    ifcStore.setHasFile(true);

    const result = addMeshes(elements, viewer.scene!);
    viewer.setMeshes(result.meshes);
    viewer.setAllMeshes(result.allMeshes);

    // A project opens with the whole building in view.
    const box = new THREE.Box3();
    for (const mesh of result.allMeshes) box.expandByObject(mesh);
    const controller = viewer.cameraController;
    if (controller && !box.isEmpty()) {
      const size = box.getSize(new THREE.Vector3());
      box.getCenter(controller.target);
      controller.spherical.radius = Math.max(size.x, size.y, size.z) * 1.5;
      controller.updateCamera();
    }

    uiStore.showLoading(t('loading.properties'));
    const elementProperties = new Map<number, Record<string, any>>();
    const allParameters = new Map<string, ParameterInfo>();
    for (const element of elements) {
      elementProperties.set(element.id, element.properties);
      extractParams(element.properties, '', element.id, allParameters);
    }
    ifcStore.setElements(elements.map((element) => ({ expressId: element.id, properties: element.properties })));
    ifcStore.setElementProperties(elementProperties);
    ifcStore.setAllParameters(allParameters);

    const sorted = sortParameters(allParameters);
    ifcStore.setParameterOptions(sorted);
    const sequence = sequenceParameter(sorted.map(([path]) => path));
    if (sequence) {
      ifcStore.setSelectedParameter(sequence);
      selectParameter(sequence);
    }

    uiStore.hideLoading();
    uiStore.showStatus(`${elements.length} ${t('status.loaded')}`, 'success');
    uiStore.setShowStatusBar(true);
    uiStore.setShowViewerControls(true);
    addDocument(project.name);
  } catch (error: any) {
    console.error('Error loading project:', error);
    uiStore.showStatus(t('status.error') + (error?.message ?? ''), 'error');
    uiStore.hideLoading();
    if (ifcStore.hasFile()) uiStore.setShowProjects(true);
    else uiStore.setShowDropZone(true);
  }
}
