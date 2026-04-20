const PROVIDER_NAME = "WatchBuddy_V51_ParamFix";
const BASE_URL = "https://stream.watchbuddy.tv";

async function getStreams(args) {
    console.error(`[${PROVIDER_NAME}] >>> AKIS BASLATILDI.`);
    
    // Nuvio'dan gelen medya bilgilerini alalim
    let mediaId = (typeof args === 'object') ? (args.tmdbId || args.id) : args;
    // Sunucunun bekledigi 'baslik' parametresi (Nuvio'da title veya name olarak gelir)
    let mediaTitle = (typeof args === 'object') ? (args.title || args.name || "Film") : "Film";

    if (!mediaId) return [];

    try {
        // 'baslik' parametresini URL'ye ekliyoruz
        const tunnelUrl = `${BASE_URL}/izle/SineWix?url=${encodeURIComponent("http://px-webservisler:2585/sinewix/movie/" + mediaId)}&baslik=${encodeURIComponent(mediaTitle)}&force_proxy=1`;
        
        console.error(`[${PROVIDER_NAME}] Gonderilen URL: ${tunnelUrl}`);

        return [{
            name: "WatchBuddy Param-Fix",
            title: `SineWix: ${mediaTitle}`,
            url: tunnelUrl,
            is_hls: true,
            headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                "Referer": "https://stream.watchbuddy.tv/"
            }
        }];

    } catch (e) {
        console.error(`[${PROVIDER_NAME}] Hata: ${e.message}`);
        return [];
    }
}

globalThis.getStreams = getStreams;
