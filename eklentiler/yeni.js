/**
 * JetFilmizle - V8 (Signature Fix)
 * Fonksiyon tanınmama hatası giderildi ve Fire Stick kimliği güçlendirildi.
 */

var BASE_URL = 'https://jetfilmizle.net';

async function getStreams(id, mediaType, season, episode) {
    // Log seviyesini E (Error) yaparak Logcat'te görmeni sağlıyoruz
    console.error(`[V8-START] Hedef: S=${season} E=${episode}`);

    try {
        // Jetfilm'in beklediği dizi URL yapısı
        // Önemli: 'cobra-kai' kısmını dinamik yapmıyorsan manuel kontrol et
        const slug = 'cobra-kai'; 
        const targetUrl = `${BASE_URL}/dizi/${slug}/${season}-sezon-${episode}-bolum`;
        
        console.error(`[V8-FETCH] İstek gidiyor: ${targetUrl}`);

        const response = await fetch(targetUrl, {
            headers: {
                // Fire Stick'in kendi orijinal User-Agent'ı (Engeli aşma ihtimali en yüksek olan)
                'User-Agent': 'Mozilla/5.0 (Linux; Android 9; Fire TV Stick 4K Build/NS6294; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/124.0.6367.82 Mobile Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,mobile/1.0',
                'Accept-Language': 'tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7',
                'Referer': 'https://jetfilmizle.net/',
                'Cache-Control': 'no-cache'
            }
        });

        const text = await response.text();
        console.error(`[V8-RESULT] Sayfa Boyutu: ${text.length}`);

        // Eğer hala 58361 geliyorsa IP bloklanmış demektir.
        if (text.length === 58361) {
            console.error("[V8-WARN] Engel aşılamadı (58361). IP veya User-Agent reddedildi.");
            return [];
        }

        // Titan Hash'ini ara
        const regex = /videopark\.top\/titan\/w\/([a-zA-Z0-9_-]{11,20})/;
        const match = text.match(regex);

        if (match && match[1]) {
            const realHash = match[1];
            console.error(`[V8-SUCCESS] Kod Bulundu: ${realHash}`);
            
            const playerUrl = `https://videopark.top/titan/w/${realHash}`;
            const playerRes = await fetch(playerUrl, { headers: { 'Referer': targetUrl } });
            const playerHtml = await playerRes.text();
            
            const sdMatch = playerHtml.match(/var\s+_sd\s*=\s*({[\s\S]*?});/);
            if (sdMatch) {
                const data = JSON.parse(sdMatch[1]);
                return [{
                    name: "Jetfilm - Titan V8",
                    url: data.stream_url,
                    type: "hls",
                    headers: { 
                        'Referer': 'https://videopark.top/',
                        'User-Agent': 'Mozilla/5.0 (Linux; Android 9)'
                    }
                }];
            }
        }
    } catch (err) {
        console.error(`[V8-ERROR] ${err.message}`);
    }
    return [];
}

// UYGULAMANIN FONKSİYONU BULMASI İÇİN BURASI ŞART:
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { getStreams };
}
// Bazı ortamlar için global'e de ekleyelim:
if (typeof globalThis !== 'undefined') {
    globalThis.getStreams = getStreams;
} else if (typeof window !== 'undefined') {
    window.getStreams = getStreams;
}
