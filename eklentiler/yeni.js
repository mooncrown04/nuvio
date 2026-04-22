/**
 * JetFilmizle - Nuvio Ultra (v59 Worker Infiltrator)
 * Player sayfasına gitmek yerine, player'ın linkleri aldığı 
 * Worker (v4/g/...) yapısını simüle eder.
 */

var BASE_URL = 'https://jetfilmizle.net';
var TMDB_API_KEY = '500330721680edb6d5f7f12ba7cd9023';

async function getStreams(id, mediaType, season, episode) {
    if (mediaType !== 'tv') return [];

    try {
        const tmdbId = id.toString().replace(/[^0-9]/g, '');
        const tmdbRes = await fetch(`https://api.themoviedb.org/3/tv/${tmdbId}?api_key=${TMDB_API_KEY}&language=tr-TR`);
        const info = await tmdbRes.json();
        const slug = (info.name || "").toLowerCase().replace(/ğ/g,'g').replace(/ü/g,'u').replace(/ş/g,'s').replace(/ı/g,'i').replace(/ö/g,'o').replace(/ç/g,'c').replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'');
        const targetUrl = `${BASE_URL}/dizi/${slug}/sezon-${season}/bolum-${episode}`;

        const pageRes = await fetch(targetUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } });
        const html = await pageRes.text();

        // 1. ADIM: Player'ın kullandığı asıl anahtarı (vId) bul
        // DFADX veya XLD fark etmeksizin en son eklenen kodu alıyoruz
        const pattern = /[a-zA-Z0-9]{11,12}/g;
        let matches = html.match(pattern) || [];
        let vId = matches.reverse().find(k => /[0-9]/.test(k) && /[A-Z]/.test(k) && !/google|manager|Active/i.test(k));

        if (!vId) return [];
        console.error(`[WORKER] Anahtar Yakalandı: ${vId}`);

        // 2. ADIM: Player'ı atla, doğrudan Worker'a (v4/g/...) sor!
        // Videopark'ın asıl "mutfağı" burasıdır.
        const workerUrls = [
            `https://videopark.top/v4/g/${vId}`,
            `https://videopark.top/titan/g/${vId}`
        ];

        for (let wUrl of workerUrls) {
            try {
                const response = await fetch(wUrl, {
                    headers: {
                        'Referer': 'https://videopark.top/', // Worker genelde kendi domainini referer ister
                        'Origin': 'https://videopark.top',
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
                        'X-Requested-With': 'XMLHttpRequest' // Worker'a "ben bir scriptim" diyoruz
                    }
                });

                const data = await response.json();

                // Eğer Worker bize doğrudan m3u8 linkini verirse (data.url veya data.stream_url)
                if (data && (data.url || data.stream_url || data.file)) {
                    console.error(`[SUCCESS] Worker Linki Verdi: ${vId}`);
                    return [{
                        name: "Jet-Worker (Direct)",
                        url: data.url || data.stream_url || data.file,
                        type: "hls",
                        headers: {
                            'Referer': 'https://videopark.top/',
                            'User-Agent': 'Mozilla/5.0'
                        }
                    }];
                }
            } catch (e) {
                // Eğer Worker JSON dönmüyorsa HTML parse etmeyi dene
                console.error(`[WORKER] ${wUrl} için JSON gelmedi, devam ediliyor...`);
            }
        }

        // 3. ADIM: Worker yemezse, dünkü klasik titan/w/ yöntemine düş (Fallback)
        const fallbackRes = await fetch(`https://videopark.top/titan/w/${vId}`, {
            headers: { 'Referer': 'https://jetfilmizle.net/', 'User-Agent': 'Mozilla/5.0' }
        });
        const fallbackHtml = await fallbackRes.text();
        if (fallbackHtml.includes('_sd')) {
            const data = JSON.parse(fallbackHtml.match(/var\s+_sd\s*=\s*({[\s\S]*?});/)[1]);
            return [{
                name: "Jet-Titan (Fallback)",
                url: data.stream_url,
                type: "hls",
                headers: { 'Referer': 'https://videopark.top/', 'User-Agent': 'Mozilla/5.0' }
            }];
        }

        return [];
    } catch (err) { return []; }
}

module.exports = { getStreams };
