/* * MoOnCrOwN - StreamIMDB Nuvio Provider
 * Bilgi: Bu kod Playerjs içindeki şifreli kaynakları Nuvio formatında ayıklar.
 */

async function getSources(input) {
    // Nuvio genellikle veriyi 'tt1270797:1:1' gibi gönderir
    const id = input.id.split(":")[0]; 
    const targetUrl = `https://streamimdb.me/embed/${id}`;
    
    try {
        const response = await http.get(targetUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Referer': 'https://streamimdb.me/'
            }
        });

        const html = response.data;

        // Bilgi: Siteden gelen ham veriyi kontrol ediyoruz
        if (!html) {
            console.error("HATA: Ham veri alınamadı!");
            return [];
        }

        // Bilgi: Playerjs içindeki 'file' değişkenini yakalıyoruz
        const fileMatch = html.match(/file\s*:\s*["']([^"']+)["']/);
        
        if (fileMatch && fileMatch[1]) {
            let encodedData = fileMatch[1];

            // Bilgi: Eğer veri '#' ile başlıyorsa veya düz link değilse şifre çözme uygulanır
            if (encodedData.startsWith("#") || !encodedData.startsWith("http")) {
                try {
                    // Playerjs şifreleme mantığı: Genelde ters çevirme veya özel Base64 kullanılır
                    // Loglardaki yapıya göre en yaygın çözücü:
                    encodedData = encodedData.replace("#", "").split("").reverse().join("");
                    encodedData = atob(encodedData);
                } catch (e) {
                    console.error("HATA: Şifre çözme başarısız: " + e.message);
                }
            }

            // Bilgi: Nuvio'nun oynatabileceği formatta geri döndür
            if (encodedData.includes(".m3u8") || encodedData.includes(".mp4")) {
                return [{
                    name: "StreamIMDB (MoOnCrOwN)",
                    url: encodedData,
                    type: "hls" // m3u8 için hls, mp4 için 'url'
                }];
            }
        }

        // Bilgi: Eğer hiçbir şey bulunamazsa ham verinin bir kısmını hata olarak bas
        console.error("HATA: Link bulunamadı. Sayfa içeriği: " + html.substring(0, 500));
        return [];

    } catch (err) {
        console.error("NUVIO SISTEM HATASI: " + err.message);
        return [];
    }
}

// Bilgi: Nuvio eklenti manifest yapısı için gerekli export
export default { getSources };
