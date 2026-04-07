var TMDB_API_KEY = '500330721680edb6d5f7f12ba7cd9023';
var VERSION      = "7.2.0-LINK-VERIFIER";

async function getStreams(tmdbId, mediaType, season, episode) {
    if (mediaType !== 'tv') return [];

    try {
        // 1. TMDB'den IMDb ID ve Dizi adını al
        const tmdbRes = await fetch(`https://api.themoviedb.org/3/tv/${tmdbId}?api_key=${TMDB_API_KEY}&language=tr-TR&append_to_response=external_ids`);
        const d = await tmdbRes.json();
        
        const imdbId = d.external_ids ? d.external_ids.imdb_id : null;
        const showName = d.name || "Bilinmeyen Dizi";

        if (!imdbId || !imdbId.startsWith('tt')) return [];

        // 2. Formatı hazırla (s1/e06 gibi)
        let sStr = "s" + season;
        let eStr = "e" + (episode < 10 ? "0" + episode : episode);
        const targetUrl = `https://vidmody.com/vs/${imdbId}/${sStr}/${eStr}`;

        // 3. KRİTİK NOKTA: Linkin gerçekten var olup olmadığını kontrol et
        // 'no-cors' modunda status alınamayacağı için normal fetch deniyoruz.
        // Bazı siteler CORS engeli koyabilir, bu durumda proxy veya sunucu tarafı gerekebilir.
        try {
            const checkRes = await fetch(targetUrl, { 
                method: 'HEAD', // Sadece başlıkları al (daha hızlıdır)
                headers: { 'User-Agent': 'Mozilla/5.0' }
            });

            // Eğer sayfa varsa (200 OK) sonuçlara ekle
            if (checkRes.status === 200) {
                return [{
                    url: targetUrl, 
                    name: `Vidmody [1080p]`,
                    title: `${showName} - ${sStr.toUpperCase()}${eStr.toUpperCase()}`,
                    quality: "1080p",
                    headers: {
                        'Referer': 'https://vidmody.com/',
                        'User-Agent': 'Mozilla/5.0'
                    }
                }];
            }
        } catch (linkError) {
            // Eğer fetch tamamen başarısız olursa (CORS veya Network hatası), 
            // risk almamak için boş döndürüyoruz.
            console.log("Link doğrulanamadı, atlanıyor...");
            return [];
        }

        return [];

    } catch (e) {
        console.error(`[V${VERSION}] HATA: ${e.message}`);
        return [];
    }
}

if (typeof module !== 'undefined') module.exports = { getStreams };
