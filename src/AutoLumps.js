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
