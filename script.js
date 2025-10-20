document.addEventListener('DOMContentLoaded', function () {
    // Check if page is being accessed directly (not in iframe)
    function isInIframe() {
        return window.self !== window.top;
    }

    // Define safe domains that can bypass iframe requirement
    const bypassDomains = ['localhost', '127.0.0.1'];
    const canBypass = bypassDomains.some(domain => window.location.hostname.includes(domain));

    // Only show content if in iframe OR if accessing from safe domain
    if (isInIframe() || canBypass) {

    } else {
        // Hide everything if accessed directly from non-safe domain
        document.body.style.display = 'none';
    }
});

function showMain(id) {
    // Pause any playlist videos before switching sections
    document.querySelectorAll('.playlist-main-video').forEach(v => { try { v.pause(); } catch (_) { } });

    // For SharePoint iframes, store the src and reload when returning
    document.querySelectorAll('.playlist-main-iframe').forEach(iframe => {
        if (iframe.src && iframe.style.display !== 'none') {
            // Store the original src if not already stored
            if (!iframe.dataset.originalSrc) {
                iframe.dataset.originalSrc = iframe.src;
            }
            // Clear src to stop playback
            iframe.src = '';
        }
    });

    // Handle explore main card video/iframe differently - remove iframe completely when leaving home
    const exploreVideo = document.getElementById('exploreMainVideo');
    const exploreCard = document.getElementById('exploreMainCard');
    const exploreIframe = document.querySelector('#exploreMainCard iframe');

    if (id !== 'home') {
        // Leaving home - completely remove the explore iframe
        if (exploreVideo) {
            try {
                exploreVideo.pause();
                exploreVideo.removeAttribute('controls');
            } catch (_) { }
        }
        if (exploreIframe) {
            // Store the URL for recreation
            if (exploreIframe.dataset.originalSrc) {
                exploreCard.dataset.exploreVideoSrc = exploreIframe.dataset.originalSrc;
            }
            exploreIframe.remove();
        }
    } else {
        // Returning to home - recreate the explore iframe if it was SharePoint
        if (exploreCard.dataset.exploreVideoSrc && !exploreIframe) {
            const newIframe = document.createElement('iframe');
            newIframe.src = exploreCard.dataset.exploreVideoSrc;
            newIframe.frameBorder = '0';
            newIframe.allowFullscreen = true;
            newIframe.style.cssText = 'width: 100%; height: 100%; object-fit: cover; display: block; background: #000; border-radius: 20px;';
            newIframe.dataset.originalSrc = exploreCard.dataset.exploreVideoSrc;

            exploreCard.appendChild(newIframe);
            exploreVideo.style.display = 'none';

            // Re-attach click handler
            const newClickHandler = () => {
                newIframe.src = '';
                setTimeout(() => {
                    newIframe.src = newIframe.dataset.originalSrc;
                }, 100);
            };
            exploreCard.removeEventListener('click', exploreCard._clickHandler);
            exploreCard.addEventListener('click', newClickHandler);
            exploreCard._clickHandler = newClickHandler;
        }
    }

    ['home', 'journey', 'principles'].forEach(sec => {
        const el = document.getElementById(sec);
        if (el) el.style.display = (sec === id) ? 'flex' : 'none';
    });

    // Rest of the function remains the same...
    // Principles enhancement (no autoplay)
    if (id === 'principles') {
        const root = document.getElementById('principlesPlaylist');
        if (root && !root.dataset.firebaseLoaded) {
            // Mark as loading to prevent multiple calls
            root.dataset.firebaseLoaded = 'true';
            loadPrinciplesFromFirestore(root);
        } else if (root && root.dataset.enhanced === 'true') {
            // Already enhanced, just restore iframe if needed
            setTimeout(() => {
                const activeIframe = root.querySelector('.playlist-main-iframe');
                if (activeIframe && activeIframe.dataset.originalSrc && activeIframe.style.display !== 'none') {
                    activeIframe.src = activeIframe.dataset.originalSrc;
                }
            }, 100);
        }
    }

    // Hero video behavior (simplified)
    if (window.heroIsIframe && window.heroIframe) {
        if (id === 'home') {
            // Restore with autoplay
            const base = window.heroIframe.dataset.baseSrc || window.heroIframe.src || '';
            if (base) {
                const url = (() => {
                    try {
                        const u = new URL(base);
                        u.searchParams.set('autoplay', 'true');
                        return u.toString();
                    } catch { return base; }
                })();
                window.heroIframe.src = url;
                window.heroIframe.dataset.playing = 'true';
            }
        } else {
            // Pause by clearing src
            if (window.heroIframe.src) {
                if (!window.heroIframe.dataset.baseSrc) {
                    window.heroIframe.dataset.baseSrc = window.heroIframe.src;
                }
                window.heroIframe.src = '';
                window.heroIframe.dataset.playing = 'false';
            }
        }
    } else if (window.heroVideo) {
        if (id === 'home') {
            window.heroUserPaused = false;
            window.heroVideo.muted = true; // Keep muted for autoplay compliance
            window.heroVideo.play().catch(() => { });
        } else {
            window.heroVideo.pause();
        }
    }
}

