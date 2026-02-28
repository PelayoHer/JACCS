# 🍪 JACCS: Just Another Cookie Clicker Script

[English](README.md) | [Español](README.es.md)

[![GitHub license](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Versión Cookie Clicker](https://img.shields.io/badge/Cookie%20Clicker-2.052-orange)](https://orteil.dashnet.org/cookieclicker/)

**JACCS** es un entorno de automatización y análisis de alto rendimiento para **Cookie Clicker**. No es un simple script de autoclick; es un **Sistema Experto** que unifica la inteligencia colectiva de la comunidad en un único núcleo asíncrono, optimizado para el *end-game* y diseñado para ser virtualmente indetectable.

---

## Arquitectura: El Motor OmniCookie

A diferencia de los mods convencionales que saturan el navegador, JACCS utiliza un **Single-Loop Engine** basado en `requestAnimationFrame`.

### 1. OmniCookieCore.js (El Corazón)
* **Sincronización a 60 FPS**: La lógica corre en armonía con el renderizado nativo del juego.
* **Frame-Dropping Inteligente**: Si un cálculo tarda más de **16ms**, el motor salta el siguiente cuadro para mantener la fluidez del juego y evitar tirones.
* **Failsafe (Protección Crítica)**: Si detecta una caída de producción inexplicable (>90%), guarda la partida automáticamente y se detiene para proteger tu progreso.
* **Persistencia Integrada**: Guarda configuraciones y telemetría directamente en tu partida de Cookie Clicker mediante `Game.modSave`.

---

## Inteligencia Analítica: EfficiencyEngine.js

Este módulo perfecciona la lógica matemática de **Cookie Monster**.

### El Algoritmo de Retorno (PP)
Calcula el **Payback Period (PP)** para determinar qué inversión recupera tu capital en el menor tiempo posible:

$$PP = \frac{\max(\text{Coste} - \text{Banco}, 0)}{CPS} + \frac{\text{Coste}}{\Delta CPS}$$

### Telemetría y Snapshots
* **Ring Buffer**: Mantiene un historial de las últimas 100 capturas de estado (CPS, Banco, Inversiones).
* **Ahorro de Recursos**: Las capturas se suspenden si la pestaña está oculta, evitando el consumo inútil de CPU.

---

## Ejecución Sigilosa: AutoManager.js

Diseñado bajo la filosofía de **CookieBot** para imitar a un jugador humano experto.

### Sigilo y Humanización
* **Clicks Poisson**: Los intervalos de clic varían estadísticamente para romper patrones robóticos detectables.
* **Latencia Variable**: Captura galletas doradas con un retraso humano (0.8s - 3.5s) basado en una **curva de Gauss**.
* **Modo de Error Humano**: Probabilidad del **0.2%** de ignorar un evento, simulando un descuido real.
* **Rampa de Aceleración**: Tarda **0.5s** en alcanzar su máxima velocidad (50+ CPS) al detectar un bufo, emulando la reacción motora humana.

### Reserva Bancaria Dinámica (Safe Bank)
Calcula permanentemente la reserva necesaria para maximizar los premios "Lucky!". Durante un **Frenzy**, retiene las compras para elevar la meta de ahorro a $(CPS \times 7) \times 6000$.

---

## Maestría en Minijuegos: MinigameAddon.js

Basado en la micro-gestión avanzada de **AutoCookie**.

* **Bolsa de Valores (SMA)**: Analiza tendencias usando **Medias Móviles Simples**. Compra en valles y vende en picos alcistas de forma automática.
* **Grimorio (Double Casting)**: Ejecuta el combo de lanzar un hechizo, vender torres de magos para manipular el coste de maná y lanzar un segundo hechizo al instante.
* **Limpieza de Wrinklers**: Explota arrugadores maduros pero protege con seguridad absoluta a los ejemplares **"Shiny"**.

---

## Interfaz y Eficiencia (Zero-Background)

* **Shadow DOM**: Interfaz aislada que no entra en conflicto con el diseño original del juego.
* **GPU Kill-Switch**: Si minimizas el panel o cambias de pestaña, JACCS **detiene** el renderizado de gráficas y UI. Esto elimina las fugas de memoria y reduce el uso de RAM y CPU al mínimo mientras estás AFK.

---

## Créditos e Inspiraciones

JACCS es un proyecto de consolidación que rinde homenaje a los pilares del modding de Cookie Clicker:

1. **Cookie Monster**: Por el estándar de análisis de eficiencia y cálculo de PP.
2. **CookieBot (prinzstani)**: Por la visión de un juego automático seguro y humano.
3. **AutoCookie (Elekester)**: Por la automatización experta de minijuegos.
4. **OrcJMR**: Por la metodología de inyección limpia y carga asíncrona.

---

## Instalación (Tampermonkey)

Para que **JACCS** se cargue automáticamente cada vez que abras el juego, haz lo siguiente:

1.  **Instala Tampermonkey**: Descarga la extensión para tu navegador (Chrome, Firefox, Edge).
2.  **Crea un nuevo Script**: Abre el panel de Tampermonkey y haz clic en el botón **"+"** (Crear nuevo script).
3.  **Pega el Cargador**: Borra el código por defecto y pega este bloque:

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
