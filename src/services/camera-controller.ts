import * as THREE from 'three';
import type { SphericalCoords } from '@/types/viewer';

export class CameraController {
  spherical: SphericalCoords;
  target: THREE.Vector3;
  private camera: THREE.PerspectiveCamera;

  constructor(camera: THREE.PerspectiveCamera) {
    this.camera = camera;
    this.spherical = { theta: Math.PI / 4, phi: Math.PI / 4, radius: 50 };
    this.target = new THREE.Vector3(0, 0, 0);
  }

  updateCamera(): void {
    this.camera.position.x = this.target.x + this.spherical.radius * Math.sin(this.spherical.phi) * Math.cos(this.spherical.theta);
    this.camera.position.y = this.target.y + this.spherical.radius * Math.cos(this.spherical.phi);
    this.camera.position.z = this.target.z + this.spherical.radius * Math.sin(this.spherical.phi) * Math.sin(this.spherical.theta);
    this.camera.lookAt(this.target);
  }

  rotate(dx: number, dy: number): void {
    this.spherical.theta += dx * 0.01;
    this.spherical.phi = Math.max(0.1, Math.min(Math.PI - 0.1, this.spherical.phi - dy * 0.01));
    this.updateCamera();
  }

  pan(dx: number, dy: number): void {
    const panSpeed = 0.05;
    const right = new THREE.Vector3();
    const up = new THREE.Vector3(0, 1, 0);
    right.crossVectors(this.camera.getWorldDirection(new THREE.Vector3()), up).normalize();
    this.target.addScaledVector(right, -dx * panSpeed);
    this.target.y += dy * panSpeed;
    this.updateCamera();
  }

  zoom(deltaY: number): void {
    this.spherical.radius *= deltaY > 0 ? 1.1 : 0.9;
    this.spherical.radius = Math.max(1, Math.min(500, this.spherical.radius));
    this.updateCamera();
  }

  resetView(): void {
    this.target.set(0, 0, 0);
    this.spherical = { theta: Math.PI / 4, phi: Math.PI / 4, radius: 50 };
    this.updateCamera();
  }
}