function loadPrinciplesFromFirestore(root) {
    // Use existing Firebase instance from initJourneyCatalog
    const db = firebase.firestore();

    db.collection('BelongingPrinciples')
        .orderBy('title') // You can change this to order by a specific field if needed
        .get()
        .then((querySnapshot) => {
            const articles = [];
            querySnapshot.forEach((doc) => {
                const data = doc.data();
                // Include ALL documents with title, regardless of videoUrl
                if (data.title && data.title.trim()) {
                    articles.push({
                        id: doc.id,
                        title: data.title.trim(),
                        description: data.description || '',
                        short: data.short || '',
                        videoUrl: data.videoUrl || '' // Empty string if no URL
                    });
                }
            });

            if (articles.length === 0) {
                // Show message if no videos available
                root.innerHTML = '<div style="padding: 2rem 0; color: #666; text-align: center;">No videos available yet. Check back soon!</div>';
                return;
            }

            // Build the playlist structure dynamically
            buildPrinciplesPlaylist(root, articles);

            // Now enhance with existing logic (this handles disabled state automatically)
            enhanceVideoPlaylistFromMarkup(root, { autoplayFirst: false });

            // Restore SharePoint iframe if it was the active video
            setTimeout(() => {
                const activeIframe = root.querySelector('.playlist-main-iframe');
                if (activeIframe && activeIframe.dataset.originalSrc && activeIframe.style.display !== 'none') {
                    activeIframe.src = activeIframe.dataset.originalSrc;
                }
            }, 100);
        })
        .catch((error) => {
            console.error('Error loading principles from Firestore:', error);
            root.innerHTML = '<div style="padding: 2rem 0; color: #666; text-align: center;">Error loading videos. Please try again later.</div>';
        });
}

