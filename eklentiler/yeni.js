/**
 * Nuvio JW-Hunter - izle.plus (V92)
 */

var config = {
    name: "izle.plus (JW-V92)",
    baseUrl: "https://izle.plus",
    proxyUrl: "https://goproxy.watchbuddy.tv/proxy/video"
};

async function getStreams(input) {
    try {
        console.error("[Kekik-Log] 1. JW-Hunter Başlatıldı");
        let query = (typeof input === 'object') ? (input.title || input.name) : input;
        if (!query || /^\d+$/.test(query)) query = "Ajan Zeta";

        var browserUA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

        // ID ve Sayfa Bulma (Onaylı)
        let sRes = await fetch(`${config.baseUrl}/?s=${encodeURIComponent(query)}`, { headers: { 'User-Agent': browserUA } });
        let sHtml = await sRes.text();
        let movieUrl = (sHtml.match(/href="(https?:\/\/izle\.plus\/(?!wp-)[^"\/]+\/)"/i) || [])[1];
        if (!movieUrl) return [];

        let mRes = await fetch(movieUrl, { headers: { 'User-Agent': browserUA } });
        let mHtml = await mRes.text();
        let videoId = (mHtml.match(/hotstream\.club\/(?:embed|v|download)\/([a-zA-Z0-9_-]+)/i) || [])[1];
        if (!videoId) return [];

        // EMBED SAYFASI ANALİZİ
        console.error("[Kekik-Log] 2. Embed Alınıyor: " + videoId);
        let eRes = await fetch(`https://hotstream.club/embed/${videoId}`, { 
            headers: { 'User-Agent': browserUA, 'Referer': movieUrl } 
        });
        let eHtml = await eRes.text();

        // 1. STRATEJİ: JWPlayer Setup Bloğunu Doğrudan Ayıkla
        // "file":"..." veya "sources": [...] içindeki linki yakalamaya çalış
        let finalUrl = "";
        
        // m3u8 avı (Tırnak içindeki her şeyi dene)
        let links = eHtml.match(/["'](https?:\/\/[^"']+\.m3u8[^"']*)["']/gi);
        if (links) {
            finalUrl = links[0].replace(/["']/g, "").replace(/\\/g, "");
            console.error("[Kekik-Log] 3. Link Bulundu (Regex): " + finalUrl);
        }

        // 2. STRATEJİ: Eğer link hala yoksa API isteğini taklit et
        // Hotstream bazen /api/source/ID adresine POST atar
        if (!finalUrl) {
            console.error("[Kekik-Log] 4. API Deneniyor...");
            try {
                let apiRes = await fetch(`https://hotstream.club/api/source/${videoId}`, {
                    method: 'POST',
                    headers: { 'User-Agent': browserUA, 'Referer': `https://hotstream.club/embed/${videoId}`, 'X-Requested-With': 'XMLHttpRequest' }
                });
                let apiJson = await apiRes.json();
                if (apiJson.data && apiJson.data[0]) finalUrl = apiJson.data[0].file;
            } catch(e) { /* API yoksa devam */ }
        }

        if (finalUrl) {
            console.error("[Kekik-Log] 5. BİNGO: " + finalUrl);
            return [{
                name: "HotStream (JW-Hunter)",
                url: `${config.proxyUrl}?url=${encodeURIComponent(finalUrl)}&referer=${encodeURIComponent("https://hotstream.club/")}&ignore_ssl=true`,
                headers: { 'User-Agent': browserUA, 'Referer': "https://hotstream.club/" }
            }];
        }

        // Link bulunamazsa debug için sayfanın küçük bir parçasını logla
        console.error("[Kekik-Log] 6. Hata: Sayfa içeriği: " + eHtml.replace(/\s+/g, ' ').substring(0, 500));
        return [];

    } catch (e) {
        console.error("[Kekik-Log] CRASH: " + e.toString());
        return [];
    }
}

globalThis.getStreams = getStreams;
