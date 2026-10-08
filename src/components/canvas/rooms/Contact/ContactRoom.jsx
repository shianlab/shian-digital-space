import { useRef, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useTexture, PositionalAudio } from '@react-three/drei';
import * as THREE from 'three';
import SocialBarrel from './SocialBarrel';
import GalleryClouds from '../Gallery/GalleryClouds';
import { usePaintMaterial } from '../Gallery/usePaintMaterial';
import { useScene } from '../../../../context/SceneState.js';
import { useAchievements } from '../../../../context/AchievementsContext';
import { useAudio } from '../../../../context/AudioManager';
import { CONTACT_CHANNELS, contactDetail } from '../../../../config/contact-channels';

const AUDIO_SETTINGS = { volume: 2, distance: 2, rolloff: 1.2 };
const LIGHTHOUSE = { position: [-10, 5, -20], rotation: [0, .1, 0], scale: [4.49, 5] };
const SHIP = { position: [0, 1.6, -15], rotation: [0, -.2, 0], scale: [3.35, 1.3] };
const desktopPositions = [[-1.4, -.7, -6], [1.4, -.7, -6], [-3.2, .5, -10], [3.2, .5, -10], [-5, -.3, -8], [5, -.3, -8]];
const mobilePositions = [[-1.2, .75, -9], [1.2, .75, -9], [-1.15, -.4, -7], [1.15, -.4, -7], [-.92, -1.5, -5.8], [.92, -1.5, -5.8]];
function configureTextures(textures) {
    const [sea, dock] = textures;
    textures.forEach(texture => { texture.colorSpace = THREE.SRGBColorSpace; });
    sea.wrapS = sea.wrapT = THREE.MirroredRepeatWrapping;
    sea.repeat.set(6, 4);
    sea.needsUpdate = true;
    dock.wrapS = dock.wrapT = THREE.RepeatWrapping;
    dock.center.set(.5, .5);
    dock.rotation = Math.PI / 2;
    dock.repeat.set(1, 1);
    dock.needsUpdate = true;
}

