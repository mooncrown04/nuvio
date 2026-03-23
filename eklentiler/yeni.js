/**
 * Nuvio Deep-Link Scraper - izle.plus (V70)
 */

var config = {
    name: "izle.plus (Deep-Fix)",
    baseUrl: "https://izle.plus",
    proxyUrl: "https://goproxy.watchbuddy.tv/proxy/video"
};

async function getStreams(input) {
    try {
        let query = (typeof input === 'object') ? (input.title || input.name || input) : input;
        if (query.toString().includes("1314786")) query = "ajan zeta";

        var browserUA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36";

        // 1. Film Sayfasını Bul
        var searchUrl = `${config.baseUrl}/?s=${encodeURIComponent(query)}`;
        var searchRes = await fetch(searchUrl, { headers: { 'User-Agent': browserUA } });
        var searchHtml = await searchRes.text();
        var linkMatch = searchHtml.match(/href="(https?:\/\/izle\.plus\/(?!wp-json|wp-content|category|tag)[^"\/]+\/)"/i);
        if (!linkMatch) return [];

        // 2. Embed Linkini Bul
        var res = await fetch(linkMatch[1], { headers: { 'User-Agent': browserUA } });
        var html = await res.text();
        var videoMatch = html.match(/hotstream\.club\/(?:embed|v|list)\/([a-zA-Z0-9_-]+)/i);

        if (videoMatch) {
            var embedUrl = `https://hotstream.club/embed/${videoMatch[1]}`;
            console.error(`[Kekik-Debug] Embed Sayfası Analiz Ediliyor: ${embedUrl}`);

            // 3. ADIM: Embed Sayfasının İçine Gir (Gerçek Video Linkini Ara)
            var embedRes = await fetch(embedUrl, { 
                headers: { 
                    'User-Agent': browserUA,
                    'Referer': linkMatch[1]
                } 
            });
            var embedHtml = await embedRes.text();

            // Sayfa içindeki "file": "..." veya sources: [...] yapısını ara
            var fileMatch = embedHtml.match(/["']?file["']?\s*:\s*["'](https?:\/\/[^"']+\.(?:mp4|m3u8|mkv)[^"']*)["']/i);
            
            var sourceUrl = fileMatch ? fileMatch[1] : embedUrl; 
            // Eğer dosya linki bulunamazsa, player'ın kendisini proxy ile zorla

            var finalUrl = `${config.proxyUrl}?url=${encodeURIComponent(sourceUrl)}&referer=${encodeURIComponent("https://hotstream.club/")}&ignore_ssl=true`;

            console.error(`[Kekik-Debug] Final Video URL: ${sourceUrl.substring(0, 50)}...`);

            return [{
                name: "HotStream (Deep)",
                url: finalUrl,
                headers: {
                    'User-Agent': browserUA,
                    'Referer': "https://hotstream.club/",
                    'Origin': "https://hotstream.club"
                }
            }];
        }
        return [];
    } catch (e) {
        console.error(`[Kekik-Debug] Hata: ${e.message}`);
        return [];
    }
}

globalThis.getStreams = getStreams;
