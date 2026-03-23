/**
 * Nuvio Hotstream-Fix Scraper - izle.plus (V69)
 */

var config = {
    name: "izle.plus (Final-Fix)",
    baseUrl: "https://izle.plus",
    proxyUrl: "https://goproxy.watchbuddy.tv/proxy/video"
};

async function getStreams(input) {
    try {
        let query = (typeof input === 'object') ? (input.title || input.name || input.id || input) : input;
        
        // Manuel ID Yaması (Ajan Zeta için)
        if (query.toString().includes("1314786")) {
            query = "ajan zeta";
        }

        var browserUA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36";

        // 1. Sayfayı Bul
        var searchUrl = `${config.baseUrl}/?s=${encodeURIComponent(query)}`;
        var searchRes = await fetch(searchUrl, { headers: { 'User-Agent': browserUA } });
        var searchHtml = await searchRes.text();

        var linkMatch = searchHtml.match(/href="(https?:\/\/izle\.plus\/(?!wp-json|wp-content|category|tag)[^"\/]+\/)"/i);
        if (!linkMatch) return [];

        var targetUrl = linkMatch[1];
        console.error(`[Kekik-Debug] Hedef Sayfa: ${targetUrl}`);

        // 2. Video Linkini Sök
        var res = await fetch(targetUrl, { headers: { 'User-Agent': browserUA } });
        var html = await res.text();

        // Hotstream embed yapısını daha geniş tara
        var videoMatch = html.match(/hotstream\.club\/(?:embed|v|list)\/([a-zA-Z0-9_-]+)/i);

        if (videoMatch) {
            var videoId = videoMatch[1];
            // Hotstream genellikle /embed/ formatını sever
            var streamUrl = `https://hotstream.club/embed/${videoId}`; 
            
            // 404 Hatasını Önlemek İçin:
            // Bazı siteler sadece /v/ ile çalışır, eğer hata devam ederse /v/ deneriz.
            
            var finalUrl = `${config.proxyUrl}?url=${encodeURIComponent(streamUrl)}&referer=${encodeURIComponent("https://hotstream.club/")}&ignore_ssl=true`;

            console.error(`[Kekik-Debug] Oynatılıyor: ${streamUrl}`);

            return [{
                name: "HotStream - " + query,
                url: finalUrl,
                headers: {
                    'User-Agent': browserUA,
                    'Referer': "https://hotstream.club/", // KRİTİK: Hotstream bunu bekler
                    'Origin': "https://hotstream.club",
                    'Connection': 'keep-alive'
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
