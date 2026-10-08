import { Component, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Text } from '@react-three/drei';
import * as THREE from 'three';
import CorridorSegment from '../src/components/canvas/corridor/CorridorSegment';
import ShianAvatar from '../src/components/canvas/corridor/ShianAvatar';
import LegacyAvatar from '../src/components/canvas/corridor/Avatar';
import LegacyHeroText from './LegacyHeroText';
import { PerformanceProvider } from '../src/context/PerformanceProvider';
import { SHIAN_IP } from '../src/config/shian-ip';
import { CHINESE_INPUT_FONT } from '../src/config/zh-CN';
import './stage-six.css';

const HOME_Z = 11.65;
const noop = () => {};

class SceneErrorBoundary extends Component {
    state = { error: null };
    static getDerivedStateFromError(error) { return { error }; }
    render() {
        if (this.state.error) return <div className="loading error" role="alert">场景加载失败：{this.state.error.message}<a href="/dev/stage-six.html">重新加载小样</a></div>;
        return this.props.children;
    }
}

function WelcomeText() {
    return <group name="shian-welcome-text">
        <Text name="shian-name" position={[0, 1.08, -0.5]} font="/fonts/RubikScribble-Regular.ttf" fontSize={0.63}
            color="#ffffff" outlineColor="#1a1a1a" outlineWidth={0.008} anchorX="center" anchorY="middle">SHIAN</Text>
        <Text name="shian-labels" position={[0, 0.60, -0.3]} font={CHINESE_INPUT_FONT} fontSize={0.104}
            color="#333333" anchorX="center" anchorY="middle" letterSpacing={0.01}>{SHIAN_IP.labels.join('  ')}</Text>
    </group>;
}

function SceneController({ targetZ, view, onMetrics }) {
    const sample = useRef({ time: 0, frames: 0 });
    const v = useMemo(() => new THREE.Vector3(), []);
    useFrame(({ camera, scene, gl, size }, delta) => {
        camera.position.z = THREE.MathUtils.damp(camera.position.z, targetZ, 5, delta);
        camera.position.x = THREE.MathUtils.damp(camera.position.x, view === 'left' ? -0.7 : view === 'right' ? 0.7 : 0, 5, delta);
        camera.position.y = 0.2;
        camera.rotation.set(0, 0, 0);
        sample.current.time += delta; sample.current.frames++;
        if (sample.current.time < 0.3) return;
        const avatar = scene.getObjectByName('shian-avatar');
        const anchor = scene.getObjectByName('shian-foot-anchor');
        const project = (point, object) => {
            v.set(...point); object.localToWorld(v); v.project(camera);
            return { x: (v.x + 1) * size.width / 2, y: (1 - v.y) * size.height / 2 };
        };
        const textBounds = name => {
            const object = scene.getObjectByName(name), bounds = object?.textRenderInfo?.blockBounds;
            return bounds ? { topLeft: project([bounds[0], bounds[3], 0], object), bottomRight: project([bounds[2], bounds[1], 0], object) } : null;
        };
        const metrics = { cameraZ: camera.position.z, dodgeX: anchor?.position.x ?? 0, frame: avatar?.userData.frame ?? null,
            fps: Math.round(sample.current.frames / sample.current.time), textures: gl.info.memory.textures,
            drawCalls: gl.info.render.calls, viewport: { width: size.width, height: size.height },
            texture: avatar?.material.map?.image?.currentSrc ?? null,
            foot: anchor ? project([0, 0, 0], anchor) : null,
            head: anchor ? project([0, SHIAN_IP.visibleHeight, 0], anchor) : null,
            nameBounds: textBounds('shian-name'), labelBounds: textBounds('shian-labels'),
        };
        // Inspection data belongs only to this development entry, never the main app.
        window.__stageSix = metrics;
        onMetrics(metrics); sample.current = { time: 0, frames: 0 };
    });
    return null;
}

function Ready({ onReady }) { useEffect(() => { onReady(); }, [onReady]); return null; }

