import { UI, CHINESE_FONT_FAMILY } from '../../config/zh-CN';
import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useScene } from '../../context/SceneState.js';
import gsap from 'gsap';
import ContactActions from './ContactActions';
import '../../styles/GlobalOverlay.scss';


const GlobalOverlay = () => {
    const { overlayContent, closeOverlay } = useScene();
    const [animateOpen, setAnimateOpen] = useState(false);

    // Check if mobile based on window width
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 768);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    useEffect(() => {
        const timer = setTimeout(() => setAnimateOpen(Boolean(overlayContent)), overlayContent ? 50 : 0);
        return () => clearTimeout(timer);
    }, [overlayContent]);

    // Retain the last item through the exit animation without delaying incoming content.
    const [cachedContent, setCachedContent] = useState(null);
    if (overlayContent && overlayContent !== cachedContent) setCachedContent(overlayContent);

    // DUMMY RENDER MOCK - Pre-render the heaviest layout (certificate_grid) invisibly 
    // to calculate CSS layout costs on page load, NOT on first click.
    const dummyGridContent = {
        title: UI.loading,
        layout: 'certificate_grid',
        items: [
            { label: '', date: '', image: '' },
            { label: '', date: '', image: '' },
            { label: '', date: '', image: '' },
            { label: '', date: '', image: '' }
        ],
        platformConfig: { label: '...' }
    };

    const content = overlayContent || cachedContent || dummyGridContent;

    // Propagate animateOpen state to control CSS transitions
    return <ContentCard content={content} isOpen={animateOpen} onClose={closeOverlay} isMobile={isMobile} />;
};

