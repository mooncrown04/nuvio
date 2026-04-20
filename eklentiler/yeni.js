/**
 * Nuvio Local Scraper - v4.7
 * Kural: args içindeki URL'yi her türlü ihtimale karşı yakala.
 */

const PROVIDER_NAME = "HDFilmCehennemi";

function getStreams(args) {
    // Nuvio'nun hangi anahtarı kullandığını bulmak için tüm args'ı logluyoruz
    console.error(`[${PROVIDER_NAME}] Gelen Veri: ${JSON.stringify(args)}`);

    return new Promise(function(resolve) {
        // Nuvio versiyonuna göre URL farklı yerlerde olabilir, hepsini dene:
        var sourceUrl = args.url || args.source || args.link || (typeof args === 'string' ? args : "");
        
        if (!sourceUrl || sourceUrl === "undefined") {
            console.error(`[${PROVIDER_NAME}] HATA: URL bulunamadı. Gelen args: ${typeof args}`);
            return resolve([]);
        }

        console.error(`[${PROVIDER_NAME}] Çözülüyor -> ${sourceUrl}`);

        var bridgeUrl = "https://stream.watchbuddy.tv/izle/HDFilmCehennemi?url=" + encodeURIComponent(sourceUrl);

        fetch(bridgeUrl, {
            headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
                "Referer": "https://stream.watchbuddy.tv/"
            }
        })
        .then(function(response) { return response.text(); })
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
                console.error(`[${PROVIDER_NAME}] HATA: Video ayıklanamadı.`);
                resolve([]);
            }
        })
        .catch(function(err) {
            console.error(`[${PROVIDER_NAME}] NETWORK HATASI: ${err.message}`);
            resolve([]);
        });
    });
}

globalThis.getStreams = getStreams;
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { getStreams: getStreams };
}
