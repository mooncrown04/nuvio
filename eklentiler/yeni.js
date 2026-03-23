/**
 * Nuvio Diagnostic Scraper - V52 (Verbose Logging)
 */

var config = {
    name: "Kekik-Diagnostic",
    proxyUrl: "https://goproxy.watchbuddy.tv/proxy/video",
    testUrl: "https://hotstream.club/v/wNXSyyQMhUeLa5Z" // Test kimliği
};

async function getStreams(input) {
    let debugInfo = "";
    try {
        const deviceUA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36";
        
        // --- ADIM 1: Link Canlı mı? (Sertifika Kontrolü) ---
        try {
            let testRes = await fetch(config.testUrl, { 
                method: 'HEAD', 
                headers: { 'User-Agent': deviceUA } 
            });
            debugInfo += `| Status: ${testRes.status} `;
        } catch (e) {
            debugInfo += `| SSL_ERR: ${e.message.substring(0,15)} `;
        }

        // --- ADIM 2: Proxy Yanıt Veriyor mu? ---
        const finalUrl = `${config.proxyUrl}?url=${encodeURIComponent(config.testUrl)}&referer=${encodeURIComponent("https://hotstream.club/")}`;
        
        return [{
            name: `[LOGS] ${debugInfo} | HotStream`,
            url: finalUrl,
            headers: {
                'User-Agent': deviceUA,
                'Referer': "https://hotstream.club/",
                'X-Debug-Mode': 'true' // Bazı proxyler bunu görünce daha fazla log basar
            }
        }];

    } catch (e) {
        return [{ name: "CRITICAL_SCRAPER_ERROR", url: "" }];
    }
}

globalThis.getStreams = getStreams;
