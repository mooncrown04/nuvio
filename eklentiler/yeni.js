const PROVIDER_NAME = "HDFilmCehennemi";
const BASE_URL = "https://www.hdfilmcehennemi.nl";

function getStreams(args) {
    var tmdbId = (typeof args === 'object') ? (args.tmdbId || args.id) : args;
    console.error(`[${PROVIDER_NAME}] TMDB ID: ${tmdbId}`);

    return new Promise(function(resolve) {
        if (!tmdbId) return resolve([]);

        // 1. TMDB'den film ismini öğren
        fetch(`https://api.themoviedb.org/3/movie/${tmdbId}?api_key=4ef0d7355d9ffb5151e987764708ce96&language=tr-TR`)
        .then(res => res.json())
        .then(tmdbData => {
            var movieTitle = tmdbData.title || tmdbData.original_title;
            console.error(`[${PROVIDER_NAME}] Aranan Başlık: ${movieTitle}`);
            
            // 2. Sitede arama yap
            return fetch(`${BASE_URL}/search?q=${encodeURIComponent(movieTitle)}`);
        })
        .then(res => res.text())
        .then(html => {
            // KRİTİK: Ana sayfa linkini (/) veya boş linkleri filtrele. 
            // Sadece içinde bir 'slug' olan ve film/dizi linki olabilecek yapıyı ara.
            var links = html.match(/href="([^"]+\/[^"\/]+\/)"/g); 
            var finalSlug = "";

            if (links) {
                for (var i = 0; i < links.length; i++) {
                    var link = links[i].match(/href="([^"]+)"/)[1];
                    // Ana sayfa, search veya kategori linklerini atla
                    if (link !== "/" && !link.includes("/search") && !link.includes("/kategori") && link.length > 5) {
                        finalSlug = link;
                        break; // İlk gerçek film linkini bulduk
                    }
                }
            }

            if (!finalSlug) {
                console.error(`[${PROVIDER_NAME}] HATA: Uygun film sayfası bulunamadı.`);
                return resolve([]);
            }

            var fullUrl = finalSlug.startsWith("http") ? finalSlug : BASE_URL + finalSlug;
            console.error(`[${PROVIDER_NAME}] Doğru Sayfa Yakalandı: ${fullUrl}`);

            // 3. WatchBuddy Köprüsü
            var bridgeUrl = "https://stream.watchbuddy.tv/izle/HDFilmCehennemi?url=" + encodeURIComponent(fullUrl);
            return fetch(bridgeUrl, { headers: { "Referer": "https://stream.watchbuddy.tv/" } });
        })
        .then(res => res.text())
        .then(html => {
            // m3u8 veya mp4 linkini çek
            var streamMatch = html.match(/file["']?\s*:\s*["'](http[^"']+)["']/);
            if (streamMatch && streamMatch[1]) {
                console.error(`[${PROVIDER_NAME}] Akış Linki: ${streamMatch[1]}`);
                resolve([{
                    name: PROVIDER_NAME,
                    title: "HDFC 1080p",
                    url: streamMatch[1],
                    quality: "1080p",
                    headers: { "Referer": "https://stream.watchbuddy.tv/" }
                }]);
            } else {
                console.error(`[${PROVIDER_NAME}] WatchBuddy sayfada video bulamadı.`);
                resolve([]);
            }
        })
        .catch(err => {
            console.error(`[${PROVIDER_NAME}] HATA: ${err.message}`);
            resolve([]);
        });
    });
}

globalThis.getStreams = getStreams;
