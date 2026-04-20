const PROVIDER_NAME = "WatchBuddy_V49_Bypass";
const BASE_URL = "https://stream.watchbuddy.tv";

async function getStreams(args) {
    console.error(`[${PROVIDER_NAME}] >>> AKIS BASLATILDI.`);
    
    let mediaId = (typeof args === 'object') ? (args.tmdbId || args.id) : args;
    if (!mediaId) return [];

    // Cloudflare'i asmak icin en iyi sansimiz: User-Agent'i degistirmek
    const headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Referer": "https://stream.watchbuddy.tv/",
        "Accept": "*/*"
    };

    // Cloudflare'in HTML sayfasini dondurmesini engellemek icin 
    // doğrudan tünel linkini 'Stream' nesnesi olarak donduruyoruz.
    try {
        // NOT: 'px-webservisler' ismini sunucu cozemiyorsa buraya IP yazmalisin.
        const tunnelUrl = `${BASE_URL}/izle/SineWix?url=${encodeURIComponent("http://px-webservisler:2585/sinewix/movie/" + mediaId)}&force_proxy=1`;
        
        console.error(`[${PROVIDER_NAME}] Cloudflare Bypass Deneniyor: ${tunnelUrl}`);

        return [{
            name: "WatchBuddy (Direct Bypass)",
            title: "Kaynak: SineWix [Tünel]",
            url: tunnelUrl,
            headers: headers,
            is_hls: true // HLS degilse bile Nuvio'nun stream'i zorlamasi icin true kalsin
        }];

    } catch (e) {
        console.error(`[${PROVIDER_NAME}] Hata: ${e.message}`);
        return [];
    }
}

globalThis.getStreams = getStreams;
