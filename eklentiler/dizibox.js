(function() {
    var cheerio = require("cheerio-without-node-native");

    // Protokol gereği: Fire Stick Lite için HTTP öncelikli
    var BASE_URL = 'http://www.dizibox.tv'; 
    var TMDB_KEY = '4ef0d7355d9ffb5151e987764708ce96';

    async function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
        console.log(`[Dizibox] Başlatıldı: ID=${tmdbId}, S=${seasonNum}, E=${episodeNum}`);
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 12000); // 12 saniye limit

        try {
            if (mediaType !== 'tv') {
                console.log("[Dizibox] Sadece TV dizileri destekleniyor.");
                return [];
            }

            // 1. ADIM: TMDB üzerinden isim çekme
            console.log("[Dizibox] TMDB bilgisi alınıyor...");
            const tmdbUrl = `https://api.themoviedb.org/3/tv/${tmdbId}?language=tr-TR&api_key=${TMDB_KEY}`;
            const tmdbRes = await fetch(tmdbUrl, { signal: controller.signal });
            const tmdbData = await tmdbRes.json();
            const query = tmdbData.name || tmdbData.original_name;

            if (!query) throw new Error("TMDB'den isim alınamadı.");
            console.log(`[Dizibox] Arama sorgusu: ${query}`);

            // 2. ADIM: Dizibox Arama (HTTP üzerinden SSL hatasını aşmak için)
            const searchUrl = `${BASE_URL}/?s=${encodeURIComponent(query)}`;
            console.log(`[Dizibox] Arama yapılıyor: ${searchUrl}`);
            
            const searchRes = await fetch(searchUrl, {
                headers: { 'User-Agent': 'facebookexternalhit/1.1' },
                signal: controller.signal
            });
            const searchHtml = await searchRes.text();

            let $ = cheerio.load(searchHtml);
            const firstMatch = $('.post-title a').first().attr('href');
            $ = null; // Belleği boşalt

            if (!firstMatch) {
                console.log("[Dizibox] Arama sonucu boş.");
                return [];
            }
            console.log(`[Dizibox] Dizi bulundu: ${firstMatch}`);

            // 3. ADIM: Bölüm Sayfasına Git
            const cleanUrl = firstMatch.endsWith('/') ? firstMatch.slice(0, -1) : firstMatch;
            const epUrl = `${cleanUrl}-sezon-${seasonNum}-bolum-${episodeNum}-izle/`.replace('https://', 'http://');
            console.log(`[Dizibox] Bölüm isteği: ${epUrl}`);

            const epRes = await fetch(epUrl, { signal: controller.signal });
            const epHtml = await epRes.text();

            // 4. ADIM: Iframe/Video Linklerini Ayıkla
            const streams = [];
            let $ep = cheerio.load(epHtml);

            // OG kontrolü (Log için)
            const ogUrl = $ep('meta[property="og:url"]').attr('content');
            if (ogUrl) console.log(`[Dizibox] OG Doğrulanmış URL: ${ogUrl}`);

            $ep('iframe').each((i, el) => {
                let src = $ep(el).attr('src') || '';
                if (src.includes('vidmoly') || src.includes('dizibox') || src.includes('moly')) {
                    const finalUrl = src.startsWith('//') ? 'https:' + src : src;
                    streams.push({
                        name: "Dizibox - Kaynak " + (i + 1),
                        url: finalUrl,
                        quality: '720p',
                        headers: { 'Referer': BASE_URL }
                    });
                }
            });

            $ep = null; // Belleği boşalt
            clearTimeout(timeoutId);

            console.log(`[Dizibox] Bitti. Bulunan kaynak sayısı: ${streams.length}`);
            return streams;

        } catch (err) {
            clearTimeout(timeoutId);
            if (err.name === 'AbortError') {
                console.error("[Dizibox] Hata: Cihaz performansı nedeniyle zaman aşımı.");
            } else {
                console.error(`[Dizibox] Kritik Hata: ${err.message}`);
            }
            return [];
        }
    }

    // --- SİSTEM ENTEGRASYONU (Loglardaki "not found" hatası çözümü) ---
    const exportObject = { getStreams: getStreams };

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = exportObject;
    }
    
    // Bazı plugin sistemleri sadece global nesneye bakar
    globalThis.getStreams = getStreams;
    
    console.log("[Dizibox] Plugin başarıyla yüklendi ve globalThis.getStreams tanımlandı.");

})();
