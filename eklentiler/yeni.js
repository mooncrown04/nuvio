/**
 * Nuvio Local Scraper Şablonu - v4.5 (WatchBuddy Resolver)
 * Kural 1: console.log YASAK, tüm loglar console.error olmalı.
 * Kural 2: async/await YASAK, Promise/axios.then kullanılmalı.
 */

var axios = require("axios");
const PROVIDER_NAME = "HDFilmCehennemi";
const DEFAULT_HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    "X-Requested-With": "fetch"
};

function getStreams(args) {
    // Nuvio'da loglar error kanalından akar
    console.error(`[${PROVIDER_NAME}] Başlatıldı -> URL: ${args.url}`);

    return new Promise(function(resolve) {
        var sourceUrl = args.url || "";
        if (!sourceUrl) {
            console.error(`[${PROVIDER_NAME}] HATA: Kaynak URL boş.`);
            return resolve([]);
        }

        // WatchBuddy Köprüsü
        var bridgeUrl = "https://stream.watchbuddy.tv/izle/HDFilmCehennemi?url=" + encodeURIComponent(sourceUrl);

        axios.get(bridgeUrl, { 
            headers: {
                "User-Agent": DEFAULT_HEADERS["User-Agent"],
                "Referer": "https://stream.watchbuddy.tv/"
            } 
        })
        .then(function(response) {
            var html = response.data;
            // Sayfa içindeki gerçek video dosyasını (m3u8/mp4) çekiyoruz
            var streamUrlMatch = html.match(/file["']?\s*:\s*["'](http[^"']+)["']/);

            if (streamUrlMatch && streamUrlMatch[1]) {
                var finalUrl = streamUrlMatch[1];
                console.error(`[${PROVIDER_NAME}] BAŞARILI LİNK: ${finalUrl}`);

                resolve([{
                    name: PROVIDER_NAME,
                    title: "HDFC - 1080p",
                    url: finalUrl,
                    quality: "1080p",
                    headers: {
                        "User-Agent": DEFAULT_HEADERS["User-Agent"],
                        "Referer": "https://stream.watchbuddy.tv/"
                    }
                }]);
            } else {
                console.error(`[${PROVIDER_NAME}] HATA: Sayfa içinde video linki bulunamadı.`);
                resolve([]);
            }
        })
        .catch(function(err) {
            console.error(`[${PROVIDER_NAME}] KRİTİK HATA: ${err.message}`);
            resolve([]);
        });
    });
}

// Nuvio'nun fonksiyonu bulabilmesi için global ve module tanımları
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { getStreams: getStreams };
}
globalThis.getStreams = getStreams;
