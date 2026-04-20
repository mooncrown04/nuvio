const PROVIDER_NAME = "WatchBuddy_Global";
const BASE_URL = "https://stream.watchbuddy.tv";

function getStreams(args) {
    var tmdbId = (typeof args === 'object') ? (args.tmdbId || args.id) : args;

    return new Promise(function(resolve) {
        if (!tmdbId) return resolve([]);

        // 1. TMDB'den ismi al (Rambo: Son Kan gibi)
        fetch("https://api.themoviedb.org/3/movie/" + tmdbId + "?api_key=4ef0d7355d9ffb5151e987764708ce96&language=tr-TR")
        .then(res => res.json())
        .then(data => {
            var title = data.title || data.original_title;
            console.error("[" + PROVIDER_NAME + "] Derin Tarama: " + title);
            
            // 2. Ana sayfayı çekip eklenti listesini alıyoruz (JS Gerektirmez)
            return fetch(BASE_URL + "/");
        })
        .then(res => res.text())
        .then(html => {
            // Kaynak kodundaki eklenti linklerini yakala
            var pluginRegex = /href="\/eklenti\/([^"\/]+)"/g;
            var plugins = [];
            var match;
            while ((match = pluginRegex.exec(html)) !== null) {
                if (plugins.indexOf(match[1]) === -1) plugins.push(match[1]);
            }

            if (plugins.length === 0) throw new Error("Eklentiler bulunamadı.");

            // 3. En popüler eklentileri seç (Hız için ilk 20 eklenti)
            // Örn: HDFilmCehennemi, Dizipal, FullHDFilm vb.
            var targetPlugins = plugins.slice(0, 20);
            console.error("[" + PROVIDER_NAME + "] " + targetPlugins.length + " eklentide Rambo aranıyor...");

            var streamPromises = targetPlugins.map(pName => {
                // Her eklentinin kendi arama sonucuna doğrudan gidiyoruz
                // TMDB ID kullanarak WatchBuddy'nin eşleştirme sistemini tetikliyoruz
                var searchUrl = BASE_URL + "/izle/" + pName + "?url=" + encodeURIComponent("/search?q=" + tmdbId);

                return fetch(searchUrl, { headers: { "Referer": BASE_URL + "/" } })
                    .then(res => res.text())
                    .then(pHtml => {
                        var fileMatch = pHtml.match(/file["']?\s*:\s*["'](http[^"']+)["']/);
                        if (fileMatch) {
                            return {
                                name: pName,
                                title: pName + " - 1080p",
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
            console.error("[" + PROVIDER_NAME + "] Bulunan Kaynak: " + final.length);
            resolve(final);
        })
        .catch(e => {
            console.error("[" + PROVIDER_NAME + "] Hata: " + e.message);
            resolve([]);
        });
    });
}

globalThis.getStreams = getStreams;
