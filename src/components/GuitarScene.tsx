import { useEffect, useRef, useState } from 'react';
import {
  ACESFilmicToneMapping,
  Color,
  DirectionalLight,
  Group,
  HemisphereLight,
  MathUtils,
  Mesh,
  MeshBasicMaterial,
  PerspectiveCamera,
  PMREMGenerator,
  RingGeometry,
  Scene,
  SRGBColorSpace,
  WebGLRenderer,
  type Material,
} from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import type { MotionValue } from 'motion/react';
import { createGuitarModel } from './guitarSceneModel';

interface GuitarSceneProps {
  scroll: MotionValue<number>;
  frets: readonly number[];
  strike: number;
  animate: boolean;
}

export default function GuitarScene({ scroll, frets, strike, animate }: GuitarSceneProps) {
  const host = useRef<HTMLDivElement>(null);
  const wake = useRef<() => void>(() => {});
  const [ready, setReady] = useState(false);
  const settings = useRef({ frets, strike, animate });

  useEffect(() => {
    settings.current = { frets, strike, animate };
    wake.current();
  }, [frets, strike, animate]);

  useEffect(() => {
    const container = host.current;
    if (!container) return;
    const canvas = document.createElement('canvas');
    let renderer: WebGLRenderer;

    try {
      if (!canvas.getContext('webgl2', { alpha: true, antialias: true })) return;
      renderer = new WebGLRenderer({ canvas, antialias: true, alpha: true });
    } catch {
      return;
    }

    renderer.setClearColor(0x000000, 0);
    renderer.outputColorSpace = SRGBColorSpace;
    renderer.toneMapping = ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.03;
    canvas.setAttribute('aria-hidden', 'true');
    container.prepend(canvas);

    const scene = new Scene();
    const room = new RoomEnvironment();
    const pmrem = new PMREMGenerator(renderer);
    const reflections = pmrem.fromScene(room, .035, .1, 25, { size: 128 });
    scene.environment = reflections.texture;
    scene.environmentIntensity = 1.12;
    pmrem.dispose();
    room.dispose();

    const camera = new PerspectiveCamera(34, 1, .1, 35);
    const { model, updateStrings } = createGuitarModel();
    const pivot = new Group();
    pivot.add(model);
    scene.add(pivot);
    scene.add(new HemisphereLight('#dce6ff', '#354166', 1.38));

    const key = new DirectionalLight('#f8f0df', 2.8);
    key.position.set(-3, 5, 5);
    scene.add(key);
    const rim = new DirectionalLight('#668cff', 4.2);
    rim.position.set(4, 1, -1);
    scene.add(rim);
    const signalLight = new DirectionalLight('#e6ff58', 0);
    signalLight.position.set(2, -.6, 4);
    scene.add(signalLight);

    const ringMaterial = new MeshBasicMaterial({
      color: new Color('#e6ff58'), opacity: 0, transparent: true, depthWrite: false,
    });
    const ring = new Mesh(new RingGeometry(.97, 1, 72), ringMaterial);
    ring.position.set(.58, -1.2, -1.2);
    ring.visible = false;
    scene.add(ring);

    let visible = false;
    let contextLost = false;
    let firstFrame = true;
    let frame = 0;
    let lastTime = 0;
    let runningTime = 0;
    let scrollPosition = 0;
    let pointerX = 0;
    let pointerY = 0;
    let lastStrike = settings.current.strike;
    let chordStarted = -10;
    let sized = false;

    const draw = (now: number) => {
      frame = 0;
      if (contextLost || !sized) return;
      const { animate: moving, frets: activeFrets, strike: currentStrike } = settings.current;
      const dt = lastTime ? Math.min(0.05, (now - lastTime) / 1000) : 1 / 60;
      lastTime = now;

      if (moving) {
        runningTime += dt;
        scrollPosition = MathUtils.damp(scrollPosition, Math.min(1, scroll.get() * 1.6), 6.8, dt);
      }

      if (lastStrike !== currentStrike) {
        lastStrike = currentStrike;
        chordStarted = runningTime;
      }
      const attackTime = runningTime - chordStarted;
      const pulse = moving ? Math.max(0, 1 - attackTime / 1.13) ** 2 : 0;
      const intro = moving ? (Math.max(0, 1 - runningTime / 1.5)) ** 2.7 : 0;
      const bob = runningTime > 0 ? Math.sin(runningTime * 1.53) : 0;

      pivot.rotation.z = .67 - scrollPosition * .35 + bob * .045;
      pivot.rotation.y = -.24 - intro * .85 + scrollPosition * 1.08 + bob * .33 + pointerX * .085;
      pivot.rotation.x = -.11 + scrollPosition * .31 + pointerY * .095;
      pivot.position.x = .26 - scrollPosition * .43;
      pivot.position.y = .08 + scrollPosition * 1.05 + bob * .11 + intro * -.18;
      const narrowOffset = Math.max(0, 1.18 / camera.aspect - 1) * 3.5;
      camera.position.set(0.06 + scrollPosition * .41, .11, 10.45 - scrollPosition * 2.95 + narrowOffset);
      camera.lookAt(0, 0, 0);

      signalLight.intensity = pulse * 5.4;
      ring.visible = pulse > .04;
      ring.scale.setScalar(.65 + attackTime * 2.25);
      ringMaterial.opacity = pulse * .56;
      updateStrings(runningTime, pulse, activeFrets);
      renderer.render(scene, camera);

      if (firstFrame) {
        firstFrame = false;
        setReady(true);
      }
      if (moving && visible && !document.hidden) frame = requestAnimationFrame(draw);
    };

    const requestFrame = () => {
      if (contextLost || frame || document.hidden || (!visible && !firstFrame)) return;
      frame = requestAnimationFrame(draw);
    };
    wake.current = requestFrame;

    const resize = () => {
      const { width, height } = container.getBoundingClientRect();
      if (width < 1 || height < 1) return;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, width > 600 ? 1.5 : 1.25));
      renderer.setSize(width, height, false);
      sized = true;
      requestFrame();
    };
    const sizeObserver = new ResizeObserver(resize);
    sizeObserver.observe(container);
    const visibilityObserver = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (visible) requestFrame();
      else {
        cancelAnimationFrame(frame);
        frame = 0;
        lastTime = 0;
      }
    });
    visibilityObserver.observe(container);

    const updatePointer = (event: PointerEvent) => {
      if (event.pointerType !== 'mouse' || !settings.current.animate) return;
      const bounds = container.getBoundingClientRect();
      pointerX = (event.clientX - bounds.left) / bounds.width - .5;
      pointerY = (event.clientY - bounds.top) / bounds.height - .5;
    };

    const onContextLost = (event: Event) => {
      event.preventDefault();
      contextLost = true;
      cancelAnimationFrame(frame);
      frame = 0;
      setReady(false);
    };
    const onContextRestored = () => {
      contextLost = false;
      firstFrame = true;
      requestFrame();
    };

    container.addEventListener('pointermove', updatePointer);
    canvas.addEventListener('webglcontextlost', onContextLost);
    canvas.addEventListener('webglcontextrestored', onContextRestored);
    document.addEventListener('visibilitychange', requestFrame);
    const unsubscribeScroll = scroll.on('change', () => {
      if (settings.current.animate) requestFrame();
    });
    resize();

    return () => {
      wake.current = () => {};
      cancelAnimationFrame(frame);
      sizeObserver.disconnect();
      visibilityObserver.disconnect();
      unsubscribeScroll();
      document.removeEventListener('visibilitychange', requestFrame);
      container.removeEventListener('pointermove', updatePointer);
      canvas.removeEventListener('webglcontextlost', onContextLost);
      canvas.removeEventListener('webglcontextrestored', onContextRestored);
      const materials = new Set<Material>();
      scene.traverse((object) => {
        const mesh = object as Mesh;
        mesh.geometry?.dispose();
        if (Array.isArray(mesh.material)) mesh.material.forEach((material) => materials.add(material));
        else if (mesh.material) materials.add(mesh.material);
      });
      materials.forEach((material) => material.dispose());
      reflections.dispose();
      renderer.dispose();
      canvas.remove();
    };
  }, [scroll]);

  return <div ref={host} className="guitar-scene" data-ready={ready} aria-hidden="true" />;
}
