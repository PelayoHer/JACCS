// ==UserScript==
// @name         JACCS Ultimate Injector
// @namespace    http://tampermonkey.net/
// @version      5.0
// @description  Bypasses Cookie Clicker CSP
// @author       PelayoHer
// @match        https://orteil.dashnet.org/cookieclicker/
// @icon         https://www.google.com/s2/favicons?sz=64&domain=dashnet.org
// @grant        none
// @sandbox      raw
// ==/UserScript==

(function() {
    'use strict';
    setTimeout(() => {
/**
 * JACCS - Logger Module
 * 
 * Manages an internal event queue with a maximum of 50 entries to
 * prevent infinite DOM growth. Connects to UI.js for rendering.
 */

if (typeof JACCS === 'undefined') {
    var JACCS = {};
}

JACCS.Logger = (function () {
    const MAX_LOGS = 50;
    let _logs = [];

    // Map categories to CSS colors (handled in UI.js)
    const CATEGORIES = {
        INFO: 'info',
        PURCHASE: 'purchase',
        MAGIC: 'magic',
        STOCK: 'stock',
        STEALTH: 'stealth',
        GARDEN: 'garden',
        LUMPS: 'lumps',
        ERROR: 'error'
    };

    /**
     * Internal method to push a log
     */
    function _pushLog(category, message) {
        let timestamp = new Date().toLocaleTimeString('en-US', { hour12: false, hour: "numeric", minute: "numeric", second: "numeric" });

        let entry = {
            time: timestamp,
            cat: category,
            msg: message
        };

        _logs.unshift(entry);

        if (_logs.length > MAX_LOGS) {
            _logs.pop();
        }

        // Notify UI to re-render if it exists
        if (JACCS.UI && typeof JACCS.UI.refreshLogs === 'function') {
            JACCS.UI.refreshLogs();
        }
    }

    return {
        // Public logging methods
        info: (msg) => _pushLog(CATEGORIES.INFO, msg),
        purchase: (msg) => _pushLog(CATEGORIES.PURCHASE, msg),
        magic: (msg) => _pushLog(CATEGORIES.MAGIC, msg),
        stock: (msg) => _pushLog(CATEGORIES.STOCK, msg),
        stealth: (msg) => _pushLog(CATEGORIES.STEALTH, msg),
        garden: (msg) => _pushLog(CATEGORIES.GARDEN, msg),
        lumps: (msg) => _pushLog(CATEGORIES.LUMPS, msg),
        error: (msg) => _pushLog(CATEGORIES.ERROR, msg),

        getLogs: function () {
            return _logs;
        }
    };

})();

// --- Intercept console.log to feed the custom UI (Optional but cool) ---
// This regex will catch our own "JACCS Xx:" logs from the other modules.
(function interceptConsoleLog() {
    const originalLog = console.log;
    console.log = function () {
        originalLog.apply(console, arguments);

        if (typeof arguments[0] === 'string' && arguments[0].startsWith('JACCS ')) {
            let fullMsg = arguments[0];
            let catMatch = fullMsg.match(/JACCS (\w+): (.*)/);

            if (catMatch && catMatch.length === 3) {
                let module = catMatch[1].toLowerCase();
                let finalMsg = catMatch[2];

                if (module === 'autobuy' || module === 'efficiency') JACCS.Logger.purchase(finalMsg);
                else if (module === 'stocks') JACCS.Logger.stock(finalMsg);
                else if (module === 'grimoire' || module === 'godzamok') JACCS.Logger.magic(finalMsg);
                else if (module === 'stealth') JACCS.Logger.stealth(finalMsg);
                else if (module === 'garden') JACCS.Logger.garden(finalMsg);
                else if (module === 'lumps') JACCS.Logger.lumps(finalMsg);
                else JACCS.Logger.info(finalMsg);
            }
        }
    };
})();

// --- Anti-Tamper: DevTools Detection ---
// Detects if the user opens the F12 developer console to inspect the script.
(function detectDevTools() {
    let devtoolsOpen = false;
    const threshold = 160;

    setInterval(function () {
        // Modern approach: calculating the difference between the outer and inner window bounds.
        // If the difference is larger than 160px (the typical minimum devtools size), it's likely open docked to a side.
        const widthThreshold = window.outerWidth - window.innerWidth > threshold;
        const heightThreshold = window.outerHeight - window.innerHeight > threshold;

        const isCurrentlyOpen = (widthThreshold || heightThreshold);

        if (isCurrentlyOpen && !devtoolsOpen) {
            devtoolsOpen = true;
            if (JACCS.Logger) JACCS.Logger.stealth("SECURITY ALERT: Developer Console (F12) opened. Script inspection detected.");
        } else if (!isCurrentlyOpen && devtoolsOpen) {
            devtoolsOpen = false;
            // Optional: Log when it's closed
            // if (JACCS.Logger) JACCS.Logger.info("SECURITY UPDATE: Developer Console closed.");
        }
    }, 1000);
})();


/**
 * JACCS - UI Module (Zero-Background Rendering)
 * Injects a Shadow DOM interface to display the feed.
 */

if (typeof JACCS === 'undefined') {
    var JACCS = {};
}

JACCS.UI = (function () {
    let _shadowRoot = null;
    let _container = null;
    let _logContainer = null;
    let _isVisible = true;

    // We will inject the CSS inline to avoid extra network requests for the user script
    const CSS_STYLES = `
        :host {
            position: fixed;
            bottom: 20px;
            left: 20px;
            width: 350px;
            background: rgba(15, 15, 15, 0.95);
            border: 1px solid #333;
            border-radius: 8px;
            color: #ccc;
            font-family: 'Courier New', Courier, monospace;
            font-size: 11px;
            z-index: 99999999;
            box-shadow: 0 4px 6px rgba(0,0,0,0.5);
            display: flex;
            flex-direction: column;
            overflow: hidden;
            transition: height 0.3s ease;
        }

        .header {
            background: #222;
            padding: 8px 12px;
            border-bottom: 1px solid #444;
            display: flex;
            justify-content: space-between;
            align-items: center;
            cursor: move;
            user-select: none;
        }

        .header-title {
            color: #fff;
            font-weight: bold;
            display: flex;
            align-items: center;
            gap: 8px;
        }

        .status-dot {
            width: 8px;
            height: 8px;
            background-color: #4caf50;
            border-radius: 50%;
            display: inline-block;
            box-shadow: 0 0 5px #4caf50;
        }

        .toggle-btn {
            background: none;
            border: none;
            color: #888;
            cursor: pointer;
            font-size: 16px;
        }
        .toggle-btn:hover { color: #fff; }

        .content {
            padding: 10px;
            height: 250px;
            display: flex;
            flex-direction: column;
        }

        .log-area {
            flex-grow: 1;
            overflow-y: auto;
            border: 1px solid #333;
            background: #111;
            padding: 5px;
            border-radius: 4px;
        }

        .log-area::-webkit-scrollbar { width: 6px; }
        .log-area::-webkit-scrollbar-track { background: #111; }
        .log-area::-webkit-scrollbar-thumb { background: #444; border-radius: 3px; }

        .log-entry {
            margin-bottom: 4px;
            line-height: 1.3;
            word-wrap: break-word;
        }

        .log-time { color: #666; margin-right: 5px; }

        /* Categorized Colors */
        .log-cat-info { color: #aaa; }
        .log-cat-purchase { color: #4caf50; font-weight: bold; }
        .log-cat-magic { color: #ba68c8; }
        .log-cat-stock { color: #64b5f6; }
        .log-cat-stealth { color: #ffb74d; font-style: italic; }
        .log-cat-garden { color: #81c784; }
        .log-cat-lumps { color: #e57373; font-weight: bold;}
        .log-cat-error { color: #f44336; font-weight: bold; background: rgba(244,67,54,0.1); }
        
        .hidden { display: none !important; }
    `;

    function _buildUI() {
        if (document.getElementById('jaccs-ui-wrapper')) return;

        let host = document.createElement('div');
        host.id = 'jaccs-ui-wrapper';
        document.body.appendChild(host);

        _shadowRoot = host.attachShadow({ mode: 'open' });

        let style = document.createElement('style');
        style.textContent = CSS_STYLES;
        _shadowRoot.appendChild(style);

        _container = document.createElement('div');
        _container.innerHTML = '' +
            '<div class="header" id="jaccs-drag-handle">' +
            '<div class="header-title">' +
            '<span class="status-dot"></span>' +
            'JACCS Autonomous Feed' +
            '</div>' +
            '<button class="toggle-btn" id="jaccs-toggle">_</button>' +
            '</div>' +
            '<div class="content" id="jaccs-content">' +
            '<div class="log-area" id="jaccs-log-feed"></div>' +
            '</div>';
        _shadowRoot.appendChild(_container);

        _logContainer = _shadowRoot.getElementById('jaccs-log-feed');

        _attachEvents();
    }

    function _attachEvents() {
        let toggleBtn = _shadowRoot.getElementById('jaccs-toggle');
        let contentPane = _shadowRoot.getElementById('jaccs-content');
        let handle = _shadowRoot.getElementById('jaccs-drag-handle');

        toggleBtn.addEventListener('click', () => {
            _isVisible = !_isVisible;
            if (_isVisible) {
                contentPane.classList.remove('hidden');
                toggleBtn.innerText = '_';
            } else {
                contentPane.classList.add('hidden');
                toggleBtn.innerText = 'O';
            }
        });

        // Basic Dragging
        let isDragging = false;
        let currentX; let currentY; let initialX; let initialY; let xOffset = 0; let yOffset = 0;

        handle.addEventListener("mousedown", dragStart);
        document.addEventListener("mouseup", dragEnd);
        document.addEventListener("mousemove", drag);

        function dragStart(e) {
            initialX = e.clientX - xOffset;
            initialY = e.clientY - yOffset;
            if (e.target === handle || handle.contains(e.target)) {
                isDragging = true;
            }
        }
        function dragEnd(e) {
            initialX = currentX;
            initialY = currentY;
            isDragging = false;
        }
        function drag(e) {
            if (isDragging) {
                e.preventDefault();
                currentX = e.clientX - initialX;
                currentY = e.clientY - initialY;
                xOffset = currentX;
                yOffset = currentY;
                // Move the host, not the shadow container
                let host = document.getElementById('jaccs-ui-wrapper');
                // The translation requires overriding the bottom/left fixed position via transform
                host.style.transform = "translate3d(" + currentX + "px, " + currentY + "px, 0)";
            }
        }
    }

    return {
        init: function () {
            _buildUI();
            if (JACCS.Logger) JACCS.Logger.info("UI rendering initialized. complete.");
        },

        refreshLogs: function () {
            if (!_isVisible || !_logContainer || !JACCS.Logger) return;

            // Zero-Background Philosophy: We only manipulate DOM when the panel is open.
            let logs = JACCS.Logger.getLogs();
            let htmlStr = '';

            for (let i = 0; i < logs.length; i++) {
                let l = logs[i];
                htmlStr += '<div class="log-entry">' +
                    '<span class="log-time">[' + l.time + ']</span> ' +
                    '<span class="log-cat-' + l.cat + '">' + l.msg + '</span>' +
                    '</div>';
            }

            // Using innerHTML is extremely fast for small arrays (50 items)
            _logContainer.innerHTML = htmlStr;
        }
    };

})();


/**
 * JACCS - Core Engine 
 * Single-Loop Engine architecture for clean, non-blocking injection.
 */

if (typeof JACCS === 'undefined') {
    var JACCS = {};
}

JACCS.Core = (function () {
    let _isRunning = false;
    let _animationFrameId = null;
    let _lastFrameTime = 0;

    // FPS configuration
    const TARGET_FPS = 60;
    const FRAME_BUDGET_MS = 1000 / TARGET_FPS; // ~16.6ms per frame
    const MAX_PROC_TIME_MS = 16; // If processing takes longer than 16ms, we drop the next frame to avoid lag

    function _mainLoop(timestamp) {
        if (!_isRunning) return;

        let deltaTime = timestamp - _lastFrameTime;

        if (deltaTime >= FRAME_BUDGET_MS) {
            _lastFrameTime = timestamp - (deltaTime % FRAME_BUDGET_MS);

            let procStart = performance.now();
            // --- EXECUTION QUEUE ---
            // We sequentially tick all our sub-modules in a synchronous manner using a unified clock.
            // This prevents chaotic overlapping intervals, race conditions, and memory leaks.
            try {
                if (JACCS.Efficiency) JACCS.Efficiency.update(); // 1. Recalculate ROI mathematics if needed
                if (JACCS.AutoManager) JACCS.AutoManager.tick(deltaTime, timestamp); // 2. Handle clicks, purchases, UI
                if (JACCS.Minigames) JACCS.Minigames.tick(deltaTime); // 3. Compute Stocks, Garden, Grimoire, Pantheon
                if (JACCS.Ascension) JACCS.Ascension.tick(deltaTime, timestamp); // 4. Check rebirth conditions
                if (JACCS.Lumps) JACCS.Lumps.tick(deltaTime, timestamp); // 5. Check sugar lumps harvesting
            } catch (e) {
                console.error("JACCS Sub-module crashed in MainLoop:", e);
            }

            let procTime = performance.now() - procStart;

            // Frame-Dropping Strategy
            if (procTime > MAX_PROC_TIME_MS) {
                console.warn(`JACCS Frame-drop warning: Cycle took ${procTime.toFixed(2)}ms. Skipping next frame.`);
                _lastFrameTime += MAX_PROC_TIME_MS;
            }
        }

        _animationFrameId = requestAnimationFrame(_mainLoop);
    }

    return {
        init: function () {
            console.log("JACCS Core: Initializing...");
            if (!JACCS.settings) JACCS.settings = {};
            this.start();
        },

        start: function () {
            if (_isRunning) return;
            console.log("JACCS Core: Engine started.");
            _isRunning = true;
            _lastFrameTime = performance.now();
            _animationFrameId = requestAnimationFrame(_mainLoop);
        },

        stop: function () {
            console.log("JACCS Core: Engine stopped.");
            _isRunning = false;
            if (_animationFrameId) {
                cancelAnimationFrame(_animationFrameId);
                _animationFrameId = null;
            }
        }
    };
})();

// --- Official Mod Registration ---
JACCS.register = function () {
    Game.registerMod("jaccs-v2", {
        init: function () {
            setTimeout(() => {
                if (JACCS.UI) JACCS.UI.init();
                JACCS.Core.init();

                // Add success notification in game's native UI
                Game.Notify('JACCS Protocol Engaged', 'Advanced autonomous systems are now online.', [16, 5], 6);
                if (JACCS.Logger) JACCS.Logger.info("Mod successfully registered via vanilla API.");
            }, 100);
        },
        save: function () {
            // Here we can serialize settings to string if desired
            return JSON.stringify({
                stealth: JACCS.settings.stealth || {},
                lumps: JACCS.settings.lumps || {},
                ascension: JACCS.settings.ascension || {}
            });
        },
        load: function (str) {
            try {
                let parsed = JSON.parse(str);
                if (parsed.stealth) JACCS.settings.stealth = parsed.stealth;
                if (parsed.lumps) JACCS.settings.lumps = parsed.lumps;
                if (parsed.ascension) JACCS.settings.ascension = parsed.ascension;
                if (JACCS.Logger) JACCS.Logger.info("Settings loaded from native modSave.");
            } catch (e) {
                console.warn("JACCS: Could not load save data", e);
            }
        }
    });
};

let _jaccsWaitInterval = setInterval(function () {
    if (typeof Game !== 'undefined' && Game.ready) {
        clearInterval(_jaccsWaitInterval);
        JACCS.register();
    }
}, 1000);


/**
 * JACCS - Efficiency Engine
 * Pure math core ported from Cookie Monster to calculate Return on Investment (ROI) 
 * for buildings and upgrades.
 */

if (typeof JACCS === 'undefined') {
    var JACCS = {};
}

JACCS.Efficiency = (function () {
    let _lastValidCPS = 0;
    let _cache = [];
    let _needsRecalc = true;

    /**
     * Simulates buying 1 building and calculates the strict increase in CPS (Delta).
     * By faking the purchase, calculating the new CPS, and instantly reverting it,
     * the bot gathers absolute measurement accuracy without permanent cost side effects.
     */
    function _simulateBuildingDelta(obj) {
        let pCPS = Game.cookiesPs;

        obj.amount++;
        Game.CalculateGains();
        let delta = Game.cookiesPs - pCPS;

        obj.amount--;
        Game.CalculateGains();

        return Math.max(delta, 0.0001);
    }

    /**
     * Simulates buying an upgrade and calculates the strict CPS increase (Delta CPS).
     * If the delta is exactly 0, it indicates a utility upgrade, which the engine evaluates via exception rules.
     */
    function _simulateUpgradeDelta(upg) {
        if (upg.bought) return 0;

        let pCPS = Game.cookiesPs;
        upg.bought = 1;
        Game.CalculateGains();

        let delta = Game.cookiesPs - pCPS;

        upg.bought = 0;
        Game.CalculateGains();

        return Math.max(delta, 0);
    }

    /**
     * Main Return on Investment (ROI) Calculation Engine.
     * Calculates the true mathematical cost of every available item: 
     *      (Time required to save up the Price) + (Time required to pay itself off).
     * This establishes an absolute hierarchy of what is the single best object to buy next.
     */
    function _recalculatePP() {
        let results = [];

        // 1. Buildings Array
        for (let i in Game.Objects) {
            let obj = Game.Objects[i];
            if (obj.locked) continue;

            let price = obj.getPrice();
            let delta = _simulateBuildingDelta(obj);

            // ROI Formula: Time to afford + Time to pay itself off
            let safeCps = Math.max(Game.cookiesPs, 0.001); // Prevent division by zero mathematically
            let dTime = Math.max(0, (price - Game.cookies)) / safeCps;
            let retTime = price / delta;
            let totalPP = dTime + retTime;

            results.push({
                type: 'building',
                name: obj.name,
                id: obj.id,
                price: price,
                delta: delta,
                ROI: totalPP,
                objRef: obj
            });
        }

        // 2. Upgrades Array (Store visible only)
        let upgsInStore = Game.UpgradesInStore;
        for (let u = 0; u < upgsInStore.length; u++) {
            let upg = upgsInStore[u];
            // Ignore click toggles, season switches, and raw cookies (hard to measure base CPS diff)
            if (upg.pool === 'toggle' || upg.type === 'cookie' || upg.name.includes('Golden switch')) continue;

            let price = upg.getPrice();
            let delta = _simulateUpgradeDelta(upg);

            // Essential mechanics don't instantly add direct CPS, so their delta=0. We force priority.
            let isEssential = (upg.name === 'Lucky day' || upg.name === 'Serendipity' || upg.name === 'Get lucky' || upg.name === 'Bingo center/Research facility');

            if (delta <= 0 && !isEssential) {
                // If it's a utility or click upgrade but extremely cheap (< 15 mins of CPS), buy it eventually
                let safeCpsLocal = Math.max(Game.cookiesPs, 1);
                if (price > 0 && price < (safeCpsLocal * 900)) {
                    delta = safeCpsLocal * 0.001;
                } else {
                    continue;
                }
            } else if (isEssential) {
                // Force an insanely high delta (equivalent to +100% total CPS) so the bot buys it instantly
                delta = Math.max(Game.cookiesPs, 1);
            }

            let safeCps = Math.max(Game.cookiesPs, 0.001);
            let dTime = Math.max(0, (price - Game.cookies)) / safeCps;
            let retTime = price / delta;

            results.push({
                type: 'upgrade',
                name: upg.name,
                id: upg.id,
                price: price,
                delta: delta,
                ROI: dTime + retTime,
                objRef: upg
            });
        }

        // Sort by Lowest ROI (Most efficient first)
        results.sort((a, b) => a.ROI - b.ROI);

        _cache = results;
        _needsRecalc = false;

        return results;
    }

    return {
        update: function () {
            // Passive Recalc: Only when CPS shifts massively or a purchase was made
            if (Math.abs(Game.cookiesPs - _lastValidCPS) > (Game.cookiesPs * 0.05) || _needsRecalc) {
                _lastValidCPS = Game.cookiesPs;
                _recalculatePP();
                // console.log("JACCS Efficiency: Recalculated ROI Rankings."); // Muted to prevent UI flood
            }
        },

        getBestInvestment: function () {
            if (_cache.length === 0) _recalculatePP();
            return _cache.length > 0 ? _cache[0] : null;
        },

        invalidate: function () {
            _needsRecalc = true;
        },

        get lastCache() {
            return _cache;
        }
    };
})();


/**
 * JACCS - AutoManager (Steering & Humanization)
 * 
 * Focuses strictly on clicking the Big Cookie and Golden Cookies
 * using organic, human-like stealth patterns.
 */

if (typeof JACCS === 'undefined') {
    var JACCS = {};
}

JACCS.settings = JACCS.settings || {};
JACCS.settings.stealth = {
    humanErrorRate: 0.002,      // 0.2% chance to ignore Golden Cookies or Fortune News
    baseCpsTarget: 12,          // Normal CPS (10-14ish)
    burstCpsTarget: 50,         // Burst CPS (50+)
    burstAccelerationMs: 500,   // 0.5s ramp from Human to Burst
    dynamicSafeBank: true,      // Hoarding limit config
    autoPurchase: true          // Main switch for the bot to buy things
};

JACCS.AutoManager = (function () {
    // --- Internal Stealth State ---
    let _lastBigClick = 0;
    let _burstModeStart = 0;
    let _isBursting = false;

    /**
     * Contextual Buff Awareness:
     * Evaluates if we should enter Burst Mode based on Click Frenzy or Dragonflight.
     */
    function _evaluateBuffClimate() {
        let isGodMode = false;

        for (let i in Game.buffs) {
            let buff = Game.buffs[i];
            if (buff.type && buff.type.name) {
                let bn = buff.type.name.toLowerCase();
                if (bn.includes("click frenzy") || bn.includes("dragonflight")) {
                    isGodMode = true;
                    break;
                }
            }
        }

        if (isGodMode && !_isBursting) {
            _isBursting = true;
            _burstModeStart = performance.now();
            console.log("JACCS Stealth: Burst Mode Activated! (Buff detected)");
        } else if (!isGodMode && _isBursting) {
            _isBursting = false;
            console.log("JACCS Stealth: Returning to Human Idle mode.");
        }
    }

    /**
     * Big Cookie Clicker 
     * Uses Poisson-like distribution for irregular, organic clicks mimicking a human.
     * Transitions smoothly via humanized acceleration ramp when bursting.
     */
    function _clickBigCookie(timestamp) {
        let cpsTarget = JACCS.settings.stealth.baseCpsTarget;

        if (_isBursting) {
            // Humanized Acceleration Ramp (0.5s = 500ms)
            let timeInBurst = timestamp - _burstModeStart;
            let accelRatio = Math.min(1, timeInBurst / JACCS.settings.stealth.burstAccelerationMs);

            cpsTarget = JACCS.settings.stealth.baseCpsTarget +
                ((JACCS.settings.stealth.burstCpsTarget - JACCS.settings.stealth.baseCpsTarget) * accelRatio);
        }

        let idealDelay = 1000 / cpsTarget;

        // Poisson / Jitter (stat noise up to +-20% of the delay)
        let jitter = idealDelay * (Math.random() * 0.4 - 0.2);
        let currentDelay = idealDelay + jitter;

        if (timestamp - _lastBigClick > currentDelay) {
            _lastBigClick = timestamp;
            if (Game.ClickCookie) Game.ClickCookie(null, 0);
        }
    }

    /**
     * Golden Cookies and Fortunes
     * Uses Variable Task Latency (Gaussian curve) and Human Error Mode.
     */
    function _checkGoldenCookies(timestamp) {
        let shimmers = Game.shimmers;

        // Let's also check for Fortunes in the ticker
        let fortune = Game.TickerEffect;
        if (fortune && fortune.type === 'fortune' && Game.drawT) {
            if (!Game.jaccsFortuneTargetTime) {
                _assignReactionTime(Game, timestamp, "Fortune News");
            } else if (!Game.jaccsErrorIgnored && timestamp >= Game.jaccsFortuneTargetTime) {
                if (Game.tickerL && typeof Game.tickerL.click === 'function') {
                    Game.tickerL.click();
                }
                Game.jaccsFortuneTargetTime = null; // reset
            }
        }

        if (shimmers.length === 0) return;

        for (let i = 0; i < shimmers.length; i++) {
            let s = shimmers[i];

            if (!s.jaccsTargetTime) {
                _assignReactionTime(s, timestamp, "Golden Cookie");
            } else if (!s.jaccsErrorIgnored && timestamp >= s.jaccsTargetTime) {
                s.pop();
            }
        }
    }

    /**
     * Assigns Gaussian target time or triggers Human Error Mode
     */
    function _assignReactionTime(targetObj, timestamp, typeName) {
        // Human Error Mode
        if (Math.random() < JACCS.settings.stealth.humanErrorRate) {
            targetObj.jaccsErrorIgnored = true;
            console.log(`JACCS Stealth: Ignored ${typeName} intentionally (Human Error Emulation).`);
            return;
        }

        // Gaussian curve (Box-Muller) for reaction delay
        let u = 1 - Math.random();
        let v = Math.random();
        let z = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);

        // Mean: ~700ms, StdDev: ~200ms
        let reactionDelay = Math.max(300, 700 + (z * 200));

        if (typeName === "Fortune News") {
            targetObj.jaccsFortuneTargetTime = timestamp + reactionDelay;
        } else {
            targetObj.jaccsTargetTime = timestamp + reactionDelay;
        }
    }

    /**
     * Calculates the required bank to maximize the "Lucky!" Golden Cookie combo.
     * Implements Dynamic Game Stage AI to hoard cookies up to a specific mathematical limit,
     * ensuring we get the maximum possible reward without stalling base progression.
     */
    function _getDynamicSafeBank() {
        if (!JACCS.settings.stealth.dynamicSafeBank) return 0;

        // 1. Calculate pure Base CPS dynamically by stripping all active buff multipliers
        let baseCps = Game.cookiesPs;
        let hasFrenzy = false;

        for (let i in Game.buffs) {
            let buff = Game.buffs[i];
            if (buff.multCpS && buff.multCpS > 0) {
                baseCps /= buff.multCpS;
            }
            if (buff.type && buff.type.name && buff.type.name.toLowerCase().includes("frenzy")) {
                hasFrenzy = true;
            }
        }

        // 2. Early Game (Arranque): Spend everything to grow exponentially
        if (Game.cookiesEarned < 1000000000000) { // Extended to 1 Trillion to speed up progression immensely
            return 0;
        }

        // 3. Late Game (Post-Get Lucky): Hoard for Frenzy + Lucky (105 minutes of CPS)
        let hasGetLucky = Game.Has('Get lucky');
        if (hasGetLucky) {
            // To cap a Lucky during a Frenzy (x7), we need 7 * 6000 * BaseCPS = 42000 * BaseCPS
            return baseCps * 42000;
        }

        // 4. Mid Game (Pre-Get Lucky): Hoard for normal Lucky (15 minutes of CPS)
        // To cap a normal Lucky, we need 15 mins * 60s * 10% math ceiling -> roughly 6000 * BaseCPS
        return baseCps * 6000;
    }

    /**
     * Smart Purchasing (EfficiencyEngine + Dynamic Safe Bank)
     * Compares the absolute best Return on Investment (ROI) against our Safe Bank threshold.
     * Mathematical bypass rules allow buying highly efficient items even if the bank isn't full yet.
     */
    function _handlePurchases() {
        if (!JACCS.settings.stealth.autoPurchase || !JACCS.Efficiency) return;

        let safeBank = _getDynamicSafeBank();
        let target = JACCS.Efficiency.getBestInvestment();

        if (!target) return;

        let hasGetLucky = Game.Has('Get lucky');
        // Mathematical Proof: If an item pays for itself faster than the Safe Bank coefficient (e.g. 6000s or 42000s),
        // it is ALWAYS better to buy it than to hoard. We use absolute limits to prioritize raw CPS scaling.
        let roiThreshold = hasGetLucky ? 42000 : 6000; // 11.6 hours / 1.6 hours of ROI

        let isEarlyGame = Game.cookiesEarned < 1000000000000;
        let isTriviallyCheap = target.price < (Game.cookies * 0.01);
        let respectsBank = (Game.cookies - target.price) >= safeBank;

        // Highly efficient override: we actually have the cookies AND the Return on Investment is incredibly low.
        let isHighlyEfficient = target.ROI < roiThreshold && Game.cookies >= target.price;

        if ((isEarlyGame || isTriviallyCheap || respectsBank || isHighlyEfficient) && Game.cookies >= target.price) {
            if (target.type === 'building' && target.objRef) {
                target.objRef.buy();
                JACCS.Efficiency.invalidate();
                if (isHighlyEfficient && !respectsBank && !isEarlyGame && !isTriviallyCheap) {
                    console.log(`JACCS AutoBuy: [High-Efficiency Override] Built ${target.name} (ROI: ${target.ROI.toFixed(2)}s)`);
                } else if (!isTriviallyCheap) {
                    console.log(`JACCS AutoBuy: Built ${target.name} (ROI: ${target.ROI.toFixed(2)}s)`);
                }
            }
            else if (target.type === 'upgrade' && target.objRef) {
                target.objRef.buy();
                JACCS.Efficiency.invalidate();
                if (isHighlyEfficient && !respectsBank && !isEarlyGame && !isTriviallyCheap) {
                    console.log(`JACCS AutoBuy: [High-Efficiency Override] Upgraded ${target.name} (ROI: ${target.ROI.toFixed(2)}s)`);
                } else if (!isTriviallyCheap) {
                    console.log(`JACCS AutoBuy: Upgraded ${target.name} (ROI: ${target.ROI.toFixed(2)}s)`);
                }
            }
        }
    }

    return {
        tick: function (deltaTime, timestamp) {
            // Contextual Intelligence
            _evaluateBuffClimate();

            // Reaction to visual spawns
            _checkGoldenCookies(timestamp);

            // Active clicking
            _clickBigCookie(timestamp);

            // AutoPurchasing routines (limited execution rate to save cycles)
            if (timestamp % 1000 < 20) {
                _handlePurchases();
            }
        }
    };

})();


/**
 * JACCS - Minigame Addon 
 * Manages Stock Market (SMA), Grimoire (Double Casting) and Wrinklers.
 */

if (typeof JACCS === 'undefined') {
    var JACCS = {};
}

JACCS.settings.minigames = {
    smaPeriod: 10,        // Simple Moving Average period for Stocks
    autoWrinklers: true,  // Auto-pop wrinklers
    autoGrimoire: true    // Auto-cast (If there's a combo)
};

JACCS.Minigames = (function () {

    // --- Stock Market (SMA Analysis) ---
    let _stockHistory = {};

    function _handleStocks() {
        if (!Game.Objects['Bank'].minigameLoaded) return;
        let M = Game.Objects['Bank'].minigame;

        for (let i = 0; i < M.goodsById.length; i++) {
            let good = M.goodsById[i];

            // History tracking
            if (!_stockHistory[good.id]) _stockHistory[good.id] = [];
            _stockHistory[good.id].push(good.val);

            if (_stockHistory[good.id].length > JACCS.settings.minigames.smaPeriod) {
                _stockHistory[good.id].shift();
            }

            let currSMA = _stockHistory[good.id].reduce((a, b) => a + b, 0) / _stockHistory[good.id].length;
            let restingVal = M.getRestingVal(good.id);

            // Stock Modes: 1 (Slow Rise), 2 (Slow Fall), 3 (Fast Rise), 4 (Fast Fall)
            let isFalling = (good.mode === 2 || good.mode === 4);
            let isRising = (good.mode === 1 || good.mode === 3);

            // Buy if (Price < RV * 0.45) AND (Rebounding from SMA) AND NOT actively falling fast
            if (good.val < (restingVal * 0.45) && good.val > currSMA && !isFalling) {
                if (M.buyGood(good.id, 10000)) {
                    console.log(`JACCS Stocks: Bought MAX ${good.name} (Val: $${good.val.toFixed(2)} | SMA: $${currSMA.toFixed(2)})`);
                }
            }
            // Sell if (Price > RV * 1.6) AND (Dropping below SMA) AND NOT actively rising fast
            else if (good.val > (restingVal * 1.6) && good.val < currSMA && !isRising) {
                if (M.sellGood(good.id, 10000)) {
                    console.log(`JACCS Stocks: Sold MAX ${good.name} (Val: $${good.val.toFixed(2)} | SMA: $${currSMA.toFixed(2)})`);
                }
            }
        }
    }

    // --- Grimoire (Double Casting Strategy) ---
    // Automates spell casting when high CpS multipliers are present (e.g. Frenzy + Building Special).
    // Features an advanced exploit: Rapidly sells Wizard Towers automatically to drop the maximum mana pool ceiling,
    // allowing an instantaneous second cast of 'Force the Hand of Fate', before automatically rebuying the towers safely.
    function _handleGrimoire() {
        if (!JACCS.settings.minigames.autoGrimoire || !Game.Objects['Wizard tower'].minigameLoaded) return;
        let M = Game.Objects['Wizard tower'].minigame;

        // God Combo: E.g. Frenzy + Building Special active
        let isComboReady = false;
        let activeMultiplier = 1;

        for (let i in Game.buffs) {
            if (Game.buffs[i].multCpS > 1) activeMultiplier *= Game.buffs[i].multCpS;
        }
        if (activeMultiplier >= 50) isComboReady = true;

        if (isComboReady) {
            let spell = M.spells['hand of fate'];
            let cost = M.getSpellCost(spell);

            // CAST 1
            if (M.magic >= cost) {
                M.castSpell(spell);
                console.log("JACCS Grimoire: 1st FTHoF Casted!");

                // DOUBLE CAST LOGIC 
                let residualMagic = M.magic;
                let towers = Game.Objects['Wizard tower'];
                let soldTowersAmount = 0;

                while (towers.amount > 21) {
                    towers.amount -= 10;
                    soldTowersAmount += 10;
                    M.computeMagicM();
                    let newCost = M.getSpellCost(spell);

                    if (residualMagic >= newCost) {
                        M.castSpell(spell);
                        console.log(`JACCS Grimoire: 2nd FTHoF Double-Casted! (Sold ${soldTowersAmount} towers for instant mana manip)`);
                        break;
                    }
                }

                // Re-buy instantly
                if (soldTowersAmount > 0) {
                    towers.amount += soldTowersAmount;
                    Game.CalculateGains();
                    M.computeMagicM();
                }
            }
        }
    }

    // --- Wrinklers (Shiny Safe) ---
    function _handleWrinklers() {
        if (!JACCS.settings.minigames.autoWrinklers) return;

        let normalCount = 0;
        let shinySafe = true;

        for (let i in Game.wrinklers) {
            let w = Game.wrinklers[i];
            if (w.phase > 0 && w.type === 1) shinySafe = true; // Never touch type 1
            if (w.phase > 0 && w.type === 0) normalCount++;
        }

        let numWrinklersNeeded = Game.Has('Elder spice') ? 12 : 10;

        // Auto-pop when full
        if (normalCount >= (numWrinklersNeeded - 1)) {
            for (let i in Game.wrinklers) {
                let w = Game.wrinklers[i];
                if (w.phase > 0 && w.type === 0) {
                    w.hp = 0; // Trigger pop
                }
            }
            console.log("JACCS Wrinklers: Automated Pop executed. Shinies ignored.");
        }
    }

    // --- Garden (Auto-Harvest) ---
    // Periodically checks the plot and harvests mature crops without disrupting growth cycles natively.
    // Also features an 'Intelligent Weedkiller' that actively detects infectious weeds like Meddleweed
    // and instantly destroys them to protect the user's cross-breeding grid logic, assuming the seed is known.
    function _handleGarden() {
        if (!Game.Objects['Farm'].minigameLoaded) return;
        let M = Game.Objects['Farm'].minigame;

        // Loop through plot 6x6 (36 tiles max depending on farm level)
        for (let y = 0; y < 6; y++) {
            for (let x = 0; x < 6; x++) {
                if (!M.plot[y] || !M.plot[y][x]) continue;
                let tile = M.plot[y][x];

                // If seed is planted (ID > 0)
                if (tile[0] > 0) {
                    let plantId = tile[0] - 1;
                    let plant = M.plantsById[plantId];
                    let age = tile[1];
                    let matureAge = Math.ceil(plant.mature);

                    if (plant.weed && plant.unlocked) {
                        // Weedkiller: If it's an invasive weed and we already have its seed, kill it before it spreads
                        M.harvest(x, y);
                        console.log(`JACCS Garden: [Weedkiller] Eradicated invasive ${plant.name} to protect crossbreeds.`);
                        continue;
                    }

                    if (age >= matureAge) {
                        // Mature. Do not harvest immortals like Drowsyfern automatically.
                        if (!plant.immortal) {
                            M.harvest(x, y);
                            console.log(`JACCS Garden: Auto-Harvested mature ${plant.name}.`);
                        }
                    }
                }
            }
        }
    }

    // --- Pantheon (Godzamok Macro) ---
    // Sells cheap bulk buildings to trigger massive clicking frenzy buffs, then replenishes them.
    let _snapshotGodzamok = {};
    let _godzamokActive = false;
    const SACRIFICE_TARGETS = ['Farm', 'Mine', 'Factory', 'Bank', 'Shipment', 'Alchemy lab'];

    function _handlePantheon() {
        if (!Game.Objects['Temple'].minigameLoaded) return;
        let M = Game.Objects['Temple'].minigame;

        // Godzamok ID is 2 (Ruin). Check if he is worshipped in Diamond(0), Ruby(1) or Jade(2).
        let godzamokSlotted = false;
        for (let i = 0; i < 3; i++) {
            if (M.slot[i] === 2) godzamokSlotted = true;
        }
        if (!godzamokSlotted) return;

        // Is there an active click frenzy?
        let clickFrenzyActive = false;
        for (let i in Game.buffs) {
            let bn = Game.buffs[i].type.name.toLowerCase();
            if (bn.includes("click frenzy") || bn.includes("dragonflight")) {
                clickFrenzyActive = true;
            }
        }

        if (clickFrenzyActive && !_godzamokActive) {
            _godzamokActive = true;
            let totalSacrificed = 0;

            // Sacrifice cheap buildings
            for (let i = 0; i < SACRIFICE_TARGETS.length; i++) {
                let objName = SACRIFICE_TARGETS[i];
                let b = Game.Objects[objName];
                if (b && b.amount > 0) {
                    _snapshotGodzamok[objName] = b.amount;
                    totalSacrificed += b.amount;
                    b.sell(b.amount); // Trigger sell bypasses UI safeguards
                }
            }

            if (totalSacrificed > 0) {
                console.log(`JACCS Godzamok: Sacrificed ${totalSacrificed} buildings across 6 low-tier categories for DEVASTATION +${totalSacrificed}% click power!`);
            }

        } else if (!clickFrenzyActive && _godzamokActive) {
            _godzamokActive = false;

            // Replenish sacrifices safely and efficiently (using native buyBulk to prevent lag spikes)
            let originalBulk = Game.buyBulk;

            for (let i = 0; i < SACRIFICE_TARGETS.length; i++) {
                let objName = SACRIFICE_TARGETS[i];
                if (_snapshotGodzamok[objName] > 0) {
                    let tgt = _snapshotGodzamok[objName];
                    let b = Game.Objects[objName];

                    while (b.amount < tgt && b.getPrice() <= Game.cookies) {
                        let diff = tgt - b.amount;
                        if (diff >= 100) Game.buyBulk = 100;
                        else if (diff >= 10) Game.buyBulk = 10;
                        else Game.buyBulk = 1;

                        b.buy();
                    }
                }
            }

            Game.buyBulk = originalBulk;
            console.log("JACCS Godzamok: Replenished sacrificed buildings.");
        }
    }

    return {
        tick: function (deltaTime) {
            // Evaluates stocks rarely
            if (Math.random() < 0.01) {
                _handleStocks();
                _handleWrinklers();
            }
            // Grimoire is occasionally checked to look for a Combo window
            if (Math.random() < 0.05) {
                _handleGrimoire();
                _handleGarden();
                _handlePantheon();
            }
        }
    };

})();


/**
 * JACCS - Ascension & Prestige AI
 * Manages rebirths, Heavenly Chips returns, and Dragon Aura equipping.
 */

if (typeof JACCS === 'undefined') {
    var JACCS = {};
}

JACCS.settings.ascension = {
    enabled: true,
    chipMultiplierThreshold: 10,   // Ascend when chips gained > current chips * 10
    autoRebirth: true              // Automatically manage the ascension screen and buy upgrades
};

JACCS.Ascension = (function () {

    let _ascensionState = 'idle'; // idle -> ascending -> rebirthing -> idle

    /**
     * Determines if the current Heavenly Chips return justifies ascending.
     * Enforces the mathematical minimum of 440 chips for the very first save file run,
     * to ensure the player can afford basic necessities, and uses a dynamic x10 
     * exponential scaler for all subsequent ascensions.
     */
    function _evaluateAscension() {
        if (!JACCS.settings.ascension.enabled || Game.OnAscend || Game.AscendTimer > 0) return false;

        let currentChips = Game.heavenlyChips || 0;
        let earnedChips = Math.floor(Game.HowMuchPrestige(Game.cookiesReset + Game.cookiesEarned));
        let chipDifference = earnedChips - Game.prestige;

        // 1. Pure Speedrun Route: The very first ascension must NEVER happen before 440 chips.
        // This guarantees enough currency for: Legacy (1), Heavenly Cookies (3), Dragon (9), 
        // Boxes (84), Season Switcher (111), Heralds (100) and Permanent Slot 1 (100).
        if (Game.prestige === 0) {
            if (earnedChips >= 440) {
                console.log(`JACCS Ascension: First Rebirth Speedrun Checkpoint met! Ascending at ${earnedChips} chips.`);
                return true;
            }
            return false;
        }

        // 2. Scale subsequent ascensions using the x10 heuristic
        if (chipDifference >= currentChips * JACCS.settings.ascension.chipMultiplierThreshold) {
            console.log(`JACCS Ascension: Threshold met. Current: ${currentChips}, Potential: +${chipDifference}`);
            return true;
        }
        return false;
    }

    const OPTIMAL_HEAVENLY_PATH = [
        'Legacy', 'Heavenly cookies', 'How to bake your dragon', 'Box of brand biscuits',
        'Tin of british tea biscuits', 'Heavenly luck', 'Permanent upgrade slot I',
        'Heralds', 'Starter kit', 'Tin of butter cookies', 'Box of macarons',
        'Season switcher', 'Permanent upgrade slot II', 'Starspawn', 'Starsnow',
        'Starter kitchen', 'Halo gloves', 'Kitten angels', 'Permanent upgrade slot III',
        'Permanent upgrade slot IV', 'Permanent upgrade slot V'
    ];

    /**
     * Finds the best upgrade ID for a specific permanent slot category.
     */
    function _getBestPermanentUpgrade(category) {
        let bestId = -1;
        let highestPrice = 0;

        for (let i in Game.Upgrades) {
            let u = Game.Upgrades[i];
            // Only consider upgrades we've unlocked at least once in our history
            if (u.unlocked || u.bought) {
                if (category === 'kitten' && u.name.toLowerCase().includes('kitten')) {
                    if (u.basePrice > highestPrice) { highestPrice = u.basePrice; bestId = u.id; }
                }
                else if (category === 'fingers' && u.name.toLowerCase().includes('fingers')) {
                    if (u.basePrice > highestPrice) { highestPrice = u.basePrice; bestId = u.id; }
                }
                else if (category === 'omelette' && u.name.toLowerCase() === 'omelette') {
                    return u.id;
                }
                else if (category === 'lucky' && u.name.toLowerCase() === 'lucky day') {
                    return u.id;
                }
                else if (category === 'biscuit' && u.name.toLowerCase().includes('butter biscuit')) {
                    if (u.basePrice > highestPrice) { highestPrice = u.basePrice; bestId = u.id; }
                }
            }
        }
        return bestId;
    }

    /**
     * Handles the automated buying, slotting, and clicking logic inside the astral Ascension screen.
     * - Auto-buys Heavenly Upgrades sequentially obeying the Speedrun absolute meta.
     * - Injects the most powerful unlocked upgrades (Kittens, Fingers, Omelette) into the 5 Permanent Slots.
     */
    function _handleAscensionScreen() {
        if (!JACCS.settings.ascension.autoRebirth) return;

        // If we are fully in the ascension screen and not transitioning
        if (Game.OnAscend && Game.AscendTimer === 0) {

            let boughtSomething = false;

            // 1. Auto-Buy Heavenly Upgrades
            for (let i = 0; i < OPTIMAL_HEAVENLY_PATH.length; i++) {
                let upgName = OPTIMAL_HEAVENLY_PATH[i];
                let upg = Game.Upgrades[upgName];

                if (upg && !upg.bought && Game.heavenlyChips >= upg.getPrice()) {
                    upg.buy();
                    boughtSomething = true;
                    console.log(`JACCS Ascension: Auto-bought Heavenly Upgrade -> ${upgName}`);
                }
            }

            // 2. Auto-Assign Permanent Slots
            let slotAssignments = ['kitten', 'fingers', 'omelette', 'lucky', 'biscuit'];
            let romanNumerals = ['I', 'II', 'III', 'IV', 'V'];
            for (let s = 0; s < 5; s++) {
                let slotUpgName = `Permanent upgrade slot ${romanNumerals[s]}`;
                if (Game.Has(slotUpgName)) {
                    let bestId = _getBestPermanentUpgrade(slotAssignments[s]);
                    if (bestId !== -1 && Game.permanentUpgrades[s] !== bestId) {
                        Game.permanentUpgrades[s] = bestId;
                        console.log(`JACCS Ascension: Slotted Permanent Upgrade ID ${bestId} into Slot ${s + 1} (${slotAssignments[s]})`);
                    }
                }
            }

            // If we bought something, wait a bit before rebirthing to allow further purchases next tick
            if (boughtSomething) return;

            let rebirthButton = document.getElementById('ascendButton');
            if (rebirthButton && rebirthButton.style.display !== 'none') {
                console.log("JACCS Ascension: Done shopping. Triggering Rebirth...");
                rebirthButton.click();

                // Confirm prompt if it exists
                setTimeout(() => {
                    let confirmButton = document.getElementById('promptOption0');
                    if (confirmButton) confirmButton.click();
                }, 1000);
            }
        }
    }

    /**
     * Equips optimal Dragon Auras if Krumblor is available.
     */
    function _handleDragonAuras() {
        if (!Game.Has('A crumbly egg')) return;

        let dragonLevel = Game.dragonLevel;
        let aura1 = Game.dragonAura;
        let aura2 = Game.dragonAura2;

        // Aura mapping in Vanilla Cookie Clicker:
        // 15 = Radiant Appetite (x2 production)
        // 18 = Dragonflight (Golden cookie massive click multiplier)

        // Try to equip Radiant Appetite in slot 1 if we have high enough level
        if (dragonLevel >= 15 && aura1 !== 15) {
            Game.SetDragonAura(15, 0);
            Game.ConfirmPrompt(); // Skips the cost warning
            console.log("JACCS Dragon: Equipped Radiant Appetite (Aura 1)");
        }

        // Try to equip Dragonflight in slot 2 if we have max level
        if (dragonLevel >= 21 && aura2 !== 18) {
            Game.SetDragonAura(18, 1);
            Game.ConfirmPrompt();
            console.log("JACCS Dragon: Equipped Dragonflight (Aura 2)");
        }
    }

    return {
        tick: function (deltaTime, timestamp) {

            // Check dragon auras occasionally
            if (timestamp % 10000 < 50) {
                _handleDragonAuras();
            }

            // High-level ascension state machine
            if (Game.OnAscend) {
                if (timestamp % 2000 < 50) {
                    _handleAscensionScreen();
                }
            } else {
                // If not ascending, check if we should
                if (timestamp % 60000 < 50) { // Check once a minute
                    if (_evaluateAscension()) {
                        console.log("JACCS Ascension: Initiating Ascension Protocol.");
                        Game.Ascend(true); // pass true to bypass confirmation ideally, or click the UI
                    }
                }
            }
        }
    };

})();


/**
 * JACCS - Auto Lumps
 * Automatically clicks Sugar Lumps exactly when they become ripe, 
 * saving an entire hour of wait time vs letting them auto-fall.
 */

if (typeof JACCS === 'undefined') {
    var JACCS = {};
}

JACCS.settings.lumps = {
    autoHarvest: true
};

JACCS.Lumps = (function () {

    return {
        tick: function (deltaTime, timestamp) {
            // Check once a minute
            if (timestamp % 60000 < 50) {
                if (JACCS.settings.lumps.autoHarvest && Game.canLumps()) {
                    // timeSinceLumpRipe() is a native CC method. 
                    // If >= 0, it means it is Ripe (or Overripe), and manual harvest succeeds 100%.
                    if (Game.timeSinceLumpRipe() >= 0) {
                        Game.clickLump();
                        console.log("JACCS Lumps: Harvested ripe sugar lump flawlessly.");
                    }
                }
            }
        }
    };

})();



        // CSP Bypass for UI Events
        document.addEventListener('click', function(e) {
            if (e.target && e.target.getAttribute('data-jaccs-click')) {
                let action = e.target.getAttribute('data-jaccs-click');
                if (action === 'JACCS.UI.togglePanel()') {
                    JACCS.UI.togglePanel();
                } else if (action === 'JACCS.UI.clearLogs()') {
                    JACCS.UI.clearLogs();
                }
            }
        });
    }, 1500);
})();
