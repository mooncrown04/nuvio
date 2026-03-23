/**
 * Nuvio Smart Search Scraper - izle.plus (V65)
 */

var config = {
    name: "izle.plus (Smart Search)",
    baseUrl: "https://izle.plus",
    proxyUrl: "https://goproxy.watchbuddy.tv/proxy/video"
};

async function getStreams(input) {
    try {
        // 1. INPUT ANALİZİ: Rakam gelirse onu kullanma, title'ı bulmaya çalış
        var query = "";
        if (typeof input === 'object') {
            // Öncelik gerçek isimde, ID en son çare
            query = input.title || input.name || input.imdbId || "";
        } else {
            query = input;
        }

        console.error(`[Kekik-Debug] Ham Sorgu: ${query}`);

        // Eğer sorgu sadece rakamlardan oluşuyorsa (ID ise) ve başka veri yoksa
        // Bu durumda site üzerinde ID ile arama yapmaktan başka çare kalmıyor 
        // Ama çoğu zaman site bunu bulamaz.
        
        var browserUA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36";

        // 2. Arama Yap
        var searchUrl = `${config.baseUrl}/?s=${encodeURIComponent(query)}`;
        console.error(`[Kekik-Debug] Arama URL: ${searchUrl}`);

        var searchRes = await fetch(searchUrl, { headers: { 'User-Agent': browserUA } });
        var searchHtml = await searchRes.text();

        // 3. Link Ayıklama (Daha esnek regex)
        // href="https://izle.plus/herhangi-bir-sey/"
        var linkRegex = /href="(https?:\/\/izle\.plus\/([^"\/]+)\/)"/gi;
        var match;
        var targetUrl = "";

        while ((match = linkRegex.exec(searchHtml)) !== null) {
            let foundLink = match[1];
            let slug = match[2];

            // Çöpleri temizle
            if (!slug.includes('wp-') && !slug.includes('category') && !slug.includes('tag') && slug !== 'contact') {
                targetUrl = foundLink;
                break; 
            }
        }

        if (!targetUrl) {
            console.error(`[Kekik-Debug] Hata: Arama sonucunda temiz link bulunamadı.`);
            return [];
        }

        console.error(`[Kekik-Debug] Hedef Sayfa: ${targetUrl}`);

        // 4. Video ID Yakala
        var response = await fetch(targetUrl, { headers: { 'User-Agent': browserUA } });
        var html = await response.text();

        var videoMatch = html.match(/(?:hotstream\.club|vidmoly\.to|dizipal[^.]+)\/(?:embed|v|list)\/([a-zA-Z0-9_-]+)/i);

        if (videoMatch) {
            var videoId = videoMatch[1];
            var sourceDomain = videoMatch[0].split('/')[0];
            var streamUrl = `https://${sourceDomain}/v/${videoId}`;
            
            var finalUrl = `${config.proxyUrl}?url=${encodeURIComponent(streamUrl)}&referer=${encodeURIComponent("https://"+sourceDomain+"/")}&ignore_ssl=true`;

            return [{
                name: "HotStream (Smart)",
                url: finalUrl,
                headers: { 'User-Agent': browserUA, 'Referer': `https://${sourceDomain}/` }
            }];
        }

        return [];

    } catch (e) {
        console.error(`[Kekik-Debug] Hata: ${e.message}`);
        return [];
    }
}

globalThis.getStreams = getStreams;
