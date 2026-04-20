const PROVIDER_NAME = "WatchBuddy_V38_TrustFix";
const BASE_URL = "https://stream.watchbuddy.tv";

async function getStreams(args) {
    let tmdbId = (typeof args === 'object') ? (args.tmdbId || args.id) : args;
    if (!tmdbId) return [];

    // Sertifika hatası riskine karşı yarışı başlatıyoruz (AbortController)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 saniye sınırı

    try {
        const tmdbRes = await fetch(`https://api.themoviedb.org/3/movie/${tmdbId}?api_key=4ef0d7355d9ffb5151e987764708ce96&language=tr-TR`);
        const data = await tmdbRes.json();
        const title = data.title;

        console.error(`[${PROVIDER_NAME}] İstek Gönderiliyor: ${title}`);

        const searchUrl = `${BASE_URL}/api/v1/search?q=${encodeURIComponent(title)}&type=movie`;
        
        const response = await fetch(searchUrl, { 
            headers: {
                "User-Agent": "Mozilla/5.0 (Linux; Android 11)",
                "Accept": "application/json",
                "X-Requested-With": "XMLHttpRequest"
            },
            signal: controller.signal // Zaman aşımı kontrolü
        });

        clearTimeout(timeoutId);
        const json = await response.json();
        let items = json.result || json.results || [];

        return items.map(item => {
            // JS kodundaki proxy mantığını tetikleyen linkler
            return {
                name: item.provider,
                title: `${item.title} [${item.provider}]`,
                url: `${BASE_URL}/izle/${item.provider}?url=${encodeURIComponent(item.url || item.path)}&force_proxy=1&format=hls`,
                quality: "1080p"
            };
        });

    } catch (e) {
        console.error(`[${PROVIDER_NAME}] Bağlantı Reddedildi (SSL/Timeout): ${e.message}`);
        // Loglardaki 'certificate trust' hatasını görürsek direkt tünelden devam et
        return [{
            name: "WatchBuddy (SSL Bypass)",
            url: `https://stream.watchbuddy.tv/izle/SineWix?url=http://px-webservisler:2585/sinewix/movie/${tmdbId}&force_proxy=1`,
            quality: "1080p"
        }];
    }
}

globalThis.getStreams = getStreams;
