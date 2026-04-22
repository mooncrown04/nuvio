/**
 * JetFilmizle - Nuvio Ultra (v62 Forensic Scanner)
 * Bu kod sadece "DFADX" ve benzeri yapıların sayfada 
 * nasıl saklandığını (Base64, Plain, JSON) tespit eder.
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

        console.error(`[FORENSIC] Taranıyor: ${targetUrl}`);
        const pageRes = await fetch(targetUrl, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' } });
        const html = await pageRes.text();

        // TEST 1: Doğrudan Metin Olarak mı Duruyor?
        const directMatch = html.match(/DFADX[a-zA-Z0-9]+/);
        if (directMatch) {
            console.error(`[FORENSIC] BULDUM (Düz Metin): ${directMatch[0]}`);
        }

        // TEST 2: Base64 Şifreli mi? (DFADX'in Base64 karşılığı 'REZA')
        const base64Match = html.match(/REZA[a-zA-Z0-9+/=]+/);
        if (base64Match) {
            try {
                const decoded = Buffer.from(base64Match[0], 'base64').toString('utf-8');
                console.error(`[FORENSIC] BULDUM (Base64): ${base64Match[0]} -> ${decoded}`);
            } catch(e) {}
        }

        // TEST 3: Iframe veya Script Src içinde mi?
        const srcMatch = html.match(/src="([^"]*videopark[^"]*)"/i);
        if (srcMatch) {
            console.error(`[FORENSIC] BULDUM (URL İçinde): ${srcMatch[1]}`);
        }

        // TEST 4: JSON Konfigürasyonu mu?
        const jsonMatch = html.match(/data-config='([^']+)'/) || html.match(/playerConfig\s*=\s*({[^;]+})/);
        if (jsonMatch) {
            console.error(`[FORENSIC] BULDUM (JSON/Config): ${jsonMatch[0].substring(0, 50)}...`);
        }

        // Eğer hiçbir şey bulamazsak, tüm JS bloklarını görelim
        if (!directMatch && !base64Match) {
            console.error(`[FORENSIC] Kritik: "DFADX" izine rastlanamadı. Şifreleme farklı olabilir.`);
        }

        return []; // Sadece analiz yapıyoruz
    } catch (err) {
        console.error(`[FORENSIC] Hata: ${err.message}`);
        return [];
    }
}

module.exports = { getStreams };
