import { useTexture } from '@react-three/drei';
import * as THREE from 'three';
import { HANDWRITING } from '../../config/handwriting';

// Alpha cutouts keep the approved ink's stroke shape and natural uneven baseline.
// Text remains in userData for inspection; DOM controls keep accessible labels.
export default function HandwrittenLabel({ text, height, maxWidth = Infinity, color = '#242424', ...props }) {
    const asset = HANDWRITING[text];
    const texture = useTexture(asset.texture, loaded => { loaded.colorSpace = THREE.SRGBColorSpace; });
    const width = Math.min(height * asset.aspect, maxWidth);
    const inkHeight = width / asset.aspect;
    return <mesh {...props} userData={{ handwritingText: text, handwritingBounds: [width, inkHeight], handwritingSource: asset.texture }}>
        <planeGeometry args={[width, inkHeight]} />
        <meshBasicMaterial map={texture} color={color} transparent alphaTest={.015} depthWrite={false} toneMapped={false} side={THREE.DoubleSide} />
    </mesh>;
}
