/**
 * JetFilmizle — Nuvio Provider (MoOnCrOwN - V28)
 * Analitik ve Bot korumasını atlayarak doğrudan hedefe odaklanır.
 */

var BASE_URL     = 'https://jetfilmizle.net';
var TMDB_API_KEY = '500330721680edb6d5f7f12ba7cd9023';

var HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Linux; Android 10; BRAVIA 4K VH2) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    'Referer': 'https://www.google.com/',
    'Accept-Language': 'tr-TR,tr;q=0.9'
};

function cleanSlug(t) {
    return (t || '').toLowerCase()
        .replace(/ğ/g,'g').replace(/ü/g,'u').replace(/ş/g,'s')
        .replace(/ı/g,'i').replace(/İ/g,'i').replace(/ö/g,'o')
        .replace(/ç/g,'c')
        .replace(/[^a-z0-9]+/g,'-')
        .replace(/^-+|-+$/g,'');
}

async function getStreams(id, mediaType, season, episode) {
    var tmdbId = id.toString().replace(/[^0-9]/g, '');
    var type = (mediaType === 'tv') ? 'tv' : 'movie';

    try {
        // 1. TMDB'den orijinal ismi al
        const tmdbRes = await fetch('https://api.themoviedb.org/3/' + type + '/' + tmdbId + '?api_key=' + TMDB_API_KEY + '&language=tr-TR');
        const info = await tmdbRes.json();
        
        // Jetfilm genellikle orijinal ismi (İngilizce) veya Türkçe ismi slug yapar.
        // İkisini de denemek için bir dizi oluşturuyoruz.
        const titleToTry = info.name || info.title;
        const slug = cleanSlug(titleToTry);
        
        let targetUrl = (mediaType === 'tv') 
            ? `${BASE_URL}/dizi/${slug}/${season}-sezon-${episode}-bolum`
            : `${BASE_URL}/film/${slug}`;

        console.error('[JetFilm-V28] Tahmin URL: ' + targetUrl);

        // 2. Sayfayı çek
        const response = await fetch(targetUrl, { headers: HEADERS });
        const html = await response.text();
        console.error('[JetFilm-V28] HTML Boyutu: ' + html.length);

        const streams = [];

        // 3. TİTAN & WORKER ANALİZİ
        const titanHashRe = /videopark\.top\/titan\/w\/([a-zA-Z0-9_-]+)/;
        const hashMatch = titanHashRe.exec(html);

        if (hashMatch) {
            console.error('[JetFilm-V28] Hash Bulundu: ' + hashMatch[1]);
            const titanUrl = 'https://videopark.top/titan/w/' + hashMatch[1];
            
            const titanRes = await fetch(titanUrl, { headers: { 'Referer': targetUrl } });
            const titanHtml = await titanRes.text();

            // Senin bulduğun o uzun Worker kodunu yakalayalım
            const workerRe = /workers\.dev\/[i|e]\/([a-zA-Z0-9_-]{40,})/i;
            const wm = workerRe.exec(titanHtml);

            if (wm) {
                streams.push({
                    name: "JetFilmizle",
                    title: '⌜ Titan Worker ⌟ | 1080p',
                    url: 'https://videopark.erikkalinina1994.workers.dev/i/' + wm[1],
                    type: 'video',
                    quality: '1080p',
                    headers: { 
                        'Referer': 'https://videopark.top/',
                        'Origin': 'https://videopark.top'
                    }
                });
            }
        }

        // Eğer Titan yoksa Pixeldrain ara
        const pdRe = /href="(https?:\/\/pixeldrain\.com\/u\/([^"]+))"/g;
        let m;
        while ((m = pdRe.exec(html)) !== null) {
            streams.push({
                name: "JetFilmizle",
                title: '⌜ Pixeldrain ⌟',
                url: 'https://pixeldrain.com/api/file/' + m[2] + '?download',
                type: 'video'
            });
        }

        return streams;

    } catch (e) {
        console.error('[JetFilm-V28 Error]: ' + e.message);
        return [];
    }
}

module.exports = { getStreams: getStreams };
