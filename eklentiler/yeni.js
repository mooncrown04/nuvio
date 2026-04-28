/* * MoOnCrOwN - StreamIMDB Nuvio Stable Fix
 * Bilgi: 'split' hatası için null kontrolü eklendi.
 * Bilgi: Bellek hatalarına karşı daha hafif bir yapı kullanıldı.
 */

async function getStreams(input) {
    // Bilgi: Input veya ID eksik gelirse çökmemesi için kontrol
    if (!input || !input.id) {
        console.error("HATA: Gelen veri (input.id) boş!");
        return [];
    }

    const cleanId = input.id.split(':')[0];
    const targetUrl = `https://streamimdb.me/embed/${cleanId}`;
    
    try {
        // Bilgi: Silk Tarayıcı kimliğiyle siteyi kandırıyoruz
        const response = await http.get(targetUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Linux; Android 11; Silk/115) AppleWebKit/537.36',
                'Referer': 'https://streamimdb.me/'
            }
        });

        const html = response.data;

        if (!html) {
            console.error("HATA: Sayfa içeriği alınamadı!");
            return [];
        }

        // Bilgi: Playerjs içindeki video dosyasını bul
        const fileMatch = html.match(/file\s*:\s*["']([^"']+)["']/);
        
        if (fileMatch && fileMatch[1]) {
            let streamUrl = fileMatch[1];

            // Bilgi: Şifreli veriyi çöz
            if (streamUrl.startsWith("#") || !streamUrl.startsWith("http")) {
                try {
                    streamUrl = atob(streamUrl.replace("#", "").split("").reverse().join(""));
                } catch (e) {
                    try { streamUrl = atob(streamUrl.replace("#", "")); } catch(e2) {}
                }
            }

            if (streamUrl.includes(".m3u8")) {
                return [{
                    name: "MoOnCrOwN - StreamIMDB",
                    url: streamUrl,
                    type: "hls"
                }];
            }
        }

        console.error("HATA: Video linki ayıklanamadı.");
        return [];

    } catch (err) {
        console.error("SİSTEM HATASI: " + err.message);
        return [];
    }
}

// Bilgi: Nuvio'nun fonksiyonu görebilmesi için global tanımlama
globalThis.getStreams = getStreams;
