/**
 * Simple Global Audio Manager for background music
 */

import { normalizeVolume } from './audioPreferences';

let bgMusicAudio = null;
let isMuted = false;
let bgMusicStarted = false;

// Initialize background music
export const initAudio = () => {
    if (typeof window === 'undefined') return;

    // Sync muted state from localStorage (same key as AudioManager context)
    const savedMuted = localStorage.getItem('audio_muted');
    isMuted = savedMuted === 'true';

    if (!bgMusicAudio) {
        // We use the file provided by the user in public/sounds/
        bgMusicAudio = new Audio('/sounds/cfl_turningpages-belem-breeze-487596.ogg');
        bgMusicAudio.preload = 'auto'; // Force browser to fetch data immediately
        bgMusicAudio.loop = true;
        bgMusicAudio.volume = normalizeVolume(localStorage.getItem('music_volume'), 0.3);
        bgMusicAudio.muted = isMuted; // Apply synced mute state

        // Trigger background load
        bgMusicAudio.load();
    }
};

export const playBackgroundMusic = () => {
    initAudio();
    bgMusicStarted = true;
    if (bgMusicAudio && bgMusicAudio.paused) {
        // Only play if not muted and it's currently paused
        bgMusicAudio.play().catch((err) => {
            console.warn('Audio play failed/blocked by browser:', err);
        });
    }
};

export const pauseBackgroundMusic = () => {
    if (bgMusicAudio && !bgMusicAudio.paused) {
        bgMusicAudio.pause();
    }
};

export const toggleMute = () => {
    isMuted = !isMuted;
    if (bgMusicAudio) {
        bgMusicAudio.muted = isMuted;
    }
    return isMuted;
};

export const getIsMuted = () => isMuted;

export const setMusicVolume = (vol) => {
    const volume = normalizeVolume(vol, 0.3);
    localStorage.setItem('music_volume', String(volume));
    if (bgMusicAudio) {
        bgMusicAudio.volume = volume;
        // Auto-unmute if user drags slider up
        if (volume > 0 && isMuted) {
            isMuted = false;
            bgMusicAudio.muted = false;
            localStorage.setItem('audio_muted', 'false');
        }

        // Ensure playback continues if we unmute, ONLY if the music has actually been requested to start
        if (volume > 0 && bgMusicAudio.paused && bgMusicStarted) {
            bgMusicAudio.play().catch(e => console.warn(e));
        }
    }
    // Dispatch event so UI sliders can stay in sync if changed programmatically
    window.dispatchEvent(new CustomEvent('musicVolumeChanged', { detail: volume }));
};

export const getMusicVolume = () => {
    return bgMusicAudio ? bgMusicAudio.volume : normalizeVolume(localStorage.getItem('music_volume'), 0.3);
};
