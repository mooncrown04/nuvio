/**
 * Provider: DDizi (v46 - Final Fix)
 */
(function() {
    const getStreams = async (tmdbId, mediaType, seasonNum, episodeNum) => {
        const mainUrl = "https://www.ddizi.im";
        const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

        try {
            if (mediaType !== 'tv') return [];

            // 1. TMDB Verisi
            const tmdbRes = await fetch(`https://api.themoviedb.org/3/tv/${tmdbId}?api_key=4ef0d7355d9ffb5151e987764708ce96&language=tr-TR`);
            const tmdbData = await tmdbRes.json();
            const query = tmdbData.name || tmdbData.original_name;

            // 2. Arama
            const searchRes = await fetch(`${mainUrl}/arama/`, {
                method: "POST",
                headers: { "Content-Type": "application/x-www-form-urlencoded", "User-Agent": UA, "Referer": mainUrl },
                body: `arama=${encodeURIComponent(query)}`
            });
            const searchHtml = await searchRes.text();

            // 3. Bölüm Linki (Daha esnek regex)
            const regex = new RegExp(`href="([^"]*${episodeNum}-(?:bolum|Bölüm)[^"]*)"`, 'i');
            const match = searchHtml.match(regex);
            if (!match) return [];

            const epUrl = match[1].startsWith('http') ? match[1] : mainUrl + (match[1][0] === '/' ? '' : '/') + match[1];

            // 4. Bölüm Sayfası ve Player ID
            const epRes = await fetch(epUrl, { headers: { "User-Agent": UA, "Referer": mainUrl } });
            const epHtml = await epRes.text();
            const playerMatch = epHtml.match(/\/player\/oynat\/([a-z0-9]+)/i);
            if (!playerMatch) return [];

            // 5. Player Sayfası ve Video Linki
            const playerUrl = mainUrl + playerMatch[0];
            const pRes = await fetch(playerUrl, { headers: { "User-Agent": UA, "Referer": epUrl } });
            const pHtml = await pRes.text();
            
            const fileMatch = pHtml.match(/file:\s*["']([^"']+)["']/i);
            if (!fileMatch) return [];

            let videoUrl = fileMatch[1];
            if (videoUrl.startsWith('//')) videoUrl = 'https:' + videoUrl;

            return [{
                name: "DDizi (v46)",
                url: videoUrl,
                quality: "1080p",
                headers: {
                    "User-Agent": UA,
                    "Referer": playerUrl,
                    "Origin": mainUrl
                }
            }];

        } catch (e) {
            return [];
        }
    };

    // Fonksiyonu dışarı aktar (ZORUNLU KISIM)
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = { getStreams };
    } else {
        globalThis.getStreams = getStreams;
    }
})();
