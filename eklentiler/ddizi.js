/**
 * Provider: DDizi (v49 - Precise Targeting)
 */
(function() {
    const getStreams = async (tmdbId, mediaType, seasonNum, episodeNum) => {
        const mainUrl = "https://www.ddizi.im";
        const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36";

        try {
            if (mediaType !== 'tv') return [];

            // 1. TMDB'den dizi ismini al
            const tmdbRes = await fetch(`https://api.themoviedb.org/3/tv/${tmdbId}?api_key=4ef0d7355d9ffb5151e987764708ce96&language=tr-TR`);
            const tmdbData = await tmdbRes.json();
            const originalName = tmdbData.name || tmdbData.original_name;
            // Dizi ismini URL dostu (slug) hale getir (Örn: "Dark" -> "dark")
            const querySlug = originalName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

            // 2. Arama yap
            const searchRes = await fetch(`${mainUrl}/arama/`, {
                method: "POST",
                headers: { "Content-Type": "application/x-www-form-urlencoded", "User-Agent": UA, "Referer": mainUrl },
                body: `arama=${encodeURIComponent(originalName)}`
            });
            const searchHtml = await searchRes.text();

            // 3. DOĞRU LİNKİ BUL: Hem dizi ismini hem bölüm numarasını içermeli
            // Sahtekarlar gibi rastgele linkleri eler
            const regex = new RegExp(`href="([^"]*${querySlug}[^"]*${episodeNum}-(?:bolum|Bölüm)[^"]*)"`, 'i');
            let match = searchHtml.match(regex);

            // Eğer dizi ismiyle eşleşme bulamazsa, daha genel ama yine de bölüm odaklı ara
            if (!match) {
                const fallbackRegex = new RegExp(`href="([^"]*izle/[^"]*${episodeNum}-(?:bolum|Bölüm)[^"]*)"`, 'i');
                match = searchHtml.match(fallbackRegex);
            }

            if (!match) return [];
            const epUrl = match[1].startsWith('http') ? match[1] : mainUrl + (match[1][0] === '/' ? '' : '/') + match[1];

            // 4. Bölüm Sayfası
            const epRes = await fetch(epUrl, { headers: { "User-Agent": UA, "Referer": mainUrl } });
            const epHtml = await epRes.text();
            
            const playerMatch = epHtml.match(/\/player\/oynat\/[a-z0-9]+/i);
            if (!playerMatch) return [];
            const playerUrl = mainUrl + playerMatch[0];

            // 5. Player Sayfası ve Video Linki
            const pRes = await fetch(playerUrl, { headers: { "User-Agent": UA, "Referer": epUrl } });
            const pHtml = await pRes.text();
            
            const fileMatch = pHtml.match(/file:\s*["']([^"']+)["']/i);
            if (!fileMatch) return [];

            let videoUrl = fileMatch[1];
            if (videoUrl.startsWith('//')) videoUrl = 'https:' + videoUrl;

            return [{
                name: "DDizi (v49 Target)",
                url: videoUrl,
                quality: "1080p",
                headers: {
                    "User-Agent": UA,
                    "Referer": playerUrl,
                    "Origin": mainUrl,
                    "Range": "bytes=0-"
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
