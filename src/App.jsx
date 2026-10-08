import { useState, Suspense, useEffect, useCallback, lazy } from 'react';
import { Canvas } from '@react-three/fiber';
import { Preload, useTexture, PerformanceMonitor } from '@react-three/drei';
import * as THREE from 'three';

import Preloader from './components/dom/Preloader';
import PaperTransition from './components/dom/PaperTransition';
import SceneErrorBoundary, { SceneRecovery } from './components/dom/SceneErrorBoundary';
import { supportsWebGL } from './utils/webgl';
import { useAudio } from './context/AudioManager';
import { AudioProvider } from './context/AudioProvider';
import { usePerformance } from './context/PerformanceContext';
import { PerformanceProvider } from './context/PerformanceProvider';
import { SceneProvider } from './context/SceneContext';
import { useScene } from './context/SceneState.js';
import NavigationUI from './components/ui/NavigationUI';
import GlobalOverlay from './components/ui/GlobalOverlay';
import ScreenReaderOverlay from './components/ui/ScreenReaderOverlay';
import { useDocumentMeta } from './hooks/useDocumentMeta';
import { loadLocalContent } from './hooks/useLocalContent';

// Lazy load the heavy 3D experience
const Experience = lazy(() => import('./components/canvas/Experience'));

import './styles/main.scss';

// --- CONDITIONAL ASSET PRELOADING ---
// Preload the entrance and corridor; room modules and textures load when entered.
import { 
  ENTRANCE_TEXTURES, 
  CORRIDOR_TEXTURES, 
  UI_TEXTURES,
  IMAGE_ASSETS,
  filterTexturesByDevice
} from './config/texturePreloadList';

// Standard Browser-level Image Preloader (for <img> tags)
const preloadBrowserImage = (path) => {
  if (typeof window === 'undefined') return;
  const img = new Image();
  img.src = path;
};


// Refined check for "hover capability" (non-touch devices should have hover: hover)
// Laptops with touch screens (which also have a mouse/trackpad) will return true here.
const supportsHover = typeof window !== 'undefined' && window.matchMedia('(hover: hover)').matches;
const webglSupported = supportsWebGL();

// Trigger Three.js preloads at module level (as standard for Drei)
// Only the entrance and corridor are needed to start exploring.
const CORE_TEXTURES = [...new Set([...ENTRANCE_TEXTURES, ...CORRIDOR_TEXTURES, ...UI_TEXTURES])];
if (webglSupported) filterTexturesByDevice(CORE_TEXTURES, supportsHover).forEach(path => useTexture.preload(path));

// Helper component to handle global audio enable on interaction
const GlobalAudioEnabler = () => {
  const { enableAudio } = useAudio();
  useEffect(() => {
    const handleInteraction = () => enableAudio();
    window.addEventListener('click', handleInteraction, { once: true });
    window.addEventListener('touchstart', handleInteraction, { once: true });
    window.addEventListener('keydown', handleInteraction, { once: true });
    return () => {
      window.removeEventListener('click', handleInteraction);
      window.removeEventListener('touchstart', handleInteraction);
      window.removeEventListener('keydown', handleInteraction);
    };
  }, [enableAudio]);
  return null;
};

// Scene background using corridor wall texture (static, no animation)
const configurePaperTexture = texture => { texture.colorSpace = THREE.SRGBColorSpace; };
const PaperSceneBackground = () => {
  const texture = useTexture('/textures/paper-texture.webp', configurePaperTexture);
  return <primitive attach="background" object={texture} />;
};

// Bridge component to use hooks inside SceneProvider
// Handles dynamic meta tags + deep link auto-teleport
function DocumentMetaBridge() {
  useDocumentMeta();

  const { initialRoom, deeplinkHandled: deeplinkHandledRef, hasEntered, teleportTo } = useScene();

  // Deep linking: if user lands on e.g. /gallery, auto-teleport after scene loads
  useEffect(() => {
    if (initialRoom && hasEntered && !deeplinkHandledRef.current) {
      deeplinkHandledRef.current = true;
      // Small delay to let the corridor render first
      setTimeout(() => teleportTo(initialRoom), 300);
    }
  }, [initialRoom, hasEntered, teleportTo, deeplinkHandledRef]);

  return null;
}

function AppContent() {
  const [isLoaded, setIsLoaded] = useState(false);
  const [sceneReady, setSceneReady] = useState(false);

  // Use Performance Context
  const { settings, downgradeTier } = usePerformance();

  const handleSceneReady = useCallback(() => {
    requestAnimationFrame(() => {
      setSceneReady(true);
    });
  }, []);

  return (
    <AudioProvider>
      <SceneProvider>
        <DocumentMetaBridge />
        <GlobalAudioEnabler />
        <div className="app">
          {/* Full screen 3D Canvas */}
          <div className="canvas-wrapper">
            <Canvas
              camera={{
                position: [0, 0.2, 28],
                fov: 60,
                near: 0.1,
                far: 150
              }}
              gl={{
                antialias: settings.antialias,
                alpha: false,
                powerPreference: settings.powerPreference,
                localClippingEnabled: true,
                failIfMajorPerformanceCaveat: true
              }}
              dpr={settings.dpr}
              shadows={settings.shadows}
            >
              <color attach="background" args={['#fafafa']} />
              <fog attach="fog" args={['#fafafa', 15, 50]} />

              {/* Scale performance down if fps drops */}
              <PerformanceMonitor
                onDecline={() => downgradeTier()}
                flipflops={3}
                onFallback={() => downgradeTier()}
              />

              {/* Advanced FPS & Performance Monitor */}
              {/* <Perf position="top-left" minimal={false} /> */}

              <Suspense fallback={null}>
                <Experience
                  onSceneReady={handleSceneReady}
                />
                <Preload all />
              </Suspense>
            </Canvas>
          </div>

          {/* Navigation UI - Hamburger, Map, Back, Audio */}
          {isLoaded && (
            <>
              <NavigationUI />
              <GlobalOverlay />
              <PaperTransition />
              <ScreenReaderOverlay />
            </>
          )}

          {/* 2D Preloader */}
          <Preloader
            ready={sceneReady}
            onComplete={() => setIsLoaded(true)}
          />
        </div>
      </SceneProvider>
    </AudioProvider>
  );
}

import { AchievementsProvider } from './context/AchievementsProvider';

export default function App() {
  // Preload browser-based images (for standard <img> tags) immediately upon mounting App
  // This ensures they are in the network waterfall during the initial loading phase.
  useEffect(() => {
    if (!webglSupported) return;
    // Reviewed local content is ready; preload the browser images.
    loadLocalContent();

    const filteredImages = filterTexturesByDevice(IMAGE_ASSETS, supportsHover);
    // console.log(`[Preload] Triggering browser-level image preloads for ${filteredImages.length} assets.`);
    filteredImages.forEach(path => preloadBrowserImage(path));
  }, []);

  if (!webglSupported) return <SceneRecovery />;

  return (
    <PerformanceProvider>
      <AchievementsProvider>
        <SceneErrorBoundary><AppContent /></SceneErrorBoundary>
      </AchievementsProvider>
    </PerformanceProvider>
  );
}



