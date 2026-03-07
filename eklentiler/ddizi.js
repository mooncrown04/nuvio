/**
 * Provider: DDizi (v51 - Cloudstream Deep Linker)
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

            // 2. Arama yaparak ANA DİZİ SAYFASINI bul (/diziler/...)
            const searchRes = await fetch(`${mainUrl}/arama/`, {
                method: "POST",
                headers: { "Content-Type": "application/x-www-form-urlencoded", "User-Agent": UA, "Referer": mainUrl },
                body: `arama=${encodeURIComponent(originalName)}`
            });
            const searchHtml = await searchRes.text();

            // Sadece /diziler/ formatındaki linkleri ara (Dizi ana sayfası)
            const seriesMatch = searchHtml.match(new RegExp(`href="([^"]*/diziler/[^"]*)"`, 'i'));
            if (!seriesMatch) return [];
            const seriesUrl = seriesMatch[1].startsWith('http') ? seriesMatch[1] : mainUrl + seriesMatch[1];

            // 3. Ana Dizi Sayfasına git ve BÖLÜM LİNKİNİ bul (/izle/...)
            const seriesRes = await fetch(seriesUrl, { headers: { "User-Agent": UA, "Referer": mainUrl } });
            const seriesPageHtml = await seriesRes.text();

            // Bölüm numarasını içeren linki nokta atışı ara
            const episodeRegex = new RegExp(`href="([^"]*/izle/[^"]*${episodeNum}-(?:bolum|Bölüm)[^"]*)"`, 'i');
            const epMatch = seriesPageHtml.match(episodeRegex);
            
            if (!epMatch) return [];
            const epUrl = epMatch[1].startsWith('http') ? epMatch[1] : mainUrl + epMatch[1];

            // 4. Bölüm Sayfasından PLAYER'ı al
            const epRes = await fetch(epUrl, { headers: { "User-Agent": UA, "Referer": seriesUrl } });
            const epHtml = await epRes.text();
            
            const playerMatch = epHtml.match(/\/player\/oynat\/[a-z0-9]+/i);
            if (!playerMatch) return [];
            const playerUrl = mainUrl + playerMatch[0];

            // 5. Player Sayfası ve Video Dosyası
            const pRes = await fetch(playerUrl, { headers: { "User-Agent": UA, "Referer": epUrl } });
            const pHtml = await pRes.text();
            
            const fileMatch = pHtml.match(/file:\s*["']([^"']+)["']/i);
            if (!fileMatch) return [];

            let videoUrl = fileMatch[1];
            if (videoUrl.startsWith('//')) videoUrl = 'https:' + videoUrl;

            return [{
                name: "DDizi (v51 CloudLogic)",
                url: videoUrl,
                quality: "1080p",
                headers: {
                    "User-Agent": UA,
                    "Referer": playerUrl,
                    "Origin": mainUrl,
                    "Accept": "*/*",
                    "Sec-Fetch-Mode": "no-cors"
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
