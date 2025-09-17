function showMain(id) {
    // Pause any playlist videos before switching sections
    document.querySelectorAll('.playlist-main-video').forEach(v => { try { v.pause(); } catch (_) { } });

    // Pause explore main card video (home section) when leaving
    const exploreVideo = document.getElementById('exploreMainVideo');
    if (exploreVideo) {
        try { exploreVideo.pause(); } catch (_) { }
    }

    ['home', 'journey', 'principles'].forEach(sec => {
        const el = document.getElementById(sec);
        if (el) el.style.display = (sec === id) ? 'flex' : 'none';
    });

    // Principles enhancement (no autoplay)
    if (id === 'principles') {
        const root = document.getElementById('principlesPlaylist');
        if (root) enhanceVideoPlaylistFromMarkup(root, { autoplayFirst: false });
    }

    // Hero video behavior
    if (window.heroVideo) {
        if (id === 'home') {
            window.heroUserPaused = false;
            window.heroVideo.muted = true;
            window.heroVideo.play().catch(() => { });
        } else {
            window.heroVideo.pause();
        }
    }
}

(function () {
    const criticalImages = [
        'assets/img/hero-background.png',
        'assets/img/Belonging at Blip Photo 10.jpg',
        'assets/img/Belonging at Blip Photo 13.jpg',
        'assets/img/Belonging at Blip Photo 14.jpg'
    ];

    function loadImage(src) {
        return new Promise(res => {
            const img = new Image();
            img.onload = img.onerror = () => res();
            img.src = src;
        });
    }

    function waitForVideoFirstFrame(video) {
        return new Promise(res => {
            if (!video) return res();
            if (video.readyState >= 2) return res(); // HAVE_CURRENT_DATA
            const onData = () => { video.removeEventListener('loadeddata', onData); res(); };
            video.addEventListener('loadeddata', onData);
            setTimeout(res, 4000); // safety timeout
        });
    }

    window.__appReady = (async () => {
        const heroVideo = document.querySelector('.hero-video video');
        await Promise.all([
            ...criticalImages.map(loadImage),
            waitForVideoFirstFrame(heroVideo)
        ]);
    })().then(() => {
        document.documentElement.classList.add('app-loaded');
        document.documentElement.classList.remove('is-loading');
        // Trigger initial height after reveal
        try {
            parent.postMessage({ type: 'bh-resize', height: document.documentElement.scrollHeight }, '*');
        } catch (_) { }
        // Remove loader node after fade
        setTimeout(() => {
            const l = document.getElementById('appLoader');
            l && l.remove();
        }, 600);
    });
})();

(function () {
    // Expose hero video refs globally after initAppLogic runs
    document.addEventListener('DOMContentLoaded', () => {
        // After your initAppLogic executes it sets heroVideo locally.
        // We hook into it by polling once (safe + lightweight).
        const tryAssign = () => {
            const hv = document.querySelector('.hero-video video');
            if (hv) window.heroVideo = hv;
        };
        tryAssign();
    });
})();

