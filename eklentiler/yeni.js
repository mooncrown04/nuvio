const PROVIDER_NAME = "WatchBuddy_Global";
const BASE_URL = "https://stream.watchbuddy.tv";

function getStreams(args) {
    var tmdbId = (typeof args === 'object') ? (args.tmdbId || args.id) : args;

    return new Promise(function(resolve) {
        if (!tmdbId) return resolve([]);

        // 1. TMDB Metodu (Konuşmamızın temeli)
        fetch("https://api.themoviedb.org/3/movie/" + tmdbId + "?api_key=4ef0d7355d9ffb5151e987764708ce96&language=tr-TR")
        .then(res => res.json())
        .then(data => {
            var title = data.title || data.original_title;
            console.error("[" + PROVIDER_NAME + "] Aramaya Başlanıyor: " + title);
            
            // 2. WatchBuddy Arama sayfasına git
            return fetch(BASE_URL + "/search?q=" + encodeURIComponent(title));
        })
        .then(res => res.text())
        .then(html => {
            // 3. Eklenti listesini yakala (Senin gönderdiğin source koddaki yapı)
            var pluginRegex = /href="\/eklenti\/([^"]+)"/g;
            var plugins = [];
            var match;
            while ((match = pluginRegex.exec(html)) !== null) {
                if (plugins.indexOf(match[1]) === -1) plugins.push(match[1]);
            }

            if (plugins.length === 0) {
                console.error("[" + PROVIDER_NAME + "] Eklenti listesi bulunamadı.");
                return resolve([]);
            }

            // 4. Kritik Hamle: Arama sonucunu eklenti sayfasına zorla
            // WatchBuddy normalde bunu JS ile yapar, biz URL üzerinden zorluyoruz
            var streamPromises = plugins.slice(0, 10).map(pName => {
                // Her eklentinin 'izle' sayfasına, o film için bir URL oluşturup gönderiyoruz
                var searchPath = "/izle/" + pName + "?url=" + encodeURIComponent("/search?q=" + args.id);

                return fetch(BASE_URL + searchPath, { headers: { "Referer": BASE_URL } })
                    .then(res => res.text())
                    .then(p_html => {
                        // Video linkini ara (file: "...")
                        var fileMatch = p_html.match(/file["']?\s*:\s*["'](http[^"']+)["']/);
                        if (fileMatch) {
                            return {
                                name: pName,
                                title: pName + " - WB",
                                url: fileMatch[1],
                                quality: "1080p",
                                headers: { "Referer": BASE_URL }
                            };
                        }
                        return null;
                    }).catch(() => null);
            });

            return Promise.all(streamPromises);
        })
        .then(results => {
            var final = results.filter(r => r !== null);
            console.error("[" + PROVIDER_NAME + "] Sonuç: " + final.length + " aktif kaynak.");
            resolve(final);
        })
        .catch(e => {
            console.error("[" + PROVIDER_NAME + "] Hata: " + e.message);
            resolve([]);
        });
    });
}

globalThis.getStreams = getStreams;
