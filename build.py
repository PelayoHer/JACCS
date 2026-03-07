import os
import re

files = [
    'Logger.js', 
    'UI.js', 
    'OmniCookieCore.js', 
    'EfficiencyEngine.js', 
    'AutoManager.js', 
    'MinigameAddon.js', 
    'AutoAscend.js', 
    'AutoLumps.js'
]

header = """// ==UserScript==
// @name         JACCS Ultimate Injector
// @namespace    http://tampermonkey.net/
// @version      5.0
// @description  Bypasses Cookie Clicker CSP
// @author       PelayoHer
// @match        https://orteil.dashnet.org/cookieclicker/
// @icon         https://www.google.com/s2/favicons?sz=64&domain=dashnet.org
// @grant        none
// @sandbox      raw
// ==/UserScript==

(function() {
    'use strict';
    setTimeout(() => {
"""

footer = """
        // CSP Bypass for UI Events
        document.addEventListener('click', function(e) {
            if (e.target && e.target.getAttribute('data-jaccs-click')) {
                let action = e.target.getAttribute('data-jaccs-click');
                if (action === 'JACCS.UI.togglePanel()') {
                    JACCS.UI.togglePanel();
                } else if (action === 'JACCS.UI.clearLogs()') {
                    JACCS.UI.clearLogs();
                }
            }
        });
    }, 1500);
})();
"""

with open('jaccs-tampermonkey.user.js', 'w', encoding='utf-8', newline='\n') as out:
    out.write(header)
    for f in files:
        filepath = os.path.join('src', f)
        if os.path.exists(filepath):
            with open(filepath, 'r', encoding='utf-8-sig') as src:
                content = src.read()
                # Remove zero-width characters and unusual line terminators that IDEs flag as "Invalid character"
                content = re.sub(r'[\u200b\ufeff]', '', content)
                content = content.replace('onclick="JACCS.UI.togglePanel()"', 'data-jaccs-click="JACCS.UI.togglePanel()"')
                content = content.replace('onclick="JACCS.UI.clearLogs()"', 'data-jaccs-click="JACCS.UI.clearLogs()"')
                out.write(content + '\n\n')
    out.write(footer)

print("jaccs-tampermonkey.user.js clean generated.")
