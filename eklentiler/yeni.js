// Nuvio Provider Yapısı
const BASE_URL = "https://stream.watchbuddy.tv";

async function getStreams(args) {
    // Nuvio'dan gelen TMDB veya IMDB ID'sini yakala
    var mediaId = args.tmdbId || args.imdbId || args.id;
    if (!mediaId) return [];

    // Nuvio'nun Player'da 422 almaması için gereken standart Header seti
    var requestHeaders = {
        "User-Agent": "Mozilla/5.0 (Linux; Android 11; Fire TV)",
        "Referer": BASE_URL + "/",
        "X-Requested-With": "XMLHttpRequest"
    };

    try {
        // 1. KekikStreamAPI Arama Endpoint'ine İstek At
        var searchUrl = `${BASE_URL}/api/v1/search?q=${mediaId}&type=movie`;
        
        var response = await fetch(searchUrl, { headers: requestHeaders });
        var data = await response.json();
        
        // Sunucudan dönen sonuçları (Dizipal, SineWix vb.) ayıkla
        var results = data.result || data.results || [];

        // 2. Nuvio'nun anlayacağı formatta objeleri dönüştür
        if (results.length > 0) {
            return results.map(item => ({
                name: item.provider || "WatchBuddy",
                title: `${item.title} (${item.provider})`,
                // Proxy üzerinden geçecek final link
                url: `${BASE_URL}/proxy/video?url=${encodeURIComponent(item.url || item.path)}&force_proxy=1`,
                headers: requestHeaders, // Nuvio bu header'ı doğrudan Player'a iletir
                is_hls: true
            }));
        }

        // 3. Fallback: Eğer arama sonuç vermezse Tünel linkini gönder
        return [{
            name: "WatchBuddy Direct",
            title: "Otomatik Kaynak (SineWix)",
            url: `${BASE_URL}/izle/SineWix?url=${encodeURIComponent("http://px-webservisler:2585/sinewix/movie/" + mediaId)}&force_proxy=1`,
            headers: requestHeaders,
            is_hls: true
        }];

    } catch (e) {
        console.error("Nuvio Entegrasyon Hatası: ", e);
        return [];
    }
}

// Nuvio'nun fonksiyonu tanıyabilmesi için dışa aktar
globalThis.getStreams = getStreams;
