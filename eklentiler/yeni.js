// ============================================================
//  NUVIO PROVIDER: HDFilmCehennemi (Error-First Logic)
// ============================================================

const manifest = {
    id: 'com.nuvio.hdfc',
    version: '1.2.0',
    name: 'HDFC Precision',
    resources: ['stream'],
    types: ['movie', 'series'],
    idPrefixes: ['tt']
};

const PROVIDER_CONFIG = {
    domain: 'https://www.hdfilmcehennemi.nl',
    embed: 'https://hdfilmcehennemi.mobi',
    // Header seti Nuvio'nun fetch yapısına göre optimize edildi
    headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'X-Requested-With': 'fetch',
        'Accept': 'application/json'
    }
};

async function getStreams(type, id) {
    try {
        // 1. ARAMA AŞAMASI
        const searchUrl = `${PROVIDER_CONFIG.domain}/search?q=${id}`;
        const response = await fetch(searchUrl, { 
            headers: Object.assign({}, PROVIDER_CONFIG.headers, { 'Referer': PROVIDER_CONFIG.domain + '/' })
        });

        if (!response.ok) {
            console.error(`[HDFC-ERROR] Search Fetch Failed! Status: ${response.status} URL: ${searchUrl}`);
            return [];
        }

        const data = await response.json();
        
        // Nokta atışı eşleşme: ID veya Tam İsim kontrolü
        const target = (data.results || []).find(html => {
            return html.includes(id); // Notlarındaki "Precision Match" mantığı
        });

        if (!target) {
            console.error(`[HDFC-ERROR] No exact match found for ID: ${id} in results.`);
            return [];
        }

        // 2. IFRAME/EMBED AYIKLAMA
        const pageHref = target.match(/href="([^"]+)"/)?.[1];
        if (!pageHref) {
            console.error(`[HDFC-ERROR] Could not extract href from target HTML. Target: ${target.substring(0, 100)}`);
            return [];
        }

        const pageRes = await fetch(pageHref, { headers: PROVIDER_CONFIG.headers });
        const pageHtml = await pageRes.text();
        
        const embedUrl = pageHtml.match(/data-src="(https:\/\/hdfilmcehennemi\.mobi\/video\/embed\/[^"]+)"/i)?.[1];
        
        if (!embedUrl) {
            console.error(`[HDFC-ERROR] Embed URL not found on page: ${pageHref}. Possible Cloudflare or Layout change.`);
            return [];
        }

        // 3. STREAM AŞAMASI (M3U8)
        const embedRes = await fetch(embedUrl, { 
            headers: { 'Referer': pageHref, 'User-Agent': PROVIDER_CONFIG.headers['User-Agent'] }
        });
        const embedHtml = await embedRes.text();
        
        const m3u8 = embedHtml.match(/["'](https?:\/\/[^"']+(?:master\.txt|\.m3u8)[^"']*)["']/i)?.[1];

        if (!m3u8) {
            console.error(`[HDFC-ERROR] Final M3U8 Link not found in embed source. EmbedURL: ${embedUrl}`);
            return [];
        }

        return [{
            name: "HDFC",
            title: "HD-HLS Stream",
            url: m3u8,
            behaviorHints: {
                proxyHeaders: { "Referer": PROVIDER_CONFIG.embed + "/" }
            }
        }];

    } catch (err) {
        // Tüm beklenmedik çökmeler için ana hata logu
        console.error(`[HDFC-CRITICAL] Stack: ${err.stack} | Message: ${err.message}`);
        return [];
    }
}

// Nuvio'nun beklediği export
if (typeof module !== 'undefined') module.exports = { manifest, getStreams };
