/**
 * JACCS - Ascension & Prestige AI
 * Manages rebirths, Heavenly Chips returns, and Dragon Aura equipping.
 */

if (typeof JACCS === 'undefined') {
    var JACCS = {};
}

JACCS.settings.ascension = {
    enabled: true,
    chipMultiplierThreshold: 10,   // Ascend when chips gained > current chips * 10
    autoRebirth: true              // Automatically manage the ascension screen and buy upgrades
};

JACCS.Ascension = (function () {

    let _ascensionState = 'idle'; // idle -> ascending -> rebirthing -> idle

    /**
     * Determines if the current Heavenly Chips return justifies ascending.
     * Enforces the mathematical minimum of 440 chips for the very first save file run,
     * to ensure the player can afford basic necessities, and uses a dynamic x10 
     * exponential scaler for all subsequent ascensions.
     */
    function _evaluateAscension() {
        if (!JACCS.settings.ascension.enabled || Game.OnAscend || Game.AscendTimer > 0) return false;

        let currentChips = Game.heavenlyChips || 0;
        let earnedChips = Math.floor(Game.HowMuchPrestige(Game.cookiesReset + Game.cookiesEarned));
        let chipDifference = earnedChips - Game.prestige;

        // 1. Pure Speedrun Route: The very first ascension must NEVER happen before 440 chips.
        // This guarantees enough currency for: Legacy (1), Heavenly Cookies (3), Dragon (9), 
        // Boxes (84), Season Switcher (111), Heralds (100) and Permanent Slot 1 (100).
        if (Game.prestige === 0) {
            if (earnedChips >= 440) {
                console.log(`JACCS Ascension: First Rebirth Speedrun Checkpoint met! Ascending at ${earnedChips} chips.`);
                return true;
            }
            return false;
        }

        // 2. Scale subsequent ascensions using the x10 heuristic
        if (chipDifference >= currentChips * JACCS.settings.ascension.chipMultiplierThreshold) {
            console.log(`JACCS Ascension: Threshold met. Current: ${currentChips}, Potential: +${chipDifference}`);
            return true;
        }
        return false;
    }

    const OPTIMAL_HEAVENLY_PATH = [
        'Legacy', 'Heavenly cookies', 'How to bake your dragon', 'Box of brand biscuits',
        'Tin of british tea biscuits', 'Heavenly luck', 'Permanent upgrade slot I',
        'Heralds', 'Starter kit', 'Tin of butter cookies', 'Box of macarons',
        'Season switcher', 'Permanent upgrade slot II', 'Starspawn', 'Starsnow',
        'Starter kitchen', 'Halo gloves', 'Kitten angels', 'Permanent upgrade slot III',
        'Permanent upgrade slot IV', 'Permanent upgrade slot V'
    ];

    /**
     * Finds the best upgrade ID for a specific permanent slot category.
     */
    function _getBestPermanentUpgrade(category) {
        let bestId = -1;
        let highestPrice = 0;

        for (let i in Game.Upgrades) {
            let u = Game.Upgrades[i];
            // Only consider upgrades we've unlocked at least once in our history
            if (u.unlocked || u.bought) {
                if (category === 'kitten' && u.name.toLowerCase().includes('kitten')) {
                    if (u.basePrice > highestPrice) { highestPrice = u.basePrice; bestId = u.id; }
                }
                else if (category === 'fingers' && u.name.toLowerCase().includes('fingers')) {
                    if (u.basePrice > highestPrice) { highestPrice = u.basePrice; bestId = u.id; }
                }
                else if (category === 'omelette' && u.name.toLowerCase() === 'omelette') {
                    return u.id;
                }
                else if (category === 'lucky' && u.name.toLowerCase() === 'lucky day') {
                    return u.id;
                }
                else if (category === 'biscuit' && u.name.toLowerCase().includes('butter biscuit')) {
                    if (u.basePrice > highestPrice) { highestPrice = u.basePrice; bestId = u.id; }
                }
            }
        }
        return bestId;
    }

    /**
     * Handles the automated buying, slotting, and clicking logic inside the astral Ascension screen.
     * - Auto-buys Heavenly Upgrades sequentially obeying the Speedrun absolute meta.
     * - Injects the most powerful unlocked upgrades (Kittens, Fingers, Omelette) into the 5 Permanent Slots.
     */
    function _handleAscensionScreen() {
        if (!JACCS.settings.ascension.autoRebirth) return;

        // If we are fully in the ascension screen and not transitioning
        if (Game.OnAscend && Game.AscendTimer === 0) {

            let boughtSomething = false;

            // 1. Auto-Buy Heavenly Upgrades
            for (let i = 0; i < OPTIMAL_HEAVENLY_PATH.length; i++) {
                let upgName = OPTIMAL_HEAVENLY_PATH[i];
                let upg = Game.Upgrades[upgName];

                if (upg && !upg.bought && Game.heavenlyChips >= upg.getPrice()) {
                    upg.buy();
                    boughtSomething = true;
                    console.log(`JACCS Ascension: Auto-bought Heavenly Upgrade -> ${upgName}`);
                }
            }

            // 2. Auto-Assign Permanent Slots
            let slotAssignments = ['kitten', 'fingers', 'omelette', 'lucky', 'biscuit'];
            let romanNumerals = ['I', 'II', 'III', 'IV', 'V'];
            for (let s = 0; s < 5; s++) {
                let slotUpgName = `Permanent upgrade slot ${romanNumerals[s]}`;
                if (Game.Has(slotUpgName)) {
                    let bestId = _getBestPermanentUpgrade(slotAssignments[s]);
                    if (bestId !== -1 && Game.permanentUpgrades[s] !== bestId) {
                        Game.permanentUpgrades[s] = bestId;
                        console.log(`JACCS Ascension: Slotted Permanent Upgrade ID ${bestId} into Slot ${s + 1} (${slotAssignments[s]})`);
                    }
                }
            }

            // If we bought something, wait a bit before rebirthing to allow further purchases next tick
            if (boughtSomething) return;

            let rebirthButton = document.getElementById('ascendButton');
            if (rebirthButton && rebirthButton.style.display !== 'none') {
                console.log("JACCS Ascension: Done shopping. Triggering Rebirth...");
                rebirthButton.click();

                // Confirm prompt if it exists
                setTimeout(() => {
                    let confirmButton = document.getElementById('promptOption0');
                    if (confirmButton) confirmButton.click();
                }, 1000);
            }
        }
    }

    /**
     * Equips optimal Dragon Auras if Krumblor is available.
     */
    function _handleDragonAuras() {
        if (!Game.Has('A crumbly egg')) return;

        let dragonLevel = Game.dragonLevel;
        let aura1 = Game.dragonAura;
        let aura2 = Game.dragonAura2;

        // Aura mapping in Vanilla Cookie Clicker:
        // 15 = Radiant Appetite (x2 production)
        // 18 = Dragonflight (Golden cookie massive click multiplier)

        // Try to equip Radiant Appetite in slot 1 if we have high enough level
        if (dragonLevel >= 15 && aura1 !== 15) {
            Game.SetDragonAura(15, 0);
            Game.ConfirmPrompt(); // Skips the cost warning
            console.log("JACCS Dragon: Equipped Radiant Appetite (Aura 1)");
        }

        // Try to equip Dragonflight in slot 2 if we have max level
        if (dragonLevel >= 21 && aura2 !== 18) {
            Game.SetDragonAura(18, 1);
            Game.ConfirmPrompt();
            console.log("JACCS Dragon: Equipped Dragonflight (Aura 2)");
        }
    }

    return {
        tick: function (deltaTime, timestamp) {

            // Check dragon auras occasionally
            if (timestamp % 10000 < 50) {
                _handleDragonAuras();
            }

            // High-level ascension state machine
            if (Game.OnAscend) {
                if (timestamp % 2000 < 50) {
                    _handleAscensionScreen();
                }
            } else {
                // If not ascending, check if we should
                if (timestamp % 60000 < 50) { // Check once a minute
                    if (_evaluateAscension()) {
                        console.log("JACCS Ascension: Initiating Ascension Protocol.");
                        Game.Ascend(true); // pass true to bypass confirmation ideally, or click the UI
                    }
                }
            }
        }
    };

})();
