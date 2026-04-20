// Bu kodda her şeyi birleştirdim: TMDB ID kullanımı + RecTV Arama Mantığı + HDFC Link Yapısı
const PROVIDER_NAME = "HDFilmCehennemi";
const BASE_URL = "https://www.hdfilmcehennemi.nl";

function getStreams(args) {
    // 1. ADIM: Nuvio'dan gelen o meşhur ID'yi yakala (Unutmadım!)
    var tmdbId = (typeof args === 'object') ? (args.tmdbId || args.id) : args;
    
    return new Promise(function(resolve) {
        if (!tmdbId) return resolve([]);

        // 2. ADIM: TMDB üzerinden film adını al (RecTV'de yaptığımız gibi)
        fetch("https://api.themoviedb.org/3/movie/" + tmdbId + "?api_key=4ef0d7355d9ffb5151e987764708ce96&language=tr-TR")
        .then(function(res) { return res.json(); })
        .then(function(data) {
            var searchTitle = data.title || data.original_title;
            console.error("[" + PROVIDER_NAME + "] Aranan Film: " + searchTitle);
            
            // 3. ADIM: HDFC'de ara
            return fetch(BASE_URL + "/search?q=" + encodeURIComponent(searchTitle));
        })
        .then(function(res) { return res.text(); })
        .then(function(html) {
            // 4. ADIM: Linki ayıkla (Senin verdiğin /project-hail-mary-3/ yapısına göre filtrele)
            // Sadece ana sayfa (/) olmayan ve içinde slug barındıran linki arıyoruz
            var match = html.match(/href="([^"]+\/[^"\/]+\/)"/); 
            var finalUrl = (match && match[1]) ? match[1] : "";

            if (!finalUrl || finalUrl.length < 10) {
                console.error("[" + PROVIDER_NAME + "] HATA: Film sayfası bulunamadı.");
                return resolve([]);
            }

            var fullMovieUrl = finalUrl.startsWith("http") ? finalUrl : BASE_URL + finalUrl;
            console.error("[" + PROVIDER_NAME + "] Film Sayfası: " + fullMovieUrl);

            // 5. ADIM: WatchBuddy üzerinden m3u8 çek
            var bridge = "https://stream.watchbuddy.tv/izle/HDFilmCehennemi?url=" + encodeURIComponent(fullMovieUrl);
            return fetch(bridge, { headers: { "Referer": "https://stream.watchbuddy.tv/" } });
        })
        .then(function(res) { return res.text(); })
        .then(function(html) {
            var stream = html.match(/file["']?\s*:\s*["'](http[^"']+)["']/);
            if (stream && stream[1]) {
                console.error("[" + PROVIDER_NAME + "] BAŞARILI: " + stream[1]);
                resolve([{
                    name: PROVIDER_NAME,
                    title: "1080p - HDFC",
                    url: stream[1],
                    quality: "1080p",
                    headers: { "Referer": "https://stream.watchbuddy.tv/" }
                }]);
            } else {
                resolve([]);
            }
        })
        .catch(function(e) {
            console.error("[" + PROVIDER_NAME + "] HATA: " + e.message);
            resolve([]);
        });
    });
}

globalThis.getStreams = getStreams;
