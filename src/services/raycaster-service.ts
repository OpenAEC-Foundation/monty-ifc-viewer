import * as THREE from 'three';

const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

export function updateMouse(clientX: number, clientY: number, rect: DOMRect): void {
  mouse.x = ((clientX - rect.left) / rect.width) * 2 - 1;
  mouse.y = -((clientY - rect.top) / rect.height) * 2 + 1;
}

export function pickMesh(
  camera: THREE.PerspectiveCamera,
  allMeshes: THREE.Mesh[],
  hiddenExpressIds: Set<number>,
): THREE.Mesh | null {
  if (allMeshes.length === 0) return null;

  raycaster.setFromCamera(mouse, camera);
  const intersects = raycaster.intersectObjects(allMeshes, false);

  for (const intersect of intersects) {
    const obj = intersect.object as THREE.Mesh;
    const mat = obj.material as THREE.MeshLambertMaterial;
    const expressId = obj.userData.expressId;
    if (obj.visible && mat.opacity > 0.2 && !hiddenExpressIds.has(expressId)) {
      return obj;
    }
  }
  return null;
}

export function applyHoverEffect(mesh: THREE.Mesh): void {
  const mat = mesh.material as THREE.MeshLambertMaterial;
  if (!mesh.userData.originalEmissive) {
    mesh.userData.originalEmissive = mat.emissive ? mat.emissive.getHex() : 0;
  }
  if (mat.emissive) {
    mat.emissive.setHex(0x444400);
  }
}

export function clearHoverEffect(mesh: THREE.Mesh | null): void {
  if (mesh && mesh.material) {
    const mat = mesh.material as THREE.MeshLambertMaterial;
    if (mat.emissive && mesh.userData.originalEmissive !== undefined) {
      mat.emissive.setHex(mesh.userData.originalEmissive);
    }
  }
}
