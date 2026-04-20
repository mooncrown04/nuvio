/**
 * Nuvio Local Scraper - v4.6 (No-Axios / Pure Fetch Edition)
 * Kural 1: console.log YASAK -> console.error kullanılacak.
 * Kural 2: async/await YASAK -> Promise kullanılacak.
 * Kural 3: Axios YASAK -> Fetch kullanılacak.
 */

const PROVIDER_NAME = "HDFilmCehennemi";

function getStreams(args) {
    console.error(`[${PROVIDER_NAME}] Başlatıldı (Fetch Mode) -> URL: ${args.url}`);

    return new Promise(function(resolve) {
        var sourceUrl = args.url || "";
        if (!sourceUrl) {
            console.error(`[${PROVIDER_NAME}] HATA: URL boş.`);
            return resolve([]);
        }

        var bridgeUrl = "https://stream.watchbuddy.tv/izle/HDFilmCehennemi?url=" + encodeURIComponent(sourceUrl);

        // Axios yerine doğrudan fetch kullanıyoruz
        fetch(bridgeUrl, {
            headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
                "Referer": "https://stream.watchbuddy.tv/"
            }
        })
        .then(function(response) {
            return response.text();
        })
        .then(function(html) {
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
                        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
                        "Referer": "https://stream.watchbuddy.tv/"
                    }
                }]);
            } else {
                console.error(`[${PROVIDER_NAME}] HATA: Sayfada video linki yok.`);
                resolve([]);
            }
        })
        .catch(function(err) {
            console.error(`[${PROVIDER_NAME}] NETWORK HATASI: ${err.message}`);
            resolve([]);
        });
    });
}

// Global tanımlamalar
globalThis.getStreams = getStreams;
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { getStreams: getStreams };
}
