const PROVIDER_NAME = "WatchBuddy_V20";
const BASE_URL = "https://stream.watchbuddy.tv";

function getStreams(args) {
    var tmdbId = (typeof args === 'object') ? (args.tmdbId || args.id) : args;

    return new Promise(function(resolve) {
        if (!tmdbId) return resolve([]);

        fetch("https://api.themoviedb.org/3/movie/" + tmdbId + "?api_key=4ef0d7355d9ffb5151e987764708ce96&language=tr-TR")
        .then(res => res.json())
        .then(data => {
            var title = data.title || data.original_title;
            console.error("[" + PROVIDER_NAME + "] Derin Tarama Başladı: " + title);
            return fetch(BASE_URL + "/search?q=" + encodeURIComponent(title));
        })
        .then(res => res.text())
        .then(html => {
            var results = [];
            
            // STRATEJİ: JSON veya HTML fark etmeksizin içindeki URL yapılarını cımbızla çekiyoruz
            // "url": "http..." veya href="/icerik/..." olan her şeyi bulur
            var urlPattern = /(?:url|path|href)["']?\s*[:=]\s*["']([^"'\s>]+)/g;
            var match;

            while ((match = urlPattern.exec(html)) !== null) {
                var foundPath = match[1].replace(/\\/g, ""); // Kaçış karakterlerini temizle

                // Eğer bulduğumuz şey bir SineWix, HDFilmCehennemi veya içerik linkiyse
                if (foundPath.includes("icerik") || foundPath.includes("movie") || foundPath.includes("sinewix")) {
                    
                    // Linkin içinden sağlayıcı adını ayıklayalım (SineWix, HDFilmCehennemi vb.)
                    var providerMatch = foundPath.match(/icerik\/([^/?]+)/) || foundPath.match(/([a-zA-Z]+)(?=\/movie)/);
                    var provider = providerMatch ? providerMatch[1] : "Kaynak";

                    // Senin verdiğin izle formatına dönüştür
                    // Eğer link zaten tam bir URL ise (http...), onu temizle ve parametre yap
                    var cleanUrl = foundPath.includes("http") ? foundPath : "https://stream.watchbuddy.tv" + foundPath;
                    
                    var watchUrl = BASE_URL + "/izle/" + provider + "?url=" + encodeURIComponent(cleanUrl) + "&baslik=Video";

                    results.push({
                        name: provider,
                        title: "İzle: " + provider,
                        url: watchUrl,
                        quality: "1080p"
                    });
                }
            }

            // Mükerrer (aynı) linkleri temizleyelim
            var uniqueResults = results.filter((v, i, a) => a.findIndex(t => (t.url === v.url)) === i);

            console.error("[" + PROVIDER_NAME + "] Bulunan Ham Veri: " + results.length);
            console.error("[" + PROVIDER_NAME + "] Temizlenmiş Benzersiz Link: " + uniqueResults.length);
            
            resolve(uniqueResults);
        })
        .catch(e => {
            console.error("[" + PROVIDER_NAME + "] Tarama Hatası: " + e.message);
            resolve([]);
        });
    });
}

globalThis.getStreams = getStreams;
