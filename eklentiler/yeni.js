const PROVIDER_NAME = "WatchBuddy_Global";
const BASE_URL = "https://stream.watchbuddy.tv";

function getStreams(args) {
    var tmdbId = (typeof args === 'object') ? (args.tmdbId || args.id) : args;

    return new Promise(function(resolve) {
        if (!tmdbId) return resolve([]);

        // 1. TMDB'den film bilgilerini al (Enjekte etmek için lazım)
        fetch("https://api.themoviedb.org/3/movie/" + tmdbId + "?api_key=4ef0d7355d9ffb5151e987764708ce96&language=tr-TR")
        .then(res => res.json())
        .then(data => {
            var title = data.title || data.original_title;
            var poster = "https://image.tmdb.org/t/p/w500" + data.poster_path;
            var year = (data.release_date || "").split("-")[0];
            var rating = data.vote_average;

            // 2. Senin verdiğin link yapısını eklentilere enjekte ediyoruz
            // Popüler eklentilerin listesi (WatchBuddy'deki 82 eklentiden en sağlamları)
            var targetPlugins = ["SelcukFlix", "HDFilmCehennemi", "Dizipal", "FullHDFilm", "Dizigom"];
            
            console.error("[" + PROVIDER_NAME + "] Enjekte ediliyor: " + title);

            var streamPromises = targetPlugins.map(pName => {
                // Senin verdiğin URL yapısını her eklenti için simüle ediyoruz
                // Bu yapı WatchBuddy'nin o eklenti sayfasını "aramadan" açmasını sağlar
                var injectUrl = BASE_URL + "/izle/" + pName + 
                                "?url=" + encodeURIComponent("https://google.com/search?q=" + encodeURIComponent(title)) + // Geçici url
                                "&baslik=" + encodeURIComponent(title) +
                                "&poster_url=" + encodeURIComponent(poster) +
                                "&year=" + year +
                                "&rating=" + rating;

                return fetch(injectUrl, { headers: { "Referer": BASE_URL + "/" } })
                    .then(res => res.text())
                    .then(html => {
                        // Sayfa içindeki asıl video linkini (m3u8) bul
                        var fileMatch = html.match(/file["']?\s*:\s*["'](http[^"']+)["']/);
                        if (fileMatch) {
                            return {
                                name: pName,
                                title: title + " (" + pName + ")",
                                url: fileMatch[1],
                                quality: "1080p",
                                headers: { "Referer": BASE_URL + "/" }
                            };
                        }
                        return null;
                    }).catch(() => null);
            });

            return Promise.all(streamPromises);
        })
        .then(results => {
            var final = results.filter(r => r !== null);
            console.error("[" + PROVIDER_NAME + "] Enjeksiyon Sonucu: " + final.length + " kaynak.");
            resolve(final);
        })
        .catch(e => {
            console.error("[" + PROVIDER_NAME + "] Kritik Hata: " + e.message);
            resolve([]);
        });
    });
}

globalThis.getStreams = getStreams;