document.addEventListener('DOMContentLoaded', function () {
    if (window.__appReady) {
        window.__appReady.then(initAppLogic);
    } else {
        initAppLogic();
    }

    function initAppLogic() {
        // HERO VIDEO SETUP
        const heroVideo = document.querySelector('.hero-video video');
        window.heroVideo = heroVideo;           // make globally accessible
        window.heroUserPaused = window.heroUserPaused || false;

        const pauseSVG = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path fill="currentColor" fill-rule="evenodd" d="M18.535 4.766c.73.27 1.215.965 1.215 1.743V17.49c0 .778-.485 1.474-1.215 1.743a4.44 4.44 0 0 1-3.07 0a1.86 1.86 0 0 1-1.215-1.743V6.51c0-.778.485-1.474 1.215-1.743a4.44 4.44 0 0 1 3.07 0M18.25 6.51a.36.36 0 0 0-.234-.335a2.94 2.94 0 0 0-2.032 0a.36.36 0 0 0-.234.335v10.98c0 .15.093.284.234.335a2.94 2.94 0 0 0 2.032 0a.36.36 0 0 0 .234-.335zM8.535 4.766c.73.27 1.215.965 1.215 1.743V17.49c0 .778-.485 1.474-1.215 1.743a4.44 4.44 0 0 1-3.07 0A1.86 1.86 0 0 1 4.25 17.49V6.51c0-.778.485-1.474 1.215-1.743a4.44 4.44 0 0 1 3.07 0M8.25 6.51a.36.36 0 0 0-.234-.335a2.94 2.94 0 0 0-2.032 0a.36.36 0 0 0-.234.335v10.98c0 .15.093.284.234.335a2.94 2.94 0 0 0 2.032 0a.36.36 0 0 0 .234-.335z" clip-rule="evenodd"/></svg>`;
        const playSVG = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path fill="currentColor" d="M16.394 12L10 7.737v8.526zm2.982.416L8.777 19.482A.5.5 0 0 1 8 19.066V4.934a.5.5 0 0 1 .777-.416l10.599 7.066a.5.5 0 0 1 0 .832"/></svg>`;
        const unmuteSVG = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path fill="currentColor" d="M12 3.75v16.5a.75.75 0 0 1-1.255.555L5.46 16H2.75A1.75 1.75 0 0 1 1 14.25v-4.5C1 8.784 1.784 8 2.75 8h2.71l5.285-4.805A.75.75 0 0 1 12 3.75M6.255 9.305a.75.75 0 0 1-.505.195h-3a.25.25 0 0 0-.25.25v4.5c0 .138.112.25.25.25h3c.187 0 .367.069.505.195l4.245 3.86V5.445ZM16.28 8.22a.75.75 0 1 0-1.06 1.06L17.94 12l-2.72 2.72a.75.75 0 1 0 1.06 1.06L19 13.06l2.72 2.72a.75.75 0 1 0 1.06-1.06L20.06 12l2.72-2.72a.75.75 0 0 0-1.06-1.06L19 10.94z"/></svg>`;
        const muteSVG = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path fill="currentColor" d="M11.553 3.064A.75.75 0 0 1 12 3.75v16.5a.75.75 0 0 1-1.255.555L5.46 16H2.75A1.75 1.75 0 0 1 1 14.25v-4.5C1 8.784 1.784 8 2.75 8h2.71l5.285-4.805a.75.75 0 0 1 .808-.13ZM10.5 5.445l-4.245 3.86a.75.75 0 0 1-.505.195h-3a.25.25 0 0 0-.25.25v4.5c0 .138.112.25.25.25h3c.187 0 .367.069.505.195l4.245 3.86Zm8.218-1.223a.75.75 0 0 1 1.06 0c4.296 4.296 4.296 11.26 0 15.556a.75.75 0 0 1-1.06-1.06a9.5 9.5 0 0 0 0-13.436a.75.75 0 0 1 0-1.06"/><path fill="currentColor" d="M16.243 7.757a.75.75 0 1 0-1.061 1.061a4.5 4.5 0 0 1 0 6.364a.75.75 0 0 0 1.06 1.06a6 6 0 0 0 0-8.485Z"/></svg>`;

        const playPauseBtn = document.getElementById('playPauseBtn');
        const muteBtn = document.getElementById('muteBtn');
        const playPauseIcon = document.getElementById('playPauseIcon');
        const muteIcon = document.getElementById('muteIcon');

        function setPlayPauseIcon() {
            if (heroVideo.paused) {
                playPauseIcon.innerHTML = playSVG;
                playPauseBtn.setAttribute('aria-label', 'Play');
            } else {
                playPauseIcon.innerHTML = pauseSVG;
                playPauseBtn.setAttribute('aria-label', 'Pause');
            }
        }

        function setMuteIcon() {
            if (heroVideo.muted) {
                muteIcon.innerHTML = unmuteSVG;
                muteBtn.setAttribute('aria-label', 'Unmute');
            } else {
                muteIcon.innerHTML = muteSVG;
                muteBtn.setAttribute('aria-label', 'Mute');
            }
        }

        playPauseBtn.addEventListener('click', function () {
            if (heroVideo.paused) {
                heroVideo.play().catch(() => { });
                window.heroUserPaused = false;
            } else {
                heroVideo.pause();
                window.heroUserPaused = true;
            }
            setPlayPauseIcon();
        });

        muteBtn.addEventListener('click', function () {
            heroVideo.muted = !heroVideo.muted;
            setMuteIcon();
        });

        heroVideo.addEventListener('pause', () => {
            // If not user-paused and still on home, resume (keeps looping feel)
            if (!window.heroUserPaused && document.getElementById('home').style.display !== 'none') {
                heroVideo.play().catch(() => { });
            }
            setPlayPauseIcon();
        });

        heroVideo.addEventListener('play', setPlayPauseIcon);
        heroVideo.addEventListener('volumechange', setMuteIcon);

        // Initial icons
        setPlayPauseIcon();
        setMuteIcon();

        // Ensure it plays on first load (muted autoplay)
        if (document.getElementById('home').style.display !== 'none') {
            heroVideo.play().catch(() => { });
        }

        const exploreCard = document.getElementById('exploreMainCard');
        const exploreVideo = document.getElementById('exploreMainVideo');
        const explorePlayBtn = document.getElementById('explorePlayBtn');

        explorePlayBtn.innerHTML = playSVG;

        exploreVideo.removeAttribute('controls');

        function enterPlayingState() {
            exploreCard.classList.add('playing');
            if (!exploreVideo.hasAttribute('controls')) {
                exploreVideo.setAttribute('controls', 'controls');
            }
        }

        function leavePlayingState() {
            exploreCard.classList.remove('playing');
            if (exploreVideo.hasAttribute('controls')) {
                exploreVideo.removeAttribute('controls');
            }
        }

        exploreCard.addEventListener('click', function () {
            if (exploreVideo.paused) {
                exploreVideo.play().catch(() => { });
            }
        });

        explorePlayBtn.addEventListener('click', function (e) {
            e.stopPropagation();
            if (exploreVideo.paused) {
                exploreVideo.play().catch(() => { });
            }
        });

        exploreVideo.addEventListener('play', () => {
            enterPlayingState();
            if (heroVideo.paused && !window.heroUserPaused) {
                heroVideo.play().catch(() => { });
            }
        });

        exploreVideo.addEventListener('pause', leavePlayingState);
        exploreVideo.addEventListener('ended', () => {
            exploreVideo.currentTime = 0;
            leavePlayingState();
        });

        // Initialize Journey tabs
        initJourneyTabs();
    }
});

