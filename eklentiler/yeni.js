/**
 * Nuvio HTML Sniffer - izle.plus (V91)
 */

var config = {
    name: "izle.plus (Sniffer-V91)",
    baseUrl: "https://izle.plus",
    proxyUrl: "https://goproxy.watchbuddy.tv/proxy/video"
};

async function getStreams(input) {
    try {
        console.error("[Kekik-Log] 1. Sniffer Başlatıldı");
        let query = (typeof input === 'object') ? (input.title || input.name) : input;
        if (!query || /^\d+$/.test(query)) query = "Ajan Zeta";

        var browserUA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

        // 1. Film Sayfası ve ID Çekimi (Zaten çalışıyor)
        let sRes = await fetch(`${config.baseUrl}/?s=${encodeURIComponent(query)}`, { headers: { 'User-Agent': browserUA } });
        let sHtml = await sRes.text();
        let movieUrl = (sHtml.match(/href="(https?:\/\/izle\.plus\/(?!wp-)[^"\/]+\/)"/i) || [])[1];
        if (!movieUrl) return [];

        let mRes = await fetch(movieUrl, { headers: { 'User-Agent': browserUA } });
        let mHtml = await mRes.text();
        let videoId = (mHtml.match(/hotstream\.club\/(?:embed|v|download)\/([a-zA-Z0-9_-]+)/i) || [])[1];
        if (!videoId) return [];

        // 2. KRİTİK ADIM: EMBED SAYFASININ İÇİNİ LOGLA
        let eRes = await fetch(`https://hotstream.club/embed/${videoId}`, { 
            headers: { 'User-Agent': browserUA, 'Referer': movieUrl } 
        });
        let eHtml = await eRes.text();

        console.error("[Kekik-Log] 2. Sayfa Geldi. Script İçerikleri Analiz Ediliyor...");

        // Sayfadaki tüm <script> bloklarını bul ve logla (Parça parça)
        let scripts = eHtml.match(/<script\b[^>]*>([\s\S]*?)<\/script>/g);
        
        if (scripts) {
            scripts.forEach((s, index) => {
                // Sadece içinde 'http' veya 'm3u8' veya 'file' veya 'sources' geçen scriptleri logla
                if (s.toLowerCase().includes("http") || s.toLowerCase().includes("file")) {
                    console.error(`[Kekik-Log] SCRIPT-${index}: ${s.substring(0, 300)}`); 
                }
            });
        }

        // 3. Geçici bir regex denemesi (Daha agresif)
        let finalUrl = (eHtml.match(/https?:\/\/[^"']+\.m3u8[^"']*/i) || [])[0];
        
        if (finalUrl) {
            console.error("[Kekik-Log] 3. BİNGO: " + finalUrl);
            return [{
                name: "HotStream (V91)",
                url: `${config.proxyUrl}?url=${encodeURIComponent(finalUrl)}&referer=${encodeURIComponent("https://hotstream.club/")}&ignore_ssl=true`
            }];
        }

        console.error("[Kekik-Log] 4. Link hala yok. Lütfen SCRIPT loglarını paylaş.");
        return [];

    } catch (e) {
        console.error("[Kekik-Log] CRASH: " + e.toString());
        return [];
    }
}

globalThis.getStreams = getStreams;
