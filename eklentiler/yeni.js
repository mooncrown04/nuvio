const PROVIDER_NAME = "WatchBuddy_V47_Diagnostic";
const BASE_URL = "https://stream.watchbuddy.tv";

async function getStreams(args) {
    console.error(`[${PROVIDER_NAME}] >>> AKIŞ BAŞLADI.`);
    
    // 1. ADIM: ID Ayıklama ve Doğrulama
    let mediaId = (typeof args === 'object') ? (args.tmdbId || args.id) : args;
    if (!mediaId) {
        console.error(`[${PROVIDER_NAME}] !!! KRİTİK HATA: Media ID alınamadı. Args:`, JSON.stringify(args));
        return [];
    }

    const playerHeaders = {
        "User-Agent": "Mozilla/5.0 (Linux; Android 11; Fire TV)",
        "Referer": BASE_URL + "/",
        "Accept": "application/json"
    };

    try {
        // 2. ADIM: API İsteği ve Detaylı Hata Analizi
        const searchUrl = `${BASE_URL}/api/v1/search?q=${mediaId}&type=movie`;
        console.error(`[${PROVIDER_NAME}] İstek gönderiliyor: ${searchUrl}`);

        const response = await fetch(searchUrl, { headers: playerHeaders });

        // Hata Kodlarını Anlama Merkezi
        if (!response.ok) {
            if (response.status === 410) {
                console.error(`[${PROVIDER_NAME}] HATA 410: Sunucu bu API yolunu kapatmış veya taşımış!`);
            } else if (response.status === 422) {
                console.error(`[${PROVIDER_NAME}] HATA 422: Sunucu bu ID'yi (7555) işleyemiyor. Parametre hatası!`);
            } else {
                console.error(`[${PROVIDER_NAME}] HATA ${response.status}: Sunucu beklenmedik bir yanıt verdi.`);
            }
            throw new Error(`HTTP_${response.status}`);
        }

        const data = await response.json();
        const items = data.result || data.results || [];

        if (items && items.length > 0) {
            console.error(`[${PROVIDER_NAME}] Başarılı! ${items.length} kaynak bulundu.`);
            return items.map(item => ({
                name: item.provider || "WatchBuddy",
                title: `${item.title} [Dahili]`,
                url: `${BASE_URL}/proxy/video?url=${encodeURIComponent(item.url)}&force_proxy=1`,
                headers: playerHeaders,
                is_hls: true
            }));
        } else {
            throw new Error("EMPTY_RESULT");
        }

    } catch (e) {
        // 3. ADIM: Tünel (Fallback) ve Sertifika Uyarısı
        console.error(`[${PROVIDER_NAME}] >>> TÜNEL MODUNA GEÇİLİYOR. Sebep: ${e.message}`);
        
        // Eğer cihaz saati bozuksa burası TRACE Starting certificate trust hatası verecek
        const tunnelUrl = `${BASE_URL}/izle/SineWix?url=${encodeURIComponent("http://px-webservisler:2585/sinewix/movie/" + mediaId)}&force_proxy=1`;
        
        console.error(`[${PROVIDER_NAME}] Final Link: ${tunnelUrl}`);

        return [{
            name: "WatchBuddy Direct",
            title: "Yedek Kaynak (Otomatik)",
            url: tunnelUrl,
            headers: playerHeaders,
            is_hls: true
        }];
    }
}

globalThis.getStreams = getStreams;
