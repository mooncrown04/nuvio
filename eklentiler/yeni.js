/**
 * Nuvio Title-First - izle.plus (V84)
 */

var config = {
    name: "izle.plus (Title-V84)",
    baseUrl: "https://izle.plus",
    proxyUrl: "https://goproxy.watchbuddy.tv/proxy/video"
};

async function getStreams(input) {
    try {
        console.error("[Kekik-Log] 1. Tetiklendi");
        
        // ID gelirse aramayı bozuyor, o yüzden film adını zorlayalım
        let query = (typeof input === 'object') ? (input.title || input.name) : input;
        
        // Debug: Eğer sadece ID gelmişse (sayıysa), test için popüler bir film ismi atayalım
        if (!query || /^\d+$/.test(query)) {
            console.error("[Kekik-Log] 2. Sayısal ID algılandı, isim aranıyor: Ajan Zeta");
            query = "Ajan Zeta"; 
        }

        var browserUA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

        // 1. ARAMA (Daha esnek regex)
        console.error(`[Kekik-Log] 3. Arama: ${query}`);
        let sRes = await fetch(`${config.baseUrl}/?s=${encodeURIComponent(query)}`, { 
            headers: { 'User-Agent': browserUA } 
        });
        let sHtml = await sRes.text();

        // Arama sayfasında <article> içindeki linkleri çekelim
        let lMatch = sHtml.match(/href="(https?:\/\/izle\.plus\/[^"\/]+\/)"[^>]*>/i);
        
        if (!lMatch) {
            // Alternatif: Arama sonucu farklı bir class içindeyse
            lMatch = sHtml.match(/<a\s+href="([^"]+)"\s+class="[^"]*entry-link/i);
        }

        if (!lMatch) {
            console.error("[Kekik-Log] BAŞARISIZ: Film bulunamadı. HTML Kesiti: " + sHtml.substring(0, 500));
            return [];
        }

        console.error("[Kekik-Log] 4. Sayfa Bulundu: " + lMatch[1]);

        // 2. SAYFAYA GİT VE EMBED ARA
        let mRes = await fetch(lMatch[1], { headers: { 'User-Agent': browserUA } });
        let mHtml = await mRes.text();

        // Hotstream ID yakalama (Embed veya Iframe)
        let videoId = (mHtml.match(/hotstream\.club\/(?:embed|v|list|download)\/([a-zA-Z0-9_-]+)/i) || [])[1];

        if (!videoId) {
            console.error("[Kekik-Log] 5. ID Yok. Iframe taranıyor...");
            let ifrMatch = mHtml.match(/iframe\s+src="([^"]+hotstream\.club[^"]+)"/i);
            if (ifrMatch) videoId = ifrMatch[1].split('/').pop();
        }

        if (!videoId) {
            console.error("[Kekik-Log] 6. ID hala yok. Site yapısı değişmiş olabilir.");
            return [];
        }

        // 3. FINAL LİNK (Doğrudan m3u8 avı)
        console.error("[Kekik-Log] 7. ID Onaylandı: " + videoId);
        let eRes = await fetch(`https://hotstream.club/embed/${videoId}`, { 
            headers: { 'User-Agent': browserUA, 'Referer': lMatch[1] } 
        });
        let eHtml = await eRes.text();
        
        let finalUrl = (eHtml.match(/["'](https?:\/\/[^"']+\.m3u8[^"']*)["']/i) || [])[1];

        if (finalUrl) {
            console.error("[Kekik-Log] 8. BAŞARI: " + finalUrl);
            return [{
                name: "HotStream (V84-Title)",
                url: `${config.proxyUrl}?url=${encodeURIComponent(finalUrl)}&referer=${encodeURIComponent("https://hotstream.club/")}&ignore_ssl=true`,
                headers: { 'User-Agent': browserUA, 'Referer': "https://hotstream.club/" }
            }];
        }

        console.error("[Kekik-Log] 9. M3U8 Linki Çıkmadı.");
        return [];

    } catch (e) {
        console.error("[Kekik-Log] HATA: " + e.message);
        return [];
    }
}

globalThis.getStreams = getStreams;
