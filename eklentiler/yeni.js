const PROVIDER_NAME = "WatchBuddy_API";
const BASE_URL = "https://stream.watchbuddy.tv";

function getStreams(args) {
    var tmdbId = (typeof args === 'object') ? (args.tmdbId || args.id) : args;

    return new Promise(function(resolve) {
        if (!tmdbId) return resolve([]);

        // 1. Önce TMDB'den temiz film ismini al
        fetch("https://api.themoviedb.org/3/movie/" + tmdbId + "?api_key=4ef0d7355d9ffb5151e987764708ce96&language=tr-TR")
        .then(res => res.json())
        .then(data => {
            var title = data.title || data.original_title;
            // Sitenin arama motoruna (HTML sayfasına değil, API'sine) gidiyoruz
            var apiUrl = BASE_URL + "/api/v1/search?q=" + encodeURIComponent(title);
            
            console.error("[" + PROVIDER_NAME + "] API İsteği: " + apiUrl);

            return fetch(apiUrl, {
                headers: { 
                    "Accept": "application/json",
                    "X-Requested-With": "XMLHttpRequest" // JS isteği gibi görünmek için
                }
            });
        })
        .then(res => {
            console.error("[" + PROVIDER_NAME + "] API Yanıt Kodu: " + res.status);
            return res.json();
        })
        .then(json => {
            // Paylaştığın JSON yapısındaki 'result' veya 'results' objesini kontrol et
            var data = json.result || json.results || [];
            if (!Array.isArray(data)) data = [data]; // Tekli objeyi diziye çevir

            var results = data.map(item => {
                if (item.url) {
                    return {
                        name: item.provider || "WatchBuddy",
                        title: (item.title || "Kaynak") + " [" + (item.year || "") + "]",
                        url: decodeURIComponent(item.url).replace(/\\/g, ""),
                        quality: "1080p",
                        poster: item.poster
                    };
                }
                return null;
            }).filter(r => r !== null);

            console.error("[" + PROVIDER_NAME + "] Toplam Link: " + results.length);
            resolve(results);
        })
        .catch(e => {
            console.error("[" + PROVIDER_NAME + "] Bağlantı Hatası: " + e.message);
            resolve([]);
        });
    });
}

globalThis.getStreams = getStreams;
