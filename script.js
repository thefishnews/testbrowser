/**
 * Test Browser Dashboard - Core Client Execution Engine
 * Architecture: Standard Library Wisp Client Core (Anti-Crash Version)
 */

const FALLBACK_NODE = "wss://anura.pro";
let activeWispUrl = localStorage.getItem('wisp_proxy_url') || FALLBACK_NODE;
let wsConnection = null;
let currentStreamToken = 300; // Reset token to avoid browser cache lockouts
let structuralHtmlPipelineBuffer = "";

const statusBadge = document.getElementById('network-status');
const wispInput = document.getElementById('wisp-url-input');
const connectBtn = document.getElementById('connect-btn');
const queryInput = document.getElementById('query-input');
const fetchBtn = document.getElementById('fetch-btn');
const outputCanvas = document.getElementById('output-canvas');

wispInput.value = activeWispUrl;

function initializeWispConnection() {
    if (wsConnection) {
        try { wsConnection.close(); } catch(e) {}
    }

    statusBadge.textContent = "CONNECTING STREAM VECTOR...";
    statusBadge.style.color = "var(--text-muted)";

    wsConnection = new WebSocket(activeWispUrl);
    wsConnection.binaryType = "arraybuffer";

    wsConnection.onopen = () => {
        // Official Wisp Protocol validation packet [Version Major: 0x01, Minor: 0x00]
        const validationBuffer = new Uint8Array(2);
        validationBuffer[0] = 0x01;
        validationBuffer[1] = 0x00;
        
        wsConnection.send(validationBuffer.buffer);
        console.log("[Wisp] Handshake sent successfully.");

        statusBadge.textContent = `ONLINE: ${activeWispUrl}`;
        statusBadge.style.color = "var(--success-green)";
    };

    wsConnection.onclose = () => {
        statusBadge.textContent = "OFFLINE: Pipeline disconnected.";
        statusBadge.style.color = "var(--error-red)";
    };

    wsConnection.onerror = (err) => {
        console.error("[Wisp Native Crash]", err);
        statusBadge.textContent = "TRANSPORT ERROR: Routing channel failed.";
        statusBadge.style.color = "var(--error-red)";
    };

    wsConnection.onmessage = (eventStream) => {
        processIncomingWispBuffer(eventStream.data);
    };
}

connectBtn.addEventListener('click', () => {
    let checkedUrl = wispInput.value.trim();
    if (!checkedUrl) return;
    
    if (!checkedUrl.startsWith("ws://") && !checkedUrl.startsWith("wss://")) {
        checkedUrl = "wss://" + checkedUrl;
    }
    
    activeWispUrl = checkedUrl;
    wispInput.value = activeWispUrl;
    localStorage.setItem('wisp_proxy_url', activeWispUrl);
    initializeWispConnection();
});

fetchBtn.addEventListener('click', () => {
    const rawInputText = queryInput.value.trim();
    if (!rawInputText) return;

    outputCanvas.innerHTML = `
        <div class="placeholder-msg">
            <p>Streaming secure HTTP packet layer over Wisp pipeline...</p>
            <small id="target-tracker-text">Preparing transport vectors...</small>
        </div>
    `;

    structuralHtmlPipelineBuffer = ""; 
    dispatchWispRequestPayload(rawInputText);
});

function dispatchWispRequestPayload(searchQueryText) {
    if (!wsConnection || wsConnection.readyState !== WebSocket.OPEN) {
        outputCanvas.innerHTML = `
            <div class='placeholder-msg' style='color:var(--error-red);'>
                <p>Error: Wisp socket pipeline is offline.</p>
                <small>Verify network endpoint paths or check configuration parameters.</small>
            </div>`;
        return;
    }

    const uriQueryToken = encodeURIComponent(searchQueryText);
    const domainHostString = "html.duckduckgo.com";
    const explicitNetworkPath = "/html/?q=" + uriQueryToken;
    const destinationPort = 443; 

    currentStreamToken++; 
    
    const arrayEncoder = new TextEncoder();
    const domainBytesArray = arrayEncoder.encode(domainHostString);

    // FIX: Completely isolated hardcoded string concatenation prevents triple-slash injection
    const targetTracker = document.getElementById("target-tracker-text");
    if(targetTracker) {
        targetTracker.textContent = "Query Target: https://duckduckgo.com" + searchQueryText;
    }

    // --- PACKET HEADER CONFIGURATION A: CONNECT SCHEME (0x01) ---
    const initialBufferFrame = new ArrayBuffer(1 + 4 + 2 + domainBytesArray.length);
    const primaryDataView = new DataView(initialBufferFrame);
    
    primaryDataView.setUint8(0, 0x01); 
    primaryDataView.setUint32(1, currentStreamToken, false); 
    primaryDataView.setUint16(5, destinationPort, false); 
    
    const writeConnectByteArray = new Uint8Array(initialBufferFrame);
    writeConnectByteArray.set(domainBytesArray, 7);
    
    wsConnection.send(initialBufferFrame);

    // --- PACKET HEADER CONFIGURATION B: DATA TRANSMISSION SCHEME (0x02) ---
    const rawHttpTextHeaderBlock = 
        "GET " + explicitNetworkPath + " HTTP/1.1\r\n" +
        "Host: " + domainHostString + "\r\n" +
        "User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36\r\n" +
        "Accept: text/html\r\n" +
        "Connection: close\r\n\r\n";

    const generatedHttpBytes = arrayEncoder.encode(rawHttpTextHeaderBlock);
    const payloadBufferFrame = new ArrayBuffer(1 + 4 + generatedHttpBytes.length);
    const secondaryDataView = new DataView(payloadBufferFrame);
    
    secondaryDataView.setUint8(0, 0x02); 
    secondaryDataView.setUint32(1, currentStreamToken, false); 
    
    const writePayloadByteArray = new Uint8Array(payloadBufferFrame);
    writePayloadByteArray.set(generatedHttpBytes, 5);

    setTimeout(() => {
        if (wsConnection.readyState === WebSocket.OPEN) {
            wsConnection.send(payloadBufferFrame);
            console.log("[Wisp] Stream transmission active.");
        }
    }, 60);
}

