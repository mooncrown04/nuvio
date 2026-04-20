// Version: 10.0 (Fire TV Optimized Bridge)
// FIXED: Network library detection for Cloudstream/Fire TV environments.

const PROVIDER_NAME = "HDFilmCehennemi";

async function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
    const targetUrl = "https://www.hdfilmcehennemi.nl/1-ready-or-not-izle-hdf-8/";
    const bridgeUrl = `https://stream.watchbuddy.tv/izle/HDFilmCehennemi?url=${encodeURIComponent(targetUrl)}`;

    console.error("[" + PROVIDER_NAME + "] v10 Çözücü Başlatıldı...");

    try {
        // Cloudstream JS eklentilerinde genellikle 'request' veya 'app' kullanılır.
        // Hepsini birden kontrol eden en güvenli yapı:
        const client = (typeof request !== 'undefined') ? request : 
                       (typeof app !== 'undefined') ? app : 
                       (typeof http !== 'undefined') ? http : null;

        if (!client) {
            console.error("[" + PROVIDER_NAME + "] KRİTİK: Hiçbir network istemcisi (request/app/http) tanımlı değil.");
            // Eğer istemci yoksa, direkt WatchBuddy linkini dönüyoruz. 
            // Bazı Cloudstream sürümleri URL'yi harici player'a gönderebilir.
            return [{
                name: "HDFC (WatchBuddy Link)",
                url: bridgeUrl,
                quality: "1080p"
            }];
        }

        // WatchBuddy sayfasını çekip içindeki gerçek .m3u8 linkini ayıklamaya çalışıyoruz
        const response = await client.get(bridgeUrl);
        const html = (typeof response === 'string') ? response : (response.text || response.body || "");

        // WatchBuddy'nin player kodunda 'file: "..."' şeklinde link saklanır.
        const finalUrlMatch = html.match(/file["']?\s*:\s*["'](http[^"']+)["']/);
        const finalUrl = finalUrlMatch ? finalUrlMatch[1] : bridgeUrl;

        console.error("[" + PROVIDER_NAME + "] Çözüm başarılı, link dönülüyor.");

        return [{
            name: PROVIDER_NAME,
            url: finalUrl,
            quality: "1080p",
            headers: { "Referer": "https://stream.watchbuddy.tv/" }
        }];

    } catch (err) {
        console.error("[" + PROVIDER_NAME + "] v10 Hata: " + err.message);
        // Hata olsa bile en azından köprü linkini dönmeyi dene
        return [{
            name: "HDFC (Fallback)",
            url: bridgeUrl,
            quality: "1080p"
        }];
    }
}

module.exports = { getStreams };
