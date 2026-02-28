/**
 * JACCS - Main Loader
 * Asynchronously loads all OmniCookie architecture modules
 */

(function () {
    console.log("JACCS: Initiating bootstrapping sequence...");

    // Base configuration injected from Gist/Tampermonkey
    const REPO_URL = "https://cdn.jsdelivr.net/gh/PelayoHer/YACCS@main/src/";

    // Required modules in dependency order
    const modules = [
        "Logger.js",
        "OmniCookieCore.js",
        "EfficiencyEngine.js",
        "AutoManager.js",
        "MinigameAddon.js",
        "UI.js"
    ];

    let loadedCount = 0;

    // Function to inject scripts via waterfall
    function loadScript(src, callback) {
        let script = document.createElement('script');
        script.src = src;
        script.onload = () => {
            console.log(`JACCS: Loaded ${src}`);
            callback();
        };
        script.onerror = () => {
            console.error(`JACCS: Failed to load ${src}. Failsafe Triggered.`);
        };
        document.head.appendChild(script);
    }

    // Recursive Sequential Loader
    function loadNext() {
        if (loadedCount >= modules.length) {
            console.log("JACCS: All modules loaded. Registering hooks.");
            // Once all scripts are in memory, initialize UIs and the Loop
            if (typeof JACCS !== 'undefined' && JACCS.Core) {
                if (JACCS.UI) JACCS.UI.init();
                JACCS.Core.init(); // Starts the requestAnimationFrame loop
            } else {
                console.error("JACCS Error: Core object not found after load.");
            }
            return;
        }

        let path = REPO_URL + modules[loadedCount];
        loadScript(path, () => {
            loadedCount++;
            loadNext();
        });
    }

    // Wait until native Cookie Clicker is ready
    function checkGameReady() {
        if (typeof Game !== 'undefined' && Game.ready) {
            loadNext();
        } else {
            // Re-check in 1 second
            setTimeout(checkGameReady, 1000);
        }
    }

    // Start bootstrapping
    checkGameReady();

})();