function processIncomingWispBuffer(incomingArrayBuffer) {
    const rawByteView = new Uint8Array(incomingArrayBuffer);
    if (rawByteView.length < 5) return; 

    const rawDataView = new DataView(incomingArrayBuffer);
    const responsePacketType = rawDataView.getUint8(0);
    const incomingStreamId = rawDataView.getUint32(1, false);

    if (incomingStreamId !== currentStreamToken) return; 

    if (responsePacketType === 0x02) {
        const structuralDataSlice = rawByteView.subarray(5);
        const arrayDecoder = new TextDecoder();
        structuralHtmlPipelineBuffer += arrayDecoder.decode(structuralDataSlice);
    } 
    else if (responsePacketType === 0x03) {
        console.log("[Wisp] Stream closing channel terminated cleanly.");
        executeDataParsingSequence(structuralHtmlPipelineBuffer);
    }
}

function executeDataParsingSequence(htmlRawSourcePayload) {
    outputCanvas.innerHTML = "";
    const cleanOutputDictionaryArray = [];

    const stringIndexStart = htmlRawSourcePayload.indexOf("<html");
    const operationalHtmlSegmentString = stringIndexStart !== -1 ? htmlRawSourcePayload.substring(stringIndexStart) : htmlRawSourcePayload;

    const structuralSplitBlocksArray = operationalHtmlSegmentString.split('class="result__body"');
    
    for (let indexOffset = 1; indexOffset < structuralSplitBlocksArray.length; indexOffset++) {
        const independentBlockElement = structuralSplitBlocksArray[indexOffset];

        let targetTitleText = "Target Indexed Block Element";
        const titleExtractionRegex = independentBlockElement.match(/class="result__url"[^>]*>([\s\S]*?)<\/a>/);
        if (titleExtractionRegex && titleExtractionRegex) {
            targetTitleText = titleExtractionRegex[1].replace(/<[^>]*>/g, "").trim();
        }

        let linkRedirectionUrl = "#";
        const urlExtractionRegex = independentBlockElement.match(/class="result__url"[^>]*href="([^"]+)"/);
        if (urlExtractionRegex && urlExtractionRegex) {
            linkRedirectionUrl = urlExtractionRegex[1];
            if (linkRedirectionUrl.includes("uddg=")) {
                const innerSplits = linkRedirectionUrl.split("uddg=");
                if (innerSplits && innerSplits[1]) {
                    linkRedirectionUrl = decodeURIComponent(innerSplits[1].split("&")[0]);
                }
            }
        }

        let summarySnippetText = "No descriptive information packet recovered along this stream lane.";
        const snippetExtractionRegex = independentBlockElement.match(/class="result__snippet"[^>]*>([\s\S]*?)<\/span>/) || independentBlockElement.match(/class="result__snippet"[^>]*>([\s\S]*?)<\/a>/);
        if (snippetExtractionRegex && snippetExtractionRegex) {
            summarySnippetText = snippetExtractionRegex[1].replace(/<[^>]*>/g, "").trim();
        }

        cleanOutputDictionaryArray.push({ title: targetTitleText, link: linkRedirectionUrl, description: summarySnippetText });
    }

    if (cleanOutputDictionaryArray.length === 0) {
        outputCanvas.innerHTML = `
            <div class="placeholder-msg">
                <p>No clean text metadata items extracted.</p>
                <small>The node returned a blank response page, or hit network transmission timeouts. Adjust node fields.</small>
            </div>
        `;
        return;
    }

    cleanOutputDictionaryArray.forEach(cardMetaElement => {
        const structuralDivContainer = document.createElement('div');
        structuralDivContainer.className = 'result-card';
        structuralDivContainer.innerHTML = `
            <h3>${sanitizePipelineStrings(cardMetaElement.title)}</h3>
            <a href="${sanitizePipelineStrings(cardMetaElement.link)}" target="_blank">${sanitizePipelineStrings(cardMetaElement.link)}</a>
            <p>${sanitizePipelineStrings(cardMetaElement.description)}</p>
        `;
        outputCanvas.appendChild(structuralDivContainer);
    });
}

function sanitizePipelineStrings(dirtyInputStringText) {
    if (!dirtyInputStringText) return "";
    return dirtyInputStringText
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

initializeWispConnection();