/**
 * Provider: DDizi (v48 - Security Bypass)
 */
(function() {
    const getStreams = async (tmdbId, mediaType, seasonNum, episodeNum) => {
        const mainUrl = "https://www.ddizi.im";
        const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36";

        try {
            if (mediaType !== 'tv') return [];

            const tmdbRes = await fetch(`https://api.themoviedb.org/3/tv/${tmdbId}?api_key=4ef0d7355d9ffb5151e987764708ce96&language=tr-TR`);
            const tmdbData = await tmdbRes.json();
            const query = tmdbData.name || tmdbData.original_name;

            const searchRes = await fetch(`${mainUrl}/arama/`, {
                method: "POST",
                headers: { "Content-Type": "application/x-www-form-urlencoded", "User-Agent": UA, "Referer": mainUrl },
                body: `arama=${encodeURIComponent(query)}`
            });
            const searchHtml = await searchRes.text();

            // Sadece asıl dizi linkine odaklan (popüler diziler listesini atla)
            const searchPattern = new RegExp(`href="([^"]*${episodeNum}-(?:bolum|Bölüm|bolum-izle)[^"]*)"`, 'i');
            const searchMatch = searchHtml.match(searchPattern);
            if (!searchMatch) return [];

            const epUrl = searchMatch[1].startsWith('http') ? searchMatch[1] : mainUrl + (searchMatch[1][0] === '/' ? '' : '/') + searchMatch[1];
            
            const epRes = await fetch(epUrl, { headers: { "User-Agent": UA, "Referer": mainUrl } });
            const epHtml = await epRes.text();
            
            const playerMatch = epHtml.match(/\/player\/oynat\/[a-z0-9]+/i);
            if (!playerMatch) return [];
            const playerUrl = mainUrl + playerMatch[0];

            const pRes = await fetch(playerUrl, { headers: { "User-Agent": UA, "Referer": epUrl } });
            const pHtml = await pRes.text();
            
            const fileMatch = pHtml.match(/file:\s*["']([^"']+)["']/i) || pHtml.match(/src\s*:\s*["']([^"']+)["']/i);
            if (!fileMatch) return [];

            let videoUrl = fileMatch[1];
            if (videoUrl.startsWith('//')) videoUrl = 'https:' + videoUrl;

            return [{
                name: "DDizi (v48 High-Prio)",
                url: videoUrl,
                quality: "1080p",
                headers: {
                    "User-Agent": UA,
                    "Referer": playerUrl,
                    "Origin": mainUrl,
                    "Accept": "*/*",
                    "Accept-Language": "tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7",
                    "Sec-Fetch-Dest": "video",
                    "Sec-Fetch-Mode": "cors",
                    "Sec-Fetch-Site": "cross-site"
                }
            }];

        } catch (e) {
            return [];
        }
    };

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = { getStreams };
    } else {
        globalThis.getStreams = getStreams;
    }
})();
