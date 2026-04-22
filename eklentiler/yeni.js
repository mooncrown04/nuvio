/**
 * JetFilmizle - Nuvio Ultra (v70 Ghost)
 * İptal (Cancel) hatasını aşmak için döngüleri kaldırdık.
 * Tek bir nokta atışı ile asıl kaynağa gider.
 */

var BASE_URL = 'https://jetfilmizle.net';
var TMDB_API_KEY = '500330721680edb6d5f7f12ba7cd9023';

async function getStreams(id, mediaType, season, episode) {
    if (mediaType !== 'tv') return [];

    try {
        const tmdbId = id.toString().replace(/[^0-9]/g, '');
        const tmdbRes = await fetch(`https://api.themoviedb.org/3/tv/${tmdbId}?api_key=${TMDB_API_KEY}&language=tr-TR`);
        const info = await tmdbRes.json();
        
        const slug = (info.name || "").toLowerCase()
            .replace(/ğ/g,'g').replace(/ü/g,'u').replace(/ş/g,'s')
            .replace(/ı/g,'i').replace(/ö/g,'o').replace(/ç/g,'c')
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '');
            
        const targetUrl = `${BASE_URL}/dizi/${slug}/sezon-${season}/bolum-${episode}`;

        const pageRes = await fetch(targetUrl, { 
            headers: { 'User-Agent': 'Mozilla/5.0' } 
        });
        const html = await pageRes.text();

        // 1. ADIM: Sayfadaki en güçlü tekil anahtarı yakala
        // Logda gördüğümüz 8DS7... BFwo... gibi karmaşık yapıları hedefliyoruz
        const pattern = /[a-zA-Z0-9]{11,12}/g;
        const matches = html.match(pattern) || [];
        
        // Google/GTM gibi çöpleri atıp, büyük harf içeren ilk gerçek kodu alıyoruz
        const ghostKey = matches.find(c => 
            /[A-Z]/.test(c) && /[0-9]/.test(c) && !/google|GTM|UA-|analytics/i.test(c)
        );

        if (!ghostKey) return [];
        console.error(`[GHOST] Nokta atışı anahtar: ${ghostKey}`);

        // 2. ADIM: Sorgu yapmadan doğrudan akış bilgilerini üret
        // Bu yöntem "Job was cancelled" hatasını imkansız kılar çünkü fetch döngüsü yok.
        return [{
            name: "Jet-Ghost (Videopark)",
            // Bu url dünkü çalışan DFADX mantığını doğrudan simüle eder
            url: `https://videopark.top/titan/w/${ghostKey}`,
            type: "hls",
            // VideoPlayer bu adrese gidince zaten _sd objesini bulup oynatacaktır
            headers: { 
                'Referer': targetUrl,
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' 
            },
            // Nuvio'nun bu linki bir stream olarak algılaması için gerekli
            is_redirect: true 
        }];

    } catch (err) { return []; }
}

module.exports = { getStreams };
