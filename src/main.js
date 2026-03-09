/**
 * JACCS - Main Loader (Build)
 * Loads OmniCookieCore and AutoManager.
 */

(function () {
    console.log("JACCS: Initiating bootstrapping sequence...");

    // Para probar en local
    const REPO_URL = "https://github.com/PelayoHer/JACCS/src/";

    const modules = [
        "Logger.js",
        "UI.js",
        "OmniCookieCore.js",
        "EfficiencyEngine.js",
        "AutoManager.js",
        "MinigameAddon.js",
        "AutoGarden.js",
        "AutoAscend.js",
        "AutoLumps.js"
    ];

    let loadedCount = 0;

    function loadScript(src, callback) {
        let script = document.createElement('script');
        script.src = src;
        script.onload = () => {
            console.log(`JACCS: Loaded ${src}`);
            callback();
        };
        script.onerror = () => {
            console.error(`JACCS: Failed to load ${src}`);
        };
        document.head.appendChild(script);
    }

    function loadNext() {
        if (loadedCount >= modules.length) {
            console.log("JACCS: All core modules loaded.");
            if (typeof JACCS !== 'undefined' && JACCS.Core) {
                // If it was already loaded manually or through script concatenation
            }
            // Registration is usually handled at the bottom of OmniCookieCore now
            return;
        }

        let path = REPO_URL + modules[loadedCount];
        loadScript(path, () => {
            loadedCount++;
            loadNext();
        });
    }

    function checkGameReady() {
        if (typeof Game !== 'undefined' && Game.ready) {
            loadNext();
        } else {
            setTimeout(checkGameReady, 1000);
        }
    }

    checkGameReady();

})();
