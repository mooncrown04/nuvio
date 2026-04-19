// ============================================================
// NUVIO PROVIDER: HDFilmCehennemi
// VER: 2.9.0-ULTRA (Parameter Logic & Header Precision)
// ============================================================

const manifest = {
    id: 'org.nuvio.hdfc.precision',
    version: '2.9.0',
    name: 'HDFC Precision',
    resources: ['stream'],
    types: ['movie', 'series'],
    idPrefixes: ['tt', 'hdfc'] // Hem IMDB hem yerel ID desteği
};

const CONFIG = {
    domain: 'https://www.hdfilmcehennemi.nl',
    embed: 'https://hdfilmcehennemi.mobi',
    headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'X-Requested-With': 'fetch'
    }
};

async function getStreams(type, id, meta = {}) {
    // 1. PARAMETRE DÜZELTME MANTIĞI
    let searchTitle = id;
    
    // Loglarda gördüğümüz "movie/tv" hatası için kontrol
    if (id === 'movie' || id === 'tv' || id === 'series') {
        // Eğer meta nesnesinde başlık varsa onu kullan, yoksa hata bas
        searchTitle = meta.name || meta.title || "";
        if (!searchTitle) {
            console.error(`[HDFC-ERROR] Kritik Hata: Geçersiz ID (${id}) ve Meta veri boş!`);
            return [];
        }
        console.error(`[HDFC-DEBUG] ID parametresi bozuk geldi, Meta'dan çekilen isim: ${searchTitle}`);
    }

    console.error(`[HDFC-DEBUG] İşlem Başlatıldı -> Başlık: ${searchTitle}`);

    try {
        // --- 2. ARAMA ---
        const searchUrl = `${CONFIG.domain}/search?q=${encodeURIComponent(searchTitle)}`;
        const sRes = await fetch(searchUrl, { 
            headers: Object.assign({}, CONFIG.headers, { 'Referer': CONFIG.domain + '/' }) 
        });

        const sData = await sRes.json();
        const results = sData.results || [];
        
        // Hassas eşleşme (Notlarındaki "Exact Match" kuralı)
        const match = results.find(html => html.toLowerCase().includes(searchTitle.toLowerCase()));
        if (!match) {
            console.error(`[HDFC-ERROR] Hassas eşleşme bulunamadı: ${searchTitle}. Gelen sonuç: ${results.length}`);
            return [];
        }

        const pageUrl = match.replace(/\\\//g, '/').match(/href="([^"]+)"/)?.[1];
        if (!pageUrl) return [];

        // --- 3. SAYFA & EMBED ---
        const pRes = await fetch(pageUrl, { headers: CONFIG.headers });
        let pHtml = await pRes.text();
        if (pHtml.trim().startsWith('{')) pHtml = JSON.parse(pHtml).html || pHtml;
        pHtml = pHtml.replace(/\\\//g, '/');

        const embedMatch = pHtml.match(/data-src="(https:\/\/hdfilmcehennemi\.mobi\/video\/embed\/[^"]+)"/i);
        if (!embedMatch) {
            console.error(`[HDFC-ERROR] Embed Bulunamadı! Sayfa HTML (ilk 500): ${pHtml.substring(0, 500)}`);
            return [];
        }

        const embedUrl = embedMatch[1];

        // --- 4. M3U8 & REFERER ---
        const eRes = await fetch(embedUrl, { headers: { 'Referer': pageUrl } });
        const eHtml = await eRes.text();
        const m3u8 = eHtml.match(/["'](https?:\/\/[^"']+(?:master\.txt|\.m3u8)[^"']*)["']/i)?.[1];

        if (!m3u8) {
            console.error(`[HDFC-ERROR] M3U8 Linki Yok! Embed HTML (ilk 500): ${eHtml.substring(0, 500)}`);
            return [];
        }

        return [{
            name: "HDFC",
            title: "Full HD - HLS",
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
        console.error(`[HDFC-CRITICAL] Çökme: ${e.message}\nStack: ${e.stack}`);
        return [];
    }
}

if (typeof module !== 'undefined') module.exports = { manifest, getStreams };
