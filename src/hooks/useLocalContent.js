import { STUDIO_CONTENT } from '../config/studio-content.js';
import { GALLERY_PROJECTS } from '../config/gallery-projects.js';

// Reviewed local content now covers all three content rooms.
// Retain the existing preload API so startup and room warmup share this ready state.
const localContent = { loaded: true, loading: false, error: null };
export function loadLocalContent() { return Promise.resolve(localContent); }
export function isLocalContentReady() { return true; }
export function useGalleryProjects() { return GALLERY_PROJECTS; }
export function useStudioContent() { return STUDIO_CONTENT; }

