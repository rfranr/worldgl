import * as THREE from 'three';
import { CELL, SIZE, SEED, createTerrain, createWorld, type World } from './world';
import './style.css';
import { createTrajectory } from './trajectory';
import { createTrajectoryView } from './trajectory-view';
import { createTrajectoryUI } from './trajectory-ui';

declare global { interface Window {
  world: Pick<World, 'inspect' | 'terrainHeight' | 'interact'>;
  worldDebug: { trajectory: ReturnType<typeof createTrajectory>['api'] };
} }
const world = createWorld();
const trajectory = createTrajectory(world);
window.worldDebug = Object.freeze({ trajectory: trajectory.api });
const syncTrajectoryUI = createTrajectoryUI(window.worldDebug.trajectory, world.inspect);
window.world = Object.freeze({ inspect: world.inspect, terrainHeight: world.terrainHeight, interact: trajectory.interact });
const scene = new THREE.Scene();
const syncTrajectory = createTrajectoryView(scene, trajectory);
scene.background = new THREE.Color('#bacfcf');
scene.fog = new THREE.Fog('#bacfcf', 80, 230);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.prepend(renderer.domElement);
const camera = new THREE.PerspectiveCamera(58, innerWidth / innerHeight, 0.1, 400);
scene.add(new THREE.HemisphereLight(0xe8f6ff, 0x536044, 2));
const sun = new THREE.DirectionalLight(0xffe5b5, 2.5);
const sunlightOffset = new THREE.Vector3(-40, 70, 20);
sun.position.copy(sunlightOffset);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
// A local shadow volume follows the craft, rather than covering the entire map.
Object.assign(sun.shadow.camera, { left: -24, right: 24, top: 24, bottom: -24, near: 0.5, far: 220 });
sun.shadow.camera.updateProjectionMatrix();
sun.shadow.normalBias = 0.04;
scene.add(sun, sun.target);

