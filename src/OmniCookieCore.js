/**
 * JACCS - Just Another Cookie Clicker Script
 * Core Engine & Module Loader
 * Architecture based on clean non-blocking injection.
 */

if (typeof JACCS === 'undefined') {
    var JACCS = {};
}

JACCS.Core = (function () {
    let _isRunning = false;
    let _animationFrameId = null;
    let _lastFrameTime = 0;

    // Base configuration for telemetry / persistence
    let _snapshotInterval = 5 * 60 * 1000; // 5 minutes default
    let _lastSnapshotTime = 0;

    // FPS limits and Frame Dropping
    const TARGET_FPS = 60;
    const FRAME_BUDGET_MS = 1000 / TARGET_FPS;
    const MAX_PROC_TIME_MS = 16; // If we take more than 16ms in the async queue, we drop the frame

    /**
     * Initializes or restores JACCS data within Orteil's game_save
     */
    function _initPersistence() {
        if (!Game.customSave) Game.customSave = [];
        if (!Game.customLoad) Game.customLoad = [];

        Game.customSave.push(function () {
            let saveData = {
                settings: JACCS.settings || {},
                snapshots: JACCS.State.getSnapshots() || []
            };
            return JSON.stringify(saveData);
        });

        Game.customLoad.push(function (savedString) {
            try {
                let parsed = JSON.parse(savedString);
                if (parsed.settings) JACCS.settings = Object.assign(JACCS.settings, parsed.settings);
                if (parsed.snapshots) JACCS.State.loadSnapshots(parsed.snapshots);
            } catch (e) {
                console.warn("JACCS: Could not load custom mod data. Proceeding with defaults.");
            }
        });
    }

    /**
     * Life or Death Failsafe.
     * If CPS drops inexplicably by more than 90% (in under 10 secs) without Ascending.
     */
    function _checkFailsafe() {
        if (!Game.cookiesPs) return; // Just started?

        if (!JACCS._failsafeBaseCPS) JACCS._failsafeBaseCPS = Game.cookiesPs;

        // A brutal CPS drop requires review. (Except if we are ascending / resetting)
        if (Game.cookiesPs < (JACCS._failsafeBaseCPS * 0.1) && Game.cookies > 100 && !Game.OnAscend) {
            console.error("JACCS Failsafe Triggered: Critical CPS drop detected. Forcing backup.");
            if (JACCS.Logger) JACCS.Logger.events.CRITICAL("Failsafe Triggered: Critical CPS Drop ( <10% of base). Forcing save & stopping.");
            try { Game.WriteSave(1); } catch (e) { /* Game UI crash */ }
            JACCS.Core.stop();
        } else {
            // Update slow base
            JACCS._failsafeBaseCPS = (JACCS._failsafeBaseCPS * 0.9) + (Game.cookiesPs * 0.1);
        }
    }

    /**
     * High frequency master loop
     */
    function _mainLoop(timestamp) {
        if (!_isRunning) return;

        let deltaTime = timestamp - _lastFrameTime;

        // Limit to 60 FPS maximum
        if (deltaTime >= FRAME_BUDGET_MS) {
            _lastFrameTime = timestamp - (deltaTime % FRAME_BUDGET_MS);

            let procStart = performance.now();

            // --- EXECUTION QUEUE ---
            try {
                _checkFailsafe();

                // Telemetry / Snapshotting
                if (timestamp - _lastSnapshotTime > _snapshotInterval) {
                    if (document.visibilityState === 'visible') { // Avoid triggering paused snaps due to desync
                        JACCS.State.takeSnapshot();
                        _lastSnapshotTime = timestamp;
                    }
                }

                // Fire sub-modules if they are loaded
                if (JACCS.Efficiency) JACCS.Efficiency.update();
                if (JACCS.AutoManager) JACCS.AutoManager.tick(deltaTime, timestamp);
                if (JACCS.Minigames) JACCS.Minigames.tick(deltaTime);
                if (JACCS.UI) JACCS.UI.render(timestamp);

            } catch (e) {
                console.error("JACCS Sub-module crashed in MainLoop:", e);
            }

            let procTime = performance.now() - procStart;

            // FRAME DROPPING STRATEGY
            if (procTime > MAX_PROC_TIME_MS) {
                console.warn(`JACCS Frame-drop warning: Cycle took ${procTime.toFixed(2)}ms (Limit: ${MAX_PROC_TIME_MS}ms). Discarding next logical frame to stabilize hub.`);
                _lastFrameTime += MAX_PROC_TIME_MS; // Fast forward frame dropping clock (will skip next if(deltaTime > BUDGET))
            }
        }

        _animationFrameId = requestAnimationFrame(_mainLoop);
    }

    return {
        init: function () {
            console.log("JACCS: Initializing Core Engine...");

            // Default config
            if (!JACCS.settings) JACCS.settings = {};

            _initPersistence();

            this.start();
        },

        start: function () {
            if (_isRunning) return;
            console.log("JACCS: Engine started.");
            _isRunning = true;
            _lastFrameTime = performance.now();
            _animationFrameId = requestAnimationFrame(_mainLoop);
        },

        stop: function () {
            console.log("JACCS: Engine stopped.");
            _isRunning = false;
            if (_animationFrameId) {
                cancelAnimationFrame(_animationFrameId);
                _animationFrameId = null;
            }
        }
    };
})();

// -- Mod Registration Placeholder API --
JACCS.register = function () {
    if (typeof Game === 'undefined' || !Game.ready) {
        setTimeout(JACCS.register, 1000);
        return;
    }
    JACCS.Core.init();
};

// Auto-boot if loaded via GM / Script Tag
if (typeof Game !== 'undefined' && Game.ready) {
    JACCS.register();
}
