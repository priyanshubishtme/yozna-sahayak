/**
 * Interactive 3D Civic Dharma Chakra & Node Network
 * Built with Three.js for Yojana Sahayak Civic Experience (Phase 8).
 */

import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

interface CivicEmblem3DProps {
  height?: number;
  interactive?: boolean;
}

export const CivicEmblem3D: React.FC<CivicEmblem3DProps> = ({
  height = 360,
  interactive = true
}) => {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    // 1. Scene, Camera, Renderer
    const scene = new THREE.Scene();
    const width = container.clientWidth || 400;
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.z = 7;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    // 2. Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.9);
    scene.add(ambientLight);

    const pointLight1 = new THREE.PointLight(0xf59e0b, 2.5, 50);
    pointLight1.position.set(5, 5, 5);
    scene.add(pointLight1);

    const pointLight2 = new THREE.PointLight(0x10b981, 2.5, 50);
    pointLight2.position.set(-5, -5, 5);
    scene.add(pointLight2);

    // 3. Central Dharma Chakra / Civic Node Group
    const emblemGroup = new THREE.Group();
    scene.add(emblemGroup);

    // Outer Ring (Torus)
    const ringGeo = new THREE.TorusGeometry(2.0, 0.05, 16, 64);
    const ringMat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      metalness: 0.6,
      roughness: 0.2,
      wireframe: false
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    emblemGroup.add(ring);

    // Inner Hub
    const hubGeo = new THREE.SphereGeometry(0.35, 32, 32);
    const hubMat = new THREE.MeshStandardMaterial({
      color: 0x3b82f6,
      metalness: 0.7,
      roughness: 0.2
    });
    const hub = new THREE.Mesh(hubGeo, hubMat);
    emblemGroup.add(hub);

    // 24 Spokes (Indian Dharma Chakra Geometry)
    const spokeCount = 24;
    for (let i = 0; i < spokeCount; i++) {
      const angle = (i / spokeCount) * Math.PI * 2;
      const spokeGeo = new THREE.CylinderGeometry(0.018, 0.018, 1.95, 8);
      const spokeMat = new THREE.MeshStandardMaterial({
        color: i % 2 === 0 ? 0xffffff : 0xf59e0b,
        metalness: 0.5,
        roughness: 0.3
      });
      const spoke = new THREE.Mesh(spokeGeo, spokeMat);
      spoke.position.x = (Math.cos(angle) * 1.95) / 2;
      spoke.position.y = (Math.sin(angle) * 1.95) / 2;
      spoke.rotation.z = angle - Math.PI / 2;
      emblemGroup.add(spoke);
    }

    // 4. Mouse Interaction
    let mouseX = 0;
    let mouseY = 0;
    let targetX = 0;
    let targetY = 0;

    const handleMouseMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      mouseX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouseY = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
    };

    if (interactive) {
      window.addEventListener('mousemove', handleMouseMove);
    }

    // 5. Animation Loop
    let animationFrameId: number;
    const clock = new THREE.Clock();

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      const elapsedTime = clock.getElapsedTime();

      // Smooth continuous rotation
      emblemGroup.rotation.y = elapsedTime * 0.35;
      emblemGroup.rotation.x = Math.sin(elapsedTime * 0.25) * 0.2;

      // Gentle mouse tracking
      if (interactive) {
        targetX += (mouseX * 0.5 - targetX) * 0.05;
        targetY += (mouseY * 0.5 - targetY) * 0.05;
        emblemGroup.rotation.y += targetX;
        emblemGroup.rotation.x += -targetY;
      }

      renderer.render(scene, camera);
    };

    animate();

    // 6. Resize Handler
    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth;
      camera.aspect = w / height;
      camera.updateProjectionMatrix();
      renderer.setSize(w, height);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
      if (interactive) {
        window.removeEventListener('mousemove', handleMouseMove);
      }
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [height, interactive]);

  return (
    <div
      ref={mountRef}
      style={{
        width: '100%',
        height: `${height}px`,
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'grab'
      }}
    />
  );
};

