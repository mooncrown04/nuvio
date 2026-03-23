/**
 * Nuvio Filtered Scraper - izle.plus (V64)
 */

var config = {
    name: "izle.plus (Nokta Atışı)",
    baseUrl: "https://izle.plus",
    proxyUrl: "https://goproxy.watchbuddy.tv/proxy/video"
};

async function getStreams(input) {
    try {
        var query = (typeof input === 'object') ? (input.title || input.imdbId || "") : input;
        console.error(`[Kekik-Debug] Sorgu: ${query}`);

        var browserUA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36";

        // 1. Arama Yap
        var searchUrl = `${config.baseUrl}/?s=${encodeURIComponent(query)}`;
        var searchRes = await fetch(searchUrl, { headers: { 'User-Agent': browserUA } });
        var searchHtml = await searchRes.text();

        // 2. KRİTİK DEĞİŞİKLİK: wp-json ve teknik linkleri filtrele
        // Sadece ana dizinde olan ve içinde wp- geçen kelimeleri içermeyen linkleri ara
        var allLinks = searchHtml.match(/href="(https?:\/\/izle\.plus\/[^"\/]+\/)"/gi) || [];
        var targetUrl = "";

        for (let link of allLinks) {
            let cleanLink = link.replace('href="', '').replace('"', '');
            // Teknik WordPress linklerini ve ana sayfayı ele
            if (!cleanLink.includes('wp-json') && 
                !cleanLink.includes('wp-content') && 
                !cleanLink.includes('category') && 
                cleanLink !== config.baseUrl + "/") {
                targetUrl = cleanLink;
                break; // İlk temiz linki bulduğumuzda dur
            }
        }

        if (!targetUrl) {
            console.error(`[Kekik-Debug] Hata: Uygun film linki bulunamadı.`);
            return [];
        }

        console.error(`[Kekik-Debug] Hedef Film Sayfası: ${targetUrl}`);

        // 3. Film Sayfasına Git
        var response = await fetch(targetUrl, { headers: { 'User-Agent': browserUA } });
        var html = await response.text();

        // 4. Video ID Yakala
        var videoMatch = html.match(/(?:hotstream\.club|vidmoly\.to|dizipal[^.]+)\/(?:embed|v|list)\/([a-zA-Z0-9_-]+)/i);

        if (videoMatch) {
            var videoId = videoMatch[1];
            var sourceDomain = videoMatch[0].split('/')[0];
            var streamUrl = `https://${sourceDomain}/v/${videoId}`;
            
            var finalUrl = `${config.proxyUrl}?url=${encodeURIComponent(streamUrl)}&referer=${encodeURIComponent("https://"+sourceDomain+"/")}&ignore_ssl=true`;
            console.error(`[Kekik-Debug] Başarılı Link: ${finalUrl.substring(0, 50)}`);

            return [{
                name: "HotStream - " + sourceDomain,
                url: finalUrl,
                headers: { 'User-Agent': browserUA, 'Referer': `https://${sourceDomain}/` }
            }];
        }

        console.error(`[Kekik-Debug] Hata: Sayfada video bulunamadı.`);
        return [];

    } catch (e) {
        console.error(`[Kekik-Debug] Hata: ${e.message}`);
        return [];
    }
}

globalThis.getStreams = getStreams;
