const PROVIDER_NAME = "WatchBuddy_V18";
const BASE_URL = "https://stream.watchbuddy.tv";

function getStreams(args) {
    var tmdbId = (typeof args === 'object') ? (args.tmdbId || args.id) : args;

    return new Promise(function(resolve) {
        if (!tmdbId) return resolve([]);

        // 1. TMDB'den doğru film ismini çekiyoruz
        fetch("https://api.themoviedb.org/3/movie/" + tmdbId + "?api_key=4ef0d7355d9ffb5151e987764708ce96&language=tr-TR")
        .then(res => res.json())
        .then(data => {
            var title = data.title || data.original_title;
            
            // 2. Sitenin arka plandaki arama motoruna (XHR) gidiyoruz
            var searchUrl = BASE_URL + "/api/v1/search?q=" + encodeURIComponent(title);
            console.error("[" + PROVIDER_NAME + "] API Sorgusu: " + searchUrl);

            return fetch(searchUrl, {
                headers: { 
                    "X-Requested-With": "XMLHttpRequest",
                    "Accept": "application/json"
                }
            });
        })
        .then(res => res.json())
        .then(json => {
            var results = [];
            // Gelen JSON yapısı içindeki her bir sonucu ayıklıyoruz
            var items = json.result || json.results || (Array.isArray(json) ? json : []);

            items.forEach(item => {
                // Senin verdiğin örneklerdeki kritik link yapısını yakalıyoruz
                var provider = item.provider || "HDFilmCehennemi";
                var sourceUrl = item.url || item.path;

                if (sourceUrl) {
                    // TAM OLARAK SENİN PAYLAŞTIĞIN ŞABLON:
                    // /izle/Provider?url=SİTE_LİNKİ&baslik=FİLM_ADI&content_url=SİTE_LİNKİ&poster_url=AFİŞ&year=YIL&rating=PUAN
                    var finalWatchUrl = BASE_URL + "/izle/" + provider + 
                        "?url=" + encodeURIComponent(sourceUrl) + 
                        "&baslik=" + encodeURIComponent(item.title || "") +
                        "&content_url=" + encodeURIComponent(sourceUrl) +
                        "&poster_url=" + encodeURIComponent(item.poster || "") +
                        "&year=" + (item.year || "") +
                        "&rating=" + (item.rating || "");

                    results.push({
                        name: provider,
                        title: (item.title || "Kaynak") + " [" + provider + "]",
                        url: finalWatchUrl,
                        quality: "1080p",
                        poster: item.poster
                    });
                }
            });

            console.error("[" + PROVIDER_NAME + "] Oluşturulan Link Sayısı: " + results.length);
            resolve(results);
        })
        .catch(e => {
            console.error("[" + PROVIDER_NAME + "] Bağlantı Hatası: " + e.message);
            resolve([]);
        });
    });
}

globalThis.getStreams = getStreams;