const terrain = createTerrain(SEED);
const vertices: number[] = [], colors: number[] = [];
function terrainColor(height: number) {
  if (height < -3) return '#687e79';
  if (height < 3) return '#8b9d62';
  if (height < 7) return '#a5ad79';
  return '#c5ba99';
}
function triangle(points: [number, number][]) {
  const heights = points.map(([x, z]) => terrain.vertexHeight(x, z));
  const average = heights.reduce((a, b) => a + b, 0) / 3;
  const color = new THREE.Color(terrainColor(average));
  points.forEach(([x, z], i) => { vertices.push(x, heights[i], z); colors.push(color.r, color.g, color.b); });
}
for (let x = -SIZE / 2; x < SIZE / 2; x += CELL) {
  for (let z = -SIZE / 2; z < SIZE / 2; z += CELL) {
    triangle([[x, z], [x, z + CELL], [x + CELL, z]]);
    triangle([[x + CELL, z], [x, z + CELL], [x + CELL, z + CELL]]);
  }
}
const geometry = new THREE.BufferGeometry();
geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
geometry.computeVertexNormals();
const terrainMesh = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 1 }));
terrainMesh.receiveShadow = true;
scene.add(terrainMesh);
const material = (color: string) => new THREE.MeshStandardMaterial({ color, flatShading: true, roughness: 0.8 });
const factories = {
  beacon: () => new THREE.Mesh(new THREE.CylinderGeometry(0.6, 1.4, 7, 6).translate(0, 3.5, 0), material('#e4ad58')),
  rock: () => new THREE.Mesh(new THREE.DodecahedronGeometry(3).translate(0, 2, 0), material('#606c72')),
  tower: () => new THREE.Mesh(new THREE.BoxGeometry(3, 10, 3).translate(0, 5, 0), material('#d0d7c7')),
};
const objectMeshes = new Map<string, THREE.Mesh>();
function removeStaleObjects() {
  for (const [id, mesh] of objectMeshes) {
    if (!world.objects.some(o => o.id === id && o.type === mesh.userData.type)) {
      scene.remove(mesh);
      mesh.geometry.dispose();
      (mesh.material as THREE.Material).dispose();
      objectMeshes.delete(id);
    }
  }
}
function syncObjects() {
  removeStaleObjects();
  for (const object of world.objects) {
    let mesh = objectMeshes.get(object.id);
    if (!mesh) {
      mesh = factories[object.type]();
      mesh.name = object.id;
      mesh.userData.type = object.type;
      objectMeshes.set(object.id, mesh);
      scene.add(mesh);
    }
    mesh.position.copy(object.position);
    mesh.rotation.set(object.orientation.x, object.orientation.y, object.orientation.z);
  }
}
syncObjects();
const player = new THREE.Group();
const hull = new THREE.Mesh(new THREE.ConeGeometry(0.85, 3, 4), material('#d66a43'));
hull.rotation.x = -Math.PI / 2;
player.add(hull);
const wings = new THREE.Mesh(new THREE.BoxGeometry(3.5, 0.18, 0.8), material('#f3dfb7'));
player.add(wings);
hull.castShadow = true;
wings.castShadow = true;
scene.add(player);
const keys = new Set<string>();
const controls = new Set(['KeyW','KeyS','KeyA','KeyD','KeyQ','KeyE','Space','ShiftLeft','ShiftRight','KeyR']);
document.addEventListener('focusin', event => {
  if (event.target instanceof Element && event.target.closest('#trajectory-debug')) keys.clear();
});
window.addEventListener('keydown', event => {
  if (event.target instanceof Element && event.target.closest('#trajectory-debug')) return;
  if (!controls.has(event.code)) return;
  event.preventDefault();
  keys.add(event.code);
  if (event.code === 'KeyR') { trajectory.interact.reset(); follow(true); }
});
window.addEventListener('keyup', event => keys.delete(event.code));
window.addEventListener('blur', () => keys.clear());
document.addEventListener('visibilitychange', () => keys.clear());
const target = new THREE.Vector3(), desired = new THREE.Vector3();
function follow(snap: boolean, dt = 0) {
  const p = world.player.position, yaw = world.player.orientation.y;
  desired.set(p.x + Math.sin(yaw) * 15, p.y + 8, p.z + Math.cos(yaw) * 15);
  desired.y = Math.max(desired.y, world.terrainHeight(desired.x, desired.z) + 3);
  camera.position.lerp(desired, snap ? 1 : 1 - Math.exp(-6 * dt));
  camera.position.y = Math.max(camera.position.y, world.terrainHeight(camera.position.x, camera.position.z) + 2);
  target.set(p.x, p.y + 1, p.z);
  camera.lookAt(target);
}
follow(true);
window.addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});
const telemetry = document.querySelector<HTMLPreElement>('#telemetry')!;
let previous = performance.now(), nextTelemetry = 0;
renderer.setAnimationLoop(now => {
  const dt = Math.min((now - previous) / 1000, 0.05);
  previous = now;
  world.update(dt, keys);
  trajectory.update(dt);
  syncTrajectory();
  syncTrajectoryUI(now);
  syncObjects();
  player.position.copy(world.player.position);
  player.rotation.y = world.player.orientation.y;
  // Move both endpoints together to preserve the existing sunlight direction.
  sun.target.position.copy(player.position);
  sun.position.copy(player.position).add(sunlightOffset);
  follow(false, dt);
  if (now >= nextTelemetry) {
    const { player: p, objects } = world.inspect();
    telemetry.textContent = `PLAYER  ${p.position.x.toFixed(1)}, ${p.position.y.toFixed(1)}, ${p.position.z.toFixed(1)}\nYAW     ${(p.orientation.y * 180 / Math.PI).toFixed(0)}°\nGROUND  ${world.terrainHeight(p.position.x, p.position.z).toFixed(1)}\n\n${objects.map(o => `${o.id}  (${o.position.x}, ${o.position.y.toFixed(1)}, ${o.position.z})`).join('\n')}`;
    nextTelemetry = now + 150;
  }
  renderer.render(scene, camera);
});
