/**
 * Nuvio JW-Grabber - izle.plus (V76)
 */

var config = {
    name: "izle.plus (JW-V76)",
    baseUrl: "https://izle.plus",
    proxyUrl: "https://goproxy.watchbuddy.tv/proxy/video"
};

async function getStreams(input) {
    try {
        let query = (typeof input === 'object') ? (input.title || input.name || "ajan zeta") : input;
        if (query.toString().includes("1314786")) query = "ajan zeta";

        var browserUA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36";

        // 1. Film Sayfasını Bul
        var searchRes = await fetch(`${config.baseUrl}/?s=${encodeURIComponent(query)}`, { headers: { 'User-Agent': browserUA } });
        var searchHtml = await searchRes.text();
        var linkMatch = searchHtml.match(/href="(https?:\/\/izle\.plus\/(?!wp-json|wp-content|category|tag)[^"\/]+\/)"/i);
        if (!linkMatch) return [];

        // 2. Embed URL'sini Al ve Sayfayı Çek
        var res = await fetch(linkMatch[1], { headers: { 'User-Agent': browserUA } });
        var html = await res.text();
        var videoMatch = html.match(/hotstream\.club\/(?:embed|v|list)\/([a-zA-Z0-9_-]+)/i);
        if (!videoMatch) return [];

        var embedUrl = `https://hotstream.club/embed/${videoMatch[1]}`;
        var playerRes = await fetch(embedUrl, { 
            headers: { 'User-Agent': browserUA, 'Referer': linkMatch[1] } 
        });
        var playerHtml = await playerRes.text();

        // 3. ADIM: JWPLAYER SETUP ANALİZİ
        let videoUrl = "";
        
        // JwPlayer setup içindeki "file" veya "sources" kısmını yakala
        let jwMatch = playerHtml.match(/["']?file["']?\s*[:=]\s*["']([^"']+)["']/i) || 
                      playerHtml.match(/sources\s*:\s*\[\s*\{\s*["']?file["']?\s*:\s*["']([^"']+)["']/i);

        if (jwMatch) {
            videoUrl = jwMatch[1];
        } else {
            // Eğer hala bulamadıysak, Hotstream'in özel 'sources' js isteğini simüle edelim
            // Bazen harici js içinde: var player = new jwplayer("vsplayer").setup({ ... })
            console.error("[Kekik-Debug] JW Match başarısız, derin tarama başlatılıyor...");
            let deepMatch = playerHtml.match(/(https?:\/\/[^"']+\.(?:m3u8|mp4)[^"']*)/i);
            if (deepMatch) videoUrl = deepMatch[1];
        }

        if (!videoUrl) {
            // Son çare: HTML içindeki script taglarının sonuna bak (Logda kesilen kısım)
            console.error("[Kekik-Debug] Link hala yok. Sayfa sonu: " + playerHtml.substring(playerHtml.length - 300));
            return [];
        }

        console.error(`[Kekik-Debug] JW GRABBER BULDUM: ${videoUrl}`);

        return [{
            name: "HotStream (JW-V76)",
            url: `${config.proxyUrl}?url=${encodeURIComponent(videoUrl)}&referer=${encodeURIComponent("https://hotstream.club/")}&ignore_ssl=true`,
            headers: { 
                'User-Agent': browserUA, 
                'Referer': "https://hotstream.club/",
                'Origin': "https://hotstream.club"
            }
        }];

    } catch (e) {
        console.error(`[Kekik-Debug] Hata: ${e.message}`);
        return [];
    }
}

globalThis.getStreams = getStreams;
