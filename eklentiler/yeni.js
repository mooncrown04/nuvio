// ============================================================
// NUVIO PROVIDER: HDFilmCehennemi
// VER: 2.8.0-FIX (ExoPlayer 404 & Referer Fix)
// ============================================================

const manifest = {
    id: 'org.nuvio.hdfc.precision',
    version: '2.8.0',
    name: 'HDFC Precision',
    resources: ['stream'],
    types: ['movie', 'series'],
    idPrefixes: ['tt']
};

const CONFIG = {
    domain: 'https://www.hdfilmcehennemi.nl',
    embedDomain: 'https://hdfilmcehennemi.mobi',
    headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'X-Requested-With': 'fetch'
    }
};

async function getStreams(type, id) {
    // Loglarda gördüğümüz ID: tv veya ID: movie karmaşasını engellemek için kontrol
    if (id === 'tv' || id === 'movie') {
        console.error(`[HDFC-ERROR] Geçersiz ID parametresi geldi: ${id}. Arama yapılmadı.`);
        return [];
    }

    console.error(`[HDFC-DEBUG] İşlem Başladı -> ID: ${id}`);

    try {
        // --- 1. ARAMA ADIMI ---
        const searchUrl = `${CONFIG.domain}/search?q=${encodeURIComponent(id)}`;
        const sRes = await fetch(searchUrl, { 
            headers: Object.assign({}, CONFIG.headers, { 'Referer': CONFIG.domain + '/' }) 
        });

        const sRaw = await sRes.text();
        const sData = JSON.parse(sRaw);
        const results = sData.results || [];
        
        // Hassas eşleşme: Gelen HTML bloğunun içinde aranan isim var mı?
        const match = results.find(html => html.toLowerCase().includes(id.toLowerCase()));
        if (!match) {
            console.error(`[HDFC-ERROR] Hassas eşleşme (ID: ${id}) bulunamadı.`);
            return [];
        }

        const pageUrl = match.replace(/\\\//g, '/').match(/href="([^"]+)"/)?.[1];
        if (!pageUrl) return [];

        // --- 2. SAYFA VE EMBED ADIMI ---
        const pRes = await fetch(pageUrl, { headers: CONFIG.headers });
        let pHtml = await pRes.text();
        
        if (pHtml.trim().startsWith('{')) pHtml = JSON.parse(pHtml).html || pHtml;
        pHtml = pHtml.replace(/\\\//g, '/');

        const embedMatch = pHtml.match(/data-src="(https:\/\/hdfilmcehennemi\.mobi\/video\/embed\/[^"]+)"/i);
        if (!embedMatch) {
            console.error(`[HDFC-ERROR] Embed bulunamadı! HTML Kesit: ${pHtml.substring(0, 500)}`);
            return [];
        }

        const embedUrl = embedMatch[1];
        console.error(`[HDFC-DEBUG] Embed URL Yakalandı: ${embedUrl}`);

        // --- 3. M3U8 ADIMI ---
        const eRes = await fetch(embedUrl, { headers: { 'Referer': pageUrl } });
        const eHtml = await eRes.text();
        
        const m3u8 = eHtml.match(/["'](https?:\/\/[^"']+(?:master\.txt|\.m3u8)[^"']*)["']/i)?.[1];

        if (!m3u8) {
            console.error(`[HDFC-ERROR] M3U8 Linki Yok! Embed HTML Kesit: ${eHtml.substring(0, 500)}`);
            return [];
        }

        // --- 4. PLAYER İÇİN DÖNÜŞ (ExoPlayer Fix) ---
        return [{
            name: "HDFC",
            title: "1080p - HLS",
            url: m3u8,
            behaviorHints: {
                notWebReady: false,
                proxyHeaders: {
                    // ExoPlayer'ın 404 almaması için bu başlıklar KRİTİK
                    "Referer": CONFIG.embedDomain + "/",
                    "Origin": CONFIG.embedDomain,
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
