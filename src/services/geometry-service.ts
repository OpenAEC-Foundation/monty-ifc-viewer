import * as THREE from 'three';
import {
  WebIFC,
  getLineIDsWithType,
  getLine,
  getFlatMesh,
  getGeometry,
  getVertexArray,
  getIndexArray,
} from './ifc-service';
import { getBaseMaterial } from './material-service';

const PRODUCT_TYPES = [
  WebIFC.IFCWALL, WebIFC.IFCWALLSTANDARDCASE,
  WebIFC.IFCSLAB, WebIFC.IFCSLABELEMENTEDCASE, WebIFC.IFCSLABSTANDARDCASE,
  WebIFC.IFCCOLUMN, WebIFC.IFCCOLUMNSTANDARDCASE,
  WebIFC.IFCBEAM, WebIFC.IFCBEAMSTANDARDCASE,
  WebIFC.IFCWINDOW, WebIFC.IFCDOOR,
  WebIFC.IFCROOF, WebIFC.IFCSTAIR, WebIFC.IFCSTAIRFLIGHT,
  WebIFC.IFCRAILING, WebIFC.IFCPLATE,
  WebIFC.IFCMEMBER, WebIFC.IFCMEMBERSTANDARDCASE,
  WebIFC.IFCFURNISHINGELEMENT, WebIFC.IFCBUILDINGELEMENTPROXY,
  WebIFC.IFCOPENINGELEMENT, WebIFC.IFCCOVERING, WebIFC.IFCFOOTING,
  WebIFC.IFCCURTAINWALL, WebIFC.IFCFLOWSEGMENT, WebIFC.IFCFLOWTERMINAL,
  WebIFC.IFCDISCRETEACCESSORY, WebIFC.IFCMECHANICALFASTENER,
];

export interface GeometryResult {
  meshes: Map<number, THREE.Mesh[]>;
  allMeshes: THREE.Mesh[];
  elementMaterials: Map<number, string>;
}

function buildElementMaterialMap(modelId: number): Map<number, string> {
  const elementMaterialMap = new Map<number, string>();
  try {
    const matRels = getLineIDsWithType(modelId, WebIFC.IFCRELASSOCIATESMATERIAL);
    for (let i = 0; i < matRels.size(); i++) {
      const relId = matRels.get(i);
      try {
        const rel = getLine(modelId, relId);
        let materialName: string | null = null;

        if (rel.RelatingMaterial?.value) {
          const mat = getLine(modelId, rel.RelatingMaterial.value);
          materialName = mat.Name?.value ?? null;

          if (!materialName && mat.ForLayerSet?.value) {
            const layerSet = getLine(modelId, mat.ForLayerSet.value);
            if (layerSet.MaterialLayers) {
              for (const layerRef of layerSet.MaterialLayers) {
                const layer = getLine(modelId, layerRef.value);
                if (layer.Material?.value) {
                  const layerMat = getLine(modelId, layer.Material.value);
                  if (layerMat.Name?.value) { materialName = layerMat.Name.value; break; }
                }
              }
            }
          }

          if (!materialName && mat.MaterialConstituents) {
            for (const constRef of mat.MaterialConstituents) {
              const constituent = getLine(modelId, constRef.value);
              if (constituent.Material?.value) {
                const constMat = getLine(modelId, constituent.Material.value);
                if (constMat.Name?.value) { materialName = constMat.Name.value; break; }
              }
            }
          }
        }

        if (materialName && rel.RelatedObjects) {
          for (const objRef of rel.RelatedObjects) {
            elementMaterialMap.set(objRef.value, materialName);
          }
        }
      } catch (_) { /* skip bad relation */ }
    }
  } catch (_) { /* skip if no material relations */ }
  return elementMaterialMap;
}

export function extractGeometry(
  modelId: number,
  scene: THREE.Scene,
): GeometryResult {
  const meshes = new Map<number, THREE.Mesh[]>();
  const allMeshes: THREE.Mesh[] = [];
  const elementMaterials = new Map<number, string>();
  const elementMaterialMap = buildElementMaterialMap(modelId);

  for (const ifcType of PRODUCT_TYPES) {
    try {
      const ids = getLineIDsWithType(modelId, ifcType);

      for (let i = 0; i < ids.size(); i++) {
        const expressId = ids.get(i);
        const materialName = elementMaterialMap.get(expressId) || '';
        elementMaterials.set(expressId, materialName);

        const baseMaterial = getBaseMaterial(materialName);

        try {
          const geometry = getFlatMesh(modelId, expressId);
          const placedGeometries = geometry.geometries;
          const meshList: THREE.Mesh[] = [];

          for (let j = 0; j < placedGeometries.size(); j++) {
            const pg = placedGeometries.get(j);
            const geomData = getGeometry(modelId, pg.geometryExpressID);

            const verts = getVertexArray(geomData.GetVertexData(), geomData.GetVertexDataSize());
            const indices = getIndexArray(geomData.GetIndexData(), geomData.GetIndexDataSize());

            if (indices.length === 0) continue;

            const positions = new Float32Array(verts.length / 2);
            const normals = new Float32Array(verts.length / 2);

            for (let k = 0; k < verts.length; k += 6) {
              const idx = (k / 6) * 3;
              positions[idx] = verts[k];
              positions[idx + 1] = verts[k + 1];
              positions[idx + 2] = verts[k + 2];
              normals[idx] = verts[k + 3];
              normals[idx + 1] = verts[k + 4];
              normals[idx + 2] = verts[k + 5];
            }

            const threeGeom = new THREE.BufferGeometry();
            threeGeom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
            threeGeom.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
            threeGeom.setIndex(new THREE.BufferAttribute(indices, 1));

            const material = baseMaterial.clone();
            const mesh = new THREE.Mesh(threeGeom, material);

            const matrix = new THREE.Matrix4();
            matrix.fromArray(pg.flatTransformation);
            mesh.applyMatrix4(matrix);

            mesh.userData.expressId = expressId;
            mesh.userData.materialName = materialName;

            scene.add(mesh);
            allMeshes.push(mesh);
            meshList.push(mesh);
          }

          if (meshList.length > 0) {
            meshes.set(expressId, meshList);
          }
        } catch (_) { /* skip bad geometry */ }
      }
    } catch (_) { /* skip missing type */ }
  }

  return { meshes, allMeshes, elementMaterials };
}
