const PROVIDER_NAME = "WatchBuddy_Nuvio_V46";
const BASE_URL = "https://stream.watchbuddy.tv";

async function getStreams(args) {
    // [LOG 1] Eklenti tetiklendi mi?
    console.error(`[${PROVIDER_NAME}] >>> Eklenti Baslatildi. Gelen Argumanlar:`, JSON.stringify(args));

    var mediaId = (typeof args === 'object') ? (args.tmdbId || args.id) : args;
    
    // [LOG 2] ID Kontrolü
    if (!mediaId) {
        console.error(`[${PROVIDER_NAME}] !!! HATA: Media ID bulunamadi. Akis durduruluyor.`);
        return [];
    }
    console.error(`[${PROVIDER_NAME}] İşlenen Media ID: ${mediaId}`);

    var playerHeaders = {
        "User-Agent": "Mozilla/5.0 (Linux; Android 11; Fire TV)",
        "Referer": BASE_URL + "/",
        "X-Requested-With": "com.nuvio.android"
    };

    try {
        // [LOG 3] Arama Başlatılıyor
        var searchUrl = `${BASE_URL}/api/v1/search?q=${mediaId}&type=movie`;
        console.error(`[${PROVIDER_NAME}] Sunucuya istek atiliyor: ${searchUrl}`);

        var response = await fetch(searchUrl, { headers: playerHeaders });
        
        // [LOG 4] Sunucu Yanıt Durumu
        console.error(`[${PROVIDER_NAME}] Sunucu Yanit Kodu: ${response.status} ${response.statusText}`);

        var data = await response.json();
        var items = data.result || data.results || [];

        // [LOG 5] Arama Sonucu Verisi
        console.error(`[${PROVIDER_NAME}] Sunucudan donen ham veri adedi: ${items ? items.length : 0}`);

        if (items && items.length > 0) {
            return items.map(function(item, index) {
                var finalUrl = `${BASE_URL}/proxy/video?url=${encodeURIComponent(item.url || item.path)}&force_proxy=1`;
                
                // [LOG 6] Link Paketleme
                console.error(`[${PROVIDER_NAME}] [${index}] Kaynak Hazir: ${item.provider} -> ${finalUrl}`);

                return {
                    name: item.provider || "WatchBuddy",
                    title: `${item.title} [Dahili]`,
                    url: finalUrl,
                    headers: playerHeaders,
                    is_hls: true
                };
            });
        }
        
        throw new Error("Sunucu bos dondu");

    } catch (e) {
        // [LOG 7] Catch Bloğu - Neden Tünele Girdik?
        console.error(`[${PROVIDER_NAME}] Arama sekteye ugradi veya sonuc yok. Sebebi: ${e.message}`);
        
        var tunnelUrl = `${BASE_URL}/izle/SineWix?url=${encodeURIComponent("http://px-webservisler:2585/sinewix/movie/" + mediaId)}&force_proxy=1`;
        
        // [LOG 8] Tünel Linki Oluşturuldu
        console.error(`[${PROVIDER_NAME}] TUNEL DEVREDE: ${tunnelUrl}`);

        return [{
            name: "WatchBuddy Direct",
            title: "Otomatik Kaynak (Yedek)",
            url: tunnelUrl,
            headers: playerHeaders,
            is_hls: true
        }];
    }
}

globalThis.getStreams = getStreams;
