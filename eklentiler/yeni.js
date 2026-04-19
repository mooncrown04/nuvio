// ============================================================
// NUVIO PROVIDER: HDFilmCehennemi
// VER: 3.0.0-ADAPTIVE (Arg-Dump & Parameter Recovery)
// ============================================================

const manifest = {
    id: 'org.nuvio.hdfc.precision',
    version: '3.0.0',
    name: 'HDFC Precision',
    resources: ['stream'],
    types: ['movie', 'series'],
    idPrefixes: ['tt', 'hdfc']
};

const CONFIG = {
    domain: 'https://www.hdfilmcehennemi.nl',
    embed: 'https://hdfilmcehennemi.mobi',
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36', 'X-Requested-With': 'fetch' }
};

async function getStreams(type, id, meta) {
    // --- 1. ARGÜMAN DÖKÜMÜ (Hata tespiti için şart) ---
    // Loglarda "movie" gelmesinin sebebini anlamak için gelen her şeyi basıyoruz
    console.error(`[HDFC-DUMP] Args -> type: ${JSON.stringify(type)}, id: ${JSON.stringify(id)}, meta: ${JSON.stringify(meta)}`);

    let searchTitle = "";

    // 2. PARAMETRE KURTARMA MANTIĞI
    if (typeof id === 'string' && id !== 'movie' && id !== 'tv') {
        searchTitle = id;
    } else if (meta && (meta.name || meta.title)) {
        searchTitle = meta.name || meta.title;
    } else if (typeof type === 'object' && (type.name || type.title)) {
        // Nuvio bazen ilk parametrede objeyi gönderir
        searchTitle = type.name || type.title;
    }

    if (!searchTitle || searchTitle.length < 2) {
        console.error(`[HDFC-ERROR] Arama için geçerli bir başlık bulunamadı! İşlem durduruldu.`);
        return [];
    }

    console.error(`[HDFC-DEBUG] Arama Başlatılıyor: ${searchTitle}`);

    try {
        // --- 3. FETCH VE MATCH (Önceki kararlı yapı) ---
        const sRes = await fetch(`${CONFIG.domain}/search?q=${encodeURIComponent(searchTitle)}`, { 
            headers: Object.assign({}, CONFIG.headers, { 'Referer': CONFIG.domain + '/' }) 
        });
        const sData = await sRes.json();
        const results = sData.results || [];
        
        const match = results.find(html => html.toLowerCase().includes(searchTitle.toLowerCase()));
        if (!match) {
            console.error(`[HDFC-ERROR] Hassas eşleşme yok: ${searchTitle}. Mevcut: ${results.length}`);
            return [];
        }

        const pageUrl = match.replace(/\\\//g, '/').match(/href="([^"]+)"/)?.[1];
        if (!pageUrl) return [];

        // --- 4. EMBED VE M3U8 ---
        const pRes = await fetch(pageUrl, { headers: CONFIG.headers });
        let pHtml = await pRes.text();
        if (pHtml.trim().startsWith('{')) pHtml = JSON.parse(pHtml).html || pHtml;
        
        const embedUrl = pHtml.replace(/\\\//g, '/').match(/data-src="(https:\/\/hdfilmcehennemi\.mobi\/video\/embed\/[^"]+)"/i)?.[1];
        if (!embedUrl) {
            console.error(`[HDFC-ERROR] Embed bulunamadı. Sayfa HTML: ${pHtml.substring(0, 500)}`);
            return [];
        }

        const eRes = await fetch(embedUrl, { headers: { 'Referer': pageUrl } });
        const eHtml = await eRes.text();
        const m3u8 = eHtml.match(/["'](https?:\/\/[^"']+(?:master\.txt|\.m3u8)[^"']*)["']/i)?.[1];

        if (!m3u8) {
            console.error(`[HDFC-ERROR] M3U8 Yok. Embed HTML: ${eHtml.substring(0, 500)}`);
            return [];
        }

        return [{
            name: "HDFC",
            title: "1080p - HLS",
            url: m3u8,
            behaviorHints: {
                proxyHeaders: {
                    "Referer": CONFIG.embed + "/",
                    "Origin": CONFIG.embed,
                    "User-Agent": CONFIG.headers['User-Agent']
                }
            }
        }];

    } catch (e) {
        console.error(`[HDFC-CRITICAL] Hata: ${e.message}`);
        return [];
    }
}

if (typeof module !== 'undefined') module.exports = { manifest, getStreams };
