/**
 * JACCS - Main Loader
 * Asynchronously loads all OmniCookie architecture modules with cache busting
 */

(function () {
    console.log("JACCS: Initiating bootstrapping sequence...");

    // Generamos un token de tiempo para obligar al servidor a darnos la versión más reciente
    const CACHE_TOKEN = "?v=" + Date.now();
    
    // Usamos @master porque es el nombre real de tu rama
    const REPO_URL = "https://cdn.jsdelivr.net/gh/PelayoHer/YACCS@master/src/";

    // Lista exacta de tus archivos en el repo (respetando mayúsculas)
    const modules = [
        "Logger.js",
        "OmniCookieCore.js",
        "EfficiencyEngine.js",
        "AutoManager.js",
        "MinigameAddon.js",
        "UI.js"
    ];

    let loadedCount = 0;

    /**
     * Inyecta los scripts uno a uno para evitar conflictos de dependencia
     */
    function loadNextModule() {
        if (loadedCount < modules.length) {
            const moduleName = modules[loadedCount];
            const script = document.createElement('script');
            
            // Construimos la URL final con el bypass de caché
            script.src = REPO_URL + moduleName + CACHE_TOKEN;
            
            script.onload = () => {
                console.log(`JACCS: Successfully loaded [${moduleName}]`);
                loadedCount++;
                loadNextModule();
            };

            script.onerror = () => {
                console.error(`JACCS: Failed to load ${moduleName} from ${REPO_URL}. Failsafe Triggered.`);
                // Si falla un módulo crítico, detenemos la carga para evitar errores en el juego
            };

            document.head.appendChild(script);
        } else {
            console.log("JACCS: All systems nominal. Engine starting...");
            checkGameReady();
        }
    }

    /**
     * Asegura que el juego esté totalmente cargado antes de inicializar el mod
     */
    function checkGameReady() {
        if (typeof Game !== 'undefined' && Game.ready) {
            console.log("JACCS: Cookie Clicker is ready. Initializing core...");
            // Aquí es donde OmniCookieCore toma el control
        } else {
            setTimeout(checkGameReady, 500);
        }
    }

    // Arrancamos la carga del primer módulo
    loadNextModule();
})();
