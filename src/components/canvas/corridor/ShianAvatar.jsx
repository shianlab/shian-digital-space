import { useCallback, useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useTexture } from '@react-three/drei';
import * as THREE from 'three';
import { SHIAN_IP, advanceWave, getAvatarLayout, getDodgeTarget } from '../../../config/shian-ip';
import useReducedMotion from '../../../hooks/useReducedMotion';

const DEFAULT_POSITION = [0, SHIAN_IP.floorY, -0.3];

export default function ShianAvatar({
    position = DEFAULT_POSITION, visibleHeight = SHIAN_IP.visibleHeight,
    playing, frame = SHIAN_IP.stillFrame, fps = SHIAN_IP.fps,
    onReady,
}) {
    const { camera, gl } = useThree();
    const reducedMotion = useReducedMotion();
    const animate = playing ?? !reducedMotion;
    // Configure loader-owned textures in its onLoad callback, before GPU upload.
    const configureTextures = useCallback(loaded => {
        for (const texture of loaded) {
            const anisotropy = Math.min(4, gl.capabilities.getMaxAnisotropy());
            if (texture.colorSpace !== THREE.SRGBColorSpace || texture.anisotropy !== anisotropy) {
                texture.colorSpace = THREE.SRGBColorSpace;
                texture.anisotropy = anisotropy;
                texture.needsUpdate = true;
            }
            gl.initTexture(texture);
        }
    }, [gl]);
    const textures = useTexture(SHIAN_IP.frames, configureTextures);
    const group = useRef();
    const mesh = useRef();
    const clock = useRef({ index: 4, elapsed: 0 });
    const world = useMemo(() => new THREE.Vector3(), []);
    const layout = getAvatarLayout(visibleHeight);

    useEffect(() => { onReady?.(); }, [onReady]);

    useLayoutEffect(() => {
        clock.current = { index: SHIAN_IP.sequence.indexOf(frame), elapsed: 0 };
        mesh.current.material.map = textures[frame - 1];
        mesh.current.userData.frame = frame;
    }, [frame, animate, textures]);

    useFrame((_, delta) => {
        group.current.getWorldPosition(world);
        // Preserve the original approach / pass / return behavior at any refresh rate.
        const target = getDodgeTarget(camera.position.z - world.z);
        group.current.position.x = THREE.MathUtils.damp(group.current.position.x, position[0] + target, 5, delta);
        if (!animate || document.hidden || camera.position.z - world.z > 18 || camera.position.z - world.z < -3) return;
        clock.current = advanceWave(clock.current.index, clock.current.elapsed, Math.min(delta, 0.1), fps);
        const next = SHIAN_IP.sequence[clock.current.index];
        if (mesh.current.userData.frame !== next) {
            mesh.current.material.map = textures[next - 1];
            mesh.current.userData.frame = next;
        }
    });

    return (
        <group ref={group} position={position} name="shian-foot-anchor">
            <mesh ref={mesh} name="shian-avatar" position={[layout.offsetX, layout.offsetY, 0]}>
                <planeGeometry args={[layout.width, layout.height]} />
                <meshBasicMaterial map={textures[frame - 1]} color="#ffffff" transparent
                    alphaTest={0.02} depthWrite={false} side={THREE.DoubleSide} toneMapped={false} />
            </mesh>
        </group>
    );
}
