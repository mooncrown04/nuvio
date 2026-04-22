/**
 * JetFilmizle - Nuvio Ultra (v32 Precise Striker)
 * Sayfadaki çöpleri (CSS, JS fonksiyonları) eler, sadece gerçek Titan ID'lerini hedefler.
 */

var BASE_URL = 'https://jetfilmizle.net';
var TMDB_API_KEY = '500330721680edb6d5f7f12ba7cd9023';

async function getStreams(id, mediaType, season, episode) {
    try {
        const tmdbId = id.toString().replace(/[^0-9]/g, '');
        const tmdbType = (mediaType === 'tv') ? 'tv' : 'movie';
        
        const tmdbRes = await fetch(`https://api.themoviedb.org/3/${tmdbType}/${tmdbId}?api_key=${TMDB_API_KEY}&language=tr-TR`);
        const info = await tmdbRes.json();
        const slug = (info.name || info.title || "").toLowerCase().replace(/ğ/g,'g').replace(/ü/g,'u').replace(/ş/g,'s').replace(/ı/g,'i').replace(/ö/g,'o').replace(/ç/g,'c').replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'');

        const targetUrl = (mediaType === 'tv') 
            ? `${BASE_URL}/dizi/${slug}/sezon-${season}/bolum-${episode}`
            : `${BASE_URL}/film/${slug}`;

        const pageRes = await fetch(targetUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } });
        const html = await pageRes.text();

        // KRİTİK DEĞİŞİKLİK: Sadece DFADX ile başlayan ve sadece harf/rakam içerenleri al (Alt çizgi veya küçük harf içermezse daha temiz olur)
        // Jetfilm'in asıl ID formatı genelde: DFADX + 6-10 karakter Büyük Harf/Rakam
        const workerRegex = /DFADX[A-Z0-9]{5,15}/g; 
        let rawIds = html.match(workerRegex) || [];
        
        // Eğer DFADX bulamazsa, 11 haneli karmaşık ID'leri ara (Ama çok seçici ol)
        if (rawIds.length === 0) {
            const backupRegex = /["']([a-zA-Z0-9]{11})["']/g;
            let m;
            while ((m = backupRegex.exec(html)) !== null) {
                // Küçük harf içeren fonksiyon isimlerini elemek için:
                if (!/^[a-z]+$/.test(m[1]) && !m[1].includes('search')) {
                    rawIds.push(m[1]);
                }
            }
        }

        let workerIds = [...new Set(rawIds)];
        console.error(`[STRIKER] Temizlenmiş Aday Sayısı: ${workerIds.length}`);

        let streams = [];

        for (let wId of workerIds) {
            // "getCSRF", "querySelect" gibi kelimeleri burada eliyoruz
            if (wId.length < 10 || /^[a-z_]+$/.test(wId)) continue;

            const workerUrl = `https://videopark.top/titan/w/${wId}`;
            console.error(`[STRIKER] Hedef: ${workerUrl}`);

            try {
                const wRes = await fetch(workerUrl, { 
                    headers: { 'Referer': 'https://jetfilmizle.net/', 'User-Agent': 'Mozilla/5.0' } 
                });
                const wHtml = await wRes.text();

                const sdMatch = wHtml.match(/var\s+_sd\s*=\s*({[\s\S]*?});/);
                if (sdMatch) {
                    const data = JSON.parse(sdMatch[1]);
                    if (data.stream_url) {
                        streams.push({
                            name: "Jet-Exo",
                            url: data.stream_url,
                            type: "hls",
                            headers: { 'Referer': 'https://videopark.top/' }
                        });
                        if (streams.length >= 2) break;
                    }
                }
            } catch (e) {}
        }

        return streams;

    } catch (err) {
        return [];
    }
}

module.exports = { getStreams };
