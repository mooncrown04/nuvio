// Gerekli Headerlar
const HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    'Referer': 'https://www.dizibox.live/'
};

async function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
    if (mediaType !== 'tv') return [];

    try {
        // 1. TMDB Verisi ve Slug Oluşturma
        const tmdbRes = await fetch(`https://api.themoviedb.org/3/tv/${tmdbId}?api_key=4ef0d7355d9ffb5151e987764708ce96&language=tr-TR`);
        const tmdbData = await tmdbRes.json();
        const slug = (tmdbData.original_name || tmdbData.name).toLowerCase().trim().replace(/\s+/g, '-').replace(/[^\w-]+/g, '');

        // 2. Bölüm Sayfasına Git
        const epUrl = `https://www.dizibox.live/${slug}-${seasonNum}-sezon-${episodeNum}-bolum-hd-izle/`;
        const mainRes = await fetch(epUrl, { headers: HEADERS });
        const mainHtml = await mainRes.text();

        // 3. Iframe'i (King Player) Bul
        const iframeMatch = mainHtml.match(/<iframe[^>]+src="([^"]*king\.php\?v=[^"]*)"/i);
        if (!iframeMatch) return [];

        let kingUrl = iframeMatch[1];
        if (kingUrl.startsWith('//')) kingUrl = 'https:' + kingUrl;
        // Kotlin örneğindeki gibi wmode ekle
        kingUrl = kingUrl.replace("king.php?v=", "king.php?wmode=opaque&v=");

        // 4. King Player Sayfasını Çek (Referer önemli!)
        const kingRes = await fetch(kingUrl, { 
            headers: { ...HEADERS, 'Referer': epUrl } 
        });
        const kingHtml = await kingRes.text();

        // 5. İçerideki asıl Player Iframe'ini bul
        const innerIframeMatch = kingHtml.match(/<iframe[^>]+src="([^"]*)"/i);
        if (!innerIframeMatch) return [];

        const finalPlayerUrl = innerIframeMatch[1];

        // 6. Şifreli Veriyi Al (AES Katmanı)
        const playerRes = await fetch(finalPlayerUrl, { 
            headers: { ...HEADERS, 'Referer': 'https://www.dizibox.live/' } 
        });
        const playerContent = await playerRes.text();

        // Regex ile Şifreli Data ve Şifre (Pass) yakalama
        const cryptDataMatch = playerContent.match(/CryptoJS\.AES\.decrypt\("([^"]+)"\s*,\s*"([^"]+)"\)/);
        
        if (cryptDataMatch) {
            const encryptedData = cryptDataMatch[1];
            const password = cryptDataMatch[2];

            /* NOT: JS ortamında CryptoJS kütüphanesi yüklü olmalıdır. 
               Eğer yüklü değilse, uygulama bu veriyi otomatik çözen 
               bir "Extractor" kullanıyor olabilir.
            */

            return [{
                name: "DiziBox | King Player",
                url: finalPlayerUrl, // Uygulama AES'i kendi çözebiliyorsa URL yeterlidir
                quality: "1080p",
                headers: { 
                    'Referer': 'https://www.dizibox.live/',
                    'User-Agent': HEADERS['User-Agent']
                }
            }];
        }

        return [];

    } catch (err) {
        console.log(`[Dizibox] Hata: ${err.message}`);
        return [];
    }
}
