/* * MoOnCrOwN - StreamIMDB Nuvio Fix
 * Bilgi: Fonksiyon ismi 'getStreams' olarak güncellendi.
 * Bilgi: QuickJS uyumluluğu için globalThis kullanıldı.
 */

async function getStreams(input) {
    // Bilgi: IMDb ID'sini gelen veriden ayıklıyoruz
    const id = input.id.includes(':') ? input.id.split(':')[0] : input.id;
    const targetUrl = `https://streamimdb.me/embed/${id}`;
    
    try {
        // Bilgi: Siteye tarayıcı gibi görünmek için Header ekliyoruz
        const response = await http.get(targetUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Referer': 'https://streamimdb.me/'
            }
        });

        const html = response.data;

        // Bilgi: Sayfa boş gelirse hata logu basıyoruz
        if (!html) {
            console.error("HATA: Sayfa içeriği boş!");
            return [];
        }

        // Bilgi: Playerjs içindeki 'file' etiketini arıyoruz
        const fileMatch = html.match(/file\s*:\s*["']([^"']+)["']/);
        
        if (fileMatch && fileMatch[1]) {
            let videoUrl = fileMatch[1];

            // Bilgi: Link şifreliyse (Base64/Reverse) çözüyoruz
            if (videoUrl.startsWith("#") || !videoUrl.startsWith("http")) {
                try {
                    videoUrl = atob(videoUrl.replace("#", "").split("").reverse().join(""));
                } catch (e) {
                    console.error("HATA: Link şifresi çözülemedi.");
                }
            }

            // Bilgi: Geçerli bir video linki varsa Nuvio formatında döndür
            if (videoUrl.includes(".m3u8") || videoUrl.includes(".mp4")) {
                return [{
                    name: "MoOnCrOwN - StreamIMDB",
                    url: videoUrl,
                    type: "hls"
                }];
            }
        }

        // Bilgi: Link bulunamazsa ham veriden bir parça basıyoruz ki sorunu görelim
        console.error("HATA: Link ayıklanamadı. Ham Veri: " + html.substring(0, 200));
        return [];

    } catch (err) {
        // Bilgi: Ağ veya sistem hatalarını yakalıyoruz
        console.error("KRİTİK HATA: " + err.message);
        return [];
    }
}

// Bilgi: Nuvio'nun fonksiyonu bulabilmesi için global tanımlama
globalThis.getStreams = getStreams;