const ContentCard = ({ content, isOpen, onClose, isMobile }) => {


    const label = content.platformConfig?.label || UI.content;

    const cardRef = useRef(null);
    useEffect(() => {
        if (!isOpen) return;
        const previousFocus = document.activeElement;
        const frame = requestAnimationFrame(() => cardRef.current?.querySelector('button')?.focus());
        const onKey = e => {
            if (e.isComposing) return;
            if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); onClose(); }
            if (e.key !== 'Tab') return;
            const targets = cardRef.current?.querySelectorAll('button, a[href], [tabindex="0"]');
            if (!targets?.length) return;
            const first = targets[0], last = targets[targets.length - 1];
            if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
            else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
        };
        document.addEventListener('keydown', onKey);
        return () => {
            cancelAnimationFrame(frame);
            document.removeEventListener('keydown', onKey);
            if (previousFocus?.isConnected) previousFocus.focus();
        };
    }, [isOpen, onClose]);

    // Preserve paragraph breaks and render content as text during the reveal.
    const descriptionRef = useRef(null);
    useEffect(() => {
        if (isOpen && content.description && descriptionRef.current && content.layout !== 'certificate_grid') {
            const node = descriptionRef.current;
            const characters = Array.from(content.description);
            const progress = { count: 0 };
            node.textContent = '';
            const animation = gsap.to(progress, {
                count: characters.length,
                duration: Math.min(2.5, characters.length * 0.015),
                ease: 'none', delay: 0.3,
                onUpdate: () => { node.textContent = characters.slice(0, Math.floor(progress.count)).join(''); },
                onComplete: () => { node.textContent = content.description; },
            });
            return () => animation.kill();
        }
    }, [isOpen, content]);

    // Custom scrollbar state
    const scrollContainerRef = useRef(null);
    const trackRef = useRef(null);
    const thumbRef = useRef(null);
    const isDragging = useRef(false);
    const dragStartY = useRef(0);
    const dragStartScroll = useRef(0);
    const [scrollThumbTop, setScrollThumbTop] = useState(0);
    const [showScrollbar, setShowScrollbar] = useState(false);

    // Update thumb position based on scroll
    const updateThumbPosition = useCallback(() => {
        const el = scrollContainerRef.current;
        if (!el) return;
        const { scrollTop, scrollHeight, clientHeight } = el;
        const maxScroll = scrollHeight - clientHeight;
        setShowScrollbar(maxScroll > 10);
        if (maxScroll <= 0) return;
        const scrollRatio = scrollTop / maxScroll;
        // Track area: 5% to 90% of track height (matching CSS)
        const trackEl = trackRef.current;
        if (!trackEl) return;
        const trackHeight = trackEl.clientHeight;
        const thumbHeight = 32; // matches CSS
        const usableHeight = trackHeight * 0.9 - thumbHeight;
        const topOffset = trackHeight * 0.05;
        setScrollThumbTop(topOffset + scrollRatio * usableHeight);
    }, []);

    // Scroll listener
    useEffect(() => {
        const el = scrollContainerRef.current;
        if (!el) return;
        const onScroll = () => updateThumbPosition();
        el.addEventListener('scroll', onScroll, { passive: true });
        // Initial check
        const raf = requestAnimationFrame(updateThumbPosition);
        return () => {
            el.removeEventListener('scroll', onScroll);
            cancelAnimationFrame(raf);
        };
    }, [updateThumbPosition, content]);

    // Recalculate on content/open change
    useEffect(() => {
        const timer = setTimeout(updateThumbPosition, 200);
        return () => clearTimeout(timer);
    }, [isOpen, content, updateThumbPosition]);

    // Drag handlers
    const handleThumbMouseDown = useCallback((e) => {
        e.preventDefault();
        e.stopPropagation();
        isDragging.current = true;
        dragStartY.current = e.clientY;
        dragStartScroll.current = scrollContainerRef.current?.scrollTop || 0;
        document.body.style.cursor = 'grabbing';
        document.body.style.userSelect = 'none';
    }, []);

    useEffect(() => {
        const handleMouseMove = (e) => {
            if (!isDragging.current) return;
            const el = scrollContainerRef.current;
            const trackEl = trackRef.current;
            if (!el || !trackEl) return;
            const deltaY = e.clientY - dragStartY.current;
            const trackHeight = trackEl.clientHeight;
            const thumbHeight = 32;
            const usableHeight = trackHeight * 0.9 - thumbHeight;
            const { scrollHeight, clientHeight } = el;
            const maxScroll = scrollHeight - clientHeight;
            const scrollDelta = (deltaY / usableHeight) * maxScroll;
            el.scrollTop = dragStartScroll.current + scrollDelta;
        };
        const handleMouseUp = () => {
            if (isDragging.current) {
                isDragging.current = false;
                document.body.style.cursor = '';
                document.body.style.userSelect = '';
            }
        };
        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, []);

    // Click on track to jump
    const handleTrackClick = useCallback((e) => {
        const el = scrollContainerRef.current;
        const trackEl = trackRef.current;
        if (!el || !trackEl) return;
        const rect = trackEl.getBoundingClientRect();
        const clickY = e.clientY - rect.top;
        const trackHeight = trackEl.clientHeight;
        const ratio = Math.max(0, Math.min(1, (clickY - trackHeight * 0.05) / (trackHeight * 0.9)));
        const { scrollHeight, clientHeight } = el;
        el.scrollTop = ratio * (scrollHeight - clientHeight);
    }, []);

    const handleBackdropClick = (e) => {
        // Only close if clicking the wrapper itself (which acts as backdrop here)
        // OR the backdrop-layer (if we could attach handler there directly, but wrapper covers it)
        // Currently wrapper covers everything.
        if (e.target.classList.contains('global-overlay-wrapper') || e.target.classList.contains('global-overlay-backdrop-layer')) {
            onClose();
        }
    };

    // --- STYLES & ANIMATION CONFIG ---
    // Spring ease for that "pop" effect
    const transitionSpring = 'transform 0.8s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.8s ease';
    const transitionContent = 'all 0.6s cubic-bezier(0.2, 0.8, 0.2, 1)';

    // --- KONFIGURACJA STYLU KARTKI (POZYCJA) ---
    // Używamy % lub vw/vh dla fluid-responsywności.
    const cardStyle = isMobile ? {
        // MOBILE: Karta na dole
        width: '90%',
        maxHeight: '72dvh',
        bottom: '1.5rem', // <--- FLUID: WPROWADZONE PRZEZ UZYTKOWNIKA
        left: '50%',
        transform: isOpen ? 'translate(-50%, 0) rotate(-1deg)' : 'translate(-50%, 120%) rotate(10deg)',
        opacity: isOpen ? 1 : 0,
        color: '#1a1a1a',
    } : {
        // DESKTOP: Karta po prawej
        width: 'clamp(280px, 30vw, 450px)', // <--- FLUID
        maxHeight: '85dvh',
        right: 'clamp(2rem, 12vw, 20rem)', // <--- FLUID: scales with viewport
        top: '50%',
        transform: isOpen ? 'translateY(-50%) rotate(1deg)' : 'translate(150%, -50%) rotate(15deg)',
        opacity: isOpen ? 1 : 0,
        color: '#1a1a1a',
    };

    // Staggered animation helper (delays based on index)
    const getStaggerStyle = (delay) => ({
        opacity: isOpen ? 1 : 0,
        transform: isOpen ? 'translateY(0)' : 'translateY(20px)',
        transition: transitionContent,
        transitionDelay: isOpen ? `${delay}ms` : '0ms',
    });

    // --- KONFIGURACJA MASKI (SPOTLIGHT - CZARNA DZIURA) ---
    const maskStyle = (content.layout === 'certificate_grid') ? {
        maskImage: 'none',
        WebkitMaskImage: 'none'
    } : isMobile ? {
        // Mobile: Monitor jest na górze (50% szerokości, 25% wysokości od góry)
        maskImage: 'radial-gradient(circle at 50% 25%, transparent 0%, transparent 15%, black 40%)',
        WebkitMaskImage: 'radial-gradient(circle at 50% 25%, transparent 0%, transparent 15%, black 40%)'
    } : {
        // Desktop: Monitor jest po lewej (31% szerokości od lewej, 50% wysokości)
        // WPROWADZONE PRZEZ UZYTKOWNIKA 31%
        maskImage: 'radial-gradient(circle at 31% 50%, transparent 0%, transparent 12%, black 35%)',
        WebkitMaskImage: 'radial-gradient(circle at 31% 50%, transparent 0%, transparent 12%, black 35%)'
    };

    return (
        <div
            className="global-overlay-wrapper"
            inert={!isOpen ? true : undefined}
            aria-hidden={!isOpen}
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                width: '100vw',
                height: '100vh',
                zIndex: 2000,
                pointerEvents: isOpen ? 'auto' : 'none',
                // Important: Wrapper itself has NO background and NO mask. 
                // It just holds the layers.
            }}
            onClick={handleBackdropClick}
        >
            {/* 1. LAYER: BACKDROP (The dark blurry part with the hole) */}
            <div
                className="global-overlay-backdrop-layer"
                style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    // Optymalizacja WebGL: Filtry są baaaardzo drogie podczas animacji
                    // Trzymamy je na sztywno, a animujemy tylko przezroczystość (opacity)
                    backgroundColor: 'rgba(0,0,0,0.5)',
                    backdropFilter: 'blur(8px)',
                    WebkitBackdropFilter: 'blur(8px)',
                    opacity: isOpen ? 1 : 0,
                    transition: 'opacity 0.8s ease',
                    // Mask applies ONLY here
                    ...maskStyle
                }}
            />

            {/* 2. LAYER: CONTENT (The card, sits ON TOP of backdrop, unaffected by mask) */}
            <div
                style={{
                    position: 'absolute',
                    width: '100%',
                    height: '100%',
                    pointerEvents: 'none', // Pass clicks through empty areas to backdrop wrapper
                    display: 'flex', // Helper to position absolute children if needed, but we use absolute on card
                    justifyContent: 'center',
                    alignItems: 'center',
                }}
            >
                <div
                    className="content-card studio-paper-card" ref={cardRef} role="dialog" aria-modal="true" aria-labelledby="content-card-title"
                    style={{
                        position: 'absolute',
                        padding: isMobile ? '1.5rem' : '2.5rem',
                        transition: transitionSpring, // The bouncy entrance
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '1.2rem',
                        fontFamily: CHINESE_FONT_FAMILY,
                        pointerEvents: 'auto', // Re-enable clicks for the card
                        ...cardStyle,
                        // Override styles for grid layout to be centered and wider
                        ...(content.layout === 'certificate_grid' ? {
                            // Make it centered and wide on desktop
                            width: isMobile ? '95vw' : 'clamp(300px, 90vw, 1200px)',
                            height: 'clamp(500px, 85vh, 900px)',
                            maxHeight: '85vh',
                            left: '50%',
                            top: '50%',
                            right: 'auto',
                            bottom: 'auto',
                            transform: isOpen ? 'translate(-50%, -50%)' : 'translate(-50%, 100%)',
                        } : {})
                    }}
                    onClick={(e) => e.stopPropagation()} // Prevent closing when clicking card
                >
                    {/* SVG Border Overlay for Torn Paper */}
                    <svg
                        className="studio-border-overlay"
                        viewBox="0 0 100 100"
                        preserveAspectRatio="none"
                        style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            width: '100%',
                            height: '100%',
                            pointerEvents: 'none',
                            zIndex: 10
                        }}
                    >
                        <path
                            d="M 0 0 L 4 1 L 8 0 L 12 1 L 16 0 L 20 1 L 24 0 L 28 1 L 32 0 L 36 1 L 40 0 L 44 1 L 48 0 L 52 1 L 56 0 L 60 1 L 64 0 L 68 1 L 72 0 L 76 1 L 80 0 L 84 1 L 88 0 L 92 1 L 96 0 L 100 0 L 99 3 L 100 6 L 98 10 L 100 14 L 99 18 L 100 22 L 98 26 L 100 30 L 99 35 L 100 40 L 98 45 L 100 50 L 99 55 L 100 60 L 98 65 L 100 70 L 99 75 L 100 80 L 98 85 L 100 90 L 99 95 L 100 100 L 96 99 L 92 100 L 88 98 L 84 100 L 80 99 L 76 100 L 72 98 L 68 100 L 64 99 L 60 100 L 56 98 L 52 100 L 48 99 L 44 100 L 40 98 L 36 100 L 32 99 L 28 100 L 24 98 L 20 100 L 16 99 L 12 100 L 8 98 L 4 100 L 0 99 L 0.5 99.5 L 1 95 L 0 90 L 2 85 L 0 80 L 1 75 L 0 70 L 2 65 L 0 60 L 1 55 L 0 50 L 2 45 L 0 40 L 1 35 L 0 30 L 2 26 L 0 22 L 1 18 L 0 14 L 2 10 L 0 6 L 1 3 L 0 0 Z"
                            fill="none"
                            stroke="#1a1a1a"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            vectorEffect="non-scaling-stroke"
                        />
                    </svg>

                    {/* Paper Tape / Decor (Mobile Handle) */}
                    <div style={{
                        position: 'absolute',
                        top: '10px',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        width: '40px',
                        height: '4px',
                        backgroundColor: 'rgba(0,0,0,0.1)',
                        borderRadius: '2px',
                        display: isMobile ? 'block' : 'none'
                    }} />

                    {/* Header */}
                    <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'flex-start',
                        marginBottom: '0.25rem',
                        gap: '0.6rem',
                        flexShrink: 0,
                        ...getStaggerStyle(100)
                    }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem', minWidth: 0 }}>
                            <span style={{
                                textTransform: 'uppercase',
                                fontSize: '0.7rem',
                                fontWeight: 700,
                                letterSpacing: '1px',
                                color: '#666'
                            }}>
                                {label}
                            </span>
                            <h2 id="content-card-title" className="content-card__heading" style={{
                                fontSize: 'clamp(1.1rem, 2vw, 1.55rem)',
                                margin: 0,
                                lineHeight: 1.5,
                                fontWeight: 800,
                                fontFamily: CHINESE_FONT_FAMILY,
                            }}>
                                {content.title}
                            </h2>
                        </div>

                        <button
                            onClick={onClose}
                            className="studio-close-btn"
                            style={{ flexShrink: 0 }}
                            aria-label={UI.closeDetails}
                        >
                            <svg viewBox="0 0 24 24">
                                <path d="M18 6L6 18M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    {/* === LAYOUT: CERTIFICATE GRID === */}
                    {content.layout === 'certificate_grid' ? (
                        <div style={{ position: 'relative', flex: 1, minHeight: 0 }}>
                            <div
                                ref={scrollContainerRef}
                                className="awards-scroll-container"
                                style={{
                                    display: 'grid',
                                    gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(280px, 1fr))',
                                    alignContent: 'start',
                                    height: '100%',
                                    overflowY: 'auto',
                                    overflowX: 'hidden',
                                    gap: isMobile ? '1rem' : '2rem',
                                    padding: isMobile ? '1rem 0.5rem 2rem 0.5rem' : '1rem 2rem 2rem 1rem',
                                    ...getStaggerStyle(200)
                                }}>
                                {content.items?.map((item, index) => (
                                    <div key={index} style={{
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: '0.8rem',
                                        backgroundColor: '#f9f9f9',
                                        padding: '1rem',
                                        border: '2px solid #1a1a1a',
                                        boxShadow: '4px 4px 0px rgba(0,0,0,0.1)',
                                        transition: 'transform 0.2s',
                                        cursor: 'pointer',
                                        borderRadius: '2px 255px 3px 255px / 255px 5px 225px 3px'
                                    }}
                                        onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-5px)'}
                                        onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                                        onClick={() => window.open(item.url || content.url || '#', '_blank', 'noopener,noreferrer')}
                                    >
                                        <div style={{
                                            position: 'relative',
                                            width: '100%',
                                            paddingBottom: '141%', // A4 Portrait ratio
                                            backgroundColor: '#eee',
                                            border: '2px solid #1a1a1a',
                                            overflow: 'hidden',
                                            borderRadius: '2px 255px 3px 255px / 255px 5px 225px 3px'
                                        }}>
                                            <img
                                                src={item.image || 'data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs='}
                                                alt={item.label}
                                                loading="lazy"
                                                decoding="async"
                                                style={{
                                                    position: 'absolute',
                                                    top: 0,
                                                    left: 0,
                                                    width: '100%',
                                                    height: '100%',
                                                    objectFit: 'fill'
                                                }}
                                            />
                                        </div>
                                        <div style={{ textAlign: 'center' }}>
                                            <h4 style={{ margin: '0 0 0.4rem 0', fontSize: '1.2rem', fontWeight: 700, fontFamily: "'Rubik Scribble', cursive" }}>
                                                {item.label}
                                            </h4>
                                            <span style={{ fontSize: '1.1rem', color: '#4a4a4a', fontFamily: "'Cabin Sketch', cursive", fontWeight: 700 }}>
                                                {item.date}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Custom torn-paper scrollbar */}
                            {showScrollbar && (
                                <div
                                    ref={trackRef}
                                    className="torn-scroll-track"
                                    onClick={handleTrackClick}
                                    style={{ pointerEvents: 'auto' }}
                                >
                                    <div className="torn-scroll-line" />
                                    <div
                                        ref={thumbRef}
                                        className="torn-scroll-thumb"
                                        style={{ top: `${scrollThumbTop}px` }}
                                        onMouseDown={handleThumbMouseDown}
                                    />
                                </div>
                            )}
                        </div>
                    ) : (
                        /* === LAYOUT: DEFAULT (The Studio Style) === */
                        <div className="content-card__body" tabIndex={0}>
                            {/* Meta Info */}
                            {(content.date || content.author || content.status || content.views) && <div style={{
                                display: 'flex',
                                flexWrap: 'wrap',
                                gap: '1rem',
                                fontSize: '0.8rem',
                                color: '#666',
                                borderBottom: '1px dashed #ccc',
                                paddingBottom: '1rem',
                                ...getStaggerStyle(200)
                            }}>
                                {content.date && <time dateTime={content.date}>{content.date}</time>}
                                {content.author && <span>{content.author}</span>}
                                {content.status && <span>{content.status}</span>}
                                {content.views && <span>{UI.views(content.views)}</span>}
                            </div>}

                            {content.cover && <img src={content.cover} alt={content.coverAlt} decoding="async" style={{ width: '100%', height: 'auto', border: '1px solid #bbb', ...getStaggerStyle(200) }} />}

                            {/* Description */}
                            <p 
                                className="content-card__description" ref={descriptionRef}
                                style={{
                                lineHeight: 1.85,
                                color: '#333',
                                fontSize: '0.95rem',
                                margin: 0,
                                minHeight: '80px', // Prevent layout jump while typing
                                ...getStaggerStyle(300)
                            }}>
                                {content.description}
                            </p>

                            {/* Action Button */}
                            <div style={{
                                marginTop: 'auto',
                                paddingTop: '1rem',
                                ...getStaggerStyle(400)
                            }}>
                                {content.contact && <ContactActions key={`${content.id}-${isOpen}`} content={content} />}
                                {!content.contact && content.url && <a
                                    href={content.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="studio-action-button"
                                >
                                    {content.actionLabel || UI.openLink} ↗
                                </a>}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default GlobalOverlay;
