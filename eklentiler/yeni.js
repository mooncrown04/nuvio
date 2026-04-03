var M3U_URL      = 'https://raw.githubusercontent.com/mooncrown04/m3ubirlestir/refs/heads/main/birlesik_sinema.m3u';
var TMDB_API_KEY = '500330721680edb6d5f7f12ba7cd9023';

// Sadece temel temizlik (Türkçe karakterleri düzelt, küçük harf yap v1)
function softClean(s) {
    return (s || '').toLowerCase()
        .replace(/[\u0130\u0131]/g, 'i').replace(/[\u00fc]/g, 'u').replace(/[\u00f6]/g, 'o')
        .replace(/[\u015f]/g, 's').replace(/[\u011f]/g, 'g').replace(/[\u00e7]/g, 'c')
        .replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
}

async function getStreams(tmdbId, mediaType) {
    if (mediaType === 'tv') return [];

    try {
        const tmdbRes = await fetch(`https://api.themoviedb.org/3/movie/${tmdbId}?api_key=${TMDB_API_KEY}&language=tr-TR&append_to_response=external_ids`);
        const d = await tmdbRes.json();
        const imdbId = d.external_ids ? d.external_ids.imdb_id : '---';
        const qTr = softClean(d.title);
        const qEn = softClean(d.original_title);
        const year = (d.release_date || '').slice(0, 4);

        console.error("DEBUG: ARANAN -> " + d.title + " (" + year + ")");

        const m3uRes = await fetch(M3U_URL);
        const text = await m3uRes.text();
        const lines = text.split('\n');
        const results = [];

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            if (line.indexOf('#EXTINF') !== -1) {
                const url = lines[i+1] ? lines[i+1].trim() : '';
                if (!url || url.indexOf('http') !== 0) continue;

                let score = 0;

                // 1. KURAL: IMDb ID var mı? (En garanti yol)
                if (imdbId !== '---' && url.indexOf(imdbId) !== -1) {
                    score = 1000;
                } else {
                    // 2. KURAL: İsim İçeriyor mu?
                    const m3uPart = line.split(',');
                    const m3uRawName = softClean(m3uPart[m3uPart.length - 1]);

                    // Eğer M3U'daki isim TMDB ismini içeriyorsa veya tam tersiyse
                    if (m3uRawName.length > 2) {
                        if (m3uRawName.indexOf(qTr) !== -1 || qTr.indexOf(m3uRawName) !== -1 || 
                            m3uRawName.indexOf(qEn) !== -1 || qEn.indexOf(m3uRawName) !== -1) {
                            
                            score = 50;
                            // Yıl da tutuyorsa skoru yükselt
                            if (line.indexOf(year) !== -1) score += 50;
                        }
                    }
                }

                if (score >= 50) {
                    results.push({
                        url: url,
                        name: d.title + " (" + year + ")",
                        title: "M3U [" + score + "]",
                        quality: "1080p",
                        score: score
                    });
                }
            }
        }

        if (results.length === 0) {
             console.error("DEBUG: Hala eşleşme yok. M3U'daki isim TMDB ile çok farklı.");
        }

        return results.sort((a, b) => b.score - a.score).slice(0, 10);

    } catch (e) {
        console.error("DEBUG: HATA -> " + e.message);
        return [];
    }
}

if (typeof module !== 'undefined') module.exports = { getStreams };
