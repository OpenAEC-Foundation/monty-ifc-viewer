import * as THREE from 'three';
import type { CameraController } from '@/services/camera-controller';

// Non-reactive refs for Three.js objects (mutations are imperative)
export let scene: THREE.Scene | null = null;
export let camera: THREE.PerspectiveCamera | null = null;
export let renderer: THREE.WebGLRenderer | null = null;
export let cameraController: CameraController | null = null;
export let meshes = new Map<number, THREE.Mesh[]>();
export let allMeshes: THREE.Mesh[] = [];
export let hoveredMesh: THREE.Mesh | null = null;

export function setScene(s: THREE.Scene) { scene = s; }
export function setCamera(c: THREE.PerspectiveCamera) { camera = c; }
export function setRenderer(r: THREE.WebGLRenderer) { renderer = r; }
export function setCameraController(cc: CameraController) { cameraController = cc; }
export function setMeshes(m: Map<number, THREE.Mesh[]>) { meshes = m; }
export function setAllMeshes(am: THREE.Mesh[]) { allMeshes = am; }
export function setHoveredMesh(m: THREE.Mesh | null) { hoveredMesh = m; }

export function resetViewerStore(): void {
  if (scene) {
    for (const mesh of allMeshes) {
      scene.remove(mesh);
      mesh.geometry.dispose();
      if (Array.isArray(mesh.material)) {
        mesh.material.forEach(m => m.dispose());
      } else {
        mesh.material.dispose();
      }
    }
  }
  meshes = new Map();
  allMeshes = [];
  hoveredMesh = null;
}
