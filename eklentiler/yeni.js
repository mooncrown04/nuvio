/**
 * Nuvio Blacklist-Bypass - izle.plus (V85)
 */

var config = {
    name: "izle.plus (V85-Final)",
    baseUrl: "https://izle.plus",
    proxyUrl: "https://goproxy.watchbuddy.tv/proxy/video"
};

async function getStreams(input) {
    try {
        console.error("[Kekik-Log] 1. Operasyon Başladı");
        let query = (typeof input === 'object') ? (input.title || input.name) : input;
        if (!query || /^\d+$/.test(query)) query = "Ajan Zeta";

        var browserUA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

        // 1. ARAMA
        console.error(`[Kekik-Log] 2. Arama Terimi: ${query}`);
        let sRes = await fetch(`${config.baseUrl}/?s=${encodeURIComponent(query)}`, { headers: { 'User-Agent': browserUA } });
        let sHtml = await sRes.text();

        // 2. LİNK AYIKLAMA (Sadece film sayfaları - wp-json vb. hariç)
        // Regex: izle.plus/ den sonra wp- ile başlamayan ve en az bir alt dizini olan linkleri al
        let matches = sHtml.match(/href="(https?:\/\/izle\.plus\/(?!wp-)[^"\/]+\/)"/gi);
        let movieUrl = "";

        if (matches) {
            // İlk geçerli film linkini seç (wp-json içermeyeni)
            movieUrl = matches.map(m => m.match(/href="([^"]+)"/)[1])
                              .find(l => !l.includes("wp-json") && !l.includes("category") && !l.includes("tag") && l.length > config.baseUrl.length + 2);
        }

        if (!movieUrl) {
            console.error("[Kekik-Log] 3. HATA: Gerçek film sayfası bulunamadı.");
            return [];
        }
        console.error("[Kekik-Log] 4. Hedef Sayfa: " + movieUrl);

        // 3. FİLM SAYFASINA GİT
        let mRes = await fetch(movieUrl, { headers: { 'User-Agent': browserUA, 'Referer': config.baseUrl } });
        let mHtml = await mRes.text();

        // 4. HOTSTREAM ID BULUCU (Iframe veya script içinden)
        let videoId = (mHtml.match(/hotstream\.club\/(?:embed|v|download)\/([a-zA-Z0-9_-]+)/i) || [])[1];
        
        if (!videoId) {
            // Eğer doğrudan link yoksa, iframe src'den yakala
            let ifr = mHtml.match(/<iframe[^>]+src="([^"]+hotstream\.club[^"]+)"/i);
            if (ifr) videoId = ifr[1].split('/').pop();
        }

        if (!videoId) {
            console.error("[Kekik-Log] 5. HATA: Hotstream ID bulunamadı.");
            return [];
        }
        console.error("[Kekik-Log] 6. Hotstream ID: " + videoId);

        // 5. EMBED SAYFASINDAN LİNK ÇEK
        let eRes = await fetch(`https://hotstream.club/embed/${videoId}`, { 
            headers: { 'User-Agent': browserUA, 'Referer': movieUrl } 
        });
        let eHtml = await eRes.text();

        // m3u8 avı
        let streamUrl = (eHtml.match(/["'](https?:\/\/[^"']+\.m3u8[^"']*)["']/i) || [])[1];

        if (streamUrl) {
            console.error("[Kekik-Log] 7. BAŞARI: " + streamUrl);
            return [{
                name: "HotStream (V85-Auto)",
                url: `${config.proxyUrl}?url=${encodeURIComponent(streamUrl)}&referer=${encodeURIComponent("https://hotstream.club/")}&ignore_ssl=true`,
                headers: { 'User-Agent': browserUA, 'Referer': "https://hotstream.club/" }
            }];
        }

        console.error("[Kekik-Log] 8. HATA: m3u8 bulunamadı.");
        return [];

    } catch (e) {
        console.error("[Kekik-Log] KRİTİK HATA: " + e.toString());
        return [];
    }
}

globalThis.getStreams = getStreams;
