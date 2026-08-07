import React, { useEffect, useRef } from "react";
import * as THREE from "three";

export default function KitchenScene({ className = "" }) {
  const wrapRef = useRef(null);
  const canvasRef = useRef(null);

  useEffect(() => {
    const wrapper = wrapRef.current;
    const canvas = canvasRef.current;
    if (!wrapper || !canvas) return undefined;

    const reducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
    camera.position.set(0, 1.55, 6.4);

    const keyLight = new THREE.DirectionalLight(0xffdfbd, 2.4);
    keyLight.position.set(2.8, 4.2, 4);
    scene.add(keyLight);
    scene.add(new THREE.AmbientLight(0xfff5eb, 1.15));

    const group = new THREE.Group();
    group.rotation.x = -0.08;
    scene.add(group);

    const floor = new THREE.Mesh(
      new THREE.CircleGeometry(3.4, 80),
      new THREE.MeshStandardMaterial({ color: 0xf8ead7, roughness: 0.76, metalness: 0.04 })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -1.12;
    group.add(floor);

    const bowl = new THREE.Mesh(
      new THREE.CylinderGeometry(1.18, 0.82, 0.42, 64),
      new THREE.MeshStandardMaterial({ color: 0x2a211c, roughness: 0.44, metalness: 0.16 })
    );
    bowl.position.set(0.62, -0.88, 0.06);
    group.add(bowl);

    const rice = new THREE.Mesh(
      new THREE.SphereGeometry(0.88, 40, 18, 0, Math.PI * 2, 0, Math.PI / 2),
      new THREE.MeshStandardMaterial({ color: 0xf5d48a, roughness: 0.7 })
    );
    rice.scale.set(1.08, 0.5, 0.9);
    rice.position.set(0.62, -0.62, 0.06);
    group.add(rice);

    const oven = new THREE.Mesh(
      new THREE.CylinderGeometry(0.62, 0.82, 1.55, 52, 1, true),
      new THREE.MeshStandardMaterial({ color: 0x9b3f2b, roughness: 0.82, metalness: 0.02 })
    );
    oven.position.set(-1.08, -0.38, 0);
    group.add(oven);

    const ovenRim = new THREE.Mesh(
      new THREE.TorusGeometry(0.64, 0.08, 14, 52),
      new THREE.MeshStandardMaterial({ color: 0x2b211d, roughness: 0.5, metalness: 0.18 })
    );
    ovenRim.rotation.x = Math.PI / 2;
    ovenRim.position.set(-1.08, 0.4, 0);
    group.add(ovenRim);

    const emberMaterial = new THREE.MeshStandardMaterial({ color: 0xff7b38, emissive: 0xe95e31, emissiveIntensity: 0.55 });
    for (let i = 0; i < 5; i += 1) {
      const ember = new THREE.Mesh(new THREE.IcosahedronGeometry(0.08 + i * 0.008, 0), emberMaterial);
      ember.position.set(-1.32 + i * 0.12, -0.98, 0.25 - (i % 2) * 0.18);
      group.add(ember);
    }

    const skewerMaterial = new THREE.MeshStandardMaterial({ color: 0x3f342e, roughness: 0.38, metalness: 0.55 });
    const paneerMaterial = new THREE.MeshStandardMaterial({ color: 0xf4b266, roughness: 0.62 });
    for (let i = 0; i < 4; i += 1) {
      const skewer = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 1.45, 14), skewerMaterial);
      skewer.rotation.z = Math.PI / 2.45;
      skewer.position.set(-1.18 + i * 0.15, 0.1 - i * 0.03, 0.08 + i * 0.08);
      group.add(skewer);

      for (let j = 0; j < 3; j += 1) {
        const cube = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.14, 0.16), paneerMaterial);
        cube.rotation.set(0.2 * j, 0.45, 0.35);
        cube.position.set(-1.36 + i * 0.16 + j * 0.18, 0.1 - i * 0.03 + j * 0.07, 0.08 + i * 0.08);
        group.add(cube);
      }
    }

    const garnishMaterial = new THREE.MeshStandardMaterial({ color: 0x1f7a52, roughness: 0.7 });
    const onionMaterial = new THREE.MeshStandardMaterial({ color: 0x7e3f6f, roughness: 0.55 });
    for (let i = 0; i < 16; i += 1) {
      const angle = (i / 16) * Math.PI * 2;
      const radius = 0.22 + (i % 5) * 0.1;
      const leaf = new THREE.Mesh(new THREE.SphereGeometry(0.035, 10, 8), i % 3 === 0 ? onionMaterial : garnishMaterial);
      leaf.scale.set(1.6, 0.55, 0.85);
      leaf.position.set(0.62 + Math.cos(angle) * radius, -0.2 + (i % 4) * 0.03, 0.06 + Math.sin(angle) * radius * 0.75);
      group.add(leaf);
    }

    const steamGroup = new THREE.Group();
    group.add(steamGroup);
    const steamLines = [];
    const makeSteam = (x, z, delay) => {
      const curve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(x, -0.18, z),
        new THREE.Vector3(x + 0.1, 0.18, z + 0.02),
        new THREE.Vector3(x - 0.04, 0.55, z - 0.02),
        new THREE.Vector3(x + 0.12, 0.92, z + 0.03),
      ]);
      const geometry = new THREE.BufferGeometry().setFromPoints(curve.getPoints(36));
      const material = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.48 });
      const line = new THREE.Line(geometry, material);
      line.userData = { baseX: x, delay };
      steamGroup.add(line);
      steamLines.push(line);
    };
    [-0.08, 0.2, 0.5, 0.8, 1.02].forEach((x, index) => makeSteam(x, -0.04 + index * 0.04, index * 0.7));

    const pointer = { x: 0, y: 0 };
    const handlePointerMove = (event) => {
      const rect = wrapper.getBoundingClientRect();
      pointer.x = ((event.clientX - rect.left) / Math.max(rect.width, 1) - 0.5) * 2;
      pointer.y = ((event.clientY - rect.top) / Math.max(rect.height, 1) - 0.5) * 2;
    };
    wrapper.addEventListener("pointermove", handlePointerMove);

    const resize = () => {
      const width = Math.max(wrapper.clientWidth, 1);
      const height = Math.max(wrapper.clientHeight, 1);
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    };
    const observer = new ResizeObserver(resize);
    observer.observe(wrapper);
    resize();

    let frameId = 0;
    const render = (timeMs = 0) => {
      const time = timeMs / 1000;
      if (!reducedMotion) {
        group.rotation.y += ((pointer.x * 0.14) - group.rotation.y) * 0.035;
        group.rotation.x += ((-0.08 - pointer.y * 0.04) - group.rotation.x) * 0.035;
        rice.position.y = -0.62 + Math.sin(time * 1.4) * 0.018;
        steamLines.forEach((line) => {
          line.position.y = Math.sin(time * 0.9 + line.userData.delay) * 0.08;
          line.position.x = Math.sin(time * 0.7 + line.userData.delay) * 0.035;
          line.material.opacity = 0.34 + Math.sin(time * 1.2 + line.userData.delay) * 0.14;
        });
      }
      renderer.render(scene, camera);
      frameId = window.requestAnimationFrame(render);
    };
    render();

    return () => {
      window.cancelAnimationFrame(frameId);
      wrapper.removeEventListener("pointermove", handlePointerMove);
      observer.disconnect();
      scene.traverse((object) => {
        if (object.geometry) object.geometry.dispose();
        if (object.material) {
          const materials = Array.isArray(object.material) ? object.material : [object.material];
          materials.forEach((material) => material.dispose());
        }
      });
      renderer.dispose();
    };
  }, []);

  return (
    <div ref={wrapRef} className={`kitchen-scene ${className}`} aria-label="Interactive 3D kitchen scene">
      <canvas ref={canvasRef} data-testid="kitchen-three-canvas" />
    </div>
  );
}
