const PROVIDER_NAME = "HDFilmCehennemi";
const BASE_URL = "https://www.hdfilmcehennemi.nl";

function getStreams(args) {
    // 1. TMDB ID'yi konuşmamızda sabitlediğimiz gibi alıyoruz
    var tmdbId = (typeof args === 'object') ? (args.tmdbId || args.id) : args;

    return new Promise(function(resolve) {
        if (!tmdbId) return resolve([]);

        // 2. TMDB Metodu (RecTV örneğindeki gibi isim çekme)
        fetch("https://api.themoviedb.org/3/movie/" + tmdbId + "?api_key=4ef0d7355d9ffb5151e987764708ce96&language=tr-TR")
        .then(res => res.json())
        .then(data => {
            var title = data.title || data.original_title;
            console.error("[" + PROVIDER_NAME + "] Aranan: " + title);
            
            // 3. Sitede arama yap
            return fetch(BASE_URL + "/search?q=" + encodeURIComponent(title));
        })
        .then(res => res.text())
        .then(html => {
            // 4. LİNK YAKALAMA (Bu konuşmadaki en büyük takılma noktamız)
            // Senin verdiğin project-hail-mary-3/ örneğine göre sadece slugları ve tam linkleri kapsayan regex
            var regex = /href="([^"]*?\/[a-z0-9-]+-izle\/|[^"]*?\/[a-z0-9-]+\d+\/)"/gi;
            var match = regex.exec(html);
            
            // Eğer spesifik yapı bulunamazsa, en azından içinde '/' olan bir slug ara (reklam/kategori hariç)
            if (!match) {
                var backupRegex = /href="\/([^"\/]+\/)"/g;
                while ((match = backupRegex.exec(html)) !== null) {
                    if (match[1].length > 5 && !match[1].includes("search") && !match[1].includes("kategori")) break;
                }
            }

            var finalPath = match ? (match[1] || match[0].replace('href="', '').replace('"', '')) : "";
            
            if (!finalPath || finalPath === "/") {
                console.error("[" + PROVIDER_NAME + "] HATA: Link ayıklanamadı. HTML uzunluğu: " + html.length);
                return resolve([]);
            }

            var fullUrl = finalPath.startsWith("http") ? finalPath : BASE_URL + (finalPath.startsWith("/") ? "" : "/") + finalPath;
            console.error("[" + PROVIDER_NAME + "] Hedef: " + fullUrl);

            // 5. WatchBuddy (Değişmez kuralımız)
            return fetch("https://stream.watchbuddy.tv/izle/HDFilmCehennemi?url=" + encodeURIComponent(fullUrl), {
                headers: { "Referer": "https://stream.watchbuddy.tv/" }
            });
        })
        .then(res => res.text())
        .then(html => {
            var stream = html.match(/file["']?\s*:\s*["'](http[^"']+)["']/);
            if (stream && stream[1]) {
                console.error("[" + PROVIDER_NAME + "] BAŞARILI: " + stream[1]);
                resolve([{
                    name: PROVIDER_NAME,
                    title: "HDFC 1080p",
                    url: stream[1],
                    quality: "1080p",
                    headers: { "Referer": "https://stream.watchbuddy.tv/" }
                }]);
            } else {
                resolve([]);
            }
        })
        .catch(e => {
            console.error("[" + PROVIDER_NAME + "] HATA: " + e.message);
            resolve([]);
        });
    });
}

globalThis.getStreams = getStreams;
