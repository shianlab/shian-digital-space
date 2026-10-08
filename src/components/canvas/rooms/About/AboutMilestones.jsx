import { useRef, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Text, useTexture, PositionalAudio } from '@react-three/drei';
import * as THREE from 'three';
import { ABOUT_PROFILE, ABOUT_INTRO_DETAIL } from '../../../../config/about-profile';
import { CHINESE_FONT } from '../../../../config/zh-CN';
import { useScene } from '../../../../context/SceneState.js';
import { useAudio } from '../../../../context/AudioManager';

const textStyle = { font: CHINESE_FONT, color: '#242424', anchorX: 'center', anchorY: 'middle', textAlign: 'center', overflowWrap: 'break-word', lineHeight: 1.45 };
const clipZ = -8;
const roomZ = -25;
const clamp = THREE.MathUtils.clamp;

function useMilestone(z, progress, name) {
    const root = useRef();
    const { size } = useThree();
    const mobile = size.width < 768;
    useFrame(() => {
        if (!root.current) return;
        const distance = z + progress.current;
        root.current.visible = roomZ + distance < clipZ;
        root.current.userData.distance = distance;
    });
    return { root, mobile, props: { name: `shian-about-${name}`, position: [0, 0, z] } };
}

function Sprite({ url, width, height, ...props }) {
    const texture = useTexture(url, t => { t.colorSpace = THREE.SRGBColorSpace; });
    return <mesh {...props}>
        <planeGeometry args={[width, height ?? width * texture.image.height / texture.image.width]} />
        <meshBasicMaterial map={texture} transparent side={THREE.DoubleSide} depthWrite={false} color="#e0e0e0" />
    </mesh>;
}

export function IntroMilestone({ z, scrollProgressRef }) {
    const { root, mobile, props } = useMilestone(z, scrollProgressRef, 'intro');
    const content = useRef();
    const { openOverlay, overlayContent, isTeleporting, currentRoom } = useScene();
    useFrame(({ clock }) => {
        if (!content.current) return;
        const progress = clamp((z + scrollProgressRef.current + 3) / 16, 0, 1);
        content.current.position.x = -progress * progress * (mobile ? 4 : 10);
        content.current.position.y = Math.sin(clock.elapsedTime * .8) * .12;
    });
    const open = e => {
        e.stopPropagation();
        if (currentRoom === 'about' && !overlayContent && !isTeleporting && e.delta <= 6) openOverlay(ABOUT_INTRO_DETAIL);
    };
    return <group ref={root} {...props}>
        <group ref={content} scale={mobile ? .7 : 1}>
            <Text {...textStyle} name="shian-about-name" position={[0, 5.45, .1]} fontSize={.8}>{ABOUT_PROFILE.name}</Text>
            <Text {...textStyle} position={[0, 4.7, .1]} font="/fonts/CabinSketch-Bold.ttf" fontSize={.43}>SHIAN</Text>
            <Text {...textStyle} name="shian-about-identities" position={[0, 4.04, .1]} fontSize={.28} maxWidth={7}>{ABOUT_PROFILE.identities.join(' · ')}</Text>
            <Sprite name="shian-about-avatar" url="/textures/shian/about/cloud-rest.webp" width={7.7} height={3.85} position={[0, 2, 0]} />
            <Text {...textStyle} position={[0, -.02, .1]} fontSize={.32}>{ABOUT_PROFILE.motto}</Text>
            <Text {...textStyle} position={[0, -.6, .1]} fontSize={.23} color="#555">{ABOUT_PROFILE.tags.join(' · ')}</Text>
            <group name="shian-about-read-intro" position={[0, -1.2, .15]} onClick={open}
                onPointerOver={() => { document.body.style.cursor = 'pointer'; }} onPointerOut={() => { document.body.style.cursor = 'auto'; }}>
                <Sprite url="/textures/about/button.webp" width={2.6} height={.6} />
                <Text {...textStyle} position={[0, 0, .02]} fontSize={.25}>阅读介绍</Text>
            </group>
        </group>
    </group>;
}

