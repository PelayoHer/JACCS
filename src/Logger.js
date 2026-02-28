/**
 * JACCS - Logger Module
 * 
 * Manages an internal event queue with a maximum of 50 entries to
 * prevent infinite DOM growth. Integrated with UI.js's Zero-Background
 * Rendering philosophy.
 */

if (typeof JACCS === 'undefined') {
    var JACCS = {};
}

JACCS.Logger = (function () {
    const MAX_LOGS = 50;
    let _logQueue = [];
    let _hasNewLogs = false; // Flag so UI.js knows whether to re-render

    // System Colors Type Definition
    const TYPES = {
        INFO: { prefix: '[INFO]', color: '#aaaaaa' }, // Gray
        PURCHASE: { prefix: '[BUY] ', color: '#4caf50' }, // Green
        MAGIC: { prefix: '[SPELL]', color: '#b388ff' }, // Purple
        STOCK: { prefix: '[STOCK]', color: '#00d2ff' }, // Blue
        STEALTH: { prefix: '[STEALTH]', color: '#ff9800' }, // Orange
        CRITICAL: { prefix: '[CRIT]', color: '#ff4b4b' }  // Red
    };

    /**
     * Adds a log to internal memory
     */
    function _addLog(typeObj, message) {
        let d = new Date();
        let timestamp = `[${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}]`;

        let logEntry = {
            id: Date.now() + Math.random(),
            time: timestamp,
            prefix: typeObj.prefix,
            color: typeObj.color,
            msg: message
        };

        _logQueue.push(logEntry);
        if (_logQueue.length > MAX_LOGS) {
            _logQueue.shift(); // Keep queue at 50 entries max
        }

        _hasNewLogs = true;

        // Also send to real console to aid F12 debugging
        console.log(`%c${timestamp} ${typeObj.prefix} ${message}`, `color: ${typeObj.color}`);
    }

    return {
        events: {
            INFO: function (msg) { _addLog(TYPES.INFO, msg); },
            PURCHASE: function (msg) { _addLog(TYPES.PURCHASE, msg); },
            MAGIC: function (msg) { _addLog(TYPES.MAGIC, msg); },
            STOCK: function (msg) { _addLog(TYPES.STOCK, msg); },
            STEALTH: function (msg) { _addLog(TYPES.STEALTH, msg); },
            CRITICAL: function (msg) { _addLog(TYPES.CRITICAL, msg); }
        },

        getLogs: function () {
            return _logQueue;
        },

        // Consumes the "dirty" flag
        checkVblank: function () {
            if (_hasNewLogs) {
                _hasNewLogs = false;
                return true;
            }
            return false;
        }
    };
})();