// Simple tabs for Journey page
function initJourneyTabs() {
    const journey = document.getElementById('journey');
    if (!journey) return;

    const tablist = journey.querySelector('#journeyTabs');
    if (!tablist) return;

    const tabs = Array.from(tablist.querySelectorAll('[role="tab"]'));
    const panels = Array.from(journey.querySelectorAll('.tab-panel'));

    function activate(index, focusPanel = false) {
        tabs.forEach((t, i) => {
            const selected = i === index;
            t.classList.toggle('active', selected);
            t.setAttribute('aria-selected', selected ? 'true' : 'false');
            t.tabIndex = selected ? 0 : -1;
        });

        panels.forEach((p, i) => {
            const show = i === index;
            p.classList.toggle('active', show);
            if (!show) {
                // Pause any media inside hidden panel
                p.querySelectorAll('video,audio').forEach(m => { try { m.pause(); } catch { } });
            }
        });

        if (focusPanel) panels[index]?.focus();

        // Resize message for embedding
        try {
            parent.postMessage({ type: 'bh-resize', height: document.documentElement.scrollHeight }, '*');
        } catch { }
    }

    tablist.addEventListener('click', (e) => {
        const btn = e.target.closest('[role="tab"]');
        if (!btn) return;
        const idx = tabs.indexOf(btn);
        if (idx >= 0) activate(idx, false);
    });

    tablist.addEventListener('keydown', (e) => {
        const current = tabs.findIndex(t => t.getAttribute('aria-selected') === 'true');
        if (['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) e.preventDefault();
        if (e.key === 'ArrowRight') {
            const next = (current + 1) % tabs.length;
            tabs[next].focus();
            activate(next, false);
        } else if (e.key === 'ArrowLeft') {
            const prev = (current - 1 + tabs.length) % tabs.length;
            tabs[prev].focus();
            activate(prev, false);
        } else if (e.key === 'Home') {
            tabs[0].focus();
            activate(0, false);
        } else if (e.key === 'End') {
            tabs[tabs.length - 1].focus();
            activate(tabs.length - 1, false);
        }
    });

    // Ensure initial state reflects markup
    const initial = Math.max(0, tabs.findIndex(t => t.classList.contains('active')));
    activate(initial, false);
}

function enhanceVideoPlaylistFromMarkup(root, options = {}) {
    if (!root || root.dataset.enhanced === 'true') return;
    const sourceWrapper = root.querySelector('.playlist-source');
    if (!sourceWrapper) return;

    const articles = [...sourceWrapper.querySelectorAll('article[data-src]')];
    if (!articles.length) return;

    const items = articles.map((art, i) => {
        const title = (art.querySelector('h4')?.textContent || art.dataset.title || `Video ${i + 1}`).trim();
        const short = (art.querySelector('.short')?.textContent || art.dataset.short || '').trim();
        const descEl = art.querySelector('.description');
        const description = descEl ? descEl.textContent.trim() : (art.textContent || '').trim();
        return {
            id: art.id || `video-${i}`,
            title,
            short,
            description,
            src: art.dataset.src
        };
    });

    root.dataset.enhanced = 'true';

    const main = document.createElement('div');
    main.className = 'video-playlist-main';
    main.innerHTML = `
                <div class="video-wrapper">
                    <video class="playlist-main-video" playsinline controls preload="metadata"></video>
                </div>
                <div class="video-playlist-info">
                    <h3 class="video-title"></h3>
                    <p class="video-description"></p>
                </div>
            `;

    const side = document.createElement('div');
    side.className = 'video-playlist-side';
    side.innerHTML = `
                <span class="video-playlist-side-header" aria-hidden="true">Playlist (${items.length})</span>
                <div class="video-playlist-list" role="listbox" aria-label="Video playlist"></div>
            `;

    root.appendChild(main);
    root.appendChild(side);

    const videoEl = main.querySelector('.playlist-main-video');
    const titleEl = main.querySelector('.video-title');
    const descEl = main.querySelector('.video-description');
    const listEl = side.querySelector('.video-playlist-list');

    const state = { currentIndex: 0, items };

    function renderList() {
        listEl.innerHTML = '';
        state.items.forEach((item, idx) => {
            const li = document.createElement('div');
            li.className = 'playlist-item' + (idx === state.currentIndex ? ' active' : '');
            li.setAttribute('role', 'option');
            li.setAttribute('aria-selected', idx === state.currentIndex ? 'true' : 'false');
            li.dataset.index = String(idx);
            // Transparent 1x1 gif as placeholder
            const blank = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==';
            li.innerHTML = `
                        <div class="playlist-thumb loading">
                            <img loading="lazy" src="${blank}" data-video-thumb="${item.src}" alt="${item.title}">
                        </div>
                        <div class="playlist-meta">
                            <div class="playlist-meta-title">${item.title}</div>
                            <div class="playlist-meta-desc">${item.short || ''}</div>
                        </div>
                        <button type="button" aria-label="Play ${item.title}"></button>
                    `;
            li.addEventListener('click', () => selectIndex(idx, true));
            listEl.appendChild(li);
        });
        generateThumbnails(listEl);
    }

    function updateActive() {
        [...listEl.children].forEach((c, i) => {
            const active = i === state.currentIndex;
            c.classList.toggle('active', active);
            c.setAttribute('aria-selected', active ? 'true' : 'false');
        });
    }

    function loadCurrent(autoplay) {
        const item = state.items[state.currentIndex];
        if (!item) return;
        if (videoEl.src !== item.src) videoEl.src = item.src;
        titleEl.textContent = item.title;
        descEl.textContent = item.description || '';
        updateActive();
        if (autoplay) videoEl.play().catch(() => { });
        try {
            parent.postMessage({ type: 'bh-resize', height: document.documentElement.scrollHeight }, '*');
        } catch { }
    }

    function selectIndex(idx, autoplay) {
        if (idx < 0 || idx >= state.items.length || idx === state.currentIndex) return;
        state.currentIndex = idx;
        loadCurrent(autoplay);
    }

    renderList();
    loadCurrent(options.autoplayFirst === true);

    // Thumbnail generation from video first frame
    function generateThumbnails(container) {
        const imgNodes = [...container.querySelectorAll('img[data-video-thumb]')];
        imgNodes.forEach(img => {
            const src = img.getAttribute('data-video-thumb');
            if (!src) return;

            const thumbWrapper = img.closest('.playlist-thumb');
            const video = document.createElement('video');
            video.preload = 'metadata';
            video.muted = true;
            video.playsInline = true;
            video.src = src;

            let done = false;
            const timeout = setTimeout(cleanup, 4000);

            video.addEventListener('loadeddata', () => {
                // Try seeking a tiny bit to avoid blank first frame (if possible)
                try {
                    if (video.readyState >= 2) {
                        video.currentTime = Math.min(0.15, (video.duration || 1) * 0.02);
                    }
                } catch { /* ignore */ }
            });

            video.addEventListener('seeked', capture);
            video.addEventListener('error', cleanup);

            function capture() {
                if (done) return;
                done = true;
                clearTimeout(timeout);
                try {
                    const w = 160;
                    const h = 94;
                    const canvas = document.createElement('canvas');
                    canvas.width = w;
                    canvas.height = h;
                    const ctx = canvas.getContext('2d');
                    const vw = video.videoWidth || 1280;
                    const vh = video.videoHeight || 720;
                    // Cover fit
                    const scale = Math.max(w / vw, h / vh);
                    const dw = vw * scale;
                    const dh = vh * scale;
                    const dx = (w - dw) / 2;
                    const dy = (h - dh) / 2;
                    ctx.drawImage(video, dx, dy, dw, dh);
                    img.src = canvas.toDataURL('image/jpeg', 0.7);
                } catch {
                    // Fallback color block already there
                }
                finalize();
            }

            function cleanup() {
                if (done) return finalize();
                done = true;
                clearTimeout(timeout);
                finalize();
            }

            function finalize() {
                video.remove();
                if (thumbWrapper) thumbWrapper.classList.remove('loading');
            }
        });
    }
}

(function () {
    function sendHeight() {
        const h = document.documentElement.scrollHeight;
        parent.postMessage({ type: 'bh-resize', height: h }, '*');
    }
    window.addEventListener('load', sendHeight);
    new ResizeObserver(sendHeight).observe(document.body);
    setInterval(sendHeight, 1000);
})();