function Qualification({ item, x, y }) {
    const ref = useRef();
    const [hovered, setHovered] = useState(false);
    useFrame((_, delta) => {
        if (!ref.current) return;
        const scale = THREE.MathUtils.lerp(ref.current.scale.x, hovered ? 1.04 : 1, Math.min(1, delta * 10));
        ref.current.scale.setScalar(scale);
    });
    return <group ref={ref} position={[x, y, 0]} name={`shian-about-qualification-${item.id}`}
        onPointerOver={() => setHovered(true)} onPointerOut={() => setHovered(false)}>
        <Sprite url={hovered ? '/textures/about/SOTD_painted.webp' : '/textures/about/SOTD.webp'} width={3.7} height={2.7} />
        <Text {...textStyle} position={[0, .91, .02]} fontSize={.21}>资质</Text>
        <Text {...textStyle} name={`shian-about-qualification-title-${item.id}`} position={[0, 0, .03]} fontSize={.27} maxWidth={2.35}>{item.cardTitle}</Text>
    </group>;
}

export function AwardsMilestone({ z, scrollProgressRef }) {
    const { root, mobile, props } = useMilestone(z, scrollProgressRef, 'qualifications');
    const papers = useRef();
    useFrame(({ clock }) => {
        if (!papers.current) return;
        const reveal = clamp((z + scrollProgressRef.current + 60) / 30, 0, 1);
        papers.current.position.y = 1.4 + (1 - reveal) * -3 + Math.sin(clock.elapsedTime * .5) * .1;
    });
    return <group ref={root} {...props}>
        <Text {...textStyle} name="shian-about-qualifications-heading" position={[0, 5.7, .1]} fontSize={mobile ? .6 : .9}>资质与荣誉</Text>
        <group ref={papers} position={[0, 1.4, 0]}>
            {ABOUT_PROFILE.qualifications.map((item, i) => <Qualification key={item.id} item={item} x={mobile ? 0 : (i - .5) * 4.3} y={mobile ? 2.4 - i * 3.1 : .5} />)}
        </group>
        <Text {...textStyle} position={[0, mobile ? -1.3 : -.15, .1]} fontSize={.3}>竞赛荣誉</Text>
        {ABOUT_PROFILE.honors.map(item => <Text key={item.id} {...textStyle} name={`shian-about-honor-${item.id}`} position={[0, mobile ? -2.05 : -.9, .1]} fontSize={mobile ? .22 : .26} maxWidth={mobile ? 4.6 : 9} lineHeight={1.45}>{item.displayTitle}</Text>)}
    </group>;
}

export function JourneyMilestone({ z, scrollProgressRef }) {
    const { root, mobile, props } = useMilestone(z, scrollProgressRef, 'practices');
    const islands = useRef();
    useFrame(({ clock }) => {
        if (!islands.current) return;
        islands.current.children.forEach((island, i) => {
            const reveal = clamp((z + scrollProgressRef.current + 60) / 35, 0, 1);
            island.position.y = (mobile ? 2.65 - i * 4.1 : 1.8 + i * .7) - (1 - reveal) * 3 + Math.sin(clock.elapsedTime * .5 + i * 2) * .18;
            island.rotation.z = Math.sin(clock.elapsedTime * .3 + i) * .035;
        });
    });
    return <group ref={root} {...props}>
        <Text {...textStyle} name="shian-about-practices-heading" position={[0, 6, .1]} fontSize={mobile ? .48 : .75}>社区与共建</Text>
        <group ref={islands}>
            {ABOUT_PROFILE.practices.map((item, i) => <group key={item.id} name={`shian-about-island-${item.id}`} position={[mobile ? 0 : (i - .5) * 7.2, 2, i * .2]} scale={mobile ? .84 : 1}>
                <Sprite url="/textures/shian/about/island-blank.png" width={8.8} height={4.4} />
                <Text {...textStyle} position={[0, .8, .07]} fontSize={.45} maxWidth={4.8}>{item.title}</Text>
                <Text {...textStyle} name={`shian-about-practice-description-${item.id}`} position={[.06, -.43, .1]} fontSize={.21} maxWidth={2.65} lineHeight={1.35}>{item.description}</Text>
            </group>)}
        </group>
    </group>;
}

