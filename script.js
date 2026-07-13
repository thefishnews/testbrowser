/**
 * Test Browser Dashboard - Core Client Execution Engine
 * Architecture: Wisp V1 Client Multiplexer (No-Iframe Design)
 */

// Configuration State Containers
const DEFAULT_WISP = "wss://anura.pro";
let currentWispUrl = localStorage.getItem('wisp_proxy_url') || DEFAULT_WISP;
let wsConnection = null;
let activeStreamId = 100; // Offset to avoid internal system channel collisions
let collectedHtmlBuffer = "";

// Element Layout Mapping
const statusBadge = document.getElementById('network-status');
const wispInput = document.getElementById('wisp-url-input');
const connectBtn = document.getElementById('connect-btn');
const queryInput = document.getElementById('query-input');
const fetchBtn = document.getElementById('fetch-btn');
const outputCanvas = document.getElementById('output-canvas');

// Populate UI Fields with Persistence State
wispInput.value = currentWispUrl;

/**
 * SECTION 1: WISP PROTOCOL INITIALIZATION & HANDSHAKE
 */
function establishWispPipeline() {
    // Terminate existing open pipeline vectors cleanly
    if (wsConnection) {
        try { wsConnection.close(); } catch(e) {}
    }

    statusBadge.textContent = "CONNECTING...";
    statusBadge.style.color = "var(--text-muted)";

    // Open connection channel via native browser WebSockets
    wsConnection = new WebSocket(currentWispUrl);
    wsConnection.binaryType = "arraybuffer";

    wsConnection.onopen = () => {
        // --- MANDATORY MERCURY WORKSHOP WISP V1 HANDSHAKE ---
        // wisp-js-server expects an immediate 2-byte connection validation packet.
        // Format: [Major Version (0x01), Minor Version (0x00)]
        const handshakePacket = new Uint8Array(2);
        handshakePacket[0] = 0x01; // Wisp v1 Major
        handshakePacket[1] = 0x00; // Wisp v1 Minor
        
        wsConnection.send(handshakePacket.buffer);
        console.log("[Wisp] Protocol initialization handshake packet broadcasted.");

        statusBadge.textContent = `CONNECTED ROUTE: ${currentWispUrl}`;
        statusBadge.style.color = "var(--success-green)";
    };

    wsConnection.onclose = () => {
        statusBadge.textContent = "OFFLINE: Pipeline disconnected.";
        statusBadge.style.color = "var(--error-red)";
    };

    wsConnection.onerror = (err) => {
        console.error("[Wisp Error] Transport error recorded:", err);
        statusBadge.textContent = "TRANSPORT ERROR: Routing channel failed.";
        statusBadge.style.color = "var(--error-red)";
    };

    wsConnection.onmessage = (event) => {
        handleIncomingWispPayload(event.data);
    };
}

// User Configuration State Save Hook
connectBtn.addEventListener('click', () => {
    let inputUrl = wispInput.value.trim();
    if (!inputUrl) return;
    
    // Automatically sanitize and enforce secure protocol layers
    if (!inputUrl.startsWith("ws://") && !inputUrl.startsWith("wss://")) {
        inputUrl = "wss://" + inputUrl;
    }
    
    currentWispUrl = inputUrl;
    wispInput.value = currentWispUrl;
    localStorage.setItem('wisp_proxy_url', currentWispUrl);
    establishWispPipeline();
});

/**
 * SECTION 2: SEARCH ENGINE PACKET COMPILATION & OUTBOUND ROUTING
 */
fetchBtn.addEventListener('click', () => {
    const query = queryInput.value.trim();
    if (!query) return;

    outputCanvas.innerHTML = `
        <div class="placeholder-msg">
            <p>Streaming secure HTTP packet layer over Wisp pipeline...</p>
            <small>Query Target: ://duckduckgo.com</small>
        </div>
    `;

    collectedHtmlBuffer = ""; // Reset parsing container buffer
    sendWispHttpRequest(query);
});

