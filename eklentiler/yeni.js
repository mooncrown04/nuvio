/** * MoOnCrOwN - Firestick Silk Optimized Fix
 * Bilgi: Firestick Silk Tarayıcı kimliği (User-Agent) eklendi.
 * Bilgi: Nuvio QuickJS uyumluluğu sağlandı.
 */

async function getStreams(input) {
    const cleanId = input.id.split(':')[0];
    const targetUrl = `https://streamimdb.me/embed/${cleanId}`;
    
    try {
        // Bilgi: Firestick Silk Tarayıcısının orijinal kimlik bilgileri
        const silkHeaders = {
            'User-Agent': 'Mozilla/5.0 (Linux; Android 11; AFTSSS Build/RS1115; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/115.0.5790.166 Mobile Safari/537.36 Silk/115.2.4',
            'Referer': 'https://streamimdb.me/',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
            'Accept-Language': 'tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7'
        };

        const response = await http.get(targetUrl, { headers: silkHeaders });
        const html = response.data;

        if (!html || html.length < 1000) {
            console.error("HATA: Site Silk kimliğini reddetti veya bot koruması çıktı.");
            return [];
        }

        // Bilgi: Playerjs içindeki video dosyasını ayıkla
        const fileMatch = html.match(/file\s*:\s*["']([^"']+)["']/);
        
        if (fileMatch && fileMatch[1]) {
            let videoUrl = fileMatch[1];

            // Bilgi: Şifreli linki çöz (atob ve reverse mantığı)
            if (videoUrl.startsWith("#") || !videoUrl.startsWith("http")) {
                try {
                    videoUrl = atob(videoUrl.replace("#", "").split("").reverse().join(""));
                } catch (e) {
                    // Alternatif şifre çözme (düz base64)
                    try { videoUrl = atob(videoUrl.replace("#", "")); } catch(e2) {}
                }
            }

            // Bilgi: Nuvio oynatıcısına m3u8 linkini gönder
            if (videoUrl.includes(".m3u8")) {
                return [{
                    name: "MoOnCrOwN - Silk Mode",
                    url: videoUrl,
                    type: "hls",
                    headers: silkHeaders // Oynatırken de aynı kimliği kullanması şart
                }];
            }
        }

        console.error("HATA: Link bulunamadı, site yapısı değişmiş olabilir.");
        return [];

    } catch (err) {
        console.error("SİSTEM HATASI: " + err.message);
        return [];
    }
}

// Bilgi: Nuvio fonksiyon ataması
globalThis.getStreams = getStreams;
