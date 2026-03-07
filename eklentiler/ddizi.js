/**
 * Provider: DDizi (v53 - Smart Search & Filter)
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
            
            // Arama için temiz isim (Türkçe karakterleri ve boşlukları yönetelim)
            const searchSlug = originalName.toLowerCase()
                .replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ş/g, 's')
                .replace(/ı/g, 'i').replace(/ö/g, 'o').replace(/ç/g, 'c')
                .replace(/[^a-z0-9]/g, '-');

            const searchRes = await fetch(`${mainUrl}/arama/`, {
                method: "POST",
                headers: { "Content-Type": "application/x-www-form-urlencoded", "User-Agent": UA, "Referer": mainUrl },
                body: `arama=${encodeURIComponent(originalName)}`
            });
            const searchHtml = await searchRes.text();

            // Tüm /diziler/ linklerini topla
            const allLinks = searchHtml.match(/href="([^"]*\/diziler\/[^"]*)"/gi) || [];
            let seriesUrl = "";

            for (let linkTag of allLinks) {
                const link = linkTag.match(/href="([^"]*)"/i)[1];
                // TUZAKTAN KURTULMA: Linkin içinde aradığımız dizinin ismi geçiyor mu?
                // "abi-1-son-bolum" içinde "dark" geçmediği için elenecek.
                if (link.toLowerCase().includes(searchSlug) || link.toLowerCase().includes(originalName.toLowerCase().replace(/\s+/g, '-'))) {
                    seriesUrl = link.startsWith('http') ? link : mainUrl + link;
                    break;
                }
            }

            // Eğer filtreleme ile bulamadıysa, son çare olarak en basit slug'ı dene
            if (!seriesUrl) {
                seriesUrl = `${mainUrl}/diziler/${searchSlug}`;
            }

            // Dizi sayfasına git ve bölümü ara
            const seriesRes = await fetch(seriesUrl, { headers: { "User-Agent": UA, "Referer": mainUrl } });
            const seriesPageHtml = await seriesRes.text();

            const episodeRegex = new RegExp(`href="([^"]*/izle/[^"]*${episodeNum}-(?:bolum|Bölüm)[^"]*)"`, 'i');
            const epMatch = seriesPageHtml.match(episodeRegex);
            
            if (!epMatch) return [];
            const epUrl = epMatch[1].startsWith('http') ? epMatch[1] : mainUrl + epMatch[1];

            // Player safhası
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
                name: "DDizi (v53 Filtered)",
                url: videoUrl,
                quality: "1080p",
                headers: { "User-Agent": UA, "Referer": playerUrl, "Origin": mainUrl }
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
