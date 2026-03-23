/**
 * Nuvio Search-Based Scraper - izle.plus (V63)
 */

var config = {
    name: "izle.plus (Arama Modu)",
    baseUrl: "https://izle.plus",
    proxyUrl: "https://goproxy.watchbuddy.tv/proxy/video"
};

async function getStreams(input) {
    try {
        // Uygulamanın gönderdiği ID veya Başlık
        var query = (typeof input === 'object') ? (input.title || input.imdbId || "") : input;
        console.error(`[Kekik-Debug] Başlatılan Arama Sorgusu: ${query}`);

        var browserUA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36";

        // 1. ADIM: Sitenin kendi arama motorunu kullan (En güvenli yol)
        // https://izle.plus/?s=ajan+zeta
        var searchUrl = `${config.baseUrl}/?s=${encodeURIComponent(query)}`;
        var searchRes = await fetch(searchUrl, { headers: { 'User-Agent': browserUA } });
        var searchHtml = await searchRes.text();

        // 2. ADIM: Arama sonuçlarından ilk geçerli film linkini yakala
        // Regex: href içindeki izle.plus/film-adi/ yapısını bulur
        var linkMatch = searchHtml.match(/href="(https?:\/\/izle\.plus\/[^?\/"]+\/)"/i);
        
        if (!linkMatch) {
            console.error(`[Kekik-Debug] Arama sonucunda film linki bulunamadı!`);
            return [];
        }

        var targetUrl = linkMatch[1];
        console.error(`[Kekik-Debug] Hedef Film Sayfası Bulundu: ${targetUrl}`);

        // 3. ADIM: Gerçek Film Sayfasına Git
        var response = await fetch(targetUrl, { headers: { 'User-Agent': browserUA } });
        var html = await response.text();

        // 4. ADIM: Video Kaynağını (HotStream/Dizipal) Yakala
        var videoMatch = html.match(/(?:hotstream\.club|vidmoly\.to|dizipal[^.]+)\/(?:embed|v|list)\/([a-zA-Z0-9_-]+)/i);

        if (videoMatch) {
            var videoId = videoMatch[1];
            var sourceDomain = videoMatch[0].split('/')[0];
            var streamUrl = `https://${sourceDomain}/v/${videoId}`;
            
            // Sertifika (TRACE) ve Referer hatalarını Proxy ile paketle
            var finalUrl = `${config.proxyUrl}?url=${encodeURIComponent(streamUrl)}&referer=${encodeURIComponent("https://"+sourceDomain+"/")}&ignore_ssl=true`;

            console.error(`[Kekik-Debug] Başarılı! Link: ${finalUrl.substring(0, 40)}...`);

            return [{
                name: "izle.plus | " + sourceDomain,
                url: finalUrl,
                headers: {
                    'User-Agent': browserUA,
                    'Referer': `https://${sourceDomain}/`
                }
            }];
        }

        console.error(`[Kekik-Debug] Hata: Sayfada video iframe'i bulunamadı.`);
        return [];

    } catch (e) {
        console.error(`[Kekik-Debug] KRİTİK HATA: ${e.message}`);
        return [];
    }
}

globalThis.getStreams = getStreams;
