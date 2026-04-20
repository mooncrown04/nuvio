const PROVIDER_NAME = "WatchBuddy_Global";
const BASE_URL = "https://stream.watchbuddy.tv";

function getStreams(args) {
    var tmdbId = (typeof args === 'object') ? (args.tmdbId || args.id) : args;

    return new Promise(function(resolve) {
        if (!tmdbId) return resolve([]);

        // 1. TMDB Metodu (İsim çekme)
        fetch("https://api.themoviedb.org/3/movie/" + tmdbId + "?api_key=4ef0d7355d9ffb5151e987764708ce96&language=tr-TR")
        .then(res => res.json())
        .then(data => {
            var title = data.title || data.original_title;
            console.error("[" + PROVIDER_NAME + "] Tüm Kaynaklarda Aranan: " + title);
            
            // 2. WatchBuddy Global Arama
            return fetch(BASE_URL + "/search?q=" + encodeURIComponent(title));
        })
        .then(res => res.text())
        .then(html => {
            // 3. HTML içindeki TÜM eklenti izleme linklerini yakala
            // Yapı: /eklenti/EklentiAdi/izle?url=HEDEF_URL
            var pluginRegex = /\/eklenti\/([^\/]+)\/izle\?url=([^"&'\s]+)/g;
            var matches;
            var streamPromises = [];

            while ((matches = pluginRegex.exec(html)) !== null) {
                var pName = matches[1];
                var pUrl = decodeURIComponent(matches[2]);
                
                // Her bir eklenti sonucu için yeni bir fetch sözü (promise) oluştur
                var finalUrl = BASE_URL + "/izle/" + pName + "?url=" + encodeURIComponent(pUrl);
                
                streamPromises.push(
                    fetch(finalUrl, { headers: { "Referer": BASE_URL + "/" } })
                    .then(res => res.text())
                    .then(innerHtml => {
                        var fileMatch = innerHtml.match(/file["']?\s*:\s*["'](http[^"']+)["']/);
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
                    }).catch(() => null)
                );
            }

            // 4. Tüm sonuçları bekle ve null olmayanları döndür
            return Promise.all(streamPromises);
        })
        .then(results => {
            var finalResults = results.filter(r => r !== null);
            console.error("[" + PROVIDER_NAME + "] Bulunan Toplam Kaynak: " + finalResults.length);
            resolve(finalResults);
        })
        .catch(e => {
            console.error("[" + PROVIDER_NAME + "] Kritik Hata: " + e.message);
            resolve([]);
        });
    });
}

globalThis.getStreams = getStreams;
