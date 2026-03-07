/**
 * Provider: DDizi (v45 - Ultra Debug)
 */
function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
    const mainUrl = "https://www.ddizi.im";
    const UA = "Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Mobile Safari/537.36";

    return new Promise((resolve) => {
        if (mediaType !== 'tv') return resolve([]);

        // 1. TMDB Bilgisi Al
        fetch(`https://api.themoviedb.org/3/tv/${tmdbId}?api_key=4ef0d7355d9ffb5151e987764708ce96&language=tr-TR`)
        .then(res => res.json())
        .then(data => {
            const query = data.name || data.original_name;
            console.error(`[DEBUG] Aranan Dizi: ${query} | Sezon: ${seasonNum} Ep: ${episodeNum}`);
            
            // 2. Arama Yap
            return fetch(`${mainUrl}/arama/`, {
                method: "POST",
                headers: { "Content-Type": "application/x-www-form-urlencoded", "User-Agent": UA, "Referer": mainUrl },
                body: `arama=${encodeURIComponent(query)}`
            });
        })
        .then(res => res.text())
        .then(searchHtml => {
            // REGEX DÜZELTME: Daha spesifik arama yapıyoruz
            // "dizi-adi-1-sezon-5-bolum" veya "dizi-adi-5-bolum" formatlarını yakala
            const regex = new RegExp(`href="([^"]*${episodeNum}-(?:bolum|Bölüm|bolum-izle)[^"]*)"`, 'i');
            const match = searchHtml.match(regex);
            
            if (!match) {
                console.error("[DEBUG] Bölüm linki bulunamadı! Arama sayfası HTML uzunluğu: " + searchHtml.length);
                return null;
            }

            const epUrl = match[1].startsWith('http') ? match[1] : mainUrl + (match[1].startsWith('/') ? '' : '/') + match[1];
            console.error("[DEBUG] Gidilen Bölüm Sayfası: " + epUrl);
            return fetch(epUrl, { headers: { "User-Agent": UA, "Referer": mainUrl } });
        })
        .then(res => res ? res.text() : null)
        .then(html => {
            if (!html) return null;
            const playerMatch = html.match(/\/player\/oynat\/([a-z0-9]+)/i);
            
            if (!playerMatch) {
                console.error("[DEBUG] Player ID (oynat/xxx) bulunamadı!");
                return null;
            }

            const playerUrl = mainUrl + playerMatch[0];
            console.error("[DEBUG] Player Sayfası Çekiliyor: " + playerUrl);
            return fetch(playerUrl, { headers: { "User-Agent": UA, "Referer": mainUrl } }).then(r => r.text().then(t => ({h: t, u: r.url})));
        })
        .then(result => {
            if (!result || !result.h) return resolve([]);

            // Video URL yakalama
            const fileMatch = result.h.match(/file:\s*["']([^"']+)["']/i);
            if (!fileMatch) {
                console.error("[DEBUG] HTML içinde 'file:' etiketi yok!");
                return resolve([]);
            }

            let videoUrl = fileMatch[1];
            if (videoUrl.startsWith('//')) videoUrl = 'https:' + videoUrl;

            console.error("[DEBUG] EXOPLAYER'A GİDEN URL: " + videoUrl);
            console.error("[DEBUG] KULLANILAN REFERER: " + result.u);

            resolve([{
                name: "DDizi (v45 Debug)",
                url: videoUrl,
                quality: "1080p",
                headers: {
                    "User-Agent": UA,
                    "Referer": result.u, // Player URL'sini referer olarak gönderiyoruz
                    "Origin": "https://www.ddizi.im",
                    "X-Requested-With": "XMLHttpRequest"
                }
            }]);
        })
        .catch(err => {
            console.error("[DEBUG] HATA: " + err.message);
            resolve([]);
        });
    });
}
