const PROVIDER_NAME = "WatchBuddy_V48_Clean";
const BASE_URL = "https://stream.watchbuddy.tv";

async function getStreams(args) {
    console.error(`[${PROVIDER_NAME}] >>> AKIS BASLADI.`);
    
    let mediaId = (typeof args === 'object') ? (args.tmdbId || args.id) : args;
    if (!mediaId) return [];

    // Oynatıcıyı yormayacak, en temiz header seti
    const cleanHeaders = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "X-Requested-With": "XMLHttpRequest"
    };

    try {
        // API 410 verdigi icin doğrudan tünele (SineWix) yonleniyoruz
        // Not: 'force_proxy=1' parametresi 422 veriyorsa, sunucu tarafında bir sorun vardır.
        const tunnelUrl = `${BASE_URL}/izle/SineWix?url=${encodeURIComponent("http://px-webservisler:2585/sinewix/movie/" + mediaId)}&force_proxy=1`;
        
        console.error(`[${PROVIDER_NAME}] Link Oynaticiya Veriliyor: ${tunnelUrl}`);

        return [{
            name: "WatchBuddy Direct",
            title: "Kaynak: SineWix (Dahili)",
            url: tunnelUrl,
            headers: cleanHeaders, // Header'lari buraya gomuyoruz
            is_hls: true
        }];

    } catch (e) {
        console.error(`[${PROVIDER_NAME}] Kritik Hata: ${e.message}`);
        return [];
    }
}

globalThis.getStreams = getStreams;