function buildPrinciplesPlaylist(root, articles) {
    // Create the playlist source structure that enhanceVideoPlaylistFromMarkup expects
    const playlistSource = document.createElement('div');
    playlistSource.className = 'playlist-source';

    articles.forEach((article, index) => {
        const articleEl = document.createElement('article');
        articleEl.id = article.id;

        // Set data-src only if videoUrl exists and is not empty
        // This is key - enhanceVideoPlaylistFromMarkup checks for this to determine disabled state
        if (article.videoUrl && article.videoUrl.trim()) {
            articleEl.dataset.src = article.videoUrl.trim();
        }
        // If no videoUrl or empty, don't set data-src - this will make it disabled

        articleEl.dataset.thumb = 'assets/img/video_thumbnail.png';

        articleEl.innerHTML = `
            <h4>${article.title}</h4>
            <p class="short">${article.short}</p>
            <p class="description">${article.description}</p>
        `;

        playlistSource.appendChild(articleEl);
    });

    // Clear existing content and add new playlist source
    root.innerHTML = '';
    root.appendChild(playlistSource);
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
        // HERO VIDEO SETUP (autoplay only)
        const heroVideoContainer = document.querySelector('.hero-video');
        const heroVideo = heroVideoContainer.querySelector('video');
        const heroSource = heroVideo.querySelector('source');
        let heroSrc = heroSource ? heroSource.src : '';
        const isSharePoint = heroSrc.includes('sharepoint.com') || heroSrc.includes('onedrive.live.com');

        // Hide all controls since we're removing mute functionality
        const playPauseBtn = document.getElementById('playPauseBtn');
        const muteBtn = document.getElementById('muteBtn');

        function stripAutoplayMute(urlStr) {
            try {
                const u = new URL(urlStr);
                u.searchParams.delete('autoplay');
                u.searchParams.delete('mute');
                u.searchParams.delete('muted');
                return u.toString();
            } catch { return urlStr; }
        }

        function buildUrl(base, { autoplay = true } = {}) {
            try {
                const u = new URL(base);
                if (autoplay) u.searchParams.set('autoplay', 'true');
                return u.toString();
            } catch { return base; }
        }

        // Hide all controls
        if (playPauseBtn) {
            playPauseBtn.style.display = 'none';
            playPauseBtn.onclick = null;
        }
        if (muteBtn) {
            muteBtn.style.display = 'none';
            muteBtn.onclick = null;
        }

        if (isSharePoint) {
            // Use iframe for SharePoint - simplified
            heroVideo.style.display = 'none';

            let heroIframe = heroVideoContainer.querySelector('iframe');
            if (!heroIframe) {
                heroIframe = document.createElement('iframe');
                heroIframe.frameBorder = '0';
                heroIframe.allowFullscreen = true;
                heroIframe.setAttribute('allow', 'autoplay; encrypted-media; fullscreen');
                heroIframe.style.width = '100%';
                heroIframe.style.height = '100%';
                heroIframe.style.display = 'block';
                heroIframe.style.background = '#000';
                heroVideoContainer.appendChild(heroIframe);
            }

            const base = stripAutoplayMute(heroSrc);
            heroIframe.dataset.baseSrc = base;
            heroIframe.dataset.playing = 'true';
            heroIframe.src = buildUrl(base, { autoplay: true });

            window.heroIsIframe = true;
            window.heroIframe = heroIframe;
        } else {
            // Local <video>: simple autoplay
            window.heroIsIframe = false;
            window.heroIframe = null;

            // Ensure autoplay on first load (muted by HTML attrs)
            heroVideo.play().catch(() => { });
        }

        // EXPLORE MAIN VIDEO SETUP (simplified like playlist)
        const exploreCard = document.getElementById('exploreMainCard');
        const exploreVideoElement = document.getElementById('exploreMainVideo');

        // Check if explore video should be an iframe
        const exploreVideoSrc = exploreVideoElement.querySelector('source')?.src;
        const isExploreSharePoint = exploreVideoSrc && (exploreVideoSrc.includes('sharepoint.com') || exploreVideoSrc.includes('onedrive.live.com')) && exploreVideoSrc.includes('embed');

        if (isExploreSharePoint) {
            // Create iframe for explore video (same as playlist)
            const exploreIframe = document.createElement('iframe');
            exploreIframe.src = exploreVideoSrc;
            exploreIframe.frameBorder = '0';
            exploreIframe.allowFullscreen = true;
            exploreIframe.style.cssText = 'width: 100%; height: 100%; object-fit: cover; display: block; background: #000; border-radius: 20px;';
            exploreIframe.dataset.originalSrc = exploreVideoSrc;

            exploreCard.appendChild(exploreIframe);
            exploreVideoElement.style.display = 'none';

            // Store the video src on the card for recreation
            exploreCard.dataset.exploreVideoSrc = exploreVideoSrc;

            // Simple click handler - just reload iframe
            const clickHandler = () => {
                exploreIframe.src = '';
                setTimeout(() => {
                    exploreIframe.src = exploreIframe.dataset.originalSrc;
                }, 100);
            };
            exploreCard.addEventListener('click', clickHandler);
            exploreCard._clickHandler = clickHandler; // Store reference for removal
        } else {
            // Regular video handling
            exploreVideoElement.removeAttribute('controls');
            exploreCard.addEventListener('click', () => {
                if (exploreVideoElement.paused) {
                    exploreVideoElement.play().catch(() => { });
                    exploreVideoElement.setAttribute('controls', 'controls');
                } else {
                    exploreVideoElement.pause();
                    exploreVideoElement.removeAttribute('controls');
                }
            });
        }

        // Initialize Journey tabs
        initJourneyTabs();

        // Add click logic for home sub-cards to open journey tabs
        const subCards = document.querySelectorAll('.section-explore-sub-card');
        subCards.forEach((card, idx) => {
            card.addEventListener('click', () => {
                showMain('journey');
                // Wait for journey tabs to be initialized
                setTimeout(() => {
                    const tablist = document.getElementById('journeyTabs');
                    if (!tablist) return;
                    const tabs = tablist.querySelectorAll('[role="tab"]');
                    if (tabs[idx]) {
                        tabs[idx].click();
                        tabs[idx].focus();
                    }
                }, 100); // slight delay to ensure DOM update
            });
        });
    }
});

