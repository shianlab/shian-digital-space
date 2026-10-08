import { useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Text } from '@react-three/drei';
import * as THREE from 'three';
import { SHIAN_IP, getDodgeTarget, getWelcomeTextScale } from '../../../config/shian-ip';
import HandwrittenLabel from '../HandwrittenLabel';
import useReducedMotion from '../../../hooks/useReducedMotion';

const LETTERS = [
    { char: 'S', x: -0.88, split: -1.8 },
    { char: 'H', x: -0.40, split: -1.0 },
    { char: 'I', x: -0.07, split: 0.65 },
    { char: 'A', x: 0.27, split: 1.1 },
    { char: 'N', x: 0.77, split: 1.8 },
];
const LABEL_X = [-0.714, 0.052, 0.766];
const LABEL_SPLIT = [-1.5, 0.4, 1.5];

export default function HeroText() {
    const group = useRef();
    const letters = useRef([]);
    const labels = useRef([]);
    const split = useRef(0);
    const world = useMemo(() => new THREE.Vector3(), []);
    const { size } = useThree();
    const scale = getWelcomeTextScale(size.width / size.height);
    const reducedMotion = useReducedMotion();

    useFrame(({ camera, clock }, delta) => {
        group.current.getWorldPosition(world);
        const distance = camera.position.z - world.z;
        const target = -getDodgeTarget(distance) * 0.6;
        split.current = THREE.MathUtils.damp(split.current, target, 5, delta);
        const time = clock.elapsedTime;
        letters.current.forEach((letter, i) => {
            if (!letter) return;
            letter.position.x = LETTERS[i].x * scale + LETTERS[i].split * split.current;
            letter.position.y = 1.08 + (reducedMotion ? 0 : Math.sin(time * 0.7 + i * 0.5) * 0.008);
            letter.rotation.z = reducedMotion ? 0 : Math.sin(time * 0.5 + i) * 0.01;
        });
        labels.current.forEach((label, i) => {
            if (!label) return;
            label.position.x = LABEL_X[i] * scale + LABEL_SPLIT[i] * split.current;
        });
    });

    return <group ref={group} position={[0, 0, -0.5]} name="shian-hero">
        {LETTERS.map((letter, i) => <Text key={letter.char} name={`shian-letter-${letter.char}`}
            ref={node => { letters.current[i] = node; }} position={[letter.x * scale, 1.08, 0]}
            font="/fonts/RubikScribble-Regular.ttf" fontSize={0.63 * scale}
            color="#ffffff" outlineWidth={0.008 * scale} outlineColor="#1a1a1a" anchorX="center" anchorY="middle">
            {letter.char}
        </Text>)}
        {SHIAN_IP.labels.map((label, i) => <HandwrittenLabel key={label} name={`shian-label-${i}`}
            ref={node => { labels.current[i] = node; }} position={[LABEL_X[i] * scale, 0.60, 0.2]}
            text={label} height={0.115 * scale} maxWidth={0.72 * scale} color="#333333" />)}
    </group>;
}

