/**
 * Nuvio Native-Session - izle.plus (V80)
 */

var config = {
    name: "izle.plus (Native-V80)",
    baseUrl: "https://izle.plus",
    proxyUrl: "https://goproxy.watchbuddy.tv/proxy/video"
};

async function getStreams(input) {
    try {
        let query = (typeof input === 'object') ? (input.title || input.name || "ajan zeta") : input;
        var browserUA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

        // 1. Arama Yap
        let searchRes = await fetch(`${config.baseUrl}/?s=${encodeURIComponent(query)}`, { 
            headers: { 'User-Agent': browserUA } 
        });
        let searchHtml = await searchRes.text();
        let linkMatch = searchHtml.match(/href="(https?:\/\/izle\.plus\/(?!wp-json|wp-content|category|tag)[^"\/]+\/)"/i);
        if (!linkMatch) return [];

        // 2. Film Sayfasını ve Çerezleri Al
        // Burada Referer ve User-Agent çok kritik
        let movieUrl = linkMatch[1];
        let movieRes = await fetch(movieUrl, { 
            headers: { 
                'User-Agent': browserUA,
                'Referer': config.baseUrl
            } 
        });
        let movieHtml = await movieRes.text();

        // ADIM 3: DOWNLOAD BUTONU ÜZERİNDEN GİT (Burası temiz link barındırabilir)
        let downloadMatch = movieHtml.match(/data-href="([^"]+)"/i) || movieHtml.match(/href="([^"]+hotstream\.club\/download[^"]+)"/i);
        let finalVideoUrl = "";

        if (downloadMatch) {
            let dlUrl = downloadMatch[1];
            console.error(`[Kekik-Debug] İndirme Linki Yakalandı: ${dlUrl}`);
            
            let dlRes = await fetch(dlUrl, { headers: { 'User-Agent': browserUA, 'Referer': movieUrl } });
            let dlHtml = await dlRes.text();
            
            // İndirme sayfasındaki o meşhur "Click to download" linkini bulalım
            let m3u8Match = dlHtml.match(/https?:\/\/[^"']+\.m3u8[^"']*/i);
            if (m3u8Match) finalVideoUrl = m3u8Match[0];
        }

        // ADIM 4: EĞER DOWNLOAD'DA YOKSA EMBED'İ TEKRAR DENE (FULL HEADERS İLE)
        if (!finalVideoUrl) {
            let videoMatch = movieHtml.match(/hotstream\.club\/(?:embed|v|list)\/([a-zA-Z0-9_-]+)/i);
            if (videoMatch) {
                let embedUrl = `https://hotstream.club/embed/${videoMatch[1]}`;
                let playerRes = await fetch(embedUrl, { 
                    headers: { 
                        'User-Agent': browserUA, 
                        'Referer': movieUrl,
                        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,webp,*/*;q=0.8'
                    } 
                });
                let playerHtml = await playerRes.text();
                
                // Agresif Regex: Her türlü m3u8'i topla, Google'ı sil
                let rawLinks = playerHtml.match(/https?:\/\/[^"']+\.m3u8[^"']*/gi);
                if (rawLinks) {
                    finalVideoUrl = rawLinks.find(l => !l.includes("google") && !l.includes("analytics"));
                }
            }
        }

        if (!finalVideoUrl) {
            console.error("[Kekik-Debug] M3U8 Bulunamadı. Hotstream koruması aşılamıyor.");
            return [];
        }

        console.error(`[Kekik-Debug] BİNGO: ${finalVideoUrl}`);

        return [{
            name: "HotStream (Session-V80)",
            url: `${config.proxyUrl}?url=${encodeURIComponent(finalVideoUrl)}&referer=${encodeURIComponent("https://hotstream.club/")}&ignore_ssl=true`,
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
