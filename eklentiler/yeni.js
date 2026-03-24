/**
 * Nuvio Ghost-Protocol - izle.plus (V84)
 */

var config = {
    name: "izle.plus (Ghost-V89)",
    baseUrl: "https://izle.plus",
    proxyUrl: "https://goproxy.watchbuddy.tv/proxy/video"
};

async function getStreams(input) {
    try {
        console.error("[Kekik-Log] 1. Ghost Mod Aktif");
        let query = (typeof input === 'object') ? (input.title || input.name) : input;
        if (!query || /^\d+$/.test(query)) query = "Ajan Zeta";

        var browserUA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

        // 1. ARAMA VE SAYFA BULMA (Bu kısım zaten çalışıyor)
        let sRes = await fetch(`${config.baseUrl}/?s=${encodeURIComponent(query)}`, { headers: { 'User-Agent': browserUA } });
        let sHtml = await sRes.text();
        let movieUrl = (sHtml.match(/href="(https?:\/\/izle\.plus\/(?!wp-)[^"\/]+\/)"/i) || [])[1];
        if (!movieUrl) return [];

        let mRes = await fetch(movieUrl, { headers: { 'User-Agent': browserUA } });
        let mHtml = await mRes.text();
        let videoId = (mHtml.match(/hotstream\.club\/(?:embed|v|download)\/([a-zA-Z0-9_-]+)/i) || [])[1];
        if (!videoId) return [];

        console.error("[Kekik-Log] 2. ID Onaylandı: " + videoId);

        // 2. FETCH HİLELERİ (Boyut: 0 sorununu aşmak için)
        // Hotstream bazen linki /api/source/ID gibi gizli bir endpoint üzerinden verir.
        // Ama en basit haliyle m3u8 linkini "tahmin" edebiliriz.
        
        let attempts = [
            `https://hotstream.club/embed/${videoId}`,
            `https://hotstream.club/v/${videoId}`,
            `https://hotstream.club/download/${videoId}`
        ];

        let finalUrl = "";

        for (let target of attempts) {
            console.error("[Kekik-Log] 3. Deneniyor: " + target);
            try {
                let response = await fetch(target, {
                    method: 'GET',
                    headers: {
                        'User-Agent': browserUA,
                        'Referer': movieUrl,
                        'Accept': '*/*',
                        'Connection': 'keep-alive'
                    },
                    credentials: 'omit' // Bot korumasını bazen bu gevşetir
                });

                let content = await response.text();
                console.error("[Kekik-Log] 4. Cevap Boyutu: " + content.length);

                if (content.length > 0) {
                    // m3u8 Yakala
                    let m = content.match(/["'](https?:\/\/[^"']+\.m3u8[^"']*)["']/i);
                    if (m) { finalUrl = m[1].replace(/\\/g, ""); break; }
                }
            } catch (e) {
                console.error("[Kekik-Log] 3.X Hata: " + e.message);
            }
        }

        if (finalUrl) {
            console.error("[Kekik-Log] 5. BİNGO: " + finalUrl);
            return [{
                name: "HotStream (Ghost-V89)",
                url: `${config.proxyUrl}?url=${encodeURIComponent(finalUrl)}&referer=${encodeURIComponent("https://hotstream.club/")}&ignore_ssl=true`,
                headers: { 
                    'User-Agent': browserUA, 
                    'Referer': "https://hotstream.club/",
                    'Origin': "https://hotstream.club"
                }
            }];
        }

        console.error("[Kekik-Log] 6. Hiçbir yöntemle link alınamadı.");
        return [];

    } catch (e) {
        console.error("[Kekik-Log] CRASH: " + e.toString());
        return [];
    }
}

globalThis.getStreams = getStreams;