export default function ContactRoom({ showRoom, onReady, isExiting, isWarmup }) {
    const { size } = useThree();
    const mobile = size.width < 768;
    const mobileWidth = Math.min(1, size.width / 390);
    const { currentRoom, isTeleporting, overlayContent, openOverlay } = useScene();
    const canInteract = showRoom && !isWarmup && !isExiting && !isTeleporting && currentRoom === 'contact' && !overlayContent;
    const { showTutorial, unlockAchievement, hidePopup } = useAchievements();
    const { globalVolume, isMuted } = useAudio();
    const audio = useRef(), group = useRef(), ship = useRef(), waves = useRef([]);
    const ready = useRef(false), frames = useRef(0), teleported = useRef(false);
    const effectiveVolume = isMuted ? 0 : AUDIO_SETTINGS.volume * globalVolume;
    const [seaTexture, dockTexture, lighthouseTexture, shipTexture] = useTexture([
        '/textures/contact/faletopdown.webp', '/textures/contact/molo.webp',
        '/textures/contact/latarnia.webp', '/textures/contact/statek.webp',
    ], configureTextures);
    const { onBeforeCompile, uniformsData, animatePaint, resetPaint, revealPaint, updateRoomOrigin } = usePaintMaterial({
        dirX: 1, dirY: 0, dirZ: -.1, startDist: -5, endDist: 55, noiseAxes: 'yz',
    });
    useEffect(() => { audio.current?.setVolume(effectiveVolume); }, [effectiveVolume]);
    useEffect(() => {
        if (isExiting || isTeleporting) hidePopup();
        if (isTeleporting) teleported.current = true;
    }, [isExiting, isTeleporting, hidePopup]);
    useEffect(() => {
        if (!canInteract) return;
        const timer = setTimeout(() => showTutorial('contact_choose'), 2000);
        return () => clearTimeout(timer);
    }, [canInteract, showTutorial]);
    useEffect(() => {
        if (showRoom && !isWarmup && !teleported.current && !isTeleporting) {
            resetPaint();
            animatePaint(.2, 2.5);
        } else revealPaint();
        return () => resetPaint();
    }, [showRoom, isWarmup, isTeleporting, resetPaint, animatePaint, revealPaint]);
    useFrame(state => {
        updateRoomOrigin(group);
        if (!ready.current && ++frames.current >= 5) { ready.current = true; onReady?.(); }
        const time = state.clock.elapsedTime;
        waves.current.forEach((wave, i) => {
            if (wave) wave.position.y = Math.sin(time * (.8 + i * .15) + i * .5) * (.15 - i * .02);
        });
        if (ship.current) {
            ship.current.position.y = SHIP.position[1] + Math.sin(time * .8) * .3;
            ship.current.position.x = SHIP.position[0] + Math.sin(time * .04) * 12;
            ship.current.rotation.z = Math.sin(time * .96) * .05;
        }
    });
    const openChannel = channel => {
        if (!canInteract) return;
        unlockAchievement('contact_choose');
        openOverlay(contactDetail(channel));
    };
    return <group ref={group} name="shian-contact-room" position={[0, -.7, -5]}>
        {!isWarmup && <PositionalAudio ref={audio} url="/sounds/szummorza.mp3" distanceModel="exponential" refDistance={AUDIO_SETTINGS.distance} rolloffFactor={AUDIO_SETTINGS.rolloff} loop autoplay={showRoom} volume={effectiveVolume} />}
        <GalleryClouds count={45} seed={88} rotationOffset={[0, 1, 0]} />
        <group position={[0, -1, -8]}>
            {Array.from({ length: 4 }, (_, i) => <mesh key={i} name={`shian-contact-wave-${i}`} ref={el => { waves.current[i] = el; }} position={[0, -i * .1, -i * 8]} rotation={[-Math.PI / 2.5, 0, 0]}>
                <planeGeometry args={[80, 30]} />
                <meshBasicMaterial map={seaTexture} color="#fff" transparent opacity={1 - i * .1} side={THREE.DoubleSide} toneMapped={false} onBeforeCompile={onBeforeCompile} />
            </mesh>)}
        </group>
        {CONTACT_CHANNELS.map((channel, i) => {
            const position = mobile ? [mobilePositions[i][0] * mobileWidth, mobilePositions[i][1], mobilePositions[i][2]] : desktopPositions[i];
            const scale = mobile ? [2.12 * mobileWidth * .9, 2.3 * mobileWidth * .9] : [2.12, 2.3];
            return <SocialBarrel key={channel.id} id={channel.id} active={canInteract} position={position} scale={scale} rotation={[0, i % 2 ? -.2 : .2, 0]} texturePath="/textures/contact/beczka.webp" label={channel.label} onClick={() => openChannel(channel)} paintOnBeforeCompile={onBeforeCompile} paintUniforms={uniformsData} />;
        })}
        <mesh name="shian-contact-dock" position={[0, .05, 1.8]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[2.5, 7]} />
            <meshBasicMaterial map={dockTexture} color="#e0e0e0" side={THREE.DoubleSide} transparent onBeforeCompile={onBeforeCompile} />
        </mesh>
        <mesh name="shian-contact-lighthouse" position={LIGHTHOUSE.position} rotation={LIGHTHOUSE.rotation}>
            <planeGeometry args={LIGHTHOUSE.scale} />
            <meshBasicMaterial color="#e0e0e0" map={lighthouseTexture} transparent alphaTest={.5} side={THREE.DoubleSide} onBeforeCompile={onBeforeCompile} />
        </mesh>
        <mesh ref={ship} name="shian-contact-ship" position={SHIP.position} rotation={SHIP.rotation}>
            <planeGeometry args={SHIP.scale} />
            <meshBasicMaterial color="#e0e0e0" map={shipTexture} transparent alphaTest={.5} side={THREE.DoubleSide} onBeforeCompile={onBeforeCompile} />
        </mesh>
    </group>;
}
