import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text, useTexture, Line } from '@react-three/drei';
import * as THREE from 'three';
import { CHINESE_FONT } from '../../../../config/zh-CN';

const ink = '#242424';
const font = '/fonts/CabinSketch-Bold.ttf';
const framePoints = [[-.68, .92, 0], [.67, .93, 0], [.69, -.93, 0], [-.69, -.92, 0], [-.68, .92, 0]];

function ProjectPreview({ url }) {
    const texture = useTexture(url, t => { t.colorSpace = THREE.SRGBColorSpace; });
    return <mesh><planeGeometry args={[1.24, 1.24 / 1.44]} /><meshBasicMaterial map={texture} toneMapped={false} /></mesh>;
}

// Live text on the original paper, so Chinese copy stays editable and searchable.
export default function ProjectCover({ project, paperMaterial, paintProgress }) {
    const root = useRef();
    useFrame(state => {
        if (!root.current || !paperMaterial.current) return;
        root.current.visible = (!paintProgress || paintProgress.value > .45) && Math.cos(root.current.parent.rotation.x) > 0;
        const bend = paperMaterial.current.bend;
        const wind = .02 + (paperMaterial.current.windStrength || 0);
        for (const row of root.current.children) {
            const y = row.position.y, phase = state.clock.elapsedTime * 2 + y * 2;
            const amplitude = wind * (1 + Math.abs(bend * 3));
            row.position.z = y * y * bend + Math.sin(phase) * amplitude + .04;
            row.rotation.x = Math.atan(2 * y * bend + 2 * Math.cos(phase) * amplitude);
        }
    });
    const common = { color: ink, anchorX: 'center', anchorY: 'middle', textAlign: 'center', overflowWrap: 'break-word', 'material-side': THREE.FrontSide };
    return <group ref={root} name={`shian-project-cover-${project.id}`}>
        <group><Line points={framePoints} color={ink} lineWidth={1} /></group>
        <group position={[0, .68, 0]}>
            <Text {...common} font={project.id === 'shian-digital-space' ? font : CHINESE_FONT} fontSize={.155} maxWidth={1.24} lineHeight={1.1}>{project.cardTitle}</Text>
        </group>
        <group position={[0, .03, 0]}>
            {project.preview ? <ProjectPreview url={project.preview} /> : <>
                <Text {...common} font={project.id === 'opengeo' ? font : CHINESE_FONT} fontSize={project.id === 'opengeo' ? .4 : .55}>{project.coverWord}</Text>
                <Text {...common} position={[0, -.3, .001]} font={CHINESE_FONT} fontSize={.077}>{project.coverCaption}</Text>
            </>}
        </group>
        <group position={[0, -.49, 0]}><Text {...common} font={CHINESE_FONT} fontSize={.083}>{project.status}</Text></group>
        <group position={[0, -.68, 0]}><Text {...common} font={CHINESE_FONT} fontSize={.083} maxWidth={1.12} lineHeight={1.4}>{project.summary}</Text></group>
        <group position={[0, -.87, 0]}><Text {...common} font={CHINESE_FONT} fontSize={.062} color="#555">点击纸卡 · 翻面了解</Text></group>
    </group>;
}