function StageSix() {
    const [variant, setVariant] = useState('shian');
    const [ready, setReady] = useState(false);
    const [playing, setPlaying] = useState(() => !window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    const [frame, setFrame] = useState(5);
    const [fps, setFps] = useState(12);
    const [targetZ, setTargetZ] = useState(HOME_Z);
    const [view, setView] = useState('front');
    const [metrics, setMetrics] = useState(null);
    const [guides, setGuides] = useState(false);
    const onReady = useCallback(() => setReady(true), []);
    const reset = () => { setTargetZ(HOME_Z); setView('front'); };
    const move = amount => setTargetZ(z => THREE.MathUtils.clamp(z + amount, 5.2, 14));
    const step = amount => { setPlaying(false); setFrame(f => (f - 1 + amount + 9) % 9 + 1); };

    useEffect(() => {
        const query = window.matchMedia('(prefers-reduced-motion: reduce)');
        const update = () => { if (query.matches) setPlaying(false); };
        query.addEventListener('change', update);
        return () => query.removeEventListener('change', update);
    }, []);

    return <>
        <header><h1>时安，走进手绘空间。</h1><p>第六阶段 · 原走廊中的人物小样</p></header>
        <main>
            <section className="viewport" tabIndex={0} aria-label="三维走廊小样，方向键前进后退"
                onKeyDown={event => { if (event.key === 'ArrowUp' || event.key === 'ArrowDown') { event.preventDefault(); move(event.key === 'ArrowUp' ? -0.45 : 0.45); } }}>
                <SceneErrorBoundary>
                    <Canvas camera={{ position: [0, 0.2, HOME_Z], fov: 60, near: 0.1, far: 100 }}
                        dpr={[1, 1.5]} gl={{ antialias: true, alpha: false, localClippingEnabled: true }}>
                        <color attach="background" args={['#fafafa']} /><fog attach="fog" args={['#fafafa', 15, 50]} />
                        <Suspense fallback={null}>
                            <CorridorSegment segmentIndex={0} hideSegmentDoors setCameraOverride={noop} clearWelcomeText={variant === 'shian'}
                                welcomeContent={variant === 'shian' ? <><WelcomeText /><ShianAvatar playing={playing} frame={frame} fps={fps} />
                                    {guides && <mesh position={[0, SHIAN_IP.floorY + 0.002, -0.3]} rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[2.3, 0.015]} /><meshBasicMaterial color="#bc6435" depthWrite={false} /></mesh>}
                                </> : <><LegacyHeroText position={[0, -0.1, -0.5]} /><LegacyAvatar position={[0, -0.61, -0.3]} /></>} />
                            <Ready onReady={onReady} />
                            <SceneController targetZ={targetZ} view={view} onMetrics={setMetrics} />
                        </Suspense>
                    </Canvas>
                    {!ready && <div className="loading" role="status">正在载入走廊与人物…<span className="note">首次打开需要加载线稿贴图和中文字体。</span></div>}
                </SceneErrorBoundary>
                <div className="view-hint">用「向前走」或方向键靠近，人物会让开通道。</div>
            </section>
            <aside>
                <h2>看人物进入场景</h2>
                <div className="group"><button aria-pressed={variant === 'shian'} onClick={() => setVariant('shian')}>时安人物</button><button aria-pressed={variant === 'original'} onClick={() => setVariant('original')}>原人物对照</button></div>
                <p className="note" role="status">{ready ? '场景已就绪。人物位于原走廊中，可前后移动观察。' : '正在准备小样…'}</p>
                <div className="group"><button onClick={() => move(-0.65)} disabled={!ready || targetZ <= 5.2}>向前走</button><button onClick={() => move(0.65)} disabled={!ready || targetZ >= 14}>往后退</button><button onClick={reset}>回到迎宾位置</button></div>
                <label className="control">观察位置<input aria-label="观察位置" type="range" min="5.2" max="14" step="0.05" value={targetZ} onChange={e => setTargetZ(Number(e.target.value))} /></label>
                <div className="group">{[['left','左侧看'],['front','正面看'],['right','右侧看']].map(([value,label]) => <button key={value} aria-pressed={view === value} onClick={() => setView(value)}>{label}</button>)}</div>
                <hr className="divider" />
                <h2>挥手动作</h2>
                <div className="group"><button disabled={!ready || variant !== 'shian'} onClick={() => setPlaying(p => !p)}>{playing ? '暂停挥手' : '播放挥手'}</button><button aria-label="上一帧" disabled={variant !== 'shian'} onClick={() => step(-1)}>上一帧</button><button aria-label="下一帧" disabled={variant !== 'shian'} onClick={() => step(1)}>下一帧</button></div>
                <label className="control">动作速度<select aria-label="动作速度" value={fps} onChange={e => setFps(Number(e.target.value))}><option value="12">12 帧 / 秒</option><option value="20">20 帧 / 秒</option></select></label>
                <label className="control">静止帧 <output>{frame} / 9</output><input aria-label="静止帧" type="range" min="1" max="9" value={frame} disabled={variant !== 'shian'} onChange={e => { setPlaying(false); setFrame(Number(e.target.value)); }} /></label>
                <label className="control"><input type="checkbox" checked={guides} onChange={e => setGuides(e.target.checked)} /> 显示脚底参考线</label>
                <p className="note">已使用你的三个身份标签。这里验证走廊迎宾区域，完整入口和四个房间导航在后续阶段接入。</p>
                <a href="/dev/stage-five.html">查看全部人物素材</a>
                <p className="note"><a href="/docs/planning/06-ip-scene-prototype.md">第六阶段交付与巡检</a></p>
                <details><summary>查看运行数据</summary><dl><dt>当前动作帧</dt><dd>{metrics?.frame ?? '—'} / 9</dd><dt>场景帧率（当前设备）</dt><dd>{metrics?.fps ?? '—'} FPS</dd><dt>相机位置 / 让路偏移</dt><dd>{metrics?.cameraZ.toFixed(2) ?? '—'} / {metrics?.dodgeX.toFixed(2) ?? '—'}</dd><dt>人物高度</dt><dd>2.1 世界单位；脚底按素材锚点定位</dd></dl></details>
            </aside>
        </main>
    </>;
}

export default function StageSixScene() { return <PerformanceProvider><StageSix /></PerformanceProvider>; }
