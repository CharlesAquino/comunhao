import { useEffect, useRef, useState } from 'react';

interface KesefCoin3DProps {
  className?: string;
  label?: string;
  initialRotationY?: number;
}

const FALLBACK_SRC = '/kesef-coin.png';

export default function KesefCoin3D({
  className = '',
  label = 'Moeda Kesef em bronze envelhecido',
  initialRotationY = -0.28,
}: KesefCoin3DProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const host = hostRef.current;
    if (!host || typeof window === 'undefined') return;

    let disposed = false;
    let frame = 0;
    let visible = true;
    let running = false;
    let cleanup = () => undefined;

    const initialize = async () => {
      try {
        const THREE = await import('three');
        if (disposed) return;

        const renderer = new THREE.WebGLRenderer({
          alpha: true,
          antialias: true,
          powerPreference: 'high-performance',
        });
        renderer.outputColorSpace = THREE.SRGBColorSpace;
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 1.08;
        renderer.setClearColor(0x000000, 0);
        renderer.domElement.setAttribute('aria-hidden', 'true');
        renderer.domElement.className = 'absolute inset-0 z-10 size-full touch-none';
        host.appendChild(renderer.domElement);

        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 30);
        camera.position.set(0, 0.02, 5.25);

        const coin = new THREE.Group();
        coin.name = 'kesef-coin';
        coin.rotation.set(-0.08, initialRotationY, -0.025);
        coin.userData.sculptRuntime = {
          targetId: 'kesef',
          actionReady: true,
          approximateBack: true,
        };
        scene.add(coin);

        const bronze = new THREE.MeshStandardMaterial({
          color: 0xcca04e,
          metalness: 0.90,
          roughness: 0.28,
        });
        const edgeBronze = new THREE.MeshStandardMaterial({
          color: 0xe0ad54,
          metalness: 0.95,
          roughness: 0.22,
        });

        const bodyGeometry = new THREE.CylinderGeometry(1.46, 1.46, 0.28, 128, 2, false);
        bodyGeometry.rotateX(Math.PI / 2);
        const body = new THREE.Mesh(bodyGeometry, [bronze, edgeBronze, edgeBronze]);
        body.name = 'coin-body';
        coin.add(body);

        const frontGeometry = new THREE.CircleGeometry(1.425, 128);
        const texture = await new THREE.TextureLoader().loadAsync(FALLBACK_SRC);
        if (disposed) {
          texture.dispose();
          scene.traverse(object => {
            if ('geometry' in object && object.geometry instanceof THREE.BufferGeometry) object.geometry.dispose();
            if ('material' in object) {
              const mats = Array.isArray(object.material) ? object.material : [object.material];
              mats.forEach(m => m instanceof THREE.Material && m.dispose());
            }
          });
          renderer.dispose();
          renderer.forceContextLoss();
          renderer.domElement.remove();
          return;
        }
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
        texture.repeat.set(0.74, 0.74);
        texture.offset.set(0.13, 0.13);
        const reverseTexture = texture.clone();
        reverseTexture.repeat.set(-0.74, 0.74);
        reverseTexture.offset.set(0.87, 0.13);
        reverseTexture.needsUpdate = true;

        const frontMaterial = new THREE.MeshStandardMaterial({
          map: texture,
          bumpMap: texture,
          bumpScale: 0.035,
          metalness: 0.78,
          roughness: 0.30,
          transparent: true,
          alphaTest: 0.04,
          polygonOffset: true,
          polygonOffsetFactor: -2,
        });
        const front = new THREE.Mesh(frontGeometry, frontMaterial);
        front.name = 'front-face';
        front.position.z = 0.151;
        coin.add(front);

        const reverseGeometry = new THREE.CircleGeometry(1.425, 128);
        const reverseMaterial = new THREE.MeshStandardMaterial({
          map: reverseTexture,
          bumpMap: reverseTexture,
          bumpScale: 0.035,
          metalness: 0.78,
          roughness: 0.30,
          transparent: true,
          alphaTest: 0.04,
          polygonOffset: true,
          polygonOffsetFactor: -2,
        });
        const reverse = new THREE.Mesh(reverseGeometry, reverseMaterial);
        reverse.name = 'reverse-face-branded-approximation';
        reverse.rotation.y = Math.PI;
        reverse.position.z = -0.151;
        coin.add(reverse);

        const edgeRidgeGeometry = new THREE.BoxGeometry(0.025, 0.07, 0.245);
        const edgeRidges = new THREE.InstancedMesh(edgeRidgeGeometry, edgeBronze, 72);
        edgeRidges.name = 'edge-ridges';
        const matrix = new THREE.Matrix4();
        const position = new THREE.Vector3();
        const quaternion = new THREE.Quaternion();
        const scale = new THREE.Vector3(1, 1, 1);
        const rotation = new THREE.Euler();
        for (let index = 0; index < 72; index += 1) {
          const angle = (index / 72) * Math.PI * 2;
          position.set(Math.cos(angle) * 1.475, Math.sin(angle) * 1.475, 0);
          rotation.set(0, 0, angle);
          quaternion.setFromEuler(rotation);
          matrix.compose(position, quaternion, scale);
          edgeRidges.setMatrixAt(index, matrix);
        }
        edgeRidges.instanceMatrix.needsUpdate = true;
        coin.add(edgeRidges);

        // Centelhas de glória em órbita suave
        const particleCount = 16;
        const particlePositions = new Float32Array(particleCount * 3);
        for (let i = 0; i < particleCount; i++) {
          const angle = (i / particleCount) * Math.PI * 2;
          const radius = 1.95 + (i % 3) * 0.22;
          particlePositions[i * 3] = Math.cos(angle) * radius;
          particlePositions[i * 3 + 1] = ((i % 5) - 2) * 0.24;
          particlePositions[i * 3 + 2] = Math.sin(angle) * radius;
        }
        const particleGeometry = new THREE.BufferGeometry();
        particleGeometry.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
        const particleMaterial = new THREE.PointsMaterial({
          color: 0xffd978,
          size: 0.055,
          transparent: true,
          opacity: 0.75,
          blending: THREE.AdditiveBlending,
        });
        const sparkOrbit = new THREE.Points(particleGeometry, particleMaterial);
        scene.add(sparkOrbit);

        // Iluminação de Estúdio & Joalheria
        const ambient = new THREE.HemisphereLight(0xffeed1, 0x17221d, 1.4);
        scene.add(ambient);
        const key = new THREE.DirectionalLight(0xffe2b2, 3.2);
        key.position.set(-3.0, 3.5, 5.2);
        scene.add(key);
        const rimGold = new THREE.DirectionalLight(0xffc13c, 3.6);
        rimGold.position.set(4.8, -1.2, -3.8);
        scene.add(rimGold);
        const rimEmerald = new THREE.DirectionalLight(0x7ed4b8, 1.5);
        rimEmerald.position.set(-4.2, -2.0, -3.0);
        scene.add(rimEmerald);
        const fill = new THREE.PointLight(0xfffaed, 1.2, 12);
        fill.position.set(2.4, 1.2, 4.0);
        scene.add(fill);

        const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
        const pointerTarget = new THREE.Vector2(initialRotationY, -0.08);
        const pointerCurrent = new THREE.Vector2(initialRotationY, -0.08);
        const clock = new THREE.Clock();

        let isDragging = false;
        let dragStartX = 0;
        let dragStartY = 0;
        let dragBaseY = initialRotationY;
        let dragBaseX = -0.08;

        const resize = () => {
          const width = Math.max(host.clientWidth, 1);
          const height = Math.max(host.clientHeight, 1);
          camera.aspect = width / height;
          camera.updateProjectionMatrix();
          const compact = Math.min(width, height) < 260;
          renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, compact ? 1.4 : 1.75));
          renderer.setSize(width, height, false);
          renderer.render(scene, camera);
        };

        const renderFrame = () => {
          running = false;
          if (disposed || !visible) return;
          pointerCurrent.lerp(pointerTarget, 0.065);
          coin.rotation.x = pointerCurrent.y;
          if (!reducedMotion.matches) {
            const elapsed = clock.getElapsedTime();
            coin.rotation.y = pointerCurrent.x + elapsed * 0.35;
            coin.position.y = Math.sin(elapsed * 0.85) * 0.038;
            coin.rotation.z = -0.025 + Math.sin(elapsed * 0.45) * 0.012;
            sparkOrbit.rotation.y = -elapsed * 0.22;
          } else {
            coin.rotation.y = pointerCurrent.x;
          }
          renderer.render(scene, camera);
          if (!reducedMotion.matches) {
            running = true;
            frame = requestAnimationFrame(renderFrame);
          }
        };

        const start = () => {
          if (running || disposed || !visible) return;
          running = true;
          frame = requestAnimationFrame(renderFrame);
        };
        const stop = () => {
          if (frame) cancelAnimationFrame(frame);
          frame = 0;
          running = false;
        };

        const onPointerDown = (event: PointerEvent) => {
          isDragging = true;
          dragStartX = event.clientX;
          dragStartY = event.clientY;
          dragBaseY = pointerTarget.x;
          dragBaseX = pointerTarget.y;
          host.setPointerCapture(event.pointerId);
        };

        const onPointerMove = (event: PointerEvent) => {
          if (isDragging) {
            const deltaX = event.clientX - dragStartX;
            const deltaY = event.clientY - dragStartY;
            pointerTarget.set(
              dragBaseY + (deltaX / 100) * 1.8,
              Math.max(-0.6, Math.min(0.6, dragBaseX - (deltaY / 100) * 1.2)),
            );
            start();
            return;
          }
          const bounds = host.getBoundingClientRect();
          const x = ((event.clientX - bounds.left) / bounds.width) * 2 - 1;
          const y = ((event.clientY - bounds.top) / bounds.height) * 2 - 1;
          pointerTarget.set(x * 0.95, -y * 0.48 - 0.08);
          if (reducedMotion.matches) start();
        };

        const onPointerUp = (event: PointerEvent) => {
          if (isDragging) {
            isDragging = false;
            try { host.releasePointerCapture(event.pointerId); } catch { /* ignore */ }
          }
        };

        const onPointerLeave = () => {
          if (!isDragging) {
            pointerTarget.set(initialRotationY, -0.08);
            if (reducedMotion.matches) start();
          }
        };
        const onMotionChange = () => {
          stop();
          start();
        };
        const onContextLost = (event: Event) => {
          event.preventDefault();
          stop();
          setFailed(true);
        };

        const resizeObserver = new ResizeObserver(resize);
        resizeObserver.observe(host);
        const intersectionObserver = new IntersectionObserver(([entry]) => {
          visible = entry.isIntersecting;
          if (visible) start(); else stop();
        }, { rootMargin: '80px' });
        intersectionObserver.observe(host);
        host.addEventListener('pointerdown', onPointerDown);
        host.addEventListener('pointermove', onPointerMove);
        host.addEventListener('pointerup', onPointerUp);
        host.addEventListener('pointercancel', onPointerUp);
        host.addEventListener('pointerleave', onPointerLeave);
        renderer.domElement.addEventListener('webglcontextlost', onContextLost);
        reducedMotion.addEventListener('change', onMotionChange);

        resize();
        setReady(true);
        start();

        cleanup = () => {
          stop();
          resizeObserver.disconnect();
          intersectionObserver.disconnect();
          host.removeEventListener('pointerdown', onPointerDown);
          host.removeEventListener('pointermove', onPointerMove);
          host.removeEventListener('pointerup', onPointerUp);
          host.removeEventListener('pointercancel', onPointerUp);
          host.removeEventListener('pointerleave', onPointerLeave);
          reducedMotion.removeEventListener('change', onMotionChange);
          renderer.domElement.removeEventListener('webglcontextlost', onContextLost);
          const geometries = new Set<THREE.BufferGeometry>();
          const materials = new Set<THREE.Material>();
          scene.traverse(object => {
            if ('geometry' in object && object.geometry instanceof THREE.BufferGeometry) geometries.add(object.geometry);
            if ('material' in object) {
              const objectMaterials = Array.isArray(object.material) ? object.material : [object.material];
              objectMaterials.forEach(material => material instanceof THREE.Material && materials.add(material));
            }
          });
          geometries.forEach(geometry => geometry.dispose());
          materials.forEach(material => material.dispose());
          texture.dispose();
          reverseTexture.dispose();
          renderer.dispose();
          renderer.forceContextLoss();
          renderer.domElement.remove();
        };
      } catch {
        if (!disposed) setFailed(true);
      }
    };

    void initialize();
    return () => {
      disposed = true;
      if (frame) cancelAnimationFrame(frame);
      cleanup();
    };
  }, [initialRotationY]);


  return (
    <div
      ref={hostRef}
      role="img"
      aria-label={label}
      className={`relative isolate overflow-visible ${className}`}
      data-kesef-3d={ready && !failed ? 'ready' : failed ? 'fallback' : 'loading'}
    >
      <img
        src={FALLBACK_SRC}
        alt=""
        className={`absolute inset-0 z-0 size-full object-contain ${ready && !failed ? 'invisible opacity-0' : 'visible opacity-100'}`}
      />
      {/* Halo de glória áurea celestial */}
      <div className="pointer-events-none absolute inset-[8%] -z-10 rounded-full bg-gradient-to-tr from-amber-500/30 via-yellow-400/20 to-emerald-400/15 blur-2xl transition-opacity duration-700" />
      {/* Sombra de contato e ancoragem espacial na base */}
      <div className="pointer-events-none absolute -bottom-2 left-1/2 -z-10 h-5 w-2/3 -translate-x-1/2 rounded-[100%] bg-black/45 blur-md" />
    </div>
  );
}
