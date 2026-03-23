/**
 * Nuvio Deep-Hunter - izle.plus (V82)
 */

var config = {
    name: "izle.plus (Deep-V82)",
    baseUrl: "https://izle.plus",
    proxyUrl: "https://goproxy.watchbuddy.tv/proxy/video"
};

async function getStreams(input) {
    try {
        let query = (typeof input === 'object') ? (input.title || input.name || "ajan zeta") : input;
        var browserUA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

        // 1. Film Arama
        let sRes = await fetch(`${config.baseUrl}/?s=${encodeURIComponent(query)}`, { headers: { 'User-Agent': browserUA } });
        let sHtml = await sRes.text();
        let lMatch = sHtml.match(/href="(https?:\/\/izle\.plus\/(?!wp-json|wp-content|category|tag)[^"\/]+\/)"/i);
        if (!lMatch) return [];

        // 2. Sayfa Kaynağını Al
        let mRes = await fetch(lMatch[1], { headers: { 'User-Agent': browserUA, 'Referer': config.baseUrl } });
        let mHtml = await mRes.text();

        // 3. ADIM: GİZLENMİŞ ID AVLAYICI
        let videoId = "";
        
        // A) Standart Match (Yine de kontrol edelim)
        let standardMatch = mHtml.match(/hotstream\.club\/(?:embed|v|list|download)\/([a-zA-Z0-9_-]+)/i);
        
        // B) Base64 Kontrolü (hotstream.club base64'te "aG90c3RyZWFtLmNsdWI" ile başlar)
        let b64Match = mHtml.match(/[A-Za-z0-9+/]{30,}/g); // Uzun base64 bloklarını topla
        
        if (standardMatch) {
            videoId = standardMatch[1];
        } else if (b64Match) {
            for (let b of b64Match) {
                try {
                    let decoded = atob(b);
                    if (decoded.includes("hotstream.club")) {
                        let id = decoded.match(/\/(?:embed|v|list|download)\/([a-zA-Z0-9_-]+)/i);
                        if (id) { videoId = id[1]; break; }
                    }
                } catch(e) {}
            }
        }

        // C) Data Attributes ve Alternatif Kelimeler
        if (!videoId) {
            let altMatch = mHtml.match(/data-(?:id|video|link|url)="([^"]+)"/i) || 
                           mHtml.match(/["']?link["']?\s*:\s*["']([^"']+)["']/i);
            if (altMatch) videoId = altMatch[1].replace(/https?:\/\/hotstream\.club\/(?:embed|v|download)\//i, "");
        }

        if (!videoId || videoId.length > 50) { 
            console.error("[Kekik-Debug] ID Hala Yok! Kaynak Kodu Analizi Gerekli.");
            // Hata tespiti için HTML'den bir parça loglayalım
            console.error("[Kekik-Debug] HTML Örnek: " + mHtml.substring(mHtml.indexOf("<article"), mHtml.indexOf("<article") + 500));
            return []; 
        }

        // 4. Link Çözme (V81 mantığı ile devam)
        let dlPage = `https://hotstream.club/download/${videoId}`;
        let dlRes = await fetch(dlPage, { headers: { 'User-Agent': browserUA, 'Referer': lMatch[1] } });
        let dlHtml = await dlRes.text();

        let finalUrl = (dlHtml.match(/https?:\/\/[^"']+\.m3u8[^"']*/i) || [])[0];

        if (!finalUrl) return [];

        console.error(`[Kekik-Debug] SONUNDA: ${finalUrl}`);

        return [{
            name: "HotStream (Deep-Scan)",
            url: `${config.proxyUrl}?url=${encodeURIComponent(finalUrl)}&referer=${encodeURIComponent("https://hotstream.club/")}&ignore_ssl=true`,
            headers: { 'User-Agent': browserUA, 'Referer': "https://hotstream.club/" }
        }];

    } catch (e) {
        console.error(`[Kekik-Debug] Hata: ${e.message}`);
        return [];
    }
}

globalThis.getStreams = getStreams;
