/**
 * Provider: Dizigom (Debug Mode)
 */
function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
    const BASE_URL = 'https://dizigom104.com';
    const HEADERS = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Referer': BASE_URL + '/'
    };

    return new Promise(async (resolve) => {
        if (mediaType !== 'tv') {
            console.log('[Dizigom] Hata: Sadece TV dizileri destekleniyor.');
            return resolve([]);
        }

        try {
            console.log(`[Dizigom] İŞLEM BAŞLADI -> TMDB ID: ${tmdbId}, S:${seasonNum} E:${episodeNum}`);

            // 1. TMDB Aşaması
            const tmdbRes = await fetch(`https://api.themoviedb.org/3/tv/${tmdbId}?api_key=4ef0d7355d9ffb5151e987764708ce96&language=tr-TR`);
            const tmdbData = await tmdbRes.json();
            const originalName = tmdbData.name || tmdbData.original_name;
            
            // Aramayı bozabilecek ekleri temizle (Örn: "The Last of Us (2023)" -> "The Last of Us")
            const cleanQuery = originalName.split(' (')[0].split(':')[0].trim();
            console.log(`[Dizigom] TMDB'den Alınan İsim: "${originalName}" -> Sorgu: "${cleanQuery}"`);

            // 2. Arama Aşaması
            const searchUrl = `${BASE_URL}/?s=${encodeURIComponent(cleanQuery)}`;
            console.log(`[Dizigom] Arama Yapılıyor: ${searchUrl}`);
            
            const searchRes = await fetch(searchUrl, { headers: HEADERS });
            console.log(`[Dizigom] Arama Yanıt Kodu: ${searchRes.status}`);
            
            const searchHtml = await searchRes.text();
            console.log(`[Dizigom] Arama Sayfa Boyutu: ${searchHtml.length} karakter`);

            // Arama sonucunda dizi linkini bul (Regex'i daha esnek yaptık)
            const linkMatch = searchHtml.match(/href="(https:\/\/dizigom104\.com\/dizi\/[^"]+)"/i);
            
            if (!linkMatch) {
                console.log('[Dizigom] KRİTİK HATA: Arama sonuçlarında dizi linki bulunamadı!');
                // Log amaçlı sayfanın küçük bir kısmını yazdırabilirsin (isteğe bağlı)
                // console.log('[Dizigom] Sayfa İçeriği İlk 500: ' + searchHtml.substring(0, 500));
                throw new Error('Dizi bulunamadı');
            }

            const showUrl = linkMatch[1].replace(/\/$/, '');
            console.log(`[Dizigom] Dizi Sayfası Tespit Edildi: ${showUrl}`);

            // 3. Bölüm Sayfası Aşaması
            const epUrl = `${showUrl}-${seasonNum}-sezon-${episodeNum}-bolum/`;
            console.log(`[Dizigom] Bölüm Sayfasına Gidiliyor: ${epUrl}`);

            let epRes = await fetch(epUrl, { headers: HEADERS });
            console.log(`[Dizigom] Bölüm Yanıt Kodu: ${epRes.status}`);

            if (epRes.status === 404) {
                const altUrl = `${epUrl.replace(/\/$/, '')}-hd1/`;
                console.log(`[Dizigom] 404 Aldı. Alternatif (HD1) Deneniyor: ${altUrl}`);
                epRes = await fetch(altUrl, { headers: HEADERS });
                console.log(`[Dizigom] Alternatif Yanıt Kodu: ${epRes.status}`);
            }

            const html = await epRes.text();
            const streams = [];

            // 4. Kaynak Ayıklama Aşaması
            console.log('[Dizigom] Video Kaynakları Taranıyor...');
            const videoRegex = /src="([^"]*(?:vidmoly|moly|player|embed|ok\.ru)[^"]*)"/gi;
            let match;
            
            while ((match = videoRegex.exec(html)) !== null) {
                let src = match[1];
                if (src.startsWith('//')) src = 'https:' + src;
                
                if (src.includes('google') || src.includes('facebook')) continue;

                console.log(`[Dizigom] KAYNAK BULUNDU: ${src}`);
                streams.push({
                    name: `Dizigom | ${src.includes('moly') ? 'MolyStream' : 'Kaynak'}`,
                    url: src,
                    quality: '1080p',
                    headers: { 'Referer': BASE_URL + '/' }
                });
            }

            console.log(`[Dizigom] İŞLEM TAMAMLANDI. Toplam Link: ${streams.length}`);
            resolve(streams);

        } catch (err) {
            console.error(`[Dizigom] Hata Detayı: ${err.message}`);
            resolve([]);
        }
    });
}

if (typeof module !== 'undefined') { module.exports = { getStreams }; }
globalThis.getStreams = getStreams;
