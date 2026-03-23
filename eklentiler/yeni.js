/**
 * Nuvio Persistent Scraper - izle.plus (V58)
 */

var config = {
    name: "izle.plus (Direct-Source)",
    baseUrl: "https://izle.plus",
    proxyUrl: "https://goproxy.watchbuddy.tv/proxy/video"
};

async function getStreams(input) {
    try {
        // Nuvio'dan gelen başlığı (title) al
        var title = (typeof input === 'object') ? (input.title || "") : input;
        if (!title) return [];

        // 1. ADIM: izle.plus formatında URL üret (Örn: batman-izle)
        var slug = title.toLowerCase().trim()
                        .replace(/[^a-z0-9]+/g, '-') // Geçersiz karakterleri tire yap
                        .replace(/^-+|-+$/g, '');   // Baştaki ve sondaki tireleri temizle
        
        var targetUrl = `${config.baseUrl}/${slug}-izle/`; 
        var deviceUA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36";

        // 2. ADIM: Siteye zorunlu fetch at
        var response = await fetch(targetUrl, { 
            headers: { 'User-Agent': deviceUA } 
        });
        
        // Eğer -izle ekiyle bulamazsa bir de eksiz dene
        if (response.status === 404) {
            targetUrl = `${config.baseUrl}/${slug}/`;
            response = await fetch(targetUrl, { headers: { 'User-Agent': deviceUA } });
        }

        var html = await response.text();

        // 3. ADIM: HotStream ID'sini Regex ile sök
        var hotstreamMatch = html.match(/hotstream\.club\/(?:embed|v|list)\/([a-zA-Z0-9_-]+)/i);

        if (hotstreamMatch && hotstreamMatch[1]) {
            var videoId = hotstreamMatch[1];
            var finalStream = `https://hotstream.club/v/${videoId}`;
            
            // Sertifika hatasını (TRACE) aşmak için Proxy parametrelerini zorla
            var proxyUrl = `${config.proxyUrl}?url=${encodeURIComponent(finalStream)}&referer=${encodeURIComponent("https://hotstream.club/")}`;

            return [{
                name: "izle.plus | " + title,
                url: proxyUrl,
                headers: {
                    'User-Agent': deviceUA,
                    'Referer': "https://hotstream.club/",
                    'Origin': "https://hotstream.club"
                }
            }];
        }

        return [];
    } catch (e) {
        return [];
    }
}

globalThis.getStreams = getStreams;
