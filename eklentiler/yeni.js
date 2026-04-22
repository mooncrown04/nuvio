/**
 * JetFilmizle - Nuvio Ultra (v51 Clean Evidence)
 * Reklam servislerini (google, yandex vb.) eler.
 * Sadece 11-12 haneli gerçek Titan kodlarına odaklanır.
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

        // 1. ADIM: "GÜÇLÜ FİLTRELEME" (googletagmanager gibi hataları eliyoruz)
        // Gerçek Titan kodları genelde büyük harf, küçük harf ve rakam karışımıdır.
        const potentialKeys = html.match(/[a-zA-Z0-9]{11,12}/g) || [];
        
        let validKeys = [...new Set(potentialKeys)].filter(k => 
            /[0-9]/.test(k) &&          // En az bir rakam içermeli
            /[A-Z]/.test(k) &&          // En az bir BÜYÜK harf içermeli
            !/google|tag|manager|GTM|script|window|document|active/i.test(k) // Reklam/JS kelimelerini ele
        );

        console.error(`[CLEAN] Temizlenmiş Aday Sayısı: ${validKeys.length}`);

        // 2. ADIM: Sayfanın sonundaki adaylara öncelik ver (Asıl player genelde sondadır)
        let targets = validKeys.reverse().slice(0, 3); 

        for (let wId of targets) {
            try {
                console.error(`[CLEAN] Deneniyor: ${wId}`);
                const response = await fetch(`https://videopark.top/titan/w/${wId}`, {
                    headers: {
                        'Referer': BASE_URL + '/',
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
                    },
                    timeout: 3000
                });
                
                const playerHtml = await response.text();

                if (playerHtml.includes('_sd')) {
                    const sdMatch = playerHtml.match(/var\s+_sd\s*=\s*({[\s\S]*?});/);
                    if (sdMatch) {
                        const data = JSON.parse(sdMatch[1]);
                        console.error(`[SUCCESS] Dizi Başlatıldı: ${wId}`);
                        return [{
                            name: "Jet-Titan (Dizi-Clean)",
                            url: data.stream_url,
                            type: "hls",
                            subtitles: data.subtitles ? data.subtitles.map(s => ({
                                url: s.file, language: s.label, format: "vtt"
                            })) : [],
                            headers: { 'Referer': 'https://videopark.top/', 'User-Agent': 'Mozilla/5.0' }
                        }];
                    }
                }
            } catch (e) {}
        }
        return [];
    } catch (err) { return []; }
}

module.exports = { getStreams };
