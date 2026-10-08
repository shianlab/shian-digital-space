import { useEffect, useMemo } from 'react';
import { useTexture } from '@react-three/drei';
import * as THREE from 'three';
import gsap from 'gsap';

// Fade pigment in the material, preserving the source painting and handwritten glyphs.
export default function WallArt({ texturePath, width, height, active = false, strength = .85, idleStrength = .12, uvCrop, removePaper = false, ...meshProps }) {
    const texture = useTexture(texturePath, loaded => {
        loaded.colorSpace = THREE.SRGBColorSpace;
        if (uvCrop) {
            loaded.repeat.set(uvCrop.width / uvCrop.sourceWidth, uvCrop.height / uvCrop.sourceHeight);
            loaded.offset.set(uvCrop.left / uvCrop.sourceWidth, (uvCrop.sourceHeight - uvCrop.top - uvCrop.height) / uvCrop.sourceHeight);
        }
    });
    const material = useMemo(() => {
        // Opaque painting writes depth so the frame's white opening cannot cover it.
        const next = new THREE.MeshBasicMaterial({ map: texture, color: '#e0e0e0', transparent: removePaper, alphaTest: .025, depthWrite: !removePaper });
        next.userData.wallArtReveal = { value: 0 };
        next.onBeforeCompile = shader => {
            shader.uniforms.uWallArtReveal = next.userData.wallArtReveal;
            shader.uniforms.uWallArtStrength = { value: strength };
            shader.uniforms.uIdleStrength = { value: idleStrength };
            shader.uniforms.uRemovePaper = { value: removePaper ? 1 : 0 };
            shader.fragmentShader = 'uniform float uWallArtReveal;\nuniform float uWallArtStrength;\nuniform float uIdleStrength;\nuniform float uRemovePaper;\n' + shader.fragmentShader;
            shader.fragmentShader = shader.fragmentShader.replace('#include <map_fragment>', `
                vec3 paperColor = diffuseColor.rgb;
                #include <map_fragment>
                vec3 pigment = diffuseColor.rgb / max(paperColor, vec3(0.001));
                float gray = dot(pigment, vec3(0.2126, 0.7152, 0.0722));
                diffuseColor.a *= mix(1.0, 1.0 - smoothstep(0.80, 0.97, gray), uRemovePaper);
                vec3 faintInk = paperColor * (1.0 - (1.0 - gray) * uIdleStrength);
                vec3 revealedInk = mix(paperColor * (1.0 - (1.0 - gray) * 0.12), diffuseColor.rgb, uWallArtStrength);
                diffuseColor.rgb = mix(faintInk, revealedInk, uWallArtReveal);
            `);
        };
        next.customProgramCacheKey = () => 'shian-wall-art-fade-v3';
        return next;
    }, [texture, strength, idleStrength, removePaper]);

    useEffect(() => {
        const tween = gsap.to(material.userData.wallArtReveal, { value: active ? 1 : 0, duration: .45, ease: 'power2.out' });
        return () => tween.kill();
    }, [active, material]);
    useEffect(() => () => material.dispose(), [material]);

    return <mesh {...meshProps} material={material}>
        <planeGeometry args={[width, height]} />
    </mesh>;
}