function initJourneyCatalog() {
    // Initialize Firebase
    const firebaseConfig = {
        apiKey: "AIzaSyB289BJeYvnPOxkZcM38Z_ftaNU4SPcjXY",
        authDomain: "belonginghub.firebaseapp.com",
        projectId: "belonginghub",
        storageBucket: "belonginghub.firebasestorage.app",
        messagingSenderId: "341033605727",
        appId: "1:341033605727:web:e33608fb0166248e4759ea"
    };

    // Initialize Firebase if not already initialized
    if (!firebase.apps.length) {
        firebase.initializeApp(firebaseConfig);
    }

    const db = firebase.firestore();

    // Define color pool for card circles
    const colorPool = ['#009cde', '#26d07c', '#f277c6', '#9063cd', '#ffda00'];

    // Create all unique color combinations
    function createColorCombinations(colors) {
        const combinations = [];
        for (let i = 0; i < colors.length; i++) {
            for (let j = 0; j < colors.length; j++) {
                if (i !== j) { // Ensure different colors for top and bottom
                    combinations.push([colors[i], colors[j]]);
                }
            }
        }
        return combinations;
    }

    // Shuffle array function
    function shuffleArray(array) {
        const shuffled = [...array];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
    }

    // Create color combination manager
    function createColorManager() {
        let availableCombinations = shuffleArray(createColorCombinations(colorPool));
        let currentIndex = 0;

        return {
            getNextCombination() {
                if (currentIndex >= availableCombinations.length) {
                    // Reshuffle and reset when we run out of combinations
                    availableCombinations = shuffleArray(createColorCombinations(colorPool));
                    currentIndex = 0;
                }
                return availableCombinations[currentIndex++];
            }
        };
    }

    // Load data from Firestore and build catalogs for all tabs
    db.collection('YourJourney').get()
        .then((querySnapshot) => {
            const data = [];
            querySnapshot.forEach((doc) => {
                const docData = doc.data();
                // Filter out documents with missing required fields
                if (docData.title && docData.title.trim() && docData.role && docData.role.trim()) {
                    data.push({
                        title: docData.title,
                        description: docData.description || '',
                        url: docData.url || '',
                        category: docData.category || 'Other',
                        role: docData.role
                    });
                }
            });

            // Define role mappings
            const roleMapping = {
                'Everyone': 'tab-everyone',
                'Managers': 'tab-managers',
                'Hiring Team': 'tab-hiring'
            };

            // Process each role
            Object.keys(roleMapping).forEach(role => {
                const tabId = roleMapping[role];
                const tabPanel = document.getElementById(tabId);
                if (!tabPanel) return;

                // Filter data for this role (exact match, case-sensitive)
                const roleData = data.filter(r => r.role.trim() === role);

                // Create catalog structure if it doesn't exist
                let catalogContainer = tabPanel.querySelector('.tab-catalog');
                if (!catalogContainer) {
                    catalogContainer = document.createElement('div');
                    catalogContainer.className = 'tab-catalog';
                    catalogContainer.innerHTML = `
                    <div class="tab-catalog-menu">
                            <span class="catalog-menu-title">Filter by:</span>
                            <div class="catalog-menu-filters"></div>
                        </div>
                    <div class="tab-catalog-cards-container">
                            <div class="tab-catalog-cards"></div>
                        </div>
                    `;
                    tabPanel.appendChild(catalogContainer);
                }

                const cardsWrap = catalogContainer.querySelector('.tab-catalog-cards');
                const filtersWrap = catalogContainer.querySelector('.catalog-menu-filters');

                if (!cardsWrap || !filtersWrap) return;

                // Clear any existing content
                cardsWrap.innerHTML = '';
                filtersWrap.innerHTML = '';

                // Only proceed if there are cards for this role
                if (roleData.length === 0) {
                    cardsWrap.innerHTML = '<div style="padding: 2rem 0; color: #666;">No resources available yet for this role.</div>';
                    catalogContainer.querySelector('.tab-catalog-menu').style.display = 'none';
                    return;
                }

                // Create color manager for this role's cards
                const colorManager = createColorManager();

                // Build cards for this role
                roleData.forEach((res, index) => {
                    const card = document.createElement('div');
                    card.className = 'tab-catalog-card';
                    card.dataset.category = res.category || 'Other';
                    card.dataset.role = res.role;

                    // Get next unique color combination
                    const [topColor, bottomColor] = colorManager.getNextCombination();

                    // Set custom CSS properties for this card's circles
                    card.style.setProperty('--top-circle-color', topColor);
                    card.style.setProperty('--bottom-circle-color', bottomColor);

                    const favicon = getFaviconURL(res.url);
                    const displayUrl = res.url.replace(/^(https?:\/\/)/i, '');

                    card.innerHTML = `
                        <span class="catalog-card-title">${res.title}</span>
                        <span class="catalog-card-description">${res.description || ''}</span>
                        <div class="catalog-card-url">
                            <div class="card-url-favicon">
                                <img src="${favicon}" alt="Favicon for ${res.title}" loading="lazy" onerror="this.style.display='none'">
                            </div>
                            <span>${displayUrl}</span>
                        </div>
                    `;
                    cardsWrap.appendChild(card);

                    card.addEventListener('click', () => {
                        window.open(res.url, '_blank', 'noopener');
                    });
                    card.style.cursor = 'pointer';
                });

                // Build filter list for this role's categories
                const categoryCounts = roleData.reduce((acc, r) => {
                    const category = r.category || 'Other';
                    acc[category] = (acc[category] || 0) + 1;
                    return acc;
                }, {});

                // Sort categories alphabetically only
                const categories = Object.keys(categoryCounts).sort((a, b) => a.localeCompare(b));

                // Only create filters if there are categories for this role
                if (categories.length > 0) {
                    categories.forEach(cat => {
                        const item = document.createElement('span');
                        item.className = 'catalog-filter';
                        item.setAttribute('role', 'button');
                        item.tabIndex = 0;
                        item.dataset.category = cat;
                        item.setAttribute('aria-pressed', 'false');
                        item.innerHTML = `${cat} <span class="filter-count">${categoryCounts[cat]}</span>`;
                        filtersWrap.appendChild(item);
                    });

                    // Set up filtering for this tab
                    setupTabFiltering(catalogContainer, role);
                    catalogContainer.querySelector('.tab-catalog-menu').style.display = 'flex';
                } else {
                    // Hide filter menu if no categories
                    catalogContainer.querySelector('.tab-catalog-menu').style.display = 'none';
                }
            });
        })
        .catch((error) => {
            console.error('Error loading data from Firestore:', error);
            // Show error message in all tabs
            ['tab-everyone', 'tab-managers', 'tab-hiring'].forEach(tabId => {
                const tabPanel = document.getElementById(tabId);
                if (tabPanel) {
                    const errorDiv = document.createElement('div');
                    errorDiv.style.cssText = 'padding: 2rem 0; color: #666; text-align: center;';
                    errorDiv.textContent = 'Error loading resources. Please try again later.';
                    tabPanel.appendChild(errorDiv);
                }
            });
        });
}

