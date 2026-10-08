import { roomFromPath } from '../config/rooms';
import { PAGE_META, SITE_PROFILE } from '../config/site-profile.js';
import { useEffect, useRef } from 'react';
import { useScene } from '../context/SceneState.js';

/**
 * useDocumentMeta — Dynamic Meta Tags & Virtual Routing (History API)
 * 
 * Updates the browser URL, page title, and meta description
 * whenever the user enters/exits a 3D room. Also handles the
 * browser back/forward buttons for seamless navigation.
 */

const ROOM_META = PAGE_META;

// Map URL paths back to room IDs for deep linking


/**
 * Returns the room ID that the initial URL points to (for deep linking).
 * Call this once at app startup to determine if we need to auto-teleport.
 */
export function getInitialRoomFromUrl() {
    const path = window.location.pathname.replace(/\/+$/, '') || '/';
    return roomFromPath(path);
}

export function useDocumentMeta() {
    const { currentRoom, teleportTo, requestExit, hasEntered, initialRoom, deeplinkHandled } = useScene();
    const isHandlingPopState = useRef(false);
    const lastPushedRoom = useRef(undefined); // Track what we last pushed to avoid duplicates

    // Update document meta and URL when room changes
    useEffect(() => {
        // Preserve a direct room URL and its metadata while the entrance is loading.
        const metaRoom = currentRoom ?? (!deeplinkHandled.current ? initialRoom : null);
        const roomKey = metaRoom === null ? 'null' : metaRoom;
        const meta = ROOM_META[roomKey] || ROOM_META['null'];

        // Update the page title
        document.title = meta.title;

        // Update meta description
        const descTag = document.querySelector('meta[name="description"]');
        if (descTag) {
            descTag.setAttribute('content', meta.description);
        }

        // Update OG meta tags
        const ogTitle = document.querySelector('meta[property="og:title"]');
        if (ogTitle) ogTitle.setAttribute('content', meta.title);

        const ogDesc = document.querySelector('meta[property="og:description"]');
        if (ogDesc) ogDesc.setAttribute('content', meta.description);

        const twitterTitle = document.querySelector('meta[name="twitter:title"]');
        if (twitterTitle) twitterTitle.setAttribute('content', meta.title);
        const twitterDesc = document.querySelector('meta[name="twitter:description"]');
        if (twitterDesc) twitterDesc.setAttribute('content', meta.description);

        const ogUrl = document.querySelector('meta[property="og:url"]');
        if (ogUrl) ogUrl.setAttribute('content', new URL(meta.path, SITE_PROFILE.url).href);

        // Update canonical link to ensure virtual routes are correctly indexable as separate pages
        const canonicalTag = document.querySelector('link[rel="canonical"]');
        if (canonicalTag) {
            canonicalTag.setAttribute('href', new URL(meta.path, SITE_PROFILE.url).href);
        }

        const schemaTag = document.querySelector('script[type="application/ld+json"]');
        if (schemaTag) {
            const schema = JSON.parse(schemaTag.textContent);
            const page = schema['@graph'].find(item => item['@type'] === 'WebPage');
            page['@id'] = new URL(meta.path + '#page', SITE_PROFILE.url).href;
            page.url = new URL(meta.path, SITE_PROFILE.url).href;
            page.name = meta.title;
            page.description = meta.description;
            schemaTag.textContent = JSON.stringify(schema).replace(/</g, '\\u003c');
        }

        // Push to browser history (only if not handling a popstate event and room actually changed)
        if (!isHandlingPopState.current && lastPushedRoom.current !== metaRoom) {
            // Use replaceState for the very first load, pushState for subsequent navigations
            if (lastPushedRoom.current === undefined) {
                window.history.replaceState({ room: metaRoom }, '', meta.path);
            } else {
                window.history.pushState({ room: metaRoom }, '', meta.path);
            }
            lastPushedRoom.current = metaRoom;
        }

        isHandlingPopState.current = false;
    }, [currentRoom, hasEntered, initialRoom, deeplinkHandled]);

    // Handle browser back/forward buttons
    useEffect(() => {
        const handlePopState = (event) => {
            isHandlingPopState.current = true;
            const targetRoom = event.state?.room ?? null;
            lastPushedRoom.current = targetRoom;

            if (targetRoom === null) {
                // Follow the existing exit animation without pushing a new history entry.
                // The room-change effect updates metadata once the corridor is restored.
                requestExit();
            } else if (hasEntered) {
                // Teleport to the target room
                teleportTo(targetRoom);
            }
        };

        window.addEventListener('popstate', handlePopState);
        return () => window.removeEventListener('popstate', handlePopState);
    }, [teleportTo, requestExit, hasEntered]);
}
