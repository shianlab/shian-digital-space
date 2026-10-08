// Development review entry, excluded from the production Vite entry graph.
// Uses the same paper, editor and reading overlay as the actual rooms.
import { Suspense, useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { Canvas } from '@react-three/fiber';
import { SceneProvider } from '../context/SceneContext';
import { useScene } from '../context/SceneState.js';
import GlobalOverlay from '../components/ui/GlobalOverlay';
import MessagePaper from '../components/canvas/rooms/Contact/MessagePaper';
import { PROFILE_PARAGRAPHS } from '../config/zh-CN';
import '../styles/main.scss';
import './ChinesePreview.scss';

export default function Preview() {
    const { openOverlay } = useScene();
    const [showPaper, setShowPaper] = useState(true);
    const [width, setWidth] = useState(window.innerWidth);
    useEffect(() => {
        const onResize = () => setWidth(window.innerWidth);
        window.addEventListener('resize', onResize);
        return () => window.removeEventListener('resize', onResize);
    }, []);
    return <>
        <header className="chinese-preview-header">
            <div><strong>中文基础样板</strong><p>沿用原纸面与详情组件。点击纸面字段，可以输入中文。</p></div>
            <nav aria-label="样板检查">
                <button onClick={() => openOverlay({ title: '关于时安', description: PROFILE_PARAGRAPHS.join('\n\n'), platformConfig: { label: '个人介绍' } })}>查看中文长文</button>
                <button onClick={() => setShowPaper(value => !value)}>{showPaper ? '收起纸面' : '展开纸面'}</button>
                <a href="/">返回网站，查看中文地图与门牌</a>
            </nav>
        </header>
        <main className="chinese-preview-canvas">
            {showPaper && <Canvas orthographic camera={{ position: [0, 4, 0], rotation: [-Math.PI / 2, 0, 0], zoom: Math.min(width / 2.1, 330), near: 0.1, far: 20 }}>
                <color attach="background" args={['#fafafa']} />
                <Suspense fallback={null}><MessagePaper position={[0, 0, 0]} /></Suspense>
            </Canvas>}
        </main>
        <GlobalOverlay />
    </>;
}

createRoot(document.getElementById('root')).render(<SceneProvider><Preview /></SceneProvider>);
