// ============================================================
// NUVIO PROVIDER: HDFilmCehennemi
// VER: 2.6.0-DEBUG (Sıralı İşlem & Ham Yanıt Loglama)
// ============================================================

const manifest = {
    id: 'org.nuvio.hdfc.precision',
    version: '2.6.0',
    name: 'HDFC Precision',
    resources: ['stream'],
    types: ['movie', 'series'],
    idPrefixes: ['tt']
};

const CONFIG = {
    domain: 'https://www.hdfilmcehennemi.nl',
    headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'X-Requested-With': 'fetch'
    }
};

async function getStreams(type, id) {
    console.error(`[HDFC-DEBUG] İstek Başladı -> Type: ${type}, ID: ${id}`);

    try {
        // --- 1. ARAMA ADIMI ---
        const searchUrl = `${CONFIG.domain}/search?q=${encodeURIComponent(id)}`;
        const sRes = await fetch(searchUrl, { 
            headers: Object.assign({}, CONFIG.headers, { 'Referer': CONFIG.domain + '/' }) 
        });

        if (!sRes.ok) {
            const rawSearch = await sRes.text();
            console.error(`[HDFC-ERROR] Search HTTP ${sRes.status}. HAM YANIT: ${rawSearch.substring(0, 500)}`);
            return [];
        }

        const sData = await sRes.json();
        const results = sData.results || [];
        
        // Hassas Eşleşme (Notlarındaki mantık)
        const match = results.find(html => html.includes(id));
        if (!match) {
            console.error(`[HDFC-ERROR] Hassas eşleşme (ID: ${id}) bulunamadı. Gelen sonuç sayısı: ${results.length}`);
            return [];
        }

        const pageUrl = match.match(/href="([^"]+)"/)?.[1];
        if (!pageUrl) {
            console.error(`[HDFC-ERROR] Sayfa linki parse edilemedi. Ham HTML: ${match}`);
            return [];
        }

        // --- 2. SAYFA İÇERİĞİ VE EMBED ADIMI ---
        const pRes = await fetch(pageUrl, { headers: CONFIG.headers });
        const pHtml = await pRes.text();

        // Loglarda gördüğümüz "Embed URL not found" hatası için burayı genişlettim
        const embedMatch = pHtml.match(/data-src="(https:\/\/hdfilmcehennemi\.mobi\/video\/embed\/[^"]+)"/i);
        
        if (!embedMatch) {
            // Hata anında sayfanın bir kısmını bas ki layout mu değişmiş görelim
            console.error(`[HDFC-ERROR] Embed bulunamadı! Sayfa (ilk 1000 ch): ${pHtml.substring(0, 1000)}`);
            return [];
        }

        const embedUrl = embedMatch[1];
        console.error(`[HDFC-DEBUG] Embed Bulundu: ${embedUrl}`);

        // --- 3. M3U8 AYIKLAMA ---
        const eRes = await fetch(embedUrl, { headers: { 'Referer': pageUrl } });
        const eHtml = await eRes.text();
        
        const m3u8Match = eHtml.match(/["'](https?:\/\/[^"']+(?:master\.txt|\.m3u8)[^"']*)["']/i);

        if (!m3u8Match) {
            console.error(`[HDFC-ERROR] M3U8 bulunamadı! Embed Kaynak: ${eHtml.substring(0, 800)}`);
            return [];
        }

        return [{
            name: "HDFC",
            title: "1080p - HLS",
            url: m3u8Match[1],
            behaviorHints: {
                proxyHeaders: { 
                    "Referer": "https://hdfilmcehennemi.mobi/",
                    "Origin": "https://hdfilmcehennemi.mobi"
                }
            }
        }];

    } catch (e) {
        console.error(`[HDFC-CRITICAL] Beklenmedik Hata: ${e.message}\nStack: ${e.stack}`);
        return [];
    }
}

if (typeof module !== 'undefined') module.exports = { manifest, getStreams };
