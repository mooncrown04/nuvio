// ============================================================
// NUVIO PROVIDER: HDFilmCehennemi
// VER: 3.2.0-STABLE (TMDB Turkish Recovery & JSON Fix)
// ============================================================

const manifest = {
    id: 'org.nuvio.hdfc.precision',
    version: '3.2.0',
    name: 'HDFC Precision',
    resources: ['stream'],
    types: ['movie', 'series'],
    idPrefixes: ['tt', '1', '2', '3', '4', '5', '6', '7', '8', '9']
};

const CONFIG = {
    domain: 'https://www.hdfilmcehennemi.nl',
    embed: 'https://hdfilmcehennemi.mobi',
    // Senin paylaştığın API anahtarı ve URL yapısı
    tmdbBase: 'https://api.themoviedb.org/3/movie/',
    tmdbSuffix: '?language=tr-TR&api_key=4ef0d7355d9ffb5151e987764708ce96',
    headers: { 'User-Agent': 'Mozilla/5.0', 'X-Requested-With': 'fetch' }
};

async function getStreams(type, id, meta) {
    // Loglardaki kaymayı (Type: 1159559, ID: movie) yakalamak için döküm
    console.error(`[HDFC-DUMP] T:${type} | I:${id}`);

    let searchTitle = "";

    // 1. ADIM: TMDB ÜZERİNDEN İSİM KURTARMA
    const tmdbId = (!isNaN(type)) ? type : ((!isNaN(id)) ? id : null);

    if (tmdbId) {
        try {
            const tmdbUrl = CONFIG.tmdbBase + tmdbId + CONFIG.tmdbSuffix;
            const tRes = await fetch(tmdbUrl);
            const tData = await tRes.json();
            searchTitle = tData.title || tData.original_title;
            console.error(`[HDFC-DEBUG] TMDB'den çekilen isim: ${searchTitle}`);
        } catch (e) {
            console.error(`[HDFC-ERROR] TMDB Hatası: ${e.message}`);
        }
    }

    // Yedek: Eğer TMDB'den gelmezse meta'ya bak
    if (!searchTitle) searchTitle = (meta && (meta.name || meta.title)) ? (meta.name || meta.title) : "";

    if (!searchTitle) {
        console.error(`[HDFC-ERROR] Arama durduruldu: Başlık bulunamadı.`);
        return [];
    }

    try {
        // --- 2. HDFC ARAMA (JSON YANIT) ---
        const sRes = await fetch(`${CONFIG.domain}/search?q=${encodeURIComponent(searchTitle)}`, { 
            headers: Object.assign({}, CONFIG.headers, { 'Referer': CONFIG.domain + '/' }) 
        });
        
        const sData = await sRes.json();
        const results = sData.results || [];
        
        // Hassas Eşleşme (ID veya İsim içeren ilk HTML bloğunu yakala)
        const match = results.find(html => html.toLowerCase().includes(searchTitle.toLowerCase()));
        if (!match) {
            console.error(`[HDFC-ERROR] Sitede bulunamadı: ${searchTitle}`);
            return [];
        }

        // JSON Kaçışlarını (\/) temizle ve Linki al
        const pageUrl = match.replace(/\\\//g, '/').match(/href="([^"]+)"/)?.[1];
        if (!pageUrl) return [];

        // --- 3. EMBED AYIKLAMA ---
        const pRes = await fetch(pageUrl, { headers: CONFIG.headers });
        let pHtml = await pRes.text();
        
        // Sayfa JSON içindeyse ayıkla
        if (pHtml.trim().startsWith('{')) pHtml = JSON.parse(pHtml).html || pHtml;
        pHtml = pHtml.replace(/\\\//g, '/');

        const embedUrl = pHtml.match(/data-src="(https:\/\/hdfilmcehennemi\.mobi\/video\/embed\/[^"]+)"/i)?.[1];
        if (!embedUrl) {
            console.error(`[HDFC-ERROR] Embed Bulunamadı! Kesit: ${pHtml.substring(0, 400)}`);
            return [];
        }

        // --- 4. M3U8 VE REFERER FIX ---
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
        console.error(`[HDFC-CRITICAL] ${e.message}`);
        return [];
    }
}

if (typeof module !== 'undefined') module.exports = { manifest, getStreams };
