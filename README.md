# 🍪 JACCS: Just Another Cookie Clicker Script

[English](README.md) | [Español](README.es.md)

[![GitHub license](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Cookie Clicker Version](https://img.shields.io/badge/Cookie%20Clicker-2.052-orange)](https://orteil.dashnet.org/cookieclicker/)
[![Maintenance](https://img.shields.io/badge/Maintained%3F-yes-brightgreen.svg)](#)

**JACCS** is a high-performance automation and analysis framework for **Cookie Clicker**. Far from being just another autoclicker, it is an **Expert System** that unifies the collective intelligence of the modding community into a single, asynchronous, optimized core designed for end-game efficiency and stealth.

---

## 🏛️ System Architecture: The OmniCookie Engine

Unlike conventional mods that saturate the main thread with multiple intervals, JACCS utilizes a **Single-Loop Engine** based on `requestAnimationFrame`.

### 1. OmniCookieCore.js (The Heart)
* **60 FPS Synchronization**: Logic processes in perfect harmony with the game's native rendering.
* **Frame-Dropping Strategy**: If complex calculations exceed a **16ms** budget, the engine intelligently skips the next logical frame to prioritize game stability and prevent stuttering.
* **Critical Failsafe**: An internal "Watchdog" monitors CPS; if it detects a catastrophic drop (>90%) without an active Ascension, it forces an emergency save (`Game.WriteSave(1)`) and halts the engine to protect your progress.
* **Integrated Persistence**: Uses `Game.modSave` to inject configurations and telemetry directly into the native save file.

---

## 🧠 Analytical Intelligence: EfficiencyEngine.js

This module inherits and refines the mathematical logic of **Cookie Monster**.

### The Payback Period (PP) Algorithm
JACCS determines the most efficient investment by calculating the time required to recover the cost:

$$PP = \frac{\max(\text{Cost} - \text{Bank}, 0)}{CPS} + \frac{\text{Cost}}{\Delta CPS}$$

### Telemetry & Snapshotting
* **Ring Buffer**: Maintains a circular history of the last 100 state captures (CPS, Bank, Top Investments).
* **Visibility Awareness**: Data capture automatically suspends if the tab is not visible (`document.hidden`), preventing de-synchronized data and unnecessary resource consumption.

---

## 🤖 Stealth Execution: AutoManager.js

Designed under the philosophy of **CookieBot** to mimic expert human behavior.

### Stealth & Humanization
* **Poisson Distribution Clicks**: The big cookie autoclicker varies intervals statistically to break robotic rhythmic patterns.
* **Variable Task Latency**: Golden Cookies are captured after a dynamic delay calculated via a **Gaussian curve** (0.8s - 3.5s), simulating human reaction time.
* **Human Error Mode**: Includes a **0.2% probability** of intentionally ignoring an event to mimic a distracted player.
* **Acceleration Ramp**: Upon detecting a click buff, it takes **0.5s** to reach maximum speed (50+ CPS), emulating human motor response.

### Dynamic Safe Bank
JACCS intelligently calculates the minimum bank required to maximize "Lucky!" cookie rewards. During a **Frenzy**, it automatically holds purchases and raises the target to $(CPS \times 7) \times 6000$.

---

## 🧙 Minigame Mastery: MinigameAddon.js

Based on the advanced micro-management logic of **AutoCookie**.

* **Stock Market (SMA Analysis)**: An algorithmic broker evaluates price histories using **Simple Moving Averages**. It identifies real trends, buying at confirmed valleys and selling at bullish peaks.
* **Grimoire (Double Casting)**: Executes the "Force the Hand of Fate" combo, instantly selling Wizard Towers to manipulate mana costs for a second cast within the same atomic thread.
* **Wrinkler Protection**: Automatically pops mature wrinklers while strictly preserving **"Shiny"** variants.

---

## 🎨 UI & Energy Efficiency (Zero-Background)

* **Shadow DOM**: The interface is fully encapsulated to prevent CSS collisions with the original game.
* **GPU Kill-Switch**: When the panel is minimized or the tab is hidden, JACCS **kills** the UI rendering pipeline (SVG/Canvas/DOM updates). This eliminates memory leaks and reduces CPU/GPU usage to near-zero during AFK sessions.

---

## 🤝 Credits & Inspirations

JACCS is a consolidation project that pays tribute to the pillars of the Cookie Clicker modding scene:

1. **Cookie Monster**: For establishing the gold standard in efficiency analysis and PP calculation.
2. **CookieBot (prinzstani)**: For the vision of a safe, human-like automatic playthrough.
3. **AutoCookie (Elekester)**: For advanced minigame automation and Grimoire logic.
4. **OrcJMR**: For clean injection methodology and asynchronous loading structures.

---

## Installation (Tampermonkey)

To run **JACCS** automatically every time you open the game, follow these steps:

1.  **Install Tampermonkey**: Download the extension for your browser (Chrome, Firefox, Edge).
2.  **Create a New Script**: Open the Tampermonkey dashboard and click the **"+"** (Create a new script) button.
3.  **Paste the Loader**: Delete the default code and paste the following:

```javascript
// ==UserScript==
// @name         JACCS Loader (PelayoHer)
// @namespace    http://tampermonkey.net/
// @version      1.2
// @description  Cargador oficial de JACCS para Cookie Clicker
// @author       PelayoHer
// @match        https://orteil.dashnet.org/cookieclicker/
// @icon         https://www.google.com/s2/favicons?sz=64&domain=dashnet.org
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    // Usamos master porque es el nombre de tu rama en GitHub
    // El ?v= al final evita que jsDelivr te sirva una versión vieja por error
    var repoUrl = 'https://cdn.jsdelivr.net/gh/PelayoHer/YACCS@master/src/main.js?v=' + Date.now();

    var script = document.createElement('script');
    script.id = 'jaccs-loader';
    script.src = repoUrl;
    document.head.appendChild(script);

    console.log("JACCS: Loader injected successfully.");
})();

