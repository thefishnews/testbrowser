const statusText = document.getElementById('status-text');
const settingsBtn = document.getElementById('settings-btn');
const settingsMenu = document.getElementById('settings-menu');
const engineSelect = document.getElementById('engine-select');

// settings panel displayer
settingsBtn.addEventListener('click', () => {
    settingsMenu.classList.toggle('show');
});

// load saved search engine data if it exists
if (localStorage.getItem('testBrowserEngine')) {
    engineSelect.value = localStorage.getItem('testBrowserEngine');
}

// save engine thingamijiggy
engineSelect.addEventListener('change', () => {
    localStorage.setItem('testBrowserEngine', engineSelect.value);
});

// vercel stupid shit
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js', { scope: '/' })
        .then(reg => {
            if (reg.installing) {
                statusText.textContent = "Installing browser engine...";
                statusText.style.color = "#fbbf24";
            } else if (reg.waiting) {
                statusText.textContent = "Engine updating, reload page.";
                reg.waiting.postMessage({ type: 'SKIP_WAITING' });
            } else if (reg.active) {
                statusText.textContent = "Engine ready. Safe from iframe blocks.";
                statusText.style.color = "#10b981";
            }
        })
        .catch(err => {
            statusText.textContent = "Engine blocked by platform structure.";
            statusText.style.color = "#ef4444";
            console.error(err);
        });
} else {
    statusText.textContent = "Browser environment handles blocking workers.";
    statusText.style.color = "#ef4444";
}

document.getElementById('proxy-form').addEventListener('submit', function(e) {
    e.preventDefault();
    let input = document.getElementById('url-input').value.trim();
    
    if (!input.startsWith('http://') && !input.startsWith('https://')) {
        if (input.includes('.') && !input.includes(' ')) {
            input = 'https://' + input;
        } else {
            // engine selection logic
            const engine = engineSelect.value;
            if (engine === 'brave') {
                input = 'https://brave.com' + encodeURIComponent(input);
            } else if (engine === 'edge') {
                input = 'https://bing.com' + encodeURIComponent(input);
            } else if (engine === 'chrome') {
                input = 'https://google.com' + encodeURIComponent(input);
            } else {
                // DuckDuckGo - Default Option
                input = 'https://duckduckgo.com' + encodeURIComponent(input);
            }
        }
    }

    // direct routing
    window.location.href = '/__scramjet__/' + btoa(input).replace(/=/g, '');
});
