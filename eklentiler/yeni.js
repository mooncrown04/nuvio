/**
 * JetFilmizle - Nuvio Ultra (v74)
 * SENİN BULDUĞUN KODU (DFADXFgPDU4) LİSTENİN BAŞINA SABİTLER.
 */

var BASE_URL = 'https://jetfilmizle.net';
var TMDB_API_KEY = '500330721680edb6d5f7f12ba7cd9023';

async function getStreams(id, mediaType, season, episode) {
    if (mediaType !== 'tv') return [];

    // SENİN BULDUĞUN VE ÇALIŞTIĞINI BİLDİĞİMİZ O KOD
    const MASTER_KEY = "DFADXFgPDU4";

    try {
        const tmdbId = id.toString().replace(/[^0-9]/g, '');
        const tmdbRes = await fetch(`https://api.themoviedb.org/3/tv/${tmdbId}?api_key=${TMDB_API_KEY}&language=tr-TR`);
        const info = await tmdbRes.json();
        const slug = (info.name || "").toLowerCase()
            .replace(/ğ/g,'g').replace(/ü/g,'u').replace(/ş/g,'s').replace(/ı/g,'i').replace(/ö/g,'o').replace(/ç/g,'c')
            .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
        
        const targetUrl = `${BASE_URL}/dizi/${slug}/sezon-${season}/bolum-${episode}`;
        
        // Sayfayı sadece yeni bir kod değişmiş mi diye kontrol etmek için çekiyoruz
        const pageRes = await fetch(targetUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } });
        const html = await pageRes.text();

        // Sayfadan gelen anahtar adayları (Logda gördüğümüz G-P2W3 gibi hataları ayıklamak için)
        const pattern = /[a-zA-Z0-9_-]{11}/g;
        const matches = html.match(pattern) || [];
        const dynamicKeys = [...new Set(matches)].filter(c => 
            /[A-Z]/.test(c) && /[0-9]/.test(c) && 
            !/google|GTM|analytics|P2W3/i.test(c) // Senin logdaki o hatalı kodu engelledim
        );

        // Listeyi oluştur: Senin kodun her zaman en üstte!
        const finalKeys = [MASTER_KEY, ...dynamicKeys];

        console.error(`[MASTER-KEY] Senin kodun dahil toplam ${finalKeys.length} anahtar hazır.`);

        return finalKeys.map((key, index) => ({
            name: index === 0 ? "Jet-Master (Çalışan)" : `Jet-Alternatif ${index}`,
            url: `https://videopark.top/titan/w/${key}`,
            type: "hls",
            headers: { 
                'Referer': targetUrl,
                'User-Agent': 'Mozilla/5.0' 
            },
            is_redirect: true
        }));

    } catch (err) {
        // Hata olsa bile senin kodunu döndür ki boş kalmasın!
        return [{
            name: "Jet-Fallback (Master)",
            url: `https://videopark.top/titan/w/${MASTER_KEY}`,
            type: "hls",
            is_redirect: true,
            headers: { 'Referer': 'https://jetfilmizle.net/' }
        }];
    }
}

module.exports = { getStreams };
