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
