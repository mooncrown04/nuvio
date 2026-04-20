const PROVIDER_NAME = "WatchBuddy_Analyzer";
const BASE_URL = "https://stream.watchbuddy.tv";

function getStreams(args) {
    var tmdbId = (typeof args === 'object') ? (args.tmdbId || args.id) : args;

    return new Promise(function(resolve) {
        if (!tmdbId) return resolve([]);

        fetch("https://api.themoviedb.org/3/movie/" + tmdbId + "?api_key=4ef0d7355d9ffb5151e987764708ce96&language=tr-TR")
        .then(res => res.json())
        .then(data => {
            var title = data.title || data.original_title;
            // Arama sorgusunu atıyoruz
            return fetch(BASE_URL + "/search?q=" + encodeURIComponent(title));
        })
        .then(res => res.text())
        .then(body => {
            console.error("[" + PROVIDER_NAME + "] Sayfa Boyutu: " + body.length);

            // KRİTİK: 'url' kelimesinin geçtiği yerleri ve etrafındaki 100 karakteri yakalıyoruz
            var urlIndex = body.indexOf('"url"');
            if (urlIndex === -1) urlIndex = body.indexOf("'url'");

            if (urlIndex !== -1) {
                var context = body.substring(urlIndex - 50, urlIndex + 300);
                console.error("[" + PROVIDER_NAME + "] YAKALANAN BLOK: " + context);
                
                // Genişletilmiş Regex: Hem tek hem çift tırnak, hem de kaçış karakterlerini (escape) destekler
                var flexibleRegex = /url["']?\s*[:=]\s*["']([^"']+)["']/i;
                var match = flexibleRegex.exec(context);

                if (match) {
                    var rawLink = match[1];
                    var cleanLink = decodeURIComponent(rawLink).replace(/\\/g, "");
                    console.error("[" + PROVIDER_NAME + "] TEMİZ LİNK: " + cleanLink);

                    resolve([{
                        name: "WatchBuddy_API",
                        title: "Bulunan Kaynak",
                        url: cleanLink,
                        quality: "1080p"
                    }]);
                    return;
                }
            } else {
                console.error("[" + PROVIDER_NAME + "] Hata: Sayfada 'url' anahtarı fiziksel olarak yok.");
            }
            resolve([]);
        })
        .catch(e => {
            console.error("[" + PROVIDER_NAME + "] Hata: " + e.message);
            resolve([]);
        });
    });
}

globalThis.getStreams = getStreams;
