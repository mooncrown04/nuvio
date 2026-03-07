/**
 * Provider: DDizi (v47 - Sniper Fix)
 */
(function() {
    const getStreams = async (tmdbId, mediaType, seasonNum, episodeNum) => {
        const mainUrl = "https://www.ddizi.im";
        const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36";

        try {
            if (mediaType !== 'tv') return [];

            // 1. TMDB Bilgisi
            const tmdbRes = await fetch(`https://api.themoviedb.org/3/tv/${tmdbId}?api_key=4ef0d7355d9ffb5151e987764708ce96&language=tr-TR`);
            const tmdbData = await tmdbRes.json();
            const query = tmdbData.name || tmdbData.original_name;

            // 2. Arama (Sadece dizi ismini gönderiyoruz)
            const searchRes = await fetch(`${mainUrl}/arama/`, {
                method: "POST",
                headers: { "Content-Type": "application/x-www-form-urlencoded", "User-Agent": UA, "Referer": mainUrl },
                body: `arama=${encodeURIComponent(query)}`
            });
            const searchHtml = await searchRes.text();

            // 3. Bölüm Linkini Nokta Atışı Yakala
            // Bu regex, içinde hem bölüm numarasını hem de 'izle' kelimesini barındıran linkleri arar
            const searchPattern = new RegExp(`href="([^"]*${episodeNum}-(?:bolum|Bölüm|bolum-izle)[^"]*)"`, 'i');
            const searchMatch = searchHtml.match(searchPattern);
            
            if (!searchMatch) return [];
            const epUrl = searchMatch[1].startsWith('http') ? searchMatch[1] : mainUrl + (searchMatch[1][0] === '/' ? '' : '/') + searchMatch[1];

            // 4. Bölüm Sayfasından Player'ı Al
            const epRes = await fetch(epUrl, { headers: { "User-Agent": UA, "Referer": mainUrl } });
            const epHtml = await epRes.text();
            
            // Birden fazla player olabilir, 'oynat' içeren ilkini alıyoruz
            const playerMatch = epHtml.match(/\/player\/oynat\/[a-z0-9]+/i);
            if (!playerMatch) return [];
            const playerUrl = mainUrl + playerMatch[0];

            // 5. Player Sayfasını Çek ve Video Linkini Bul
            const pRes = await fetch(playerUrl, { headers: { "User-Agent": UA, "Referer": epUrl } });
            const pHtml = await pRes.text();
            
            // Bazı playerlarda video linki 'file:' yerine 'src:' veya direkt 'https' olarak bulunur
            const fileMatch = pHtml.match(/file:\s*["']([^"']+)["']/i) || pHtml.match(/src\s*:\s*["']([^"']+)["']/i);
            if (!fileMatch) return [];

            let videoUrl = fileMatch[1];
            if (videoUrl.startsWith('//')) videoUrl = 'https:' + videoUrl;

            return [{
                name: "DDizi (v47 Stable)",
                url: videoUrl,
                quality: "1080p",
                headers: {
                    "User-Agent": UA,
                    "Referer": playerUrl, // Kritik: Sunucu videonun bu sayfadan istendiğini görmeli
                    "Origin": mainUrl,
                    "Range": "bytes=0-" // ExoPlayer'ın bazı 403 durumlarını aşmasına yardımcı olabilir
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
