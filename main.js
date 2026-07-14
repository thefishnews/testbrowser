const statusText = document.getElementById('status-text');

// Initialize the browser engine and handle service worker registration
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js', { scope: '/__scramjet__/' })
        .then(reg => {
            statusText.textContent = "Engine ready. Safe from iframe blocks.";
            statusText.style.color = "#10b981";
        })
        .catch(err => {
            statusText.textContent = "Service worker registration failed.";
            statusText.style.color = "#ef4444";
            console.error(err);
        });
} else {
    statusText.textContent = "Your browser does not support Service Workers.";
    statusText.style.color = "#ef4444";
}

// Intercept search bar submission
document.getElementById('proxy-form').addEventListener('submit', function(e) {
    e.preventDefault();
    let input = document.getElementById('url-input').value.trim();
    
    // Format input to turn text phrases into a google search or append missing protocols
    if (!input.startsWith('http://') && !input.startsWith('https://')) {
        if (input.includes('.') && !input.includes(' ')) {
            input = 'https://' + input;
        } else {
            input = 'https://google.com' + encodeURIComponent(input);
        }
    }

    // Direct redirection injection to prevent parent page container iframe rules
    window.location.href = '/__scramjet__/' + btoa(input).replace(/=/g, '');
});
