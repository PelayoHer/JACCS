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
