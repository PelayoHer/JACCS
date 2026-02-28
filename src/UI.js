/**
 * JACCS - UI Module (Zero-Background Rendering)
 * Injects a Shadow DOM interface to display analytics.
 */

if (typeof JACCS === 'undefined') {
    var JACCS = {};
}

JACCS.UI = (function () {
    let _shadowRoot = null;
    let _container = null;
    let _isMinimized = false;

    // UI Elements
    let _elRawCps = null;
    let _elEffCps = null;
    let _elSafeBank = null;
    let _elBurstState = null;
    let _logContainer = null;
    let _canvas = null;
    let _ctx = null;

    /**
     * Shadow DOM Injection and HTML Structure
     */
    function _buildInterface() {
        if (document.getElementById('jaccs-host')) return;

        let host = document.createElement('div');
        host.id = 'jaccs-host';
        document.body.appendChild(host);

        // We create Shadow DOM (Closed to avoid external scripts)
        _shadowRoot = host.attachShadow({ mode: 'open' });

        // Styles
        let linkStyle = document.createElement('link');
        linkStyle.rel = 'stylesheet';
        // In production this is bundled, here we use relative local path if served
        linkStyle.href = 'https://TU_USUARIO.github.io/JACCS/src/Styles.css';
        _shadowRoot.appendChild(linkStyle);

        // DOM Structure
        _container = document.createElement('div');
        _container.id = 'jaccs-panel';

        _container.innerHTML = `
            <div class="jaccs-header">
                <h2>🍪 JACCS Dashboard</h2>
                <button class="jaccs-toggle-btn" id="btn-minimize">_</button>
            </div>
            <div class="jaccs-content">
                <canvas id="jaccs-efficiency-chart"></canvas>
                
                <div class="jaccs-stat-row">
                    <span class="jaccs-stat-label">Raw CPS</span>
                    <span class="jaccs-stat-value" id="val-raw-cps">0</span>
                </div>
                
                <div class="jaccs-stat-row">
                    <span class="jaccs-stat-label">Safe Bank Goal</span>
                    <span class="jaccs-stat-value" id="val-safe-bank">0</span>
                </div>
                
                <div class="jaccs-stat-row">
                    <span class="jaccs-stat-label">Logic State</span>
                    <span class="jaccs-stat-value" id="val-burst-state">Human</span>
                </div>
                
                <div id="jaccs-log-container">
                    <!-- Event logs injected here -->
                </div>
                
                <select class="jaccs-profile-select" id="profile-select">
                    <option value="balanced">Profile: Balanced</option>
                    <option value="stealth">Profile: Ultra-Human (Stealth)</option>
                    <option value="reckless">Profile: Reckless (Burst All)</option>
                </select>
            </div>
        `;

        _shadowRoot.appendChild(_container);

        // Node Assignment
        _elRawCps = _shadowRoot.getElementById('val-raw-cps');
        _elSafeBank = _shadowRoot.getElementById('val-safe-bank');
        _elBurstState = _shadowRoot.getElementById('val-burst-state');
        _canvas = _shadowRoot.getElementById('jaccs-efficiency-chart');
        _logContainer = _shadowRoot.getElementById('jaccs-log-container');

        if (_canvas) _ctx = _canvas.getContext('2d');

        // Events
        _shadowRoot.getElementById('btn-minimize').addEventListener('click', _toggleMinimize);
        _shadowRoot.getElementById('profile-select').addEventListener('change', (e) => {
            console.log("JACCS: Profile changed to", e.target.value);
            // Profile logic would go here
        });
    }

    function _toggleMinimize() {
        _isMinimized = !_isMinimized;
        if (_isMinimized) {
            _container.classList.add('minimized');
            // GPU KILLER: Hiding the canvas so the browser doesn't spend ram painting its offscreen buffer
            if (_canvas) _canvas.style.display = 'none';
        } else {
            _container.classList.remove('minimized');
            if (_canvas) _canvas.style.display = 'block';
        }
    }

    /**
     * Draws the RingBuffer data on the Canvas (Visual Snapshotting)
     */
    function _drawTelemetry() {
        if (!_ctx || !_canvas) return;

        let snaps = JACCS.State.getSnapshots();
        if (snaps.length < 2) return;

        let w = _canvas.width;
        let h = _canvas.height;

        _ctx.clearRect(0, 0, w, h);
        _ctx.beginPath();
        _ctx.strokeStyle = '#00d2ff';
        _ctx.lineWidth = 2;

        // Maps the 'b' (Bank) values to the Y axis
        let maxV = Math.max(...snaps.map(s => s.b));
        let minV = Math.min(...snaps.map(s => s.b));
        let range = maxV - minV || 1;

        let stepX = w / (snaps.length - 1);

        for (let i = 0; i < snaps.length; i++) {
            let x = i * stepX;
            let normY = (snaps[i].b - minV) / range;
            let y = h - (normY * (h - 20)) - 10; // Padding

            if (i === 0) _ctx.moveTo(x, y);
            else _ctx.lineTo(x, y);
        }

        _ctx.stroke();
    }

    function _renderLog() {
        if (!_logContainer || !JACCS.Logger) return;

        // We check if there are new logs in the queue to avoid thrashing the DOM
        if (!JACCS.Logger.checkVblank()) return;

        let logs = JACCS.Logger.getLogs();

        // DOM Fragment for efficient manipulation
        let fragment = document.createDocumentFragment();

        for (let i = 0; i < logs.length; i++) {
            let l = logs[i];
            let row = document.createElement('div');
            row.className = 'jaccs-log-entry';

            // Safe innerHTML, the log content is ours
            row.innerHTML = `<span class="time">${l.time}</span> <strong style="color:${l.color}">${l.prefix}</strong> <span class="msg">${l.msg}</span>`;
            fragment.appendChild(row);
        }

        // Clears and inserts
        _logContainer.innerHTML = '';
        _logContainer.appendChild(fragment);

        // Auto-scroll to the bottom
        _logContainer.scrollTop = _logContainer.scrollHeight;
    }

    return {
        init: function () {
            _buildInterface();
        },

        render: function (timestamp) {
            // ZERO-BACKGROUND RENDERING:
            // If the tab is not visible or the panel is minimized, don't paint anything.
            if (_isMinimized || document.hidden || document.visibilityState !== 'visible') {
                return;
            }

            // Render text UI (only a few times per sec for perf)
            if (timestamp % 1000 < 20) {
                if (Game && _elRawCps) _elRawCps.innerText = Beautify(Game.cookiesPsRaw);

                // Safe Bank Status Logic
                if (JACCS.AutoManager && _elSafeBank) {
                    let targetBank = JACCS.AutoManager.getSafeBankTarget();
                    _elSafeBank.innerText = Beautify(targetBank);

                    if (Game.cookies < targetBank) {
                        _elSafeBank.className = "jaccs-stat-value warning";
                    } else {
                        _elSafeBank.className = "jaccs-stat-value success";
                    }
                }

                // Burst Status logic check (Assuming AutoManager messed with it)
                let isFnzy = false;
                for (let k in Game.buffs) if (Game.buffs[k].type.name.includes("frenzy")) isFnzy = true;

                if (_elBurstState) {
                    if (isFnzy) {
                        _elBurstState.innerText = "BURST (Frenzy)";
                        _elBurstState.className = "jaccs-stat-value burst";
                    } else {
                        _elBurstState.innerText = "Human (Idle)";
                        _elBurstState.className = "jaccs-stat-value";
                    }
                }

                _drawTelemetry();
                _renderLog(); // Asynchronously renders Logs only when it's safe and necessary.
            }
        }
    };
})();
