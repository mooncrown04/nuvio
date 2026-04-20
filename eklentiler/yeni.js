// Version: 9.0 (WatchBuddy API Bridge)
// Kendi kodumuzla uğraşmak yerine, çalışan WatchBuddy sistemini köprü olarak kullanıyoruz.

const PROVIDER_NAME = "HDFilmCehennemi";

async function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
    // Çözülmesini istediğimiz hedef link
    const targetUrl = "https://www.hdfilmcehennemi.nl/1-ready-or-not-izle-hdf-8/";
    
    // WatchBuddy'nin anladığı formatta API linkini oluşturuyoruz
    const bridgeUrl = `https://stream.watchbuddy.tv/izle/HDFilmCehennemi?url=${encodeURIComponent(targetUrl)}`;

    console.error("[" + PROVIDER_NAME + "] WatchBuddy Bridge Başlatıldı...");

    try {
        // Cloudstream'in gizli network fonksiyonlarını zorluyoruz
        const network = typeof app !== 'undefined' ? app : 
                        (typeof http !== 'undefined' ? http : 
                        (typeof fetch !== 'undefined' ? { get: async (u) => { let r = await fetch(u); return { text: await r.text() }; } } : null));

        if (!network) {
            // Eğer hala network bulamıyorsa, direkt linki döndürmeyi deneyelim (bazı playerlar bunu çözer)
            console.error("[" + PROVIDER_NAME + "] Network yok, direkt stream objesi dönülüyor.");
            return [{
                name: "WatchBuddy (External)",
                url: bridgeUrl,
                quality: "1080p",
                isDirect: false 
            }];
        }

        // WatchBuddy'den linki almayı dene
        const response = await network.get(bridgeUrl);
        // Burada WatchBuddy'nin döndüğü HTML içinden final .m3u8 linkini ayıklıyoruz
        const finalStream = response.text.match(/file["']?\s*:\s*["'](http[^"']+)["']/)?.[1];

        return [{
            name: PROVIDER_NAME,
            url: finalStream || bridgeUrl, // Bulamazsak köprü linkini dön
            quality: "1080p"
        }];

    } catch (err) {
        console.error("[" + PROVIDER_NAME + "] Bridge Hatası: " + err.message);
        return [];
    }
}

module.exports = { getStreams };
