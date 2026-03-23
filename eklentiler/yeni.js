/**
 * Nuvio Hard-Recovery - izle.plus (V81)
 */

var config = {
    name: "izle.plus (Hard-V81)",
    baseUrl: "https://izle.plus",
    proxyUrl: "https://goproxy.watchbuddy.tv/proxy/video"
};

async function getStreams(input) {
    try {
        let query = (typeof input === 'object') ? (input.title || input.name || "ajan zeta") : input;
        var browserUA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

        // 1. Arama Sonuçları
        let sRes = await fetch(`${config.baseUrl}/?s=${encodeURIComponent(query)}`, { headers: { 'User-Agent': browserUA } });
        let sHtml = await sRes.text();
        let lMatch = sHtml.match(/href="(https?:\/\/izle\.plus\/[^"\/]+\/)"/i);
        if (!lMatch) { console.error("[Kekik-Debug] Film bulunamadı"); return []; }

        // 2. Sayfa İçeriği
        let mRes = await fetch(lMatch[1], { headers: { 'User-Agent': browserUA, 'Referer': config.baseUrl } });
        let mHtml = await mRes.text();

        // 3. Hotstream ID Yakala
        let idMatch = mHtml.match(/hotstream\.club\/(?:embed|v|list|download)\/([a-zA-Z0-9_-]+)/i);
        if (!idMatch) { console.error("[Kekik-Debug] Hotstream ID yok"); return []; }
        
        // 4. Doğrudan Download Sayfasına Git (Embed yerine)
        let dlPage = `https://hotstream.club/download/${idMatch[1]}`;
        console.error(`[Kekik-Debug] Hedef: ${dlPage}`);

        let dlRes = await fetch(dlPage, { 
            headers: { 
                'User-Agent': browserUA, 
                'Referer': lMatch[1] 
            } 
        });
        let dlHtml = await dlRes.text();

        // 5. M3U8 veya MP4 Avı (En kaba haliyle)
        let finalUrl = "";
        let links = dlHtml.match(/https?:\/\/[^"']+\.(?:m3u8|mp4)[^"']*/gi);
        
        if (links) {
            finalUrl = links.find(l => !l.includes("google") && !l.includes("analytics"));
        }

        if (!finalUrl) {
            console.error("[Kekik-Debug] Link hala yok. Sayfa içeriği çok kısa.");
            return [];
        }

        console.error(`[Kekik-Debug] YAKALANDI: ${finalUrl}`);

        return [{
            name: "HotStream (Recovery)",
            url: `${config.proxyUrl}?url=${encodeURIComponent(finalUrl)}&referer=${encodeURIComponent("https://hotstream.club/")}&ignore_ssl=true`,
            headers: { 
                'User-Agent': browserUA, 
                'Referer': "https://hotstream.club/"
            }
        }];

    } catch (e) {
        console.error(`[Kekik-Debug] Kritik Hata: ${e.message}`);
        return [];
    }
}

globalThis.getStreams = getStreams;
