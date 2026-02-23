import * as THREE from 'three';

export interface ThreeContext {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
}

export function initThreeScene(
  canvas: HTMLCanvasElement,
  container: HTMLElement,
): ThreeContext {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0F172A);

  const camera = new THREE.PerspectiveCamera(
    60,
    container.clientWidth / container.clientHeight,
    0.1,
    10000,
  );
  camera.position.set(30, 30, 30);

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setSize(container.clientWidth, container.clientHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  // Lights
  const ambient = new THREE.AmbientLight(0xffffff, 0.6);
  scene.add(ambient);

  const directional = new THREE.DirectionalLight(0xffffff, 0.8);
  directional.position.set(50, 100, 50);
  scene.add(directional);

  const directional2 = new THREE.DirectionalLight(0xffffff, 0.4);
  directional2.position.set(-50, 50, -50);
  scene.add(directional2);

  // Grid
  const grid = new THREE.GridHelper(100, 50, 0x334155, 0x1E293B);
  scene.add(grid);

  return { scene, camera, renderer };
}

export function zoomFitCamera(
  allMeshes: THREE.Mesh[],
  target: THREE.Vector3,
  spherical: { theta: number; phi: number; radius: number },
  updateCamera: () => void,
): void {
  const box = new THREE.Box3();
  let hasVisibleMesh = false;

  for (const mesh of allMeshes) {
    if (mesh.visible && (mesh.material as THREE.MeshLambertMaterial).opacity > 0.2) {
      box.expandByObject(mesh);
      hasVisibleMesh = true;
    }
  }

  if (!hasVisibleMesh || box.isEmpty()) return;

  const center = box.getCenter(new THREE.Vector3());
  const size = box.getSize(new THREE.Vector3());
  const maxDim = Math.max(size.x, size.y, size.z);

  target.copy(center);
  spherical.radius = maxDim * 1.5;
  updateCamera();
}

export function disposeThreeScene(
  scene: THREE.Scene,
  allMeshes: THREE.Mesh[],
  renderer: THREE.WebGLRenderer,
): void {
  for (const mesh of allMeshes) {
    scene.remove(mesh);
    mesh.geometry.dispose();
    if (Array.isArray(mesh.material)) {
      mesh.material.forEach(m => m.dispose());
    } else {
      mesh.material.dispose();
    }
  }
  renderer.dispose();
}
