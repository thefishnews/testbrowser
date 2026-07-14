const statusText = document.getElementById('status-text');

// Handle registration and force immediate claim on activation lifecycle
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js', { scope: '/__scramjet__/' })
        .then(reg => {
            // Force worker activation immediately instead of waiting for tabs to close
            if (reg.installing) {
                statusText.textContent = "Installing browser engine...";
                statusText.style.color = "#fbbf24";
            } else if (reg.waiting) {
                statusText.textContent = "Engine updating, please reload.";
                reg.waiting.postMessage({ type: 'SKIP_WAITING' });
            } else if (reg.active) {
                statusText.textContent = "Engine ready. Safe from iframe blocks.";
                statusText.style.color = "#10b981";
            }
        })
        .catch(err => {
            statusText.textContent = "Engine blocked by platform security headers.";
            statusText.style.color = "#ef4444";
            console.error("SW Registration failed:", err);
        });
} else {
    statusText.textContent = "Your browser blocks custom network workers.";
    statusText.style.color = "#ef4444";
}

// Intercept submission entries natively
document.getElementById('proxy-form').addEventListener('submit', function(e) {
    e.preventDefault();
    let input = document.getElementById('url-input').value.trim();
    
    if (!input.startsWith('http://') && !input.startsWith('https://')) {
        if (input.includes('.') && !input.includes(' ')) {
            input = 'https://' + input;
        } else {
            input = 'https://google.com' + encodeURIComponent(input);
        }
    }

    // Direct path formatting matching Scramjet architecture expectations
    window.location.href = '/__scramjet__/' + btoa(input).replace(/=/g, '');
});
