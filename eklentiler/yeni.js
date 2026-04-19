// ============================================================
// NUVIO PROVIDER: HDFilmCehennemi
// VER: 3.3.0-FINAL (Parse Safety & Global Compatibility)
// ============================================================

const manifest = {
    id: 'org.nuvio.hdfc.precision',
    version: '3.3.0',
    name: 'HDFC Precision',
    resources: ['stream'],
    types: ['movie', 'series'],
    idPrefixes: ['tt', '1', '2', '3', '4', '5', '6', '7', '8', '9']
};

const CONFIG = {
    domain: 'https://www.hdfilmcehennemi.nl',
    embed: 'https://hdfilmcehennemi.mobi',
    tmdbBase: 'https://api.themoviedb.org/3/movie/',
    tmdbSuffix: '?language=tr-TR&api_key=4ef0d7355d9ffb5151e987764708ce96',
    headers: { 
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'X-Requested-With': 'fetch',
        'Accept': 'application/json, text/plain, */*'
    }
};

async function getStreams(type, id, meta) {
    console.error(`[HDFC-DUMP] T:${type} | I:${id}`);

    let searchTitle = "";

    // 1. TMDB RECOVERY (HDFC-DEBUG: Çığlık 7 yakalandı!)
    const tmdbId = (!isNaN(type)) ? type : ((!isNaN(id)) ? id : null);
    if (tmdbId) {
        try {
            const tRes = await fetch(CONFIG.tmdbBase + tmdbId + CONFIG.tmdbSuffix);
            const tData = await tRes.json();
            searchTitle = tData.title || tData.original_title;
        } catch (e) { console.error(`[HDFC-TMDB-ERR] ${e.message}`); }
    }

    if (!searchTitle) searchTitle = (meta && (meta.name || meta.title)) ? (meta.name || meta.title) : "";
    if (!searchTitle) return [];

    try {
        // --- 2. ARAMA (GÜVENLİ PARSE) ---
        const sRes = await fetch(`${CONFIG.domain}/search?q=${encodeURIComponent(searchTitle)}`, { 
            headers: Object.assign({}, CONFIG.headers, { 'Referer': CONFIG.domain + '/' }) 
        });
        
        const sRaw = await sRes.text();
        let results = [];

        // Eğer yanıt JSON ise ayrıştır, değilse ham HTML içinde link ara
        if (sRaw.trim().startsWith('{') || sRaw.trim().startsWith('[')) {
            try {
                const sData = JSON.parse(sRaw);
                results = sData.results || [];
            } catch(e) { console.error("[HDFC-JSON-ERR] JSON Parse edilemedi."); }
        }

        let pageUrl = "";
        if (results.length > 0) {
            const match = results.find(html => html.toLowerCase().includes(searchTitle.toLowerCase()));
            if (match) pageUrl = match.replace(/\\\//g, '/').match(/href="([^"]+)"/)?.[1];
        } else {
            // Eğer JSON gelmediyse doğrudan HTML içinde ara (B Planı)
            const fallbackMatch = sRaw.match(new RegExp(`href="([^"]+)"[^>]*>[^<]*${searchTitle}`, 'i'));
            pageUrl = fallbackMatch ? fallbackMatch[1] : "";
        }

        if (!pageUrl) {
            console.error(`[HDFC-ERROR] Sayfa linki bulunamadı: ${searchTitle}`);
            return [];
        }

        // --- 3. SAYFA & EMBED ---
        const pRes = await fetch(pageUrl, { headers: CONFIG.headers });
        let pHtml = await pRes.text();
        
        if (pHtml.trim().startsWith('{')) {
            try { pHtml = JSON.parse(pHtml).html || pHtml; } catch(e) {}
        }
        pHtml = pHtml.replace(/\\\//g, '/');

        const embedMatch = pHtml.match(/data-src="(https:\/\/hdfilmcehennemi\.mobi\/video\/embed\/[^"]+)"/i);
        if (!embedMatch) return [];

        const embedUrl = embedMatch[1];

        // --- 4. M3U8 (REFERER ŞART) ---
        const eRes = await fetch(embedUrl, { headers: { 'Referer': pageUrl } });
        const eHtml = await eRes.text();
        const m3u8 = eHtml.match(/["'](https?:\/\/[^"']+(?:master\.txt|\.m3u8)[^"']*)["']/i)?.[1];

        if (!m3u8) return [];

        return [{
            name: "HDFC",
            title: "1080p - HLS",
            url: m3u8,
            behaviorHints: {
                proxyHeaders: {
                    "Referer": CONFIG.embed + "/",
                    "Origin": CONFIG.embed,
                    "User-Agent": "Mozilla/5.0"
                }
            }
        }];

    } catch (e) {
        console.error(`[HDFC-CRITICAL] Hata: ${e.message}`);
        return [];
    }
}

if (typeof module !== 'undefined') module.exports = { manifest, getStreams };
