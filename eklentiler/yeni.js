/**
 * Nuvio HDFC Scraper - RecTV Logic v5.0
 * TMDB ID'den film adını bulur, HDFC'de aratır ve WatchBuddy ile çözer.
 */

const PROVIDER_NAME = "HDFilmCehennemi";
const TMDB_API_KEY = "4ef0d7355d9ffb5151e987764708ce96";

function getStreams(args) {
    // Logda gördüğümüz "567609" gibi saf ID'yi veya obje içindeki id'yi yakala
    var tmdbId = (typeof args === 'object') ? (args.tmdbId || args.id) : args;
    
    console.error(`[${PROVIDER_NAME}] Başlatıldı. TMDB ID: ${tmdbId}`);

    return new Promise(function(resolve) {
        if (!tmdbId) {
            console.error(`[${PROVIDER_NAME}] HATA: TMDB ID gelmedi.`);
            return resolve([]);
        }

        // 1. ADIM: TMDB'den Film Bilgisini Çek (RecTV'deki gibi)
        var tmdbUrl = `https://api.themoviedb.org/3/movie/${tmdbId}?api_key=${TMDB_API_KEY}&language=tr-TR`;

        fetch(tmdbUrl)
            .then(function(res) { return res.json(); })
            .then(function(tmdbData) {
                var movieTitle = tmdbData.title || tmdbData.original_title;
                console.error(`[${PROVIDER_NAME}] Film Bulundu: ${movieTitle}`);

                // 2. ADIM: HDFC Sitesinde bu isimle arama yap
                var searchUrl = `https://www.hdfilmcehennemi.nl/search?q=${encodeURIComponent(movieTitle)}`;
                return fetch(searchUrl);
            })
            .then(function(res) { return res.text(); })
            .then(function(html) {
                // Arama sonuçlarından ilk film linkini yakala
                var linkMatch = html.match(/href="([^"]+)" title="[^"]+"/);
                if (!linkMatch) {
                    console.error(`[${PROVIDER_NAME}] Sitede film bulunamadı.`);
                    return resolve([]);
                }

                var fullUrl = linkMatch[1].startsWith("http") ? linkMatch[1] : "https://www.hdfilmcehennemi.nl" + linkMatch[1];
                console.error(`[${PROVIDER_NAME}] Site Linki Yakalandı: ${fullUrl}`);

                // 3. ADIM: WatchBuddy Köprüsü ile m3u8'e ulaş
                var bridgeUrl = "https://stream.watchbuddy.tv/izle/HDFilmCehennemi?url=" + encodeURIComponent(fullUrl);
                
                return fetch(bridgeUrl, {
                    headers: { "Referer": "https://stream.watchbuddy.tv/" }
                });
            })
            .then(function(res) { return res.text(); })
            .then(function(html) {
                // WatchBuddy sayfasındaki final m3u8 linkini çek
                var streamMatch = html.match(/file["']?\s*:\s*["'](http[^"']+)["']/);

                if (streamMatch && streamMatch[1]) {
                    console.error(`[${PROVIDER_NAME}] Başarılı! Akış: ${streamMatch[1]}`);
                    
                    resolve([{
                        name: PROVIDER_NAME,
                        title: "HDFC - 1080p (RecTV Logic)",
                        url: streamMatch[1],
                        quality: "1080p",
                        headers: {
                            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
                            "Referer": "https://stream.watchbuddy.tv/"
                        }
                    }]);
                } else {
                    console.error(`[${PROVIDER_NAME}] WatchBuddy linki çözemedi.`);
                    resolve([]);
                }
            })
            .catch(function(err) {
                console.error(`[${PROVIDER_NAME}] HATA OLUŞTU: ${err.message}`);
                resolve([]);
            });
    });
}

// Global tanımlama (Nuvio zorunluluğu)
globalThis.getStreams = getStreams;
