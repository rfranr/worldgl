import * as THREE from 'three';
import type { createTrajectory } from './trajectory';
import { trajectoryColors } from './trajectory-colors';

export function createTrajectoryView(scene: THREE.Scene, recorder: ReturnType<typeof createTrajectory>) {
  const group = new THREE.Group();
  scene.add(group);
  let revision = -1;
  const colors = trajectoryColors;
  function clear() {
    for (const child of [...group.children]) {
      const mesh = child as THREE.Mesh;
      mesh.geometry.dispose();
      (mesh.material as THREE.Material).dispose();
      group.remove(child);
    }
  }
  return () => {
    group.visible = recorder.view.visible;
    if (!group.visible || revision === recorder.view.revision) return;
    revision = recorder.view.revision;
    clear();
    for (const segment of recorder.api.getHistory().segments) {
      const color = colors[segment.outcome];
      const points = segment.samples.map(s => new THREE.Vector3(s.position.x, s.position.y, s.position.z));
      const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), new THREE.LineBasicMaterial({ color, depthTest: false, transparent: true, opacity: 0.9 }));
      line.renderOrder = 10;
      group.add(line);
      if (recorder.view.destinations && segment.destination) {
        const marker = new THREE.Mesh(new THREE.OctahedronGeometry(0.6), new THREE.MeshBasicMaterial({ color, wireframe: true, depthTest: false }));
        marker.position.copy(segment.destination);
        marker.renderOrder = 11;
        group.add(marker);
      }
    }
  };
}
