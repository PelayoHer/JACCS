/**
 * JACCS - GardenBot (Autonomous Genetist)
 * Intelligent biological AI that automates the unlocking of all 34 seeds
 * via a predefined Genetic Dictionary, a Geometric Engine, and a 5-Phase State Machine.
 */

if (typeof JACCS === 'undefined') {
    var JACCS = {};
}

JACCS.settings.garden = {
    enabled: true,
    respectSafeBank: true
};

JACCS.GardenBot = (function () {

    // --- State Machine ---
    let _currentState = 'INIT'; // INIT, CLEARING, PLANTING_PARENTS, WAITING_MATURITY, MUTATION_FARMING
    let _targetRecipe = null;
    let _pattern = {};

    // --- 1. Genetic Dictionary (Botanical Database) ---
    // Priority ordered list. The bot tries to unlock them from top to bottom.
    const RECIPES = [
        { target: 'Bakeberry', p1: 'Baker\'s wheat', p2: 'Baker\'s wheat' },
        { target: 'Thumbcorn', p1: 'Baker\'s wheat', p2: 'Baker\'s wheat' },
        { target: 'Cronerice', p1: 'Baker\'s wheat', p2: 'Thumbcorn' },
        { target: 'Gildmillet', p1: 'Thumbcorn', p2: 'Cronerice' },
        { target: 'Clover', p1: 'Baker\'s wheat', p2: 'Gildmillet' },
        { target: 'Golden clover', p1: 'Baker\'s wheat', p2: 'Gildmillet' },
        { target: 'Shimmerlily', p1: 'Gildmillet', p2: 'Clover' },
        { target: 'Elderwort', p1: 'Shimmerlily', p2: 'Cronerice' },
        { target: 'Chocoroot', p1: 'Baker\'s wheat', p2: 'Brown mold' },
        { target: 'White chocoroot', p1: 'Chocoroot', p2: 'White mildew' },
        { target: 'White mildew', p1: 'Brown mold', p2: 'Brown mold' },
        { target: 'Glowshroom', p1: 'Crumbspore', p2: 'Doughshroom' },
        { target: 'Doughshroom', p1: 'Crumbspore', p2: 'Crumbspore' },
        { target: 'Wrinklegill', p1: 'Crumbspore', p2: 'Brown mold' },
        { target: 'Green rot', p1: 'White mildew', p2: 'Clover' },
        { target: 'Keenmoss', p1: 'Green rot', p2: 'Brown mold' },
        { target: 'Wardlichen', p1: 'Cronerice', p2: 'Keenmoss' },
        { target: 'Drowsyfern', p1: 'Chocoroot', p2: 'Keenmoss' },
        { target: 'Tidygrass', p1: 'Baker\'s wheat', p2: 'White chocoroot' },
        { target: 'Everdaisy', p1: 'Tidygrass', p2: 'Elderwort' },
        { target: 'Queenbeet', p1: 'Chocoroot', p2: 'Bakeberry' },
        { target: 'Juicy queenbeet', p1: 'Queenbeet', p2: 'Queenbeet' }, // Special geometry
        { target: 'Duketater', p1: 'Bakeberry', p2: 'Bakeberry' },
        { target: 'Shriekbulb', p1: 'Elderwort', p2: 'Elderwort' },
        { target: 'Ichorpuffs', p1: 'Elderwort', p2: 'Crumbspore' },
        { target: 'Whiskerblooms', p1: 'Shimmerlily', p2: 'White chocoroot' },
        { target: 'Chimerose', p1: 'Shimmerlily', p2: 'Whiskerblooms' },
        { target: 'Nursetulip', p1: 'Whiskerblooms', p2: 'Whiskerblooms' },
        { target: 'Fool\'s bolete', p1: 'Doughshroom', p2: 'Green rot' }
    ];

    /**
     * Determines the next un-unlocked seed whose parents we possess.
     */
    function _evaluateNextTarget(M) {
        for (let i = 0; i < RECIPES.length; i++) {
            let r = RECIPES[i];
            let ptTarget = _getPlantByName(M, r.target);
            let pt1 = _getPlantByName(M, r.p1);
            let pt2 = _getPlantByName(M, r.p2);

            if (ptTarget && !ptTarget.unlocked) {
                // We need this. Do we have the parents?
                if (pt1 && pt1.unlocked && pt2 && pt2.unlocked) {
                    return {
                        recipe: r,
                        targetId: ptTarget.id,
                        p1Id: pt1.id,
                        p2Id: pt2.id,
                        complex: (r.target === 'Juicy queenbeet')
                    };
                }
            }
        }
        return null; // All done or missing middle-steps.
    }

    function _getPlantByName(M, name) {
        for (let i in M.plants) {
            if (M.plants[i].name === name) return M.plants[i];
        }
        return null;
    }

    // --- 2. Geometric Engine (Matrix Scanner) ---
    /**
     * Generates a spatial planting mapping based on farm level.
     * Tries to alternate rows or columns to maximize cross-breeding.
     */
    function _generateGeometricPattern(plotSize, isComplex) {
        let pattern = {}; // { "x,y": plantId }

        if (isComplex && plotSize >= 6) {
            // Juicy Queenbeet requires 8 Queenbeets surrounding 1 empty tile exactly.
            // A 6x6 grid can fit four such rings.
            // Simplified for MVP: One ring in the center.
            let ring = [
                [1, 1], [2, 1], [3, 1],
                [1, 2], [3, 2],
                [1, 3], [2, 3], [3, 3]
            ];
            for (let coord of ring) pattern[`${coord[0]},${coord[1]}`] = 1; // 1 means 'p1' (Queenbeet)
            return pattern;
        }

        // Standard 2-Parent Line/Checker pattern
        for (let y = 0; y < plotSize; y++) {
            for (let x = 0; x < plotSize; x++) {
                // Leave empty rows for mutation gaps if possible (e.g. Y=1, Y=4)
                if (plotSize >= 3 && y % 2 !== 0) continue;

                // Alternate parents on the X axis
                let parentSign = (x % 2 === 0) ? 1 : 2;
                pattern[`${x},${y}`] = parentSign; // p1 or p2
            }
        }
        return pattern;
    }

    /**
     * Verifies if we have enough cookies relative to Safe Bank to act.
     */
    function _hasEconomicClearance(cost) {
        if (!JACCS.settings.garden.respectSafeBank) return true;
        let safeBank = 0;
        if (JACCS.AutoManager && typeof JACCS.AutoManager.getSafeBank === 'function') {
            safeBank = JACCS.AutoManager.getSafeBank();
        }
        return (Game.cookies - cost) >= safeBank;
    }

    /**
     * Set soil type. 0: Dirt, 1: Fertilizer, 2: Clay, 3: Pebbles, 4: Woodchips
     */
    function _setSoil(M, soilId) {
        if (M.soil === soilId) return;
        let soilCost = (Game.cookiesPs * 60) * 10; // Approx 10 mins of CPS base cost
        if (_hasEconomicClearance(soilCost)) {
            // Native soil swap
            let sq = document.getElementById('gardenSoil-' + soilId);
            if (sq && !sq.classList.contains('locked')) {
                sq.click();
                if (JACCS.Logger) JACCS.Logger.info(`JACCS GardenBot: Swapped soil to ID ${soilId}`);
            }
        }
    }


    // --- 3. The 5-Phase State Machine ---
    function _runStateMachine() {
        if (!JACCS.settings.garden.enabled) return;
        if (!Game.Objects['Farm'].minigameLoaded) return;

        let M = Game.Objects['Farm'].minigame;
        let plotXY = M.plot.length; // From 2 to 6

        // F0. Evaluate Targets
        if (_currentState === 'INIT') {
            _targetRecipe = _evaluateNextTarget(M);
            if (!_targetRecipe) {
                // If everything is unlocked or we can't breed, do nothing or farm cookies.
                return;
            }
            _pattern = _generateGeometricPattern(plotXY, _targetRecipe.complex);
            _currentState = 'CLEARING';
            if (JACCS.Logger) JACCS.Logger.info(`JACCS GardenGenetist: Targeted ${_targetRecipe.recipe.target} for mutation.`);
        }

        // F1. CLEARING phase: Remove useless plants 
        if (_currentState === 'CLEARING') {
            let isClean = true;
            for (let y = 0; y < plotXY; y++) {
                for (let x = 0; x < plotXY; x++) {
                    let tile = M.plot[y][x];
                    if (tile[0] > 0) {
                        let p = tile[0] - 1; // ID
                        // If it's not our target, and it's not a required parent in a required spot, kill it.
                        let isP1Spot = (_pattern[`${x},${y}`] === 1 && p === _targetRecipe.p1Id);
                        let isP2Spot = (_pattern[`${x},${y}`] === 2 && p === _targetRecipe.p2Id);

                        if (!isP1Spot && !isP2Spot) {
                            M.harvest(x, y);
                            isClean = false;
                        }
                    }
                }
            }
            if (isClean) {
                _currentState = 'PLANTING_PARENTS';
            }
        }

        // F2. PLANTING_PARENTS phase
        if (_currentState === 'PLANTING_PARENTS') {
            let isFullyPlanted = true;

            for (let y = 0; y < plotXY; y++) {
                for (let x = 0; x < plotXY; x++) {
                    let required = _pattern[`${x},${y}`];
                    let tile = M.plot[y][x];

                    if (required) {
                        let requiredId = (required === 1) ? _targetRecipe.p1Id : _targetRecipe.p2Id;
                        if (tile[0] - 1 !== requiredId) {
                            isFullyPlanted = false;

                            // Try to plant
                            let seedCost = M.getCost(M.plantsById[requiredId]);
                            if (_hasEconomicClearance(seedCost)) {
                                M.useTool(requiredId, x, y);
                            }
                        }
                    }
                }
            }

            if (isFullyPlanted) {
                _currentState = 'WAITING_MATURITY';
                if (JACCS.Logger) JACCS.Logger.info(`JACCS GardenBot: Parents planted geometrically. Awaiting maturity.`);
            }
        }

        // F3. WAITING_MATURITY
        if (_currentState === 'WAITING_MATURITY') {
            _setSoil(M, 1); // Fertilizer to accelerate growth

            let allMature = true;
            let died = false;

            for (let y = 0; y < plotXY; y++) {
                for (let x = 0; x < plotXY; x++) {
                    let tile = M.plot[y][x];
                    let required = _pattern[`${x},${y}`];

                    if (required) {
                        let requiredId = (required === 1) ? _targetRecipe.p1Id : _targetRecipe.p2Id;
                        if (tile[0] - 1 !== requiredId) {
                            // Parent died unexpectedly before others matured
                            died = true;
                            continue;
                        }

                        let age = tile[1];
                        let plant = M.plantsById[requiredId];
                        let matureAge = Math.ceil(plant.mature);

                        if (age < matureAge) allMature = false;
                    } else if (tile[0] > 0) {
                        // Kill weeds in mutation gaps
                        M.harvest(x, y);
                    }
                }
            }

            if (died) {
                _currentState = 'CLEARING'; // Restart planting sequence
            } else if (allMature) {
                _currentState = 'MUTATION_FARMING';
                if (JACCS.Logger) JACCS.Logger.info(`JACCS GardenBot: Parents mature. Switched to Woodchips to boost mutations.`);
            }
        }

        // F4. MUTATION_FARMING
        if (_currentState === 'MUTATION_FARMING') {
            _setSoil(M, 4); // Woodchips for max mutation

            let targetBorn = false;
            let died = false;

            for (let y = 0; y < plotXY; y++) {
                for (let x = 0; x < plotXY; x++) {
                    let tile = M.plot[y][x];

                    if (tile[0] > 0) {
                        let pId = tile[0] - 1;
                        let plant = M.plantsById[pId];
                        let isParent = (pId === _targetRecipe.p1Id || pId === _targetRecipe.p2Id);

                        if (pId === _targetRecipe.targetId) {
                            targetBorn = true;
                        }
                        else if (!isParent) {
                            // Eradicate useless weeds born from bad RNG
                            M.harvest(x, y);
                        }
                        else if (isParent) {
                            // Check if parent is about to die (Lifespan ending).
                            let lifeLeft = Math.ceil(100 - tile[1]);
                            if (!plant.immortal && lifeLeft <= 4) { // Margin of 4 ticks
                                M.harvest(x, y); // Uproot manually
                                died = true;
                                if (JACCS.Logger) JACCS.Logger.info(`JACCS GardenBot: Uprooted dying parent. Replacing...`);
                            }
                        }
                    }
                }
            }

            if (targetBorn) {
                _currentState = 'HARVESTING_TARGET';
                if (JACCS.Logger) JACCS.Logger.info(`JACCS GardenBot: MUTATION SUCCESSFUL. Letting target grow...`);
            } else if (died) {
                _currentState = 'CLEARING';
            }
        }

        // F5. HARVESTING_TARGET
        if (_currentState === 'HARVESTING_TARGET') {
            _setSoil(M, 1); // Fertilizer to accelerate the target's growth

            let targetHarvested = false;

            for (let y = 0; y < plotXY; y++) {
                for (let x = 0; x < plotXY; x++) {
                    let tile = M.plot[y][x];
                    if (tile[0] > 0) {
                        let pId = tile[0] - 1;
                        let plant = M.plantsById[pId];

                        if (pId === _targetRecipe.targetId) {
                            if (tile[1] >= Math.ceil(plant.mature)) {
                                M.harvest(x, y); // Unlock it!
                                targetHarvested = true;
                                if (JACCS.Logger) JACCS.Logger.info(`JACCS GardenBot: Seed ${plant.name} harvested and unlocked!`);
                            }
                        }
                    }
                }
            }

            if (targetHarvested) {
                _currentState = 'INIT'; // Restart the entire cycle for the next seed in the dictionary!
            }
        }
    }

    return {
        tick: function () {
            // Garden ticks are slow. Executing this logic every 2 seconds is more than enough
            // to not lag the engine, but responsive enough for micro-management.
            if (Math.random() < 0.05) {
                _runStateMachine();
            }
        }
    };
})();
