const PROVIDER_NAME = "WatchBuddy_V32_FinalFix";
const BASE_URL = "https://stream.watchbuddy.tv";

async function getStreams(args) {
    let tmdbId = (typeof args === 'object') ? (args.tmdbId || args.id) : args;
    if (!tmdbId) return [];

    try {
        const tmdbRes = await fetch(`https://api.themoviedb.org/3/movie/${tmdbId}?api_key=4ef0d7355d9ffb5151e987764708ce96&language=tr-TR`);
        const data = await tmdbRes.json();
        const title = data.title;

        // ADIM 1: Arama yaparken 422 almamak için tüm parametreleri veriyoruz
        const searchUrl = `${BASE_URL}/api/v1/search?q=${encodeURIComponent(title)}&type=movie&id=${tmdbId}`;
        
        console.error(`[${PROVIDER_NAME}] Sorgulanıyor: ${searchUrl}`);

        const response = await fetch(searchUrl, {
            headers: { "X-Requested-With": "XMLHttpRequest" }
        });

        // HTML dönme ihtimaline karşı kontrol (JSON parse hatasını önler)
        const contentType = response.headers.get("content-type");
        if (!contentType || !contentType.includes("application/json")) {
            console.error(`[${PROVIDER_NAME}] Sunucu JSON yerine HTML döndü! Bypass açılıyor.`);
            return tunnelFallback(title, tmdbId);
        }

        const json = await response.json();
        let items = json.result || json.results || [];

        if (items.length === 0) return tunnelFallback(title, tmdbId);

        return items.map(item => {
            // ADIM 2: ExoPlayer'ın 422 almasını önlemek için 'headers' ekliyoruz
            return {
                name: item.provider,
                title: `${item.title} [${item.provider}]`,
                url: `${BASE_URL}/izle/${item.provider}?url=${encodeURIComponent(item.url || item.path)}`,
                quality: "1080p",
                // BU KISIM EXO PLAYER İÇİN ŞART:
                headers: {
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0",
                    "Referer": BASE_URL + "/",
                    "Origin": BASE_URL
                }
            };
        });

    } catch (e) {
        console.error(`[${PROVIDER_NAME}] Hata Yakalandı: ${e.message}`);
        return tunnelFallback("Bypass", tmdbId);
    }
}

function tunnelFallback(title, tmdbId) {
    // Logdaki '<' hatasını aşmak için en güvenli liman
    return [{
        name: "SineWix (Security Bypass)",
        url: `${BASE_URL}/izle/SineWix?url=http://px-webservisler:2585/sinewix/movie/${tmdbId}`,
        quality: "1080p",
        headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0",
            "Referer": BASE_URL + "/"
        }
    }];
}

globalThis.getStreams = getStreams;
