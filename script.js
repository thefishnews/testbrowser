// Configuration Variables
const DEFAULT_WISP = "wss://anura.pro";
let currentWispUrl = localStorage.getItem('wisp_proxy_url') || DEFAULT_WISP;
let wsConnection = null;
let activeStreamId = 1;

// Elements Mapping
const statusBadge = document.getElementById('network-status');
const wispInput = document.getElementById('wisp-url-input');
const connectBtn = document.getElementById('connect-btn');
const queryInput = document.getElementById('query-input');
const fetchBtn = document.getElementById('fetch-btn');
const outputCanvas = document.getElementById('output-canvas');

// Initialize Layout States
wispInput.value = currentWispUrl;

// Establish Client Wisp Pipeline Connection
function establishWispPipeline() {
    if (wsConnection) {
        try { wsConnection.close(); } catch(e) {}
    }

    statusBadge.textContent = "CONNECTING...";
    statusBadge.style.color = "var(--text-muted)";

    // Setup pure client WebSocket transport loop 
    wsConnection = new WebSocket(currentWispUrl);
    wsConnection.binaryType = "arraybuffer";

    wsConnection.onopen = () => {
        statusBadge.textContent = `CONNECTED ROUTE: ${currentWispUrl}`;
        statusBadge.style.color = "var(--success-green)";
    };

    wsConnection.onclose = () => {
        statusBadge.textContent = "OFFLINE: Pipeline disconnected.";
        statusBadge.style.color = "var(--error-red)";
    };

    wsConnection.onerror = () => {
        statusBadge.textContent = "TRANSPORT ERROR: Routing channel failed.";
        statusBadge.style.color = "var(--error-red)";
    };

    wsConnection.onmessage = (event) => {
        handleIncomingWispPayload(event.data);
    };
}

// Save Custom Node Configuration
connectBtn.addEventListener('click', () => {
    let inputUrl = wispInput.value.trim();
    if (!inputUrl) return;
    
    if (!inputUrl.startsWith("ws://") && !inputUrl.startsWith("wss://")) {
        inputUrl = "wss://" + inputUrl;
    }
    
    currentWispUrl = inputUrl;
    wispInput.value = currentWispUrl;
    localStorage.setItem('wisp_proxy_url', currentWispUrl);
    establishWispPipeline();
});

// Execute Network Search Routing Block
fetchBtn.addEventListener('click', () => {
    const query = queryInput.value.trim();
    if (!query) return;

    outputCanvas.innerHTML = `
        <div class="placeholder-msg">
            <p>Streaming secure HTTP packet layer over Wisp pipeline...</p>
            <small>Query Target: ://duckduckgo.com</small>
        </div>
    `;

    sendWispHttpRequest(query);
});

// Structure the Binary Multiplex Wisp Packet
function sendWispHttpRequest(query) {
    if (!wsConnection || wsConnection.readyState !== WebSocket.OPEN) {
        outputCanvas.innerHTML = `<div class='placeholder-msg' style='color:var(--error-red);'><p>Error: Wisp socket pipeline is offline. Reconnect your gateway.</p></div>`;
        return;
    }

    const encodedQuery = encodeURIComponent(query);
    const host = "://duckduckgo.com";
    const path = `/html/?q=${encodedQuery}`;

    console.log(`[Wisp] Opening multiplex virtual socket stream to ${host}${path}`);

    // --- WISP V1 CLIENT MULTIPLEXING INTERFACES ---
    // Packet types: 0x01 = CONNECT, 0x02 = DATA, 0x03 = CLOSE
    activeStreamId++;
    
    // Packet Packet: TYPE (1 byte) + STREAM_ID (4 bytes) + PORT (2 bytes) + HOST (variable)
    const encoder = new TextEncoder();
    const hostBytes = encoder.encode(host);
    const packet = new Uint8Array(1 + 4 + 2 + hostBytes.length);
    
    packet[0] = 0x01; // Wisp Connect command packet flag
    
    // Write Stream ID (Big Endian)
    packet[1] = (activeStreamId >> 24) & 0xFF;
    packet[2] = (activeStreamId >> 16) & 0xFF;
    packet[3] = (activeStreamId >> 8) & 0xFF;
    packet[4] = activeStreamId & 0xFF;
    
    // Write Port 443 HTTPS (Big Endian)
    packet[5] = (443 >> 8) & 0xFF;
    packet[6] = 443 & 0xFF;
    
    // Copy Host Payload
    packet.set(hostBytes, 7);
    
    // Fire handshake over native WSS pipe
    wsConnection.send(packet.buffer);

    // Draft raw serialized baseline HTTP GET textual header payload strings
    const httpRequestText = 
        `GET ${path} HTTP/1.1\r\n` +
        `Host: ${host}\r\n` +
        `User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36\r\n` +
        `Accept: text/html\r\n` +
        `Connection: close\r\n\r\n`;

    const httpBytes = encoder.encode(httpRequestText);
    
    // Format Wisp Data Frame: TYPE (1 byte, 0x02) + STREAM_ID (4 bytes) + PAYLOAD
    const dataFrame = new Uint8Array(1 + 4 + httpBytes.length);
    dataFrame[0] = 0x02; // Wisp Data payload flag
    dataFrame.set(packet.subarray(1, 5), 1); // Mirror same Stream ID bytes
    dataFrame.set(httpBytes, 5);

    // Ship data payload down the tunnel
    setTimeout(() => {
        if(wsConnection.readyState === WebSocket.OPEN) {
            wsConnection.send(dataFrame.buffer);
        }
    }, 200);
}

