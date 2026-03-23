/**
 * Nuvio Invisible Fetch - izle.plus (V83)
 */

var config = {
    name: "izle.plus (Invisible-V83)",
    baseUrl: "https://izle.plus",
    proxyUrl: "https://goproxy.watchbuddy.tv/proxy/video"
};

async function getStreams(input) {
    try {
        console.error("[Kekik-Log] 1. Başlatıldı...");
        let query = (typeof input === 'object') ? (input.title || input.name || "ajan zeta") : input;
        var browserUA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

        // 1. ARAMA
        console.error("[Kekik-Log] 2. Arama yapılıyor: " + query);
        let sRes = await fetch(`${config.baseUrl}/?s=${encodeURIComponent(query)}`, { headers: { 'User-Agent': browserUA } });
        let sHtml = await sRes.text();
        let lMatch = sHtml.match(/href="(https?:\/\/izle\.plus\/(?!wp-json|wp-content|category|tag)[^"\/]+\/)"/i);
        
        if (!lMatch) { console.error("[Kekik-Log] Hata: Film Linki Yok"); return []; }
        console.error("[Kekik-Log] 3. Film Linki: " + lMatch[1]);

        // 2. SAYFA ANALİZİ
        let mRes = await fetch(lMatch[1], { headers: { 'User-Agent': browserUA, 'Referer': config.baseUrl } });
        let mHtml = await mRes.text();

        // ADIM 3: GİZLİ ID BULUCU (Regex'i genişlettik)
        // Bazı siteler ID'yi id="video-id-12345" gibi saklar
        let videoId = (mHtml.match(/hotstream\.club\/(?:embed|v|list|download)\/([a-zA-Z0-9_-]+)/i) || [])[1];
        
        if (!videoId) {
            console.error("[Kekik-Log] 4. Standart ID yok, derin arama...");
            // Alternatif: iframe src'lerine bak
            let frameMatch = mHtml.match(/src="([^"]+hotstream\.club[^"]+)"/i);
            if (frameMatch) videoId = frameMatch[1].split('/').pop();
        }

        if (!videoId) {
            console.error("[Kekik-Log] BAŞARISIZ: ID bulunamadı. HTML Boyutu: " + mHtml.length);
            return [];
        }

        console.error("[Kekik-Log] 5. Bulunan ID: " + videoId);

        // 4. LİNK ÇEKME (POST yerine GET deniyoruz, referer ile)
        let dlPage = `https://hotstream.club/embed/${videoId}`;
        let dlRes = await fetch(dlPage, { 
            headers: { 
                'User-Agent': browserUA, 
                'Referer': lMatch[1],
                'X-Requested-With': 'XMLHttpRequest'
            } 
        });
        let dlHtml = await dlRes.text();

        // 5. M3U8 ANALİZİ
        let finalUrl = (dlHtml.match(/["'](https?:\/\/[^"']+\.m3u8[^"']*)["']/i) || [])[1];

        if (!finalUrl) {
            console.error("[Kekik-Log] 6. Embed boş, indirme sayfası deneniyor...");
            let backupRes = await fetch(`https://hotstream.club/download/${videoId}`, { headers: { 'User-Agent': browserUA } });
            let backupHtml = await backupRes.text();
            finalUrl = (backupHtml.match(/https?:\/\/[^"']+\.m3u8[^"']*/i) || [])[0];
        }

        if (finalUrl) {
            console.error("[Kekik-Log] BINGO: " + finalUrl);
            return [{
                name: "HotStream (V83-Fix)",
                url: `${config.proxyUrl}?url=${encodeURIComponent(finalUrl)}&referer=${encodeURIComponent("https://hotstream.club/")}&ignore_ssl=true`,
                headers: { 'User-Agent': browserUA, 'Referer': "https://hotstream.club/" }
            }];
        }

        console.error("[Kekik-Log] Hiçbir linke ulaşılamadı.");
        return [];

    } catch (e) {
        console.error("[Kekik-Log] CRASH: " + e.toString());
        return [];
    }
}

globalThis.getStreams = getStreams;
