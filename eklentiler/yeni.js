/** * MoOnCrOwN - StreamIMDB Nuvio Provider
 * Bilgi: QuickJS motoru için 'export' kaldırıldı.
 */

async function getSources(input) {
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

        if (!html) {
            console.error("HATA: Siteden veri dönmedi.");
            return [];
        }

        // Bilgi: Playerjs linkini ayıkla
        const fileMatch = html.match(/file\s*:\s*["']([^"']+)["']/);
        
        if (fileMatch && fileMatch[1]) {
            let streamUrl = fileMatch[1];

            // Bilgi: Şifreli (Base64) kontrolü ve çözümü
            if (streamUrl.startsWith("#") || !streamUrl.startsWith("http")) {
                try {
                    // Ters çevir ve Base64 çöz (Playerjs standardı)
                    streamUrl = atob(streamUrl.replace("#", "").split("").reverse().join(""));
                } catch (e) {
                    console.error("HATA: Şifre çözme işlemi başarısız.");
                }
            }

            if (streamUrl.includes(".m3u8") || streamUrl.includes(".mp4")) {
                return [{
                    name: "MoOnCrOwN - StreamIMDB",
                    url: streamUrl,
                    type: streamUrl.includes(".m3u8") ? "hls" : "url"
                }];
            }
        }

        console.error("HATA: Video kaynağı bulunamadı.");
        return [];

    } catch (err) {
        console.error("SİSTEM HATASI: " + err.message);
        return [];
    }
}

// Bilgi: Bazı Nuvio sürümleri için export yerine doğrudan objeyi tanımlıyoruz
// Eğer hala SyntaxError alırsan bu satırı da silip sadece fonksiyonu bırakabilirsin.
({ getSources });
