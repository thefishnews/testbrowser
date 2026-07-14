const statusText = document.getElementById('status-text');
const settingsBtn = document.getElementById('settings-btn');
const settingsMenu = document.getElementById('settings-menu');
const engineSelect = document.getElementById('engine-select');

settingsBtn.addEventListener('click', () => {
    settingsMenu.classList.toggle('show');
});

if (localStorage.getItem('testBrowserEngine')) {
    engineSelect.value = localStorage.getItem('testBrowserEngine');
}

engineSelect.addEventListener('change', () => {
    localStorage.setItem('testBrowserEngine', engineSelect.value);
});

if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js', { scope: '/' })
        .then(reg => {
            const interval = setInterval(() => {
                if (reg.active) {
                    statusText.textContent = "Engine ready. Safe from iframe blocks.";
                    statusText.style.color = "#10b981";
                    clearInterval(interval);
                }
            }, 100);
        })
        .catch(err => {
            statusText.textContent = "Engine running via fallback bypass.";
            statusText.style.color = "#10b981";
        });
}

document.getElementById('proxy-form').addEventListener('submit', function(e) {
    e.preventDefault();
    let input = document.getElementById('url-input').value.trim();
    
    if (!input.startsWith('http://') && !input.startsWith('https://')) {
        if (input.includes('.') && !input.includes(' ')) {
            input = 'https://' + input;
        } else {
            const engine = engineSelect.value;
            if (engine === 'brave') {
                input = 'https://brave.com' + encodeURIComponent(input);
            } else if (engine === 'edge') {
                input = 'https://bing.com' + encodeURIComponent(input);
            } else if (engine === 'chrome') {
                input = 'https://google.com' + encodeURIComponent(input);
            } else {
                input = 'https://duckduckgo.com' + encodeURIComponent(input);
            }
        }
    }

    // Force strict navigation assignment array formatting
    const encodedUrl = btoa(input).replace(/=/g, '');
    window.location.replace('/__scramjet__/' + encodedUrl);
});
