/**
 * JetFilmizle - Nuvio Ultra (v63 Derin Analiz)
 * DFADX'i üreten gizli değişkenleri ve 
 * Base64 ile gizlenmiş player parametrelerini avlar.
 */

var BASE_URL = 'https://jetfilmizle.net';
var TMDB_API_KEY = '500330721680edb6d5f7f12ba7cd9023';

async function getStreams(id, mediaType, season, episode) {
    if (mediaType !== 'tv') return [];

    try {
        const tmdbId = id.toString().replace(/[^0-9]/g, '');
        const tmdbRes = await fetch(`https://api.themoviedb.org/3/tv/${tmdbId}?api_key=${TMDB_API_KEY}&language=tr-TR`);
        const info = await tmdbRes.json();
        const slug = (info.name || "").toLowerCase().replace(/[^a-z0-9]+/g,'-');
        const targetUrl = `${BASE_URL}/dizi/${slug}/sezon-${season}/bolum-${episode}`;

        const pageRes = await fetch(targetUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } });
        const html = await pageRes.text();

        console.error(`[DEEP-INSPECT] Analiz Başladı: ${targetUrl}`);

        // 1. ADIM: Gizli Input (Hidden) ve Data Attribute avı
        const hiddenData = html.match(/value="([A-Za-z0-9]{30,})"/g) || [];
        hiddenData.forEach(h => console.error(`[DEEP-INSPECT] Gizli Veri: ${h.substring(0, 50)}...`));

        // 2. ADIM: "MTc3" gibi Base64 yapılarını tek tek decode etmeyi dene
        const b64s = html.match(/[A-Za-z0-9+/]{20,}/g) || [];
        b64s.forEach(b => {
            if (!/google|manager|script/i.test(b)) {
                try {
                    let dec = Buffer.from(b, 'base64').toString('utf-8');
                    if (dec.includes('http') || dec.length > 5) {
                        console.error(`[DEEP-INSPECT] Çözülen B64: ${dec}`);
                    }
                } catch(e) {}
            }
        });

        // 3. ADIM: Sayfadaki tüm script src'lerini listele (Hangi JS dosyası şifreliyor?)
        const scripts = html.match(/src="([^"]+\.js[^"]*)"/g) || [];
        scripts.forEach(s => console.error(`[DEEP-INSPECT] JS Dosyası: ${s}`));

        // 4. ADIM: "ajax", "post", "get_player" gibi kelimelerin geçtiği satırları yakala
        const lines = html.split('\n');
        lines.forEach(l => {
            if (l.includes('get_player') || l.includes('titan') || l.includes('post(')) {
                console.error(`[DEEP-INSPECT] Şüpheli Satır: ${l.trim().substring(0, 100)}`);
            }
        });

        return []; 
    } catch (err) { return []; }
}

module.exports = { getStreams };
