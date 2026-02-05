'use client';

import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { DirectionalLightHelper, Group, HemisphereLight, PerspectiveCamera, Vector3 } from 'three';
import { OrbitControls, Stage } from '@react-three/drei';
import { VRM, VRMUtils, VRMExpressionPresetName, VRMLoaderPlugin } from '@pixiv/three-vrm';
import { GLTFLoader, GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';

type Emotion = 'neutral' | 'irritated' | 'impatient' | 'angry';

function useVrmModel(url: string, onError: () => void) {
  const [vrm, setVrm] = useState<VRM | null>(null);
  useEffect(() => {
    const loader = new GLTFLoader();
    loader.register((parser: any) => new VRMLoaderPlugin(parser));
    loader.load(
      url,
      (gltf: GLTF) => {
        const vrm = gltf.userData.vrm as VRM;
        VRMUtils.removeUnnecessaryVertices(gltf.scene);
        VRMUtils.removeUnnecessaryJoints(gltf.scene);
        vrm.scene.rotation.y = Math.PI;
        setVrm(vrm);
      },
      undefined,
      (err: any) => {
        console.error('VRM load failed', err);
        onError();
      }
    );
  }, [url, onError]);
  return vrm;
}

function expressionForEmotion(emotion: Emotion): Partial<Record<VRMExpressionPresetName, number>> {
  switch (emotion) {
    case 'irritated':
      return { angry: 0.35, sad: 0.1 };
    case 'impatient':
      return { neutral: 0.8 };
    case 'angry':
      return { angry: 0.6 };
    default:
      return { neutral: 1 };
  }
}

function VrmRig({
  url,
  isSpeaking,
  mouthValue,
  emotion = 'neutral',
  audioEl,
}: {
  url: string;
  isSpeaking: boolean;
  mouthValue?: number;
  emotion?: Emotion;
  audioEl?: HTMLAudioElement | null;
}) {
  const [fallback, setFallback] = useState(false);
  const vrm = useVrmModel(url, () => setFallback(true));
  const headRef = useRef<Group | null>(null);
  const [blink, setBlink] = useState(0);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const [amp, setAmp] = useState(0);
  const oscPhase = useRef(0);

  useEffect(() => {
    let t: any;
    const blinkLoop = () => {
      setBlink(1);
      t = setTimeout(() => setBlink(0), 120);
      const delay = 3000 + Math.random() * 2500;
      t = setTimeout(blinkLoop, delay);
    };
    t = setTimeout(blinkLoop, 2000);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (!audioEl || typeof window === 'undefined') return;
    const ctx = new AudioContext();
    const src = ctx.createMediaElementSource(audioEl);
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 256;
    src.connect(analyser);
    analyser.connect(ctx.destination);
    analyserRef.current = analyser;
    return () => {
      analyser.disconnect();
      src.disconnect();
      ctx.close();
    };
  }, [audioEl]);

  useFrame((_, delta) => {
    if (!vrm) return;
    const em = vrm.expressionManager;
    if (em) {
      // emotion
      const presets = expressionForEmotion(emotion);
      Object.entries(presets).forEach(([key, val]) => em.setValue(key as VRMExpressionPresetName, val || 0));
      // blink
      if (blink > 0) {
        em.setValue('blink', 1);
      } else {
        em.setValue('blink', 0);
      }
      // mouth
      let mv = mouthValue ?? 0;
      if (audioEl && analyserRef.current) {
        const data = new Uint8Array(analyserRef.current.fftSize);
        analyserRef.current.getByteTimeDomainData(data);
        const rms = Math.sqrt(data.reduce((a, b) => a + (b - 128) * (b - 128), 0) / data.length) / 50;
        mv = Math.min(1, rms * 1.8);
        setAmp(mv);
      } else if (isSpeaking) {
        oscPhase.current += delta * 10;
        mv = 0.2 + 0.35 * (1 + Math.sin(oscPhase.current)) / 2;
      } else {
        mv = Math.max(0, mv - delta * 1.5);
      }
      em.setValue('aa', mv);
      em.setValue('ih', mv * 0.6);
      em.setValue('ou', mv * 0.5);
    }
    // subtle head bob
    const scene = vrm.scene;
    if (scene) {
      scene.position.y = Math.sin(performance.now() / 1000) * 0.01;
      scene.rotation.z = isSpeaking ? Math.sin(performance.now() / 700) * 0.02 : 0;
    }
  });

  if (fallback) return <div className="text-sm text-slate-500">VRM model not found: /vrm/client.vrm</div>;
  if (!vrm) return <div className="text-sm text-slate-500">VRM loading…</div>;

  return <primitive object={vrm.scene} position={[0, -1.2, 0]} />;
}

export function VrmAvatar(props: { isSpeaking: boolean; mouthValue?: number; emotion?: Emotion; audioEl?: HTMLAudioElement | null }) {
  return (
    <div className="relative h-96 overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-soft">
      <Canvas camera={{ position: [0, 1.2, 2.4], fov: 25 }} gl={{ antialias: true }}>
        <hemisphereLight intensity={0.7} />
        <directionalLight intensity={0.8} position={[2, 3, 2]} />
        <Suspense fallback={null}>
          <VrmRig url="/vrm/client.vrm" {...props} />
        </Suspense>
      </Canvas>
    </div>
  );
}
