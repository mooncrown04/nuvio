/**
 * Nuvio Official Scraper - izle.plus (V57)
 */

var config = {
    name: "izle.plus (Full-Access)",
    baseUrl: "https://izle.plus",
    proxyUrl: "https://goproxy.watchbuddy.tv/proxy/video"
};

async function getStreams(input) {
    try {
        // 1. Nuvio'dan gelen başlığı temizleyelim (Slug oluşturma)
        var query = "";
        if (typeof input === 'object') {
            query = input.title || input.name;
        } else {
            query = input;
        }

        // izle.plus link yapısı genelde: film-adi-izle/ şeklindedir
        var slug = query.toLowerCase()
                        .trim()
                        .replace(/[^a-z0-9]/g, '-')
                        .replace(/-+/g, '-');
        
        // Siteye özgü "-izle" takısını ekliyoruz (Genelde bu format kullanılır)
        var targetUrl = `${config.baseUrl}/${slug}-izle/`;
        var deviceUA = "Mozilla/5.0 (Linux; Android 10; Fire TV)";

        // 2. Ana Siteye Git (Bu adım mecburi)
        var response = await fetch(targetUrl, { 
            headers: { 'User-Agent': deviceUA } 
        });

        // Eğer direkt slug tutmazsa (404 alırsak), ana sayfadan arama yapmayı deneyebiliriz
        if (response.status === 404) {
             // Alternatif: Direkt slug (izle eki olmadan)
             targetUrl = `${config.baseUrl}/${slug}/`;
             response = await fetch(targetUrl, { headers: { 'User-Agent': deviceUA } });
        }

        var html = await response.text();

        // 3. HotStream/Dizipal Linkini Ayıkla
        // Sitedeki iframe veya source etiketlerini tarar
        var hotstreamRegex = /https?:\/\/hotstream\.club\/(?:embed|v|list)\/([a-zA-Z0-9_-]+)/i;
        var match = html.match(hotstreamRegex);

        if (match && match[1]) {
            var videoId = match[1];
            // 'list' yerine 'v' (video) kullanmak 404 hatasını azaltır
            var rawStreamUrl = `https://hotstream.club/v/${videoId}`;
            
            // 4. Proxy Paketlemesi (Sertifika hatasını burada aşıyoruz)
            var finalUrl = `${config.proxyUrl}?url=${encodeURIComponent(rawStreamUrl)}&referer=${encodeURIComponent("https://hotstream.club/")}`;

            return [{
                name: "HotStream - " + query,
                url: finalUrl,
                headers: {
                    'User-Agent': deviceUA,
                    'Referer': "https://hotstream.club/",
                    'Origin': "https://hotstream.club"
                }
            }];
        }

        return []; // Link bulunamadıysa boş dön

    } catch (e) {
        return [];
    }
}

globalThis.getStreams = getStreams;
