var M3U_URL      = 'https://raw.githubusercontent.com/mooncrown04/m3ubirlestir/refs/heads/main/birlesik_sinema.m3u';
var TMDB_API_KEY = '500330721680edb6d5f7f12ba7cd9023';

// En hızlı temizleme metodu
function clean(s) {
    return (s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

async function getStreams(tmdbId, mediaType) {
    if (mediaType === 'tv') return [];

    try {
        // 1. TMDB Verisini Çek
        const tmdbRes = await fetch(`https://api.themoviedb.org/3/movie/${tmdbId}?api_key=${TMDB_API_KEY}&language=tr-TR&append_to_response=external_ids`);
        const d = await tmdbRes.json();
        const imdbId = d.external_ids ? d.external_ids.imdb_id : '---';
        const qTr = clean(d.title);
        const qEn = clean(d.original_title);
        const year = (d.release_date || '').slice(0, 4);

        console.error("DEBUG: ARANAN -> " + d.title + " (" + year + ")");

        // 2. M3U Verisini Çek
        const m3uRes = await fetch(M3U_URL);
        const text = await m3uRes.text();
        const lines = text.split('\n');
        const results = [];

        // 3. Döngüyü en hızlı şekilde çalıştır
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            if (line.indexOf('#EXTINF') !== -1) {
                const url = lines[i+1] ? lines[i+1].trim() : '';
                if (!url || url.indexOf('http') !== 0) continue;

                let match = false;
                let score = 0;

                // Önce IMDb ID kontrolü (En garantisi)
                if (url.indexOf(imdbId) !== -1) {
                    match = true;
                    score = 1000;
                } else {
                    // İsim kontrolü (Virgülden sonrasına bak)
                    const parts = line.split(',');
                    const m3uRawName = parts[parts.length - 1];
                    const m3uClean = clean(m3uRawName);

                    if (m3uClean && (m3uClean === qTr || m3uClean === qEn)) {
                        match = true;
                        score = 100;
                    }
                }

                if (match) {
                    console.error("DEBUG: BULDUM -> " + url.substring(0, 30));
                    results.push({
                        url: url,
                        name: d.title + " (" + year + ")",
                        title: "M3U Kaynağı [" + score + "]",
                        quality: "1080p",
                        score: score
                    });
                }
            }
        }

        // Eğer hiçbir şey bulunamadıysa log bas
        if (results.length === 0) console.error("DEBUG: M3U içinde eşleşme yok.");

        return results.sort((a, b) => b.score - a.score).slice(0, 5);

    } catch (e) {
        console.error("DEBUG: HATA -> " + e.message);
        return [];
    }
}

if (typeof module !== 'undefined') module.exports = { getStreams };
