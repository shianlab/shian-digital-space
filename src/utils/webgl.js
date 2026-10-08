// Match the renderer's WebGL 2 and performance-caveat requirements before Canvas
// starts its asynchronous setup; renderer setup failures bypass React boundaries.
export function supportsWebGL() {
    if (typeof document === 'undefined' || typeof WebGL2RenderingContext === 'undefined') return false;
    try {
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('webgl2', { failIfMajorPerformanceCaveat: true });
        if (!context) return false;
        context.getExtension('WEBGL_lose_context')?.loseContext();
        return true;
    } catch {
        return false;
    }
}
