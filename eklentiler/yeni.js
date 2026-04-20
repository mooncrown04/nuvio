const PROVIDER_NAME = "WatchBuddy_V54_Debug";
const BASE_URL = "https://stream.watchbuddy.tv";

async function getStreams(args) {
    // 1. ADIM: Başlangıç Logu
    console.error(`[${PROVIDER_NAME}] >>> İŞLEM BAŞLADI`);
    
    try {
        let mediaId = (typeof args === 'object') ? (args.tmdbId || args.id) : args;
        let mediaTitle = (typeof args === 'object') ? (args.title || args.name || "Film") : "Film";

        if (!mediaId) {
            console.error(`[${PROVIDER_NAME}] HATA: MediaID bulunamadı!`);
            return [];
        }

        // 2. ADIM: URL Oluşturma ve Parametre Kontrolü
        const targetApi = "http://px-webservisler:2585/sinewix/movie/" + mediaId;
        const tunnelUrl = `${BASE_URL}/izle/SineWix?url=${encodeURIComponent(targetApi)}&baslik=${encodeURIComponent(mediaTitle)}&force_proxy=1`;
        
        console.error(`[${PROVIDER_NAME}] HEDEF: ${targetApi}`);
        console.error(`[${PROVIDER_NAME}] TUNNEL URL: ${tunnelUrl}`);

        // 3. ADIM: Oynatıcıya Gönderilecek Obje
        const streamObject = {
            name: "WatchBuddy Debug",
            title: `SineWix: ${mediaTitle}`,
            url: tunnelUrl,
            headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                "Referer": "https://stream.watchbuddy.tv/",
                "Accept": "*/*"
            }
        };

        console.error(`[${PROVIDER_NAME}] >>> OYNATICIYA GÖNDERİLDİ. Lütfen ExoPlayer hatasını bekleyin...`);
        return [streamObject];

    } catch (error) {
        // 4. ADIM: Yakalanamayan Hataları Loglama
        console.error(`[${PROVIDER_NAME}] KRİTİK HATA: ${error.message}`);
        console.error(`[${PROVIDER_NAME}] STACK: ${error.stack}`);
        return [];
    }
}

globalThis.getStreams = getStreams;
