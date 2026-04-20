const PROVIDER_NAME = "WatchBuddy_V14";
const BASE_URL = "https://stream.watchbuddy.tv";

function getStreams(args) {
    var tmdbId = (typeof args === 'object') ? (args.tmdbId || args.id) : args;

    return new Promise(function(resolve) {
        if (!tmdbId) return resolve([]);

        // 1. TMDB'den temiz isim ve yıl al (Doğru eşleşme için şart)
        fetch("https://api.themoviedb.org/3/movie/" + tmdbId + "?api_key=4ef0d7355d9ffb5151e987764708ce96&language=tr-TR")
        .then(res => res.json())
        .then(data => {
            var title = data.title || data.original_title;
            var year = (data.release_date || "").split("-")[0];
            
            // 2. Senin paylaştığın JSON yapısını simüle eden "Direct API" yöntemi
            // WatchBuddy'nin en çok kullanılan 4 eklentisini doğrudan sorguluyoruz
            var providers = ["SelcukFlix", "FilmMakinesi", "HDFilmCehennemi", "Dizipal"];
            
            var promises = providers.map(p => {
                // Her provider için direkt izle/yönlendir linkini deniyoruz
                var directUrl = BASE_URL + "/izle/" + p + "?url=" + encodeURIComponent("https://www.google.com/search?q=" + encodeURIComponent(title + " " + year));
                
                return fetch(directUrl, { headers: { "Referer": BASE_URL + "/" } })
                    .then(res => res.text())
                    .then(html => {
                        // Sayfa içinde m3u8 veya video linki var mı?
                        var fileMatch = html.match(/file["']?\s*:\s*["']([^"']+)["']/);
                        if (fileMatch) {
                            return {
                                name: p,
                                title: title + " (" + p + ")",
                                url: fileMatch[1].replace(/\\/g, ""),
                                quality: "1080p"
                            };
                        }
                        return null;
                    })
                    .catch(() => null);
            });

            return Promise.all(promises);
        })
        .then(results => {
            var finalResults = results.filter(r => r !== null);
            console.error("[" + PROVIDER_NAME + "] Bulunan Kaynak Sayısı: " + finalResults.length);
            resolve(finalResults);
        })
        .catch(e => {
            console.error("[" + PROVIDER_NAME + "] Kritik Hata: " + e.message);
            resolve([]);
        });
    });
}

globalThis.getStreams = getStreams;
