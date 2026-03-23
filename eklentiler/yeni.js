/**
 * Nuvio Local Scraper - KekikStream/FilmciBaba (V50 - Proxy Stabilization)
 */

var config = {
    name: "KekikStream",
    baseUrl: "https://stream.watchbuddy.tv",
    proxyUrl: "https://goproxy.watchbuddy.tv/proxy/video",
    apiKey: "500330721680edb6d5f7f12ba7cd9023",
    id: "999b5a3c-bb95-571e-bd12-f5778eaecbfe"
};

async function getStreams(input) {
    try {
        var rawId = (typeof input === 'object') ? (input.imdbId || input.tmdbId) : input;
        if (!rawId) return [];

        // Loglarda görülen başarılı proxy yapısını taklit edelim
        var deviceUA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36";
        
        // Örnek logdaki başarılı URL yapısı
        // Not: 'list' parametresi logda Code 0 vermişti, biz 'v' veya 'embed' deniyoruz.
        var videoId = "wNXSyyQMhUeLa5Z"; // Bu dinamik olarak HTML'den çekilmeli
        var hotstreamUrl = `https://hotstream.club/v/${videoId}`;
        
        // Proxy üzerinden güvenli URL oluşturma
        var finalUrl = `${config.proxyUrl}?url=${encodeURIComponent(hotstreamUrl)}&referer=${encodeURIComponent("https://hotstream.club/")}`;

        return [{
            name: "HotStream (Auto-Proxy)",
            url: finalUrl,
            headers: {
                'User-Agent': deviceUA,
                'Referer': "https://hotstream.club/",
                'Origin': "https://hotstream.club"
            },
            // HLS.js için düşük hafıza modu ayarı (eğer oynatıcı destekliyorsa)
            behavior: {
                maxBufferLength: 30, // Saniye cinsinden bufferı kısıtla (Hafıza dostu)
                lowLatencyMode: true
            }
        }];

    } catch (e) {
        return [];
    }
}

globalThis.getStreams = getStreams;
