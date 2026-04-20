const PROVIDER_NAME = "WatchBuddy_Global";
const BASE_URL = "https://stream.watchbuddy.tv";

function getStreams(args) {
    var tmdbId = (typeof args === 'object') ? (args.tmdbId || args.id) : args;

    return new Promise(function(resolve) {
        if (!tmdbId) return resolve([]);

        // 1. TMDB'den güncel başlığı al
        fetch("https://api.themoviedb.org/3/movie/" + tmdbId + "?api_key=4ef0d7355d9ffb5151e987764708ce96&language=tr-TR")
        .then(res => res.json())
        .then(data => {
            var title = data.title || data.original_title;
            console.error("[" + PROVIDER_NAME + "] Hedef: " + title);
            
            // 2. WatchBuddy ana sayfasındaki eklenti listesini al
            return fetch(BASE_URL + "/").then(res => res.text()).then(html => {
                return { title: title, html: html };
            });
        })
        .then(obj => {
            // Eklenti isimlerini yakala (HDFilmCehennemi, Dizigom vb.)
            var pluginRegex = /href="\/eklenti\/([^"\/]+)"/g;
            var plugins = [];
            var match;
            while ((match = pluginRegex.exec(obj.html)) !== null) {
                if (plugins.indexOf(match[1]) === -1) plugins.push(match[1]);
            }

            // En güvenilir 10 kaynağı seç (Çakışma ve hız için)
            var topTen = plugins.slice(0, 10);
            console.error("[" + PROVIDER_NAME + "] " + topTen.length + " kaynak zorlanıyor...");

            var streamPromises = topTen.map(pName => {
                // KRİTİK DEĞİŞİKLİK: Doğrudan WatchBuddy'nin 'embed' sayfasına yönlendiriyoruz
                // Bu yapı, JS render beklemeden sunucu taraflı link dönmesini sağlar
                var embedUrl = BASE_URL + "/eklenti/" + pName + "/izle?url=" + encodeURIComponent(obj.title);

                return fetch(embedUrl, { 
                    headers: { 
                        "Referer": BASE_URL + "/",
                        "User-Agent": "Mozilla/5.0 (Linux; Android 10)" 
                    } 
                })
                .then(res => res.text())
                .then(pHtml => {
                    // Sayfa içinde video linkini (m3u8/mp4) bul
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
            console.error("[" + PROVIDER_NAME + "] Bulunan: " + final.length);
            resolve(final);
        })
        .catch(e => {
            console.error("[" + PROVIDER_NAME + "] Sistem Hatası: " + e.message);
            resolve([]);
        });
    });
}

globalThis.getStreams = getStreams;
