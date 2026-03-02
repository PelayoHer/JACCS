# 🍪 JACCS: Just Another Cookie Clicker Script

[English](README.md) | [Español](README.es.md)

![Logo de JACCS](logo.png)

[![GitHub license](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Versión Cookie Clicker](https://img.shields.io/badge/Cookie%20Clicker-2.052+-orange)](https://orteil.dashnet.org/cookieclicker/)

**JACCS** es un entorno de automatización y análisis de alto rendimiento, perfeccionado matemáticamente para **Cookie Clicker**. No es un simple script de autoclick; es un **Sistema Experto** diseñado explícitamente para el Speedrun y obtener el 100% de los logros del juego.

---

## Los 8 Pilares de la arquitectura

### 1. Motor Síncrono Principal (`src/OmniCookieCore.js`)
A diferencia de los mods convencionales que saturan tu navegador inyectando múltiples temporizadores `setInterval`, JACCS opera sobre un único bucle maestro mediante `requestAnimationFrame`. Mide dinámicamente el tiempo de ejecución y descarta intencionadamente sus propios frames si el ciclo dura más de `16ms`, asegurando que el juego jamás se congele ni siquiera en PCs de muy bajos recursos.

### 2. Economía Matemática Exacta (`src/EfficiencyEngine.js` y `AutoManager.js`)
Ahorrar sin sentido es del pasado. JACCS utiliza matemáticas puras de Speedrun para calcular el **Retorno de Inversión (ROI)** exacto de cada edificio y mejora. 
* **Early Game (0 a 1 Trillón)**: Escalamiento exponencial agresivo e ilimitado. Cero ahorros.
* **Mid Game (< Get Lucky)**: Calcula dinámicamente y acapara exactamente 15 minutos de CPS puro (Multiplicador 6000x) para maximizar combos regulares de tipo Lucky.
* **Late Game (> Get Lucky)**: Acapara 105 minutos (Multiplicador 42000x) para combos Frenzy+Lucky.
* **La Anulación de Speedrun**: Si el bot detecta que una compra se amortiza más rápido de lo que el banco tarda en regenerarse (ej. `ROI < 6000s`), ignorará la regla de ahorro y la comprará a la fuerza.

### 3. Ascensión Autónoma Absoluta (`src/AutoAscend.js`)
El bot calcula derivadas logarítmicas para saber el instante matemático óptimo en el que debe reencarnar (Cuando sus ingresos Celestiales superan un multiplicador de `10x` sobre el prestigio actual). Al llegar a la pantalla astral:
* Evalúa tu historial completo de desbloqueos en la partida.
* Adquiere las Mejoras Celestiales viajando dinámicamente por la **Ruta Óptima de Speedrun** (Legacy -> Brand Biscuits -> Season Switcher...).
* Equipa tu Gatito más potente, tu mejora de Dedos Suprema, la Tortilla de Pascua, el Día de Suerte y la mejor Galleta de Mantequilla en las **5 Ranuras de Mejoras Permanentes**.
* Reencarna y retoma la partida de inmediato.

### 4. Macros Híper-Óptimas de Minijuegos (`src/MinigameAddon.js`)
JACCS exprime los minijuegos a un nivel sobrehumano:
* **Bolsa de Valores**: Analiza las Medias Móviles (SMA) mezclado con el Reconocimiento de Patrones del ciclo para comprar barato en los rebotes y vender caro en las caídas.
* **Devastación de Godzamok**: Durante un "Click Frenzy", sacrifica cientos de edificios baratos simultáneamente en 6 categorías (Granjas, Minas, Bancos, Fábricas, Envíos y Laboratorios) para multiplicar su poder de clic un +500%, y los reabastece de forma segura al instante usando el comprador por lotes nativo del juego.
* **Double-Cast del Grimorio**: Predice ventanas de combo extremo (Bufos x50) y lanza *Force the Hand of Fate*. Acto seguido, vende sin piedad tus Torres de Mago para bajar el límite máximo de maná por la fuerza y lanzar el hechizo una segunda vez instantáneamente.
* **Cosecha Botánica**: Recolecta plantas maduras no inmortales en el milisegundo exacto en que están listas, maximizando el grindeo de mutaciones en el Jardín.

### 5. Terrones de Azúcar al Milisegundo (`src/AutoLumps.js`)
¿Por qué esperar a que un Sugar Lump caiga solo al suelo? JACCS se inyecta en la API nativa de `Game.timeSinceLumpRipe()` y recolecta el terrón en la milésima de segundo en la que se vuelve maduro a nivel matemático. Te ahorra, literalmente, una hora de espera inútil por cada terrón.

### 6. Interfaz Avanzada Zero-GPU y Sigilo (`src/UI.js` y `Logger.js`)
Imprimir en consola miles de cálculos de ROI cada segundo colpasaría Chrome. Por ello, JACCS inyecta una falsa interfaz Shadow DOM que levita elegantemente sobre el juego. Allí renderiza sus avisos silenciosos. Además, incluye un **Modo Error Humano** que falla a propósito el 0.2% de los clics para evadir software anti-cheats heurístico.

### 7. Soporte de Inyección Nativo
JACCS es respetuoso con el código fuente de Orteil. Emplea la función oficial de inyección `Game.registerMod()` para enlazar perfectamente sus métodos de carga, inicio y guardado en la partida original sin pervertir la cadena de texto de tu partida guardada. También incluye un *Failsafe Crítico* que fuerza un autoguardado si detecta caídas de CPS inesperadas.

### 8. Despliegue Monolítico (`build.py`)
Olvídate de instalaciones complejas. Un entorno de desarrollo local con un script en Python toma los 9 intrincados módulos arquitectónicos y los funde en un único e indestructible archivo para Tampermonkey (`jaccs-tampermonkey.user.js`) habilitado para superar las severas Políticas restrictivas de Seguridad de Contenido (CSP) del servidor web original.

---

## Instalación (Tampermonkey)

1. **Instala Tampermonkey** en Chrome, Firefox, o Edge.
2. Haz clic en **Crear un nuevo script**.
3. Copia el contenido entero del archivo `jaccs-tampermonkey.user.js` alojado en este repositorio.
4. Pégalo reescribiendo el código por defecto de Tampermonkey.
5. Guarda (`Ctrl + S`) y simplemente refresca completamente la página de Cookie Clicker (`F5`).

*(Nota: La carpeta `src` y el script `build.py` existen únicamente para el desarrollo, modularidad y contribución. El usuario final solo necesita el archivo final `jaccs-tampermonkey.user.js`).*