// Receive and Reassemble Binary Packets
let collectedHtmlBuffer = "";
function handleIncomingWispPayload(arrayBuffer) {
    const view = new Uint8Array(arrayBuffer);
    const packetType = view[0];
    
    // If it's a data frame packet type
    if (packetType === 0x02) {
        const payloadBytes = view.subarray(5);
        const decoder = new TextDecoder();
        collectedHtmlBuffer += decoder.decode(payloadBytes);
    } 
    // If the stream gets a termination command frame packet
    else if (packetType === 0x03) {
        console.log("[Wisp] Stream terminated by proxy. Initializing layout engine parsing routine.");
        parseAndRenderPureHtml(collectedHtmlBuffer);
        collectedHtmlBuffer = ""; // Wipe storage engine buffer
    }
}

// Pure Client-Side HTML Extraction & Card Injection (No Iframes)
function parseAndRenderPureHtml(htmlRawString) {
    outputCanvas.innerHTML = "";
    const searchCardsArray = [];

    // Strip out the HTTP header blocks if present in string chunk arrays
    const htmlBodyStart = htmlRawString.indexOf("<html");
    const functionalHtml = htmlBodyStart !== -1 ? htmlRawString.substring(htmlBodyStart) : htmlRawString;

    // Use pure text splitting to pull DuckDuckGo HTML objects natively 
    const resultBlocks = functionalHtml.split('class="result-links"');
    
    // Skip index 0 as it precedes the first actual element card block
    for (let i = 1; i < resultBlocks.length; i++) {
        const block = resultBlocks[i];

        // Extract Title Header Metadata
        let title = "Search Index Object";
        const titleMatch = block.match(/class="result__url"[^>]*>([^<]+)/);
        if (titleMatch && titleMatch[1]) title = titleMatch[1].trim();

        // Extract Tracking Hyperlinks
        let link = "#";
        const linkMatch = block.match(/href="([^"]+)"/);
        if (linkMatch && linkMatch[1]) {
            // Un-proxify internal duckduckgo click logging trackers if present
            link = linkMatch[1];
            if(link.includes("uddg=")) {
                link = decodeURIComponent(link.split("uddg=")[1].split("&")[0]);
            }
        }

        // Extract Content Summary Paragraph Snippet blocks
        let snippet = "No descriptive information packet recovered down this stream lane.";
        const snippetMatch = block.match(/class="result__snippet"[^>]*>([\s\S]*?)<\/a>/);
        if (snippetMatch && snippetMatch[1]) {
            snippet = snippetMatch[1].replace(/<[^>]*>/g, "").trim(); // Strip internal tags
        }

        searchCardsArray.push({ title, link, snippet });
    }

    // Render logic checks
    if (searchCardsArray.length === 0) {
        outputCanvas.innerHTML = `
            <div class="placeholder-msg" style="color:var(--text-muted);">
                <p>No clean text metadata items extracted.</p>
                <small>The node returned a blank page or an anti-bot block challenge. Try updating your Wisp server route.</small>
            </div>
        `;
        return;
    }

    // Draw the extracted elements natively into layout cards
    searchCardsArray.forEach(cardData => {
        const cardElement = document.createElement('div');
        cardElement.className = 'result-card';
        cardElement.innerHTML = `
            <h3>${escapeHtml(cardData.title)}</h3>
            <a href="${escapeHtml(cardData.link)}" target="_blank">${escapeHtml(cardData.link)}</a>
            <p>${escapeHtml(cardData.snippet)}</p>
        `;
        outputCanvas.appendChild(cardElement);
    });
}

// XSS Vector Sanitization helper
function escapeHtml(text) {
    return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

// Fire Initial Setup Vector Run
establishWispPipeline();