function sendWispHttpRequest(query) {
    if (!wsConnection || wsConnection.readyState !== WebSocket.OPEN) {
        outputCanvas.innerHTML = `
            <div class='placeholder-msg' style='color:var(--error-red);'>
                <p>Error: Wisp socket pipeline is offline.</p>
                <small>Verify your proxy link routing constraints.</small>
            </div>`;
        return;
    }

    const encodedQuery = encodeURIComponent(query);
    const host = "://duckduckgo.com";
    const path = `/html/?q=${encodedQuery}`;
    const port = 443; // Standard secure HTTPS destination port

    activeStreamId++; // Unique identifier increments per multiplex request block
    
    const encoder = new TextEncoder();
    const hostBytes = encoder.encode(host);

    // --- PACKET A: STREAM CONNECT MESSAGE (0x01) ---
    // Layout: TYPE (1 byte) + STREAM_ID (4 bytes) + PORT (2 bytes) + HOST (variable length)
    const connectFrame = new Uint8Array(1 + 4 + 2 + hostBytes.length);
    
    connectFrame[0] = 0x01; // CONNECT type directive flag
    
    // Write Stream ID (Big Endian 32-bit Integer)
    connectFrame[1] = (activeStreamId >> 24) & 0xFF;
    connectFrame[2] = (activeStreamId >> 16) & 0xFF;
    connectFrame[3] = (activeStreamId >> 8) & 0xFF;
    connectFrame[4] = activeStreamId & 0xFF;
    
    // Write Target Port (Big Endian 16-bit Integer)
    connectFrame[5] = (port >> 8) & 0xFF;
    connectFrame[6] = port & 0xFF;
    
    // Inject Destination Host array data block
    connectFrame.set(hostBytes, 7);
    
    // Ship the channel initiation stream across the WebSocket pipe
    wsConnection.send(connectFrame.buffer);

    // --- PACKET B: DATA PAYLOAD MESSAGE (0x02) ---
    // Craft canonical plain-text raw HTTP GET request headers
    const httpRequestText = 
        `GET ${path} HTTP/1.1\r\n` +
        `Host: ${host}\r\n` +
        `User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) WebEngine/1.0\r\n` +
        `Accept: text/html\r\n` +
        `Connection: close\r\n\r\n`;

    const httpPayloadBytes = encoder.encode(httpRequestText);
    
    // Layout: TYPE (1 byte, 0x02) + STREAM_ID (4 bytes) + PAYLOAD (variable length)
    const dataFrame = new Uint8Array(1 + 4 + httpPayloadBytes.length);
    dataFrame[0] = 0x02; // DATA type directive flag
    
    // Mirror the matching Stream ID bytes into tracking index header positions
    dataFrame[1] = connectFrame[1];
    dataFrame[2] = connectFrame[2];
    dataFrame[3] = connectFrame[3];
    dataFrame[4] = connectFrame[4];
    
    // Insert raw converted HTTP text content stream payload bytes
    dataFrame.set(httpPayloadBytes, 5);

    // Broadcast data frame with tiny asynchronous delta delay to ensure sequencing order
    setTimeout(() => {
        if (wsConnection.readyState === WebSocket.OPEN) {
            wsConnection.send(dataFrame.buffer);
            console.log(`[Wisp] Stream #${activeStreamId} headers dispatched successfully.`);
        }
    }, 50);
}

/**
 * SECTION 3: INBOUND MULTIPLEX REASSEMBLY
 */
function handleIncomingWispPayload(arrayBuffer) {
    const view = new Uint8Array(arrayBuffer);
    if (view.length < 5) return; // Discard corrupt or underweight packet rows

    const packetType = view[0];
    
    // Parse target stream routing token verification array matching active request indexes
    const receivedStreamId = (view[1] << 24) | (view[2] << 16) | (view[3] << 8) | view[4];
    if (receivedStreamId !== activeStreamId) return; // Drop frame data matching dead channels

    if (packetType === 0x02) {
        // DATA Frame incoming: Accumulate buffer byte strings
        const dataPayload = view.subarray(5);
        const decoder = new TextDecoder();
        collectedHtmlBuffer += decoder.decode(dataPayload);
    } 
    else if (packetType === 0x03) {
        // CLOSE Frame received: Proxy server has finished streaming document context
        console.log(`[Wisp] Stream #${receivedStreamId} terminated natively. Triggering HTML parser.`);
        parseAndRenderPureHtml(collectedHtmlBuffer);
    }
}

