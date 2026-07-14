/**
 * Test Browser Dashboard - Core Client Execution Engine
 * Architecture: Serverless Gateway Matrix (Anti-Crash Version)
 */

const FALLBACK_NODE = "wss://anura.pro";
let activeWispUrl = localStorage.getItem('wisp_proxy_url') || FALLBACK_NODE;
let wsConnection = null;

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

    statusBadge.textContent = "CONNECTING GATEWAY...";
    statusBadge.style.color = "var(--text-muted)";

    wsConnection = new WebSocket(activeWispUrl);
    wsConnection.binaryType = "arraybuffer";

    wsConnection.onopen = () => {
        const validationBuffer = new Uint8Array(2);
        validationBuffer[0] = 0x01;
        validationBuffer[1] = 0x00;
        wsConnection.send(validationBuffer.buffer);

        statusBadge.textContent = `ONLINE: ${activeWispUrl}`;
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
}

connectBtn.addEventListener('click', () => {
    let checkedUrl = wispInput.value.trim();
    if (!checkedUrl) return;
    if (!checkedUrl.startsWith("ws://") && !checkedUrl.startsWith("wss://")) {
        checkedUrl = "wss://" + checkedUrl;
    }
    activeWispUrl = checkedUrl;
    localStorage.setItem('wisp_proxy_url', activeWispUrl);
    initializeWispConnection();
});

fetchBtn.addEventListener('click', async () => {
    const rawInputText = queryInput.value.trim();
    if (!rawInputText) return;

    outputCanvas.innerHTML = `
        <div class="placeholder-msg">
            <p>Streaming secure HTTP packet layer over Scramjet Proxy...</p>
            <small>Routing Endpoint: /api/proxy?q=${encodeURIComponent(rawInputText)}</small>
        </div>
    `;

    try {
        // Fetch HTML via our Vercel Serverless Scramjet Interceptor
        const response = await fetch(`/api/proxy?q=${encodeURIComponent(rawInputText)}`);
        if (!response.ok) throw new Error("Network channel blocked by node context.");
        
        const htmlData = await response.text();
        executeDataParsingSequence(htmlData);
    } catch (err) {
        outputCanvas.innerHTML = `
            <div class='placeholder-msg' style='color:var(--error-red);'>
                <p>Error: Connection terminated by destination endpoint.</p>
                <small>${err.message}</small>
            </div>`;
    }
});

function executeDataParsingSequence(htmlRawSourcePayload) {
    outputCanvas.innerHTML = "";
    const cleanOutputDictionaryArray = [];

    const stringIndexStart = htmlRawSourcePayload.indexOf("<html");
    const operationalHtmlSegmentString = stringIndexStart !== -1 ? htmlRawSourcePayload.substring(stringIndexStart) : htmlRawSourcePayload;

    // Splitting precisely on modern DuckDuckGo class bounds
    const structuralSplitBlocksArray = operationalHtmlSegmentString.split('class="result__body"');
    
    for (let indexOffset = 1; indexOffset < structuralSplitBlocksArray.length; indexOffset++) {
        const independentBlockElement = structuralSplitBlocksArray[indexOffset];

        let targetTitleText = "Target Indexed Block Element";
        const titleExtractionRegex = independentBlockElement.match(/class="result__url"[^>]*>([\s\S]*?)<\/a>/);
        if (titleExtractionRegex && titleExtractionRegex[1]) {
            targetTitleText = titleExtractionRegex[1].replace(/<[^>]*>/g, "").trim();
        }

        let linkRedirectionUrl = "#";
        const urlExtractionRegex = independentBlockElement.match(/class="result__url"[^>]*href="([^"]+)"/);
        if (urlExtractionRegex && urlExtractionRegex[1]) {
            linkRedirectionUrl = urlExtractionRegex[1];
            if (linkRedirectionUrl.includes("uddg=")) {
                const innerSplits = linkRedirectionUrl.split("uddg=");
                if (innerSplits[1]) {
                    linkRedirectionUrl = decodeURIComponent(innerSplits[1].split("&")[0]);
                }
            }
        }

        let summarySnippetText = "No descriptive information packet recovered along this stream lane.";
        const snippetExtractionRegex = independentBlockElement.match(/class="result__snippet"[^>]*>([\s\S]*?)<\/span>/) || independentBlockElement.match(/class="result__snippet"[^>]*>([\s\S]*?)<\/a>/);
        if (snippetExtractionRegex && snippetExtractionRegex[1]) {
            summarySnippetText = snippetExtractionRegex[1].replace(/<[^>]*>/g, "").trim();
        }

        cleanOutputDictionaryArray.push({ title: targetTitleText, link: linkRedirectionUrl, description: summarySnippetText });
    }

    if (cleanOutputDictionaryArray.length === 0) {
        outputCanvas.innerHTML = `
            <div class="placeholder-msg">
                <p>No clean text metadata items extracted.</p>
                <small>The node returned a structured captcha protection page. Try clearing your browser cookies.</small>
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
