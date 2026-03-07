/**
 * Provider: DDizi (v52 - Anti-Trap & Matcher)
 */
(function() {
    const getStreams = async (tmdbId, mediaType, seasonNum, episodeNum) => {
        const mainUrl = "https://www.ddizi.im";
        const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36";

        try {
            if (mediaType !== 'tv') return [];

            const tmdbRes = await fetch(`https://api.themoviedb.org/3/tv/${tmdbId}?api_key=4ef0d7355d9ffb5151e987764708ce96&language=tr-TR`);
            const tmdbData = await tmdbRes.json();
            const originalName = tmdbData.name || tmdbData.original_name;
            const searchSlug = originalName.toLowerCase().trim();

            const searchRes = await fetch(`${mainUrl}/arama/`, {
                method: "POST",
                headers: { "Content-Type": "application/x-www-form-urlencoded", "User-Agent": UA, "Referer": mainUrl },
                body: `arama=${encodeURIComponent(originalName)}`
            });
            const searchHtml = await searchRes.text();

            // 1. Popüler dizi tuzağından kurtulmak için sadece 'dizi-list' veya sonuç alanına odaklan
            // Arama sonuçları genellikle bir liste içindedir. Linkleri dizi ismiyle doğrula.
            const links = searchHtml.match(/href="([^"]*\/diziler\/[^"]*)"/gi) || [];
            let seriesUrl = "";

            for (let link of links) {
                const cleanLink = link.match(/href="([^"]*)"/i)[1];
                // Eğer link aradığımız dizinin ismini içeriyorsa (Örn: /dark-hd)
                if (cleanLink.toLowerCase().includes(searchSlug.replace(/\s+/g, '-'))) {
                    seriesUrl = cleanLink.startsWith('http') ? cleanLink : mainUrl + cleanLink;
                    break;
                }
            }

            if (!seriesUrl) return [];

            // 2. Dizi Sayfasına git
            const seriesRes = await fetch(seriesUrl, { headers: { "User-Agent": UA, "Referer": mainUrl } });
            const seriesPageHtml = await seriesRes.text();

            // 3. Bölüm Linkini bul (Nokta atışı: Sezon ve Bölüm kontrolü)
            // Örn: "1. Sezon 5. Bölüm" veya sadece "5. Bölüm"
            const episodeRegex = new RegExp(`href="([^"]*/izle/[^"]*${episodeNum}-(?:bolum|Bölüm)[^"]*)"`, 'i');
            const epMatch = seriesPageHtml.match(episodeRegex);
            
            if (!epMatch) return [];
            const epUrl = epMatch[1].startsWith('http') ? epMatch[1] : mainUrl + epMatch[1];

            // 4. Player ve Video Dosyası
            const epRes = await fetch(epUrl, { headers: { "User-Agent": UA, "Referer": seriesUrl } });
            const epHtml = await epRes.text();
            
            const playerMatch = epHtml.match(/\/player\/oynat\/[a-z0-9]+/i);
            if (!playerMatch) return [];
            const playerUrl = mainUrl + playerMatch[0];

            const pRes = await fetch(playerUrl, { headers: { "User-Agent": UA, "Referer": epUrl } });
            const pHtml = await pRes.text();
            
            const fileMatch = pHtml.match(/file:\s*["']([^"']+)["']/i);
            if (!fileMatch) return [];

            let videoUrl = fileMatch[1];
            if (videoUrl.startsWith('//')) videoUrl = 'https:' + videoUrl;

            return [{
                name: "DDizi (v52 Matcher)",
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

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = { getStreams };
    } else {
        globalThis.getStreams = getStreams;
    }
})();
