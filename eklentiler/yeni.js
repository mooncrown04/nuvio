const PROVIDER_NAME = "WatchBuddy_V30_Master";
const BASE_URL = "https://stream.watchbuddy.tv";

async function getStreams(args) {
    let tmdbId = (typeof args === 'object') ? (args.tmdbId || args.id) : args;
    if (!tmdbId) return [];

    try {
        // 1. TMDB Verisi (Film Adı Lazım)
        const tmdbRes = await fetch(`https://api.themoviedb.org/3/movie/${tmdbId}?api_key=4ef0d7355d9ffb5151e987764708ce96&language=tr-TR`);
        const data = await tmdbRes.json();
        const title = data.title;

        // 2. PROXY ROUTER STRATEJİSİ (En sağlam yol)
        // Router'da 'proxy_router' olduğunu gördük. Bu demek oluyor ki sunucuda doğrudan bir /proxy yolu var.
        const proxyPath = `${BASE_URL}/proxy/search?q=${encodeURIComponent(title)}&tmdb=${tmdbId}`;

        // 3. API V1 STRATEJİSİ (Alternatif yol)
        const apiPath = `${BASE_URL}/api/v1/search?q=${encodeURIComponent(title)}&type=movie`;

        // İki kapıyı da aynı anda dene, hangisi önce gelirse!
        const results = await Promise.any([
            fetch(apiPath, { headers: { "X-Requested-With": "XMLHttpRequest" } }).then(r => r.json()),
            fetch(proxyPath, { headers: { "X-Requested-With": "XMLHttpRequest" } }).then(r => r.json())
        ]).catch(() => ({ result: [] }));

        let items = results.result || results.results || [];

        if (items.length === 0) {
            // Eğer iki kapı da kapalıysa (422/404), Manuel Tüneli (px-webservisler) patlat
            return [{
                name: "SineWix (Proxy Tüneli)",
                title: title + " [Direct Access]",
                url: `${BASE_URL}/izle/SineWix?url=http://px-webservisler:2585/sinewix/movie/${tmdbId}`,
                quality: "1080p",
                headers: { "Referer": BASE_URL }
            }];
        }

        return items.map(item => ({
            name: item.provider,
            title: `${item.title} [${item.provider}]`,
            url: `${BASE_URL}/izle/${item.provider}?url=${encodeURIComponent(item.url || item.path)}`,
            quality: "1080p"
        }));

    } catch (e) {
        // Hata anında karanlıkta kalma, tüneli ver!
        return [{
            name: "SineWix (Acil Durum)",
            url: `${BASE_URL}/izle/SineWix?url=http://px-webservisler:2585/sinewix/movie/${tmdbId}`,
            quality: "1080p"
        }];
    }
}

globalThis.getStreams = getStreams;
