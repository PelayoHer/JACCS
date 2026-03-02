# 🍪 JACCS: Just Another Cookie Clicker Script

[English](README.md) | [Español](README.es.md)

![JACCS Logo](logo.png)

[![GitHub license](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Versión Cookie Clicker](https://img.shields.io/badge/Cookie%20Clicker-2.052+-orange)](https://orteil.dashnet.org/cookieclicker/)

**JACCS** is a high-performance, mathematically perfected automation and analysis environment for **Cookie Clicker**. It is not a simple autoclicker; it is an **Expert System** explicitly designed for Speedrunning and 100% Achievement domination.

---

## The 8 Pillars of the Architecture

### 1. Synchronous Core Engine (`src/OmniCookieCore.js`)
Unlike conventional mods that inject multiple generic `setInterval` timers and choke your browser, JACCS operates on a single master `requestAnimationFrame` loop. It dynamically measures execution time and deliberately drops its own frames if a cycle takes more than `16ms`, ensuring the native Cookie Clicker UI never freezes or stutters even on low-end CPUs.

### 2. Exact Mathematical Economy (`src/EfficiencyEngine.js` & `AutoManager.js`)
Hoarding is obsolete. The logic utilizes absolute Speedrun mathematics to calculate the exact **Return on Investment (ROI)** for every building and upgrade. 
* **Early Game (0 - 1T Cookies)**: Absolute aggressive exponential scaling. Zero hoarding.
* **Mid Game (< Get Lucky)**: Dynamically calculates and hoards exactly 15 minutes of pure base CPS (6000x multiplier) to maximize normal Lucky combos.
* **Late Game (> Get Lucky)**: Hoards 105 minutes (42000x multiplier) for Frenzy+Lucky combos.
* **The Override**: If an upgrade pays for itself faster than the safe bank regenerates (e.g. `ROI < 6000s`), JACCS bypasses the hoarding lock and force-buys it to mathematically accelerate long-term growth.

### 3. Absolute Ascension Autonomy (`src/AutoAscend.js`)
The bot calculates exponential Logarithmic derivatives to know precisely when to reincarnate (when Heavenly Chips yield > `10x` multiplier of current prestige). Upon reaching the Ascension astral screen, it:
* Evaluates your total lifetime unlocks.
* Purchases Heavenly Upgrades dynamically traversing the scientifically proven **Optimal Speedrun Path** (Legacy -> Brand Biscuits -> Season Switcher...).
* Equips your most powerful Kitten, Fingers, Omelette, Lucky Day, and Butter Biscuit into the **5 Permanent Upgrade Slots** to instantly propel early-game speed.
* Reincarnates and continues playing seamlessly.

### 4. Flawless Minigame Macros (`src/MinigameAddon.js`)
JACCS plays the minigames better than humanly possible:
* **The Stock Market**: Analyzes Simple Moving Averages (SMA) mixed with Mode-Awareness to buy low in rebounds and sell high in crashes.
* **Godzamok Devastation**: During a Click Frenzy, it instantly sacrifices hundreds of cheap buildings across 6 different categories (Farms, Mines, Factories, Banks, Shipments, Alchemy labs) to trigger a `+500%` Devastation clicking buff, and safely replenishes them via vanilla bulk-buying.
* **Grimoire Double-Cast**: Predicts Combo Windows (x50 buffs) and casts *Force the Hand of Fate*. It then ruthlessly sells your Wizard Towers to forcefully lower the mana cap and double-cast the spell instantly.
* **Botanical Harvester**: Auto-harvests mature, non-immortal plants exactly when ready to optimize seed mutation grinds.

### 5. Millisecond Sugar Lumps (`src/AutoLumps.js`)
Why wait for a Sugar Lump to automatically fall to the ground after a long hour? JACCS hooks into the native `Game.timeSinceLumpRipe()` API and harvests the lump the exact millisecond it becomes mathematically ripe, saving you an entire hour of waiting time per lump.

### 6. Zero-GPU Interface & Logging (`src/UI.js` & `Logger.js`)
Logging thousands of mathematical ROI calculations into the web console crashes Google Chrome. JACCS injects a custom Shadow DOM interface directly into Cookie Clicker's layout. It feeds anomalous economic overrides and stealth events into this UI without touching the browser's raw console renderer. It also has a baseline 0.2% chance to "miss" Golden Cookies, deceiving heuristic anti-cheat detectors.

### 7. Native Injection Support
JACCS respects Cookie Clicker. It uses the official `Game.registerMod()` vanilla API to tie its lifecycle, initialization, saving, and loading routines perfectly into the base game without corrupting your save string. It even includes a Critical Failsafe Watchdog that forces a `Game.WriteSave()` if anomalous CPS drops are detected.

### 8. Monolithic Deployment (`build.py`)
No complex installations. A custom Python script compiles the 9 highly-structured architectural modules into a unified, secure Tampermonkey script (`jaccs-tampermonkey.user.js`) that bypasses the game's strict Content Security Policy (CSP).

---

## Installation (Tampermonkey)

1. **Install Tampermonkey** on Chrome, Firefox, or Edge.
2. Click **Create a new script**.
3. Copy the entire contents of the latest `jaccs-tampermonkey.user.js` file from this repository.
4. Replace the default Tampermonkey code with it.
5. Save (`Ctrl + S`) and reload Cookie Clicker.

*(Note: The `src` folder and `build.py` exist for development and contribution. End-users only need the compiled `jaccs-tampermonkey.user.js` script).*