function setupTabFiltering(catalogContainer, role) {
    const cardsWrap = catalogContainer.querySelector('.tab-catalog-cards');
    const filtersWrap = catalogContainer.querySelector('.catalog-menu-filters');

    // Set first filter as active by default
    let activeCategory = null;
    const firstFilter = filtersWrap.querySelector('.catalog-filter');
    if (firstFilter) {
        activeCategory = firstFilter.dataset.category;
    }

    function applyFilter(cat) {
        const cards = cardsWrap.querySelectorAll('.tab-catalog-card');
        cards.forEach(c => {
            if (!cat) {
                c.style.display = '';
            } else {
                c.style.display = (c.dataset.category === cat) ? '' : 'none';
            }
        });
        try {
            parent.postMessage({ type: 'bh-resize', height: document.documentElement.scrollHeight }, '*');
        } catch { }
    }

    function updateFilterUI() {
        filtersWrap.querySelectorAll('.catalog-filter').forEach(el => {
            const on = el.dataset.category === activeCategory;
            el.classList.toggle('active', on);
            el.setAttribute('aria-pressed', on ? 'true' : 'false');
        });
    }

    function selectFilter(cat) {
        if (activeCategory === cat) return; // Don't deselect if already active
        activeCategory = cat;
        updateFilterUI();
        applyFilter(activeCategory);
    }

    filtersWrap.addEventListener('click', e => {
        const btn = e.target.closest('.catalog-filter');
        if (!btn) return;
        selectFilter(btn.dataset.category);
    });

    filtersWrap.addEventListener('keydown', e => {
        if (e.key !== 'Enter' && e.key !== ' ') return;
        const btn = e.target.closest('.catalog-filter');
        if (!btn) return;
        e.preventDefault();
        selectFilter(btn.dataset.category);
    });

    // Initial setup
    updateFilterUI();
    applyFilter(activeCategory);
}