/**
 * SECTION 4: DOM-LESS TEXT PARSING & CARD GENERATION (NO IFRAMES)
 */
function parseAndRenderPureHtml(htmlRawString) {
    outputCanvas.innerHTML = "";
    const processedSearchItems = [];

    // Strip procedural raw proxy proxy-headers away to parse purely from document elements
    const htmlBodyStart = htmlRawString.indexOf("<html");
    const functionalHtmlString = htmlBodyStart !== -1 ? htmlRawString.substring(htmlBodyStart) : htmlRawString;

    // Isolate search cards using raw programmatic string segment cutting loops
    const elementsArray = functionalHtmlString.split('class="result-links"');
    
    for (let i = 1; i < elementsArray.length; i++) {
        const itemBlock = elementsArray[i];

        // 1. Recover Object Title Metadata
        let titleText = "Target Indexed Block Element";
        const titleRegexMatch = itemBlock.match(/class="result__url"[^>]*>([^<]+)/);
        if (titleRegexMatch && titleRegexMatch[1]) {
            titleText = titleRegexMatch[1].trim();
        }

        // 2. Recover Safe Tracking Links & Clean Up Tracking Wrappers
        let trackingUrl = "#";
        const urlRegexMatch = itemBlock.match(/href="([^"]+)"/);
        if (urlRegexMatch && urlRegexMatch[1]) {
            trackingUrl = urlRegexMatch[1];
            // Clear out duckduckgo outbound analytics logs tracking redirects automatically
            if (trackingUrl.includes("uddg=")) {
                const urlParts = trackingUrl.split("uddg=");
                if (urlParts[1]) {
                    trackingUrl = decodeURIComponent(urlParts[1].split("&")[0]);
                }
            }
        }

        // 3. Recover Context Content Description Blocks
        let snippetText = "No descriptive information packet recovered along this stream lane.";
        const snippetRegexMatch = itemBlock.match(/class="result__snippet"[^>]*>([\s\S]*?)<\/a>/);
        if (snippetRegexMatch && snippetRegexMatch[1]) {
            // Scrub interior inner HTML tag objects completely out of container data rows
            snippetText = snippetRegexMatch[1].replace(/<[^>]*>/g, "").trim();
        }

        processedSearchItems.push({ title: titleText, link: trackingUrl, description: snippetText });
    }

    // Edge Check: Handle Empty Payload Bounds or Anti-Bot Captcha Interventions
    if (processedSearchItems.length === 0) {
        outputCanvas.innerHTML = `
            <div class="placeholder-msg">
                <p>No clean text metadata items extracted.</p>
                <small>The node returned a blank body structure or hit rate limits. Try updating your active route configuration link.</small>
            </div>
        `;
        return;
    }

    // Programmatically inject separate UI divs for free layout parsing bounds
    processedSearchItems.forEach(itemData => {
        const resultCardElement = document.createElement('div');
        resultCardElement.className = 'result-card';
        resultCardElement.innerHTML = `
            <h3>${sanitizeOutputs(itemData.title)}</h3>
            <a href="${sanitizeOutputs(itemData.link)}" target="_blank">${sanitizeOutputs(itemData.link)}</a>
            <p>${sanitizeOutputs(itemData.description)}</p>
        `;
        outputCanvas.appendChild(resultCardElement);
    });
}

// XSS Vector Sanitization Shield Engine 
function sanitizeOutputs(stringText) {
    if (!stringText) return "";
    return stringText
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

// Initialize Active System Vector Loop
establishWispPipeline();
