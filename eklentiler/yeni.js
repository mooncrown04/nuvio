const PROVIDER_NAME = "WatchBuddy_V21";
const BASE_URL = "https://stream.watchbuddy.tv";

async function getStreams(args) {
    var tmdbId = (typeof args === 'object') ? (args.tmdbId || args.id) : args;
    if (!tmdbId) return [];

    try {
        // 1. Film Adını Al
        const tmdbRes = await fetch(`https://api.themoviedb.org/3/movie/${tmdbId}?api_key=4ef0d7355d9ffb5151e987764708ce96&language=tr-TR`);
        const tmdbData = await tmdbRes.json();
        const title = tmdbData.title || tmdbData.original_title;

        // 2. Arama Sayfasını Tara
        console.error(`[${PROVIDER_NAME}] Aranan: ${title}`);
        const searchRes = await fetch(`${BASE_URL}/search?q=${encodeURIComponent(title)}`);
        const html = await searchRes.text();

        let results = [];
        const urlPattern = /(?:url|path|href)["']?\s*[:=]\s*["']([^"'\s>]+)/g;
        let match;

        while ((match = urlPattern.exec(html)) !== null) {
            let foundPath = match[1].replace(/\\/g, "");
            if (foundPath.includes("icerik") || foundPath.includes("movie") || foundPath.includes("sinewix")) {
                let providerMatch = foundPath.match(/icerik\/([^/?]+)/) || foundPath.match(/([a-zA-Z]+)(?=\/movie)/);
                let provider = providerMatch ? providerMatch[1] : "Kaynak";
                let fullUrl = foundPath.startsWith("http") ? foundPath : BASE_URL + foundPath;

                // 3. KRİTİK ADIM: İzleme sayfasına gidip asıl m3u8 linkini söküyoruz
                // ExoPlayer'ın hata almaması için bu şart
                const pageRes = await fetch(fullUrl);
                const pageHtml = await pageRes.text();
                
                // Sayfa içindeki gizli m3u8 veya mp4 linkini bulalım
                const videoMatch = pageHtml.match(/["'](http[^"']+\.(?:m3u8|mp4|mkv)[^"']*)["']/i);
                
                if (videoMatch) {
                    results.push({
                        name: provider,
                        title: `${title} (${provider})`,
                        url: videoMatch[1].replace(/\\/g, ""), // Doğrudan oynatılabilir link
                        quality: "1080p",
                        isM3U8: videoMatch[1].includes("m3u8")
                    });
                }
            }
        }

        const uniqueResults = results.filter((v, i, a) => a.findIndex(t => (t.url === v.url)) === i);
        console.error(`[${PROVIDER_NAME}] Oynatılabilir Link Sayısı: ${uniqueResults.length}`);
        return uniqueResults;

    } catch (e) {
        console.error(`[${PROVIDER_NAME}] Hata: ${e.message}`);
        return [];
    }
}

globalThis.getStreams = getStreams;
