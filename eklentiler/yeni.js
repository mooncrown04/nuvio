/**
 * JetFilmizle - V7 (The ID Hunter)
 * Sayfayı parça parça çekerek bot korumasını atlatmaya çalışır.
 */

var BASE_URL = 'https://jetfilmizle.net';

async function getStreams(id, mediaType, season, episode) {
    console.error(`[DEBUG-V7] S=${season}, E=${episode} için ID avı başladı.`);

    try {
        // 1. ADIM: Doğru slug oluşturma (Jetfilm tarzı)
        // Not: TMDB ismini manuel temizlemek yerine alternatif URL yapılarını deneyeceğiz.
        const slugs = ['cobra-kai']; // Burayı TMDB'den gelen isimle dinamik yapabilirsin
        const currentSlug = slugs[0];

        // Jetfilm bazen "3-sezon-5-bolum" bazen de "3-sezon-5-bolum-izle" ister.
        const targetUrl = `${BASE_URL}/dizi/${currentSlug}/${season}-sezon-${episode}-bolum`;
        
        console.error(`[DEBUG-V7] Hedef: ${targetUrl}`);

        // 2. ADIM: Range Request (Bot korumasını şaşırtmak için sayfanın sadece başını istiyoruz)
        const response = await fetch(targetUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
                'Accept': 'text/html',
                'Range': 'bytes=0-100000', // Sadece ilk 100KB'ı getir
                'Referer': 'https://www.google.com/'
            }
        });

        const text = await response.text();
        console.error(`[DEBUG-V7] Alınan veri boyutu: ${text.length}`);

        // 3. ADIM: KODU BULMA (En kritik yer)
        // Sayfa içinde "videopark.top/titan/w/" ifadesinden sonra gelen 11 haneli kodu arıyoruz.
        const regex = /videopark\.top\/titan\/w\/([a-zA-Z0-9_-]{11,20})/;
        const match = text.match(regex);

        if (match && match[1]) {
            const realHash = match[1];
            console.error(`[SUCCESS] GERÇEK BÖLÜM KODU BULUNDU: ${realHash}`);
            
            // Bulduğumuz gerçek kodla Titan'a gidiyoruz
            const playerUrl = `https://videopark.top/titan/w/${realHash}`;
            const playerRes = await fetch(playerUrl, { headers: { 'Referer': targetUrl } });
            const playerHtml = await playerRes.text();
            
            const sdMatch = playerHtml.match(/var\s+_sd\s*=\s*({[\s\S]*?});/);
            if (sdMatch) {
                const data = JSON.parse(sdMatch[1]);
                return [{
                    name: `Jetfilm - S${season}E${episode}`,
                    url: data.stream_url,
                    type: "hls",
                    headers: { 'Referer': 'https://videopark.top/', 'Origin': 'https://videopark.top' }
                }];
            }
        } else {
            console.error("[DEBUG-V7] Sayfada yeni kod bulunamadı. Hala 58361 duvarındayız.");
            // Eğer buraya düşerse tek çare proxy kullanmak veya 
            // Fire Stick'in dahili WebView'ı üzerinden çerezleri (cookie) alıp fetch'e eklemek.
        }

    } catch (err) {
        console.error(`[ERROR] V7: ${err.message}`);
    }
    return [];
}
