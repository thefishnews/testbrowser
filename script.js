/**
 * Test Browser Dashboard - Core Client Execution Engine
 * Architecture: Wisp V1 Client Multiplexer (No-Iframe Design)
 */

const DEFAULT_WISP = "wss://anura.pro";
let currentWispUrl = localStorage.getItem('wisp_proxy_url') || DEFAULT_WISP;
let wsConnection = null;
let activeStreamId = 100; 
let collectedHtmlBuffer = "";

const statusBadge = document.getElementById('network-status');
const wispInput = document.getElementById('wisp-url-input');
const connectBtn = document.getElementById('connect-btn');
const queryInput = document.getElementById('query-input');
const fetchBtn = document.getElementById('fetch-btn');
const outputCanvas = document.getElementById('output-canvas');

wispInput.value = currentWispUrl;

function establishWispPipeline() {
    if (wsConnection) {
        try { wsConnection.close(); } catch(e) {}
    }

    statusBadge.textContent = "CONNECTING...";
    statusBadge.style.color = "var(--text-muted)";

    wsConnection = new WebSocket(currentWispUrl);
    wsConnection.binaryType = "arraybuffer";

    wsConnection.onopen = () => {
        // --- MANDATORY MERCURY WORKSHOP WISP V1 HANDSHAKE ---
        const handshakePacket = new Uint8Array(2);
        handshakePacket[0] = 0x01; // Major
        handshakePacket[1] = 0x00; // Minor
        
        wsConnection.send(handshakePacket.buffer);
        console.log("[Wisp] Handshake sent.");

        statusBadge.textContent = `CONNECTED ROUTE: ${currentWispUrl}`;
        statusBadge.style.color = "var(--success-green)";
    };

    wsConnection.onclose = () => {
        statusBadge.textContent = "OFFLINE: Pipeline disconnected.";
        statusBadge.style.color = "var(--error-red)";
    };

    wsConnection.onerror = (err) => {
        console.error("[Wisp Error]", err);
        statusBadge.textContent = "TRANSPORT ERROR: Routing channel failed.";
        statusBadge.style.color = "var(--error-red)";
    };

    wsConnection.onmessage = (event) => {
        handleIncomingWispPayload(event.data);
    };
}

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

fetchBtn.addEventListener('click', () => {
    const query = queryInput.value.trim();
    if (!query) return;

    outputCanvas.innerHTML = `
        <div class="placeholder-msg">
            <p>Streaming secure HTTP packet layer over Wisp pipeline...</p>
            <small>Query Target: ://duckduckgo.com</small>
        </div>
    `;

    collectedHtmlBuffer = ""; 
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
    const port = 443; 

    activeStreamId++; 
    
    const encoder = new TextEncoder();
    const hostBytes = encoder.encode(host);

    outputCanvas.innerHTML = `
        <div class="placeholder-msg">
            <p>Streaming secure HTTP packet layer over Wisp pipeline...</p>
            <small>Query Target: https://${host}${path}</small>
        </div>
    `;

    // --- PACKET A: STREAM CONNECT MESSAGE (0x01) ---
    const connectFrame = new Uint8Array(1 + 4 + 2 + hostBytes.length);
    connectFrame[0] = 0x01; 
    
    connectFrame[1] = (activeStreamId >> 24) & 0xFF;
    connectFrame[2] = (activeStreamId >> 16) & 0xFF;
    connectFrame[3] = (activeStreamId >> 8) & 0xFF;
    connectFrame[4] = activeStreamId & 0xFF;
    
    connectFrame[5] = (port >> 8) & 0xFF;
    connectFrame[6] = port & 0xFF;
    
    connectFrame.set(hostBytes, 7);
    wsConnection.send(connectFrame.buffer);

    // --- PACKET B: DATA PAYLOAD MESSAGE (0x02) ---
    const httpRequestText = 
        `GET ${path} HTTP/1.1\r\n` +
        `Host: ${host}\r\n` +
        `User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36\r\n` +
        `Accept: text/html\r\n` +
        `Connection: close\r\n\r\n`;

    const httpPayloadBytes = encoder.encode(httpRequestText);
    const dataFrame = new Uint8Array(1 + 4 + httpPayloadBytes.length);
    dataFrame[0] = 0x02; 
    
    dataFrame[1] = connectFrame[1];
    dataFrame[2] = connectFrame[2];
    dataFrame[3] = connectFrame[3];
    dataFrame[4] = connectFrame[4];
    
    dataFrame.set(httpPayloadBytes, 5);

    setTimeout(() => {
        if (wsConnection.readyState === WebSocket.OPEN) {
            wsConnection.send(dataFrame.buffer);
            console.log(`[Wisp] Stream #${activeStreamId} HTTP payload dispatched.`);
        }
    }, 50);
}

function handleIncomingWispPayload(arrayBuffer) {
    const view = new Uint8Array(arrayBuffer);
    if (view.length < 5) return; 

    const packetType = view[0];
    const receivedStreamId = (view[1] << 24) | (view[2] << 16) | (view[3] << 8) | view[4];
    if (receivedStreamId !== activeStreamId) return; 

    if (packetType === 0x02) {
        const dataPayload = view.subarray(5);
        const decoder = new TextDecoder();
        collectedHtmlBuffer += decoder.decode(dataPayload);
    } 
    else if (packetType === 0x03) {
        console.log(`[Wisp] Stream #${receivedStreamId} closed. Parsing HTML.`);
        parseAndRenderPureHtml(collectedHtmlBuffer);
    }
}

function parseAndRenderPureHtml(htmlRawString) {
    outputCanvas.innerHTML = "";
    const processedSearchItems = [];

    const htmlBodyStart = htmlRawString.indexOf("<html");
    const functionalHtmlString = htmlBodyStart !== -1 ? htmlRawString.substring(htmlBodyStart) : htmlRawString;

    const elementsArray = functionalHtmlString.split('class="result-links"');
    
    for (let i = 1; i < elementsArray.length; i++) {
        const itemBlock = elementsArray[i];

        let titleText = "Target Indexed Block Element";
        const titleRegexMatch = itemBlock.match(/class="result__url"[^>]*>([^<]+)/);
        if (titleRegexMatch && titleRegexMatch[1]) {
            titleText = titleRegexMatch[1].trim();
        }

        let trackingUrl = "#";
        const urlRegexMatch = itemBlock.match(/href="([^"]+)"/);
        if (urlRegexMatch && urlRegexMatch[1]) {
            trackingUrl = urlRegexMatch[1];
            if (trackingUrl.includes("uddg=")) {
                const urlParts = trackingUrl.split("uddg=");
                if (urlParts[1]) {
                    trackingUrl = decodeURIComponent(urlParts[1].split("&")[0]);
                }
            }
        }

        let snippetText = "No descriptive information packet recovered along this stream lane.";
        const snippetRegexMatch = itemBlock.match(/class="result__snippet"[^>]*>([\s\S]*?)<\/a>/);
        if (snippetRegexMatch && snippetRegexMatch[1]) {
            snippetText = snippetRegexMatch[1].replace(/<[^>]*>/g, "").trim();
        }

        processedSearchItems.push({ title: titleText, link: trackingUrl, description: snippetText });
    }

    if (processedSearchItems.length === 0) {
        outputCanvas.innerHTML = `
            <div class="placeholder-msg">
                <p>No clean text metadata items extracted.</p>
                <small>The node returned a blank body structure or hit rate limits. Try updating your active route configuration link.</small>
            </div>
        `;
        return;
    }

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

function sanitizeOutputs(stringText) {
    if (!stringText) return "";
    return stringText
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

establishWispPipeline();