// Utility: derive favicon (simple heuristic)
function getFaviconURL(resourceUrl) {
    try {
        const u = new URL(resourceUrl);
        if (u.hostname !== 'localhost' && u.protocol.startsWith('http')) {
            return `https://www.google.com/s2/favicons?domain=${u.hostname}&sz=32`;
        }
        return `${u.origin}/favicon.ico`;
    } catch {
        return 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==';
    }
}

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
                // Store and clear SharePoint iframe src
                p.querySelectorAll('iframe').forEach(iframe => {
                    if (iframe.src) {
                        if (!iframe.dataset.originalSrc) {
                            iframe.dataset.originalSrc = iframe.src;
                        }
                        iframe.src = '';
                    }
                });
            } else {
                // Restore SharePoint iframe src when showing panel
                p.querySelectorAll('iframe').forEach(iframe => {
                    if (iframe.dataset.originalSrc && !iframe.src) {
                        iframe.src = iframe.dataset.originalSrc;
                    }
                });
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

    // Initialize dynamic catalog after tabs wired (only once)
    if (!window.__journeyCatalogBuilt) {
        window.__journeyCatalogBuilt = true;
        initJourneyCatalog();
    }
}

function enhanceVideoPlaylistFromMarkup(root, options = {}) {
    if (!root || root.dataset.enhanced === 'true') return;
    const sourceWrapper = root.querySelector('.playlist-source');
    if (!sourceWrapper) return;

    // Include ALL articles, not just those with data-src
    const articles = [...sourceWrapper.querySelectorAll('article')];
    if (!articles.length) return;

    const items = articles.map((art, i) => {
        const title = (art.querySelector('h4')?.textContent || art.dataset.title || `Video ${i + 1}`).trim();
        const short = (art.querySelector('.short')?.textContent || art.dataset.short || '').trim();
        const descEl = art.querySelector('.description');
        const description = descEl ? descEl.textContent.trim() : (art.textContent || '').trim();

        // Check if this is a SharePoint embed URL
        const src = art.dataset.src || null;
        const isSharePointEmbed = src && src.includes('sharepoint.com') && src.includes('embed.aspx');

        return {
            id: art.id || `video-${i}`,
            title,
            short,
            description,
            src,
            customThumb: art.dataset.thumb || null,
            disabled: !src || src.trim() === '',
            isSharePointEmbed
        };
    });

    // Find first enabled item for initial selection
    const firstEnabledIndex = items.findIndex(item => !item.disabled);
    if (firstEnabledIndex === -1) {
        console.warn('No enabled videos found in playlist');
        return;
    }

    root.dataset.enhanced = 'true';

    const main = document.createElement('div');
    main.className = 'video-playlist-main';
    main.innerHTML = `
                <div class="video-wrapper">
                    <video class="playlist-main-video" playsinline controls preload="metadata" style="display: none;"></video>
                    <iframe class="playlist-main-iframe" frameborder="0" allowfullscreen style="display: none; width: 100%; aspect-ratio: 16/9; border-radius: 20px 20px 0 0;"></iframe>
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
    const iframeEl = main.querySelector('.playlist-main-iframe');
    const titleEl = main.querySelector('.video-title');
    const descEl = main.querySelector('.video-description');
    const listEl = side.querySelector('.video-playlist-list');

    const state = { currentIndex: firstEnabledIndex, items };

    // Define color pool for circles
    const colorPool = ['#009cde', '#26d07c', '#f277c6', '#9063cd', '#ffda00'];

    // Find the video-playlist-info element
    const playlistInfo = root.querySelector('.video-playlist-info');

    function updateColors() {
        if (playlistInfo) {
            // Pick two different colors from the pool
            const shuffledColors = [...colorPool].sort(() => 0.5 - Math.random());
            const topColor = shuffledColors[0];
            const bottomColor = shuffledColors[1];

            // Set custom CSS properties for this element's circles
            playlistInfo.style.setProperty('--top-circle-color', topColor);
            playlistInfo.style.setProperty('--bottom-circle-color', bottomColor);
        }
    }

    function renderList() {
        listEl.innerHTML = '';
        state.items.forEach((item, idx) => {
            const li = document.createElement('div');
            const isActive = idx === state.currentIndex;
            const isDisabled = item.disabled;

            // Build class list
            let className = 'playlist-item';
            if (isActive) className += ' active';
            if (isDisabled) className += ' disabled';

            li.className = className;
            li.setAttribute('role', 'option');
            li.setAttribute('aria-selected', isActive ? 'true' : 'false');
            li.setAttribute('aria-disabled', isDisabled ? 'true' : 'false');
            li.dataset.index = String(idx);

            // Transparent 1x1 gif as placeholder
            const blank = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==';

            li.innerHTML = `
                        <div class="playlist-thumb ${isDisabled ? 'disabled' : 'loading'}">
                            <img loading="lazy" src="${item.customThumb || blank}" ${!isDisabled && !item.customThumb && !item.isSharePointEmbed ? `data-video-thumb="${item.src}"` : ''} alt="${item.title}">
                        </div>
                        <div class="playlist-meta">
                            <div class="playlist-meta-title">${item.title}</div>
                            <div class="playlist-meta-desc">${item.short || ''}</div>
                        </div>
                        <button type="button" aria-label="${isDisabled ? 'Video not available' : `Play ${item.title}`}" ${isDisabled ? 'disabled' : ''}></button>
                    `;

            // Only add click handler for enabled items
            if (!isDisabled) {
                li.addEventListener('click', () => selectIndex(idx, true));
                li.style.cursor = 'pointer';
            } else {
                li.style.cursor = 'not-allowed';
            }

            listEl.appendChild(li);
        });

        // Only generate thumbnails for enabled non-SharePoint items
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
        if (!item || item.disabled) return;

        titleEl.textContent = item.title;
        descEl.textContent = item.description || '';
        updateActive();

        if (item.isSharePointEmbed) {
            // Show iframe, hide video
            videoEl.style.display = 'none';
            iframeEl.style.display = 'block';
            // Store original src for later restoration
            iframeEl.dataset.originalSrc = item.src;
            iframeEl.src = item.src;
            // Pause any video that might be playing
            try { videoEl.pause(); } catch { }
        } else {
            // Show video, hide iframe
            iframeEl.style.display = 'none';
            videoEl.style.display = 'block';
            // Clear iframe and its stored src
            iframeEl.src = '';
            iframeEl.dataset.originalSrc = '';

            if (videoEl.src !== item.src) videoEl.src = item.src;
            if (autoplay) videoEl.play().catch(() => { });
        }

        try {
            parent.postMessage({ type: 'bh-resize', height: document.documentElement.scrollHeight }, '*');
        } catch { }
    }

    function selectIndex(idx, autoplay) {
        const item = state.items[idx];
        if (idx < 0 || idx >= state.items.length || idx === state.currentIndex || !item || item.disabled) return;

        // Stop current media before switching
        if (state.items[state.currentIndex]) {
            const currentItem = state.items[state.currentIndex];
            if (currentItem.isSharePointEmbed) {
                // Store src before clearing for SharePoint videos
                if (!iframeEl.dataset.originalSrc) {
                    iframeEl.dataset.originalSrc = iframeEl.src;
                }
                iframeEl.src = '';
            } else {
                try { videoEl.pause(); } catch { }
            }
        }

        state.currentIndex = idx;
        updateColors(); // Update colors when video changes
        loadCurrent(autoplay);
    }

    renderList();
    updateColors(); // Set initial colors
    loadCurrent(options.autoplayFirst === true);

    // Thumbnail generation from video first frame (only for enabled non-SharePoint items)
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