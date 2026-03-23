/**
 * Nuvio API Hunter - izle.plus (V77)
 */

var config = {
    name: "izle.plus (API-V77)",
    baseUrl: "https://izle.plus",
    proxyUrl: "https://goproxy.watchbuddy.tv/proxy/video"
};

async function getStreams(input) {
    try {
        let query = (typeof input === 'object') ? (input.title || input.name || "ajan zeta") : input;
        if (query.toString().includes("1314786")) query = "ajan zeta";

        var browserUA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36";

        // 1. Film Sayfası
        var searchRes = await fetch(`${config.baseUrl}/?s=${encodeURIComponent(query)}`, { headers: { 'User-Agent': browserUA } });
        var searchHtml = await searchRes.text();
        var linkMatch = searchHtml.match(/href="(https?:\/\/izle\.plus\/(?!wp-json|wp-content|category|tag)[^"\/]+\/)"/i);
        if (!linkMatch) return [];

        // 2. Embed ID Yakala
        var res = await fetch(linkMatch[1], { headers: { 'User-Agent': browserUA } });
        var html = await res.text();
        var videoMatch = html.match(/hotstream\.club\/(?:embed|v|list)\/([a-zA-Z0-9_-]+)/i);
        if (!videoMatch) return [];
        
        var videoId = videoMatch[1];
        var embedUrl = `https://hotstream.club/embed/${videoId}`;

        // 3. API'den Linki İste (Hotstream'in gizli source ucu)
        // Genellikle /sources/[ID] veya /api/source/[ID] olur.
        // Ama önce ana sayfadaki "eval" veya gizli scriptleri tarayıp API yolunu bulalım.
        var playerRes = await fetch(embedUrl, { 
            headers: { 'User-Agent': browserUA, 'Referer': linkMatch[1], 'X-Requested-With': 'XMLHttpRequest' } 
        });
        var playerHtml = await playerRes.text();

        // 4. ADIM: API ÇAĞRISI SİMÜLASYONU
        // Hotstream bazen /playlist/[ID].json veya /api/source/[ID] kullanır.
        // Biz direkt link taramasını jwplayer'ın yüklediği harici scriptlere kaydıralım.
        
        let videoUrl = "";
        
        // Bu regex, jwplayer'ın playlist/sources içindeki her şeyi yakalar
        let apiMatch = playerHtml.match(/["']?(?:file|source|src)["']?\s*[:=]\s*["']([^"']+)["']/gi);
        
        if (apiMatch) {
            for (let m of apiMatch) {
                let clean = m.match(/["'](https?:\/\/[^"']+)["']/i);
                if (clean && (clean[1].includes("m3u8") || clean[1].includes("google") || clean[1].includes("storage"))) {
                    videoUrl = clean[1];
                    break;
                }
            }
        }

        // 5. SON ÇARE: Harici Script Tarama
        if (!videoUrl) {
            console.error("[Kekik-Debug] Ana sayfada yok, scriptleri deşiyoruz...");
            // Sayfadaki tüm .js dosyalarını bulup içlerine bakalım
            let scriptMatches = playerHtml.match(/src="([^"]+\.js)"/g);
            if (scriptMatches) {
                for (let s of scriptMatches) {
                    let sUrl = s.replace('src="', '').replace('"', '');
                    if (sUrl.includes('player') || sUrl.includes('bepeak')) {
                        let jsRes = await fetch(sUrl.startsWith('http') ? sUrl : `https://hotstream.club${sUrl}`);
                        let jsText = await jsRes.text();
                        let jsVideoMatch = jsText.match(/https?:\/\/[^"']+\.(?:m3u8|mp4)[^"']*/i);
                        if (jsVideoMatch) { videoUrl = jsVideoMatch[0]; break; }
                    }
                }
            }
        }

        if (!videoUrl) {
            console.error("[Kekik-Debug] LINK HALA YOK! API Engeli olabilir.");
            return [];
        }

        console.error(`[Kekik-Debug] SIZDIRILAN LINK: ${videoUrl}`);

        return [{
            name: "HotStream (API-Sızdırma)",
            url: `${config.proxyUrl}?url=${encodeURIComponent(videoUrl)}&referer=${encodeURIComponent("https://hotstream.club/")}&ignore_ssl=true`,
            headers: { 'User-Agent': browserUA, 'Referer': "https://hotstream.club/" }
        }];

    } catch (e) {
        console.error(`[Kekik-Debug] Hata: ${e.message}`);
        return [];
    }
}

globalThis.getStreams = getStreams;
