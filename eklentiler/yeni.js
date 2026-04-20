const PROVIDER_NAME = "WatchBuddy_V27_Security";
const BASE_URL = "https://stream.watchbuddy.tv";

async function getStreams(args) {
    let tmdbId = (typeof args === 'object') ? (args.tmdbId || args.id) : args;
    if (!tmdbId) return [];

    try {
        const tmdbRes = await fetch(`https://api.themoviedb.org/3/movie/${tmdbId}?api_key=4ef0d7355d9ffb5151e987764708ce96&language=tr-TR`);
        const data = await tmdbRes.json();
        const title = data.title;

        // GÜVENLİK DUVARINI GEÇMEK İÇİN ÖZEL BAŞLIKLAR
        const secureHeaders = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "X-Requested-With": "XMLHttpRequest",
            "Referer": BASE_URL + "/", // SAMEORIGIN kontrolünü geçmek için kritik
            "Origin": BASE_URL,        // Cross-Origin politikasını kandırmak için
            "Accept": "application/json, text/javascript, */*; q=0.01"
        };

        const searchUrl = `${BASE_URL}/api/v1/search?q=${encodeURIComponent(title)}&type=movie`;
        const response = await fetch(searchUrl, { headers: secureHeaders });

        if (!response.ok) throw new Error("Security Block");

        const json = await response.json();
        let items = json.result || json.results || [];
        
        return items.map(item => {
            // Sunucunun Cross-Origin engeline takılmamak için 
            // Video linkini doğrudan değil, sunucu üzerinden geçiyormuş gibi manipüle ediyoruz
            let rawUrl = item.url || item.path;
            let finalUrl = `${BASE_URL}/izle/${item.provider}?url=${encodeURIComponent(rawUrl)}&baslik=${encodeURIComponent(title)}`;

            return {
                name: item.provider,
                title: `${item.title} [${item.provider}]`,
                url: finalUrl,
                quality: "1080p",
                // ExoPlayer'a sunucu başlıklarını taklit etmesini söylüyoruz
                headers: {
                    "Referer": BASE_URL + "/",
                    "Origin": BASE_URL,
                    "User-Agent": secureHeaders["User-Agent"]
                }
            };
        });

    } catch (e) {
        // Hata durumunda manuel bypass (px-webservisler sunucu içi olduğu için güvenlik duvarına takılmaz)
        return [{
            name: "SineWix (Security Bypass)",
            url: `${BASE_URL}/izle/SineWix?url=http://px-webservisler:2585/sinewix/movie/${tmdbId}`,
            quality: "1080p",
            headers: { "Referer": BASE_URL }
        }];
    }
}

globalThis.getStreams = getStreams;