const balloonPositions = [[-2.4, 2.6, .3], [2.4, 2.9, .2], [0, 3.6, .5], [-4.2, 1.1, -.3], [4.2, 1.4, -.2], [-2, -.2, -.4], [2, -.4, -.4]];

function InterestBalloon({ label, index, mobile, progress }) {
    const root = useRef(), skin = useRef(), popText = useRef(), audio = useRef();
    const poppedAt = useRef(null), hovered = useRef(false);
    const { globalVolume, isMuted } = useAudio();
    const { currentRoom, overlayContent, isTeleporting } = useScene();
    const [x, y, z] = balloonPositions[index];
    const baseX = x * (mobile ? .58 : 1);
    useFrame(({ clock }) => {
        if (!root.current) return;
        const t = clock.elapsedTime;
        const reveal = clamp((progress.current + 70) / 40, 0, 1);
        root.current.position.set(baseX + Math.sin(t * .4 + index) * .1, y - (1 - reveal) * 7 + Math.sin(t * .6 + index) * .17, z);
        root.current.rotation.z = Math.sin(t * .3 + index) * .045;
        root.current.scale.setScalar((mobile ? .87 : 1) * (hovered.current ? 1.035 : 1));
        if (poppedAt.current !== null && t - poppedAt.current > 3.6) poppedAt.current = null;
        const age = poppedAt.current === null ? 0 : t - poppedAt.current;
        skin.current.visible = poppedAt.current === null;
        popText.current.visible = poppedAt.current !== null;
        popText.current.fillOpacity = clamp(3.6 - age, 0, 1);
        root.current.userData.popped = poppedAt.current !== null;
    });
    const pop = e => {
        e.stopPropagation();
        if (currentRoom !== 'about' || overlayContent || isTeleporting || poppedAt.current !== null || e.delta > 6) return;
        // Set from the render clock in the next frame via the shared time value.
        poppedAt.current = root.current.userData.time;
        if (audio.current && !isMuted) {
            audio.current.setVolume(globalVolume);
            if (audio.current.isPlaying) audio.current.stop();
            audio.current.play();
        }
    };
    useFrame(({ clock }) => { if (root.current) root.current.userData.time = clock.elapsedTime; });
    const size = index < 3 ? 2.7 : 2.15;
    return <group ref={root} name={`shian-about-interest-${index}`} onClick={pop}
        onPointerOver={() => { hovered.current = true; document.body.style.cursor = 'pointer'; }}
        onPointerOut={() => { hovered.current = false; document.body.style.cursor = 'auto'; }}>
        <group ref={skin}>
            <Sprite url="/textures/shian/about/balloon-blank.png" width={size * .5} height={size} />
            <Text {...textStyle} name={`shian-about-interest-label-${index}`} position={[0, size * .24, .03]} fontSize={label === '自动化工作流' ? .145 : .18} maxWidth={size * .38} lineHeight={1.3}>{label}</Text>
        </group>
        <Text {...textStyle} ref={popText} position={[0, .5, .05]} fontSize={.34} maxWidth={2.9} outlineWidth={.015} outlineColor="#fff" visible={false}>{label}</Text>
        <PositionalAudio ref={audio} url="/sounds/baloonpoop.mp3" distanceModel="exponential" refDistance={2} rolloffFactor={2} loop={false} />
    </group>;
}

export function SkillsMilestone({ z, scrollProgressRef }) {
    const { root, mobile, props } = useMilestone(z, scrollProgressRef, 'interests');
    const progress = useRef(0);
    useFrame(() => { progress.current = z + scrollProgressRef.current; });
    return <group ref={root} {...props}>
        <Text {...textStyle} name="shian-about-interests-heading" position={[0, 6, .1]} fontSize={mobile ? .6 : .9}>关注方向</Text>
        <Text {...textStyle} position={[0, 5.2, .1]} fontSize={mobile ? .25 : .32}>我在研究和实践的方向</Text>
        {ABOUT_PROFILE.interests.map((label, i) => <InterestBalloon key={label} label={label} index={i} mobile={mobile} progress={progress} />)}
    </group>;
}

