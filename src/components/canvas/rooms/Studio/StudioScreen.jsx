import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text, useTexture } from '@react-three/drei';
import * as THREE from 'three';
import { CHINESE_FONT } from '../../../../config/zh-CN';

const common = { color: '#242424', font: CHINESE_FONT, anchorX: 'center', anchorY: 'middle', textAlign: 'center', overflowWrap: 'break-word', 'material-side': THREE.FrontSide };

function Cover({ url, width, maxHeight }) {
    const texture = useTexture(url, t => { t.colorSpace = THREE.SRGBColorSpace; });
    const aspect = texture.image.width / texture.image.height;
    const fittedWidth = Math.min(width, maxHeight * aspect);
    return <mesh><planeGeometry args={[fittedWidth, fittedWidth / aspect]} /><meshBasicMaterial map={texture} toneMapped={false} /></mesh>;
}

// The original device shells stay intact; their blank screens carry editable text.
export default function StudioScreen({ item, paintProgress }) {
    const root = useRef();
    useFrame(() => { if (root.current) root.current.visible = paintProgress.value > .45; });
    const phone = item.device === 'phone', tv = item.device === 'tv';
    const width = phone ? .46 : tv ? .96 : 1.35;
    return <group ref={root} position={[0, 0, item.depth / 2 + .012]} name={`shian-studio-screen-${item.index}`}>
        <group position={[tv ? -.19 : 0, tv ? .055 : .035, 0]}>
            {item.cover ? <>
                <group position={[0, .16, 0]}><Cover url={item.cover} width={phone ? width : width * .8} maxHeight={phone ? .38 : .43} /></group>
                <Text {...common} position={[0, phone ? -.105 : -.2, .002]} fontSize={phone ? .045 : .072} maxWidth={width} lineHeight={1.35}>{item.screenTitle}</Text>
                <Text {...common} position={[0, phone ? -.31 : -.34, .002]} fontSize={phone ? .034 : .042} maxWidth={width}>{item.screenCaption}</Text>
            </> : <>
                <Text {...common} font={item.platform === 'skill' ? '/fonts/CabinSketch-Bold.ttf' : CHINESE_FONT} position={[0, .045, .002]} fontSize={phone ? .068 : tv ? .145 : .2} maxWidth={width} lineHeight={1.2}>{item.screenTitle}</Text>
                <Text {...common} position={[0, -.235, .002]} fontSize={phone ? .034 : .06} maxWidth={width}>{item.screenCaption}</Text>
                <Text {...common} position={[0, -.335, .002]} fontSize={phone ? .034 : .041}>点击了解 ↗</Text>
            </>}
        </group>
        {item.device === 'monitor' && <group position={[0, -.444, .002]}>
            <mesh><planeGeometry args={[.27, .06]} /><meshBasicMaterial color="#e0e0e0" toneMapped={false} /></mesh>
            <Text {...common} position={[0, 0, .002]} font="/fonts/CabinSketch-Bold.ttf" fontSize={.034}>SHIAN</Text>
        </group>}
    </group>;
}

