/**
 * Nuvio Debug Scraper - izle.plus (V61)
 */

var config = {
    name: "izle.plus (Full-Debug)",
    baseUrl: "https://izle.plus",
    proxyUrl: "https://goproxy.watchbuddy.tv/proxy/video"
};

async function getStreams(input) {
    try {
        var title = (typeof input === 'object') ? (input.title || "") : input;
        console.error(`[Kekik-Debug] Gelen Film Başlığı: ${title}`);

        var slug = title.toLowerCase().trim()
                        .replace(/[^a-z0-9]+/g, '-')
                        .replace(/^-+|-+$/g, '');
        
        var targetUrl = `${config.baseUrl}/${slug}-izle/`;
        console.error(`[Kekik-Debug] Denenen İlk URL: ${targetUrl}`);

        var browserUA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36";

        // 1. ADIM: Siteye İstek At
        var response = await fetch(targetUrl, { 
            headers: { 'User-Agent': browserUA } 
        });

        console.error(`[Kekik-Debug] Site Yanıt Kodu: ${response.status}`);

        if (response.status === 404) {
            targetUrl = `${config.baseUrl}/${slug}/`;
            console.error(`[Kekik-Debug] 404 Alındı, Alternatif URL Deneniyor: ${targetUrl}`);
            response = await fetch(targetUrl, { headers: { 'User-Agent': browserUA } });
        }

        var html = await response.text();
        console.error(`[Kekik-Debug] HTML Uzunluğu: ${html.length} karakter`);

        // 2. ADIM: HotStream ID Yakalama
        var match = html.match(/hotstream\.club\/(?:embed|v|list)\/([a-zA-Z0-9_-]+)/i);

        if (match && match[1]) {
            var videoId = match[1];
            console.error(`[Kekik-Debug] Video ID Bulundu: ${videoId}`);
            
            var streamUrl = `https://hotstream.club/v/${videoId}`;
            var finalUrl = `${config.proxyUrl}?url=${encodeURIComponent(streamUrl)}&referer=${encodeURIComponent("https://hotstream.club/")}&ua=${encodeURIComponent(browserUA)}`;

            console.error(`[Kekik-Debug] Final Proxy URL Oluştu: ${finalUrl.substring(0, 50)}...`);

            return [{
                name: "HotStream (Tarayıcı Taklidi)",
                url: finalUrl,
                headers: {
                    'User-Agent': browserUA,
                    'Referer': "https://hotstream.club/"
                }
            }];
        } else {
            console.error(`[Kekik-Debug] Hata: Sayfada HotStream linki bulunamadı!`);
        }
        return [];

    } catch (e) {
        console.error(`[Kekik-Debug] KRİTİK HATA: ${e.message}`);
        return [];
    }
}

globalThis.getStreams = getStreams;
