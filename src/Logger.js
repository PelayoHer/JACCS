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
