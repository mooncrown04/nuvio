const PROVIDER_NAME = "WatchBuddy_V19";
const BASE_URL = "https://stream.watchbuddy.tv";

function getStreams(args) {
    var tmdbId = (typeof args === 'object') ? (args.tmdbId || args.id) : args;

    return new Promise(function(resolve) {
        if (!tmdbId) return resolve([]);

        fetch("https://api.themoviedb.org/3/movie/" + tmdbId + "?api_key=4ef0d7355d9ffb5151e987764708ce96&language=tr-TR")
        .then(res => res.json())
        .then(data => {
            var title = data.title || data.original_title;
            console.error("[" + PROVIDER_NAME + "] HTML Araması Başlatıldı: " + title);
            
            // API yerine doğrudan HTML arama sayfasına gidiyoruz
            return fetch(BASE_URL + "/search?q=" + encodeURIComponent(title));
        })
        .then(res => res.text())
        .then(html => {
            var results = [];
            
            // SENİN PAYLAŞTIĞIN ÖRNEKLERİ YAKALAYAN ÖZEL REGEX
            // Bu regex, "/icerik/HDFilmCehennemi?url=..." gibi yapıları yakalar
            var pattern = /\/icerik\/([^?]+)\?url=([^"&'\s>]+)/g;
            var match;

            while ((match = pattern.exec(html)) !== null) {
                var provider = match[1]; // SineWix, HDFilmCehennemi vb.
                var rawUrl = match[2];    // Kodlanmış site linki
                
                // Senin verdiğin izle şablonunu oluşturuyoruz
                var watchUrl = BASE_URL + "/izle/" + provider + "?url=" + rawUrl + "&baslik=Video";

                results.push({
                    name: provider,
                    title: "Kaynak: " + provider,
                    url: watchUrl,
                    quality: "1080p"
                });
            }

            // Alternatif: Eğer yukarıdaki yakalayamazsa, ham linkleri ara
            if (results.length === 0) {
                console.error("[" + PROVIDER_NAME + "] RegEx 1 başarısız, Alternatif deneniyor...");
                var altPattern = /"provider"\s*:\s*"([^"]+)"\s*,\s*"url"\s*:\s*"([^"]+)"/g;
                while ((match = altPattern.exec(html)) !== null) {
                    results.push({
                        name: match[1],
                        title: "Kaynak: " + match[1],
                        url: BASE_URL + "/izle/" + match[1] + "?url=" + encodeURIComponent(match[2].replace(/\\/g, '')),
                        quality: "1080p"
                    });
                }
            }

            console.error("[" + PROVIDER_NAME + "] Sökülen Link Sayısı: " + results.length);
            resolve(results);
        })
        .catch(e => {
            console.error("[" + PROVIDER_NAME + "] Kritik Hata: " + e.message);
            resolve([]);
        });
    });
}

globalThis.getStreams = getStreams;
