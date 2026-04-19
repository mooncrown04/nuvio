// ============================================================
// NUVIO PROVIDER: HDFilmCehennemi
// VER: 2.7.0-FIX (JSON-HTML Response Handling)
// ============================================================

const manifest = {
    id: 'org.nuvio.hdfc.precision',
    version: '2.7.0',
    name: 'HDFC Precision',
    resources: ['stream'],
    types: ['movie', 'series'],
    idPrefixes: ['tt']
};

const CONFIG = {
    domain: 'https://www.hdfilmcehennemi.nl',
    headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'X-Requested-With': 'fetch',
        'Accept': 'application/json, text/plain, */*'
    }
};

async function getStreams(type, id) {
    console.error(`[HDFC-DEBUG] İşlem Başladı -> Type: ${type}, ID: ${id}`);

    try {
        // --- 1. ARAMA ADIMI ---
        const searchUrl = `${CONFIG.domain}/search?q=${encodeURIComponent(id)}`;
        const sRes = await fetch(searchUrl, { 
            headers: Object.assign({}, CONFIG.headers, { 'Referer': CONFIG.domain + '/' }) 
        });

        const sRaw = await sRes.text();
        let sData;
        try {
            sData = JSON.parse(sRaw);
        } catch(e) {
            console.error(`[HDFC-ERROR] Search yanıtı JSON değil! Ham Yanıt: ${sRaw.substring(0, 300)}`);
            return [];
        }

        const results = sData.results || [];
        // Hassas eşleşme: Gelen HTML bloğunun içinde aranan ID/İsim var mı?
        const match = results.find(html => html.toLowerCase().includes(id.toLowerCase()));
        
        if (!match) {
            console.error(`[HDFC-ERROR] Hassas eşleşme (ID: ${id}) bulunamadı. Mevcut sonuçlar: ${results.length}`);
            return [];
        }

        // JSON içinden gelen kaçış karakterlerini temizle
        const cleanMatch = match.replace(/\\\//g, '/');
        const pageUrl = cleanMatch.match(/href="([^"]+)"/)?.[1];

        if (!pageUrl) {
            console.error(`[HDFC-ERROR] Sayfa linki bulunamadı. Temizlenmiş HTML: ${cleanMatch}`);
            return [];
        }

        // --- 2. SAYFA VE EMBED ADIMI ---
        const pRes = await fetch(pageUrl, { headers: CONFIG.headers });
        const pRaw = await pRes.text();
        
        // Siteden gelen yanıt JSON içindeki HTML ise onu ayıkla
        let pageHtml = pRaw;
        if (pRaw.trim().startsWith('{')) {
            try {
                pageHtml = JSON.parse(pRaw).html || pRaw;
            } catch(e) {}
        }

        // Kaçış karakterlerini temizle (Regex'in çalışması için kritik)
        pageHtml = pageHtml.replace(/\\\//g, '/');

        const embedMatch = pageHtml.match(/data-src="(https:\/\/hdfilmcehennemi\.mobi\/video\/embed\/[^"]+)"/i);
        
        if (!embedMatch) {
            console.error(`[HDFC-ERROR] Embed bulunamadı! Ayıklanan HTML: ${pageHtml.substring(0, 800)}`);
            return [];
        }

        const embedUrl = embedMatch[1];
        console.error(`[HDFC-DEBUG] Embed URL: ${embedUrl}`);

        // --- 3. M3U8 ADIMI ---
        const eRes = await fetch(embedUrl, { headers: { 'Referer': pageUrl } });
        const eHtml = await eRes.text();
        
        const m3u8 = eHtml.match(/["'](https?:\/\/[^"']+(?:master\.txt|\.m3u8)[^"']*)["']/i)?.[1];

        if (!m3u8) {
            console.error(`[HDFC-ERROR] M3U8 yok! Embed HTML: ${eHtml.substring(0, 500)}`);
            return [];
        }

        return [{
            name: "HDFC",
            title: "HLS - HD",
            url: m3u8,
            behaviorHints: {
                proxyHeaders: { "Referer": "https://hdfilmcehennemi.mobi/" }
            }
        }];

    } catch (e) {
        console.error(`[HDFC-CRITICAL] Hata: ${e.message}\n${e.stack}`);
        return [];
    }
}

if (typeof module !== 'undefined') module.exports = { manifest, getStreams };
