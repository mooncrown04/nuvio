const PROVIDER_NAME = "WatchBuddy_Global";
const BASE_URL = "https://stream.watchbuddy.tv";

function getStreams(args) {
    // 1. TMDB ID'yi yakala
    var tmdbId = (typeof args === 'object') ? (args.tmdbId || args.id) : args;

    return new Promise(function(resolve) {
        if (!tmdbId) return resolve([]);

        // 2. TMDB üzerinden film adını al (RecTV Metodu)
        fetch("https://api.themoviedb.org/3/movie/" + tmdbId + "?api_key=4ef0d7355d9ffb5151e987764708ce96&language=tr-TR")
        .then(function(res) { return res.json(); })
        .then(function(data) {
            var title = data.title || data.original_title;
            console.error("[" + PROVIDER_NAME + "] Aranan Film: " + title);
            
            // 3. WatchBuddy Arama Sayfası (Paylaştığın kaynak koddaki arama motoru)
            return fetch(BASE_URL + "/search?q=" + encodeURIComponent(title), {
                headers: { "User-Agent": "Mozilla/5.0", "Referer": BASE_URL + "/" }
            });
        })
        .then(function(res) { return res.text(); })
        .then(function(html) {
            // 4. Kaynak kodundaki <a href="/eklenti/..." class="card plugin-card"> yapılarını yakala
            var pluginRegex = /href="(\/eklenti\/[^"]+)"/g;
            var uniquePlugins = [];
            var match;

            while ((match = pluginRegex.exec(html)) !== null) {
                var path = match[1];
                if (uniquePlugins.indexOf(path) === -1) {
                    uniquePlugins.push(path);
                }
            }

            if (uniquePlugins.length === 0) {
                console.error("[" + PROVIDER_NAME + "] Arama sonucu boş veya JS engeline takıldı.");
                return resolve([]);
            }

            console.error("[" + PROVIDER_NAME + "] " + uniquePlugins.length + " eklenti içinde video aranıyor...");

            // 5. Her eklentinin içine girip 'file: "http..."' linkini ayıkla (Hepsini al)
            var streamPromises = uniquePlugins.slice(0, 15).map(function(path) {
                return fetch(BASE_URL + path, { headers: { "Referer": BASE_URL } })
                    .then(function(res) { return res.text(); })
                    .then(function(p_html) {
                        var fileMatch = p_html.match(/file["']?\s*:\s*["'](http[^"']+)["']/);
                        if (fileMatch) {
                            var name = path.split('/')[2] || "Kaynak";
                            return {
                                name: name,
                                title: name + " - 1080p",
                                url: fileMatch[1],
                                quality: "1080p",
                                headers: { "Referer": BASE_URL }
                            };
                        }
                        return null;
                    })
                    .catch(function() { return null; });
            });

            return Promise.all(streamPromises);
        })
        .then(function(results) {
            // Null olmayan tüm başarılı sonuçları Nuvio'ya gönder
            var finalResults = results.filter(function(r) { return r !== null; });
            console.error("[" + PROVIDER_NAME + "] Toplam " + finalResults.length + " kaynak bulundu.");
            resolve(finalResults);
        })
        .catch(function(e) {
            console.error("[" + PROVIDER_NAME + "] Hata: " + e.message);
            resolve([]);
        });
    });
}

globalThis.getStreams = getStreams;
