import { Component } from 'react';
import { pauseBackgroundMusic } from '../../utils/audioManager';
import '../../styles/SceneStatus.scss';

export function SceneRecovery() {
    return <main className="scene-error" aria-labelledby="scene-error-title">
        <h1 id="scene-error-title">三维场景暂时无法加载</h1>
        <p>请检查网络和浏览器的图形支持后重新加载，也可以先从简洁入口查看介绍、作品和联系方式。</p>
        <div><button type="button" onClick={()=>window.location.reload()}>重新加载</button><a href="/start">打开简洁入口</a></div>
    </main>;
}

export default class SceneErrorBoundary extends Component {
    state = { failed:false };
    static getDerivedStateFromError() { return { failed:true }; }
    componentDidCatch() { pauseBackgroundMusic(); }
    render() {
        if (!this.state.failed) return this.props.children;
        return <SceneRecovery />;
    }
}
