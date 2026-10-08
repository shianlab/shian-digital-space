import { useRef } from 'react';
import { Text, useTexture } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { SHIAN_ENTRANCE } from '../../../config/shian-ip';
import useReducedMotion from '../../../hooks/useReducedMotion';

const SignSystem = (props) => {
    const groupRef = useRef();
    const signTexture = useTexture(SHIAN_ENTRANCE.sign);
    const mountTexture = useTexture('/textures/entrance/belka.webp');

    // Physics parameters
    const reducedMotion = useReducedMotion();

    useFrame((state) => {
        if (groupRef.current) {
            // Simple wind sway (idle animation only)
            const time = state.clock.elapsedTime;
            const windSway = reducedMotion ? 0 : Math.sin(time * 2) * 0.05;

            groupRef.current.rotation.x = windSway;
            groupRef.current.rotation.y = 0;
        }
    });

    return (
        <group {...props}>
            {/* 1. THE MOUNT (Visual Anchor) */}
            {/* Texture is horizontal, so we use Width=3.5, Height=0.4 (approx aspect ratio) */}
            {/* No rotation needed as the texture is already horizontal */}
            <mesh position={[-0.05, 2.05, 0.65]}>
                <planeGeometry args={[2.7, 0.4]} />
                <meshBasicMaterial color="#e0e0e0" map={mountTexture} transparent={true} side={THREE.DoubleSide} />
            </mesh>

            {/* 2. THE SIGN (SignGroup) */}
            {/* Positioned exactly at the center of the mounting bar */}
            <group
                ref={groupRef}
                position={[0, 1.9, 0.60]}
            >
                {/* 3. THE PIVOT FIX */}
                {/* Translate geometry DOWN so the top edge (where chains are) is at (0,0,0) of the group */}
                <mesh
                    position={[0, -0.5, 0]} // Moving down by half height (assuming height ~1)
                >
                    {/* Width 2.6 (Narrower), Height 1 */}
                    <planeGeometry args={[2, 1]} />
                    <meshBasicMaterial color="#e0e0e0"
                        map={signTexture}
                        transparent={true}
                        side={THREE.DoubleSide}
                        depthWrite={false} // Fix for seeing objects behind transparent parts
                    />
                </mesh>
                <Text name="shian-sign-first" position={[0, -0.57, 0.012]} font="/fonts/CabinSketch-Regular.ttf"
                    fontSize={0.25} color="#1a1a1a" anchorX="center" anchorY="middle">ShiAn’s</Text>
                <Text name="shian-sign-second" position={[0, -0.80, 0.012]} font="/fonts/CabinSketch-Regular.ttf"
                    fontSize={0.205} color="#1a1a1a" anchorX="center" anchorY="middle">Digital Space</Text>
            </group>
        </group>
    );
};

export default SignSystem;
