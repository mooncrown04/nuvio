var M3U_URL      = 'https://raw.githubusercontent.com/mooncrown04/m3ubirlestir/refs/heads/main/birlesik_sinema.m3u';
var TMDB_API_KEY = '500330721680edb6d5f7f12ba7cd9023';

function normalize(s) {
    if (!s) return '';
    return s.toLowerCase()
        .replace(/[\u0130\u0131]/g, 'i').replace(/[\u00fc]/g, 'u').replace(/[\u00f6]/g, 'o')
        .replace(/[\u015f]/g, 's').replace(/[\u011f]/g, 'g').replace(/[\u00e7]/g, 'c')
        .replace(/[^a-z0-9]/g, '')
        .trim();
}

async function getStreams(tmdbId, mediaType) {
    if (mediaType === 'tv') return [];

    try {
        const tmdbRes = await fetch(`https://api.themoviedb.org/3/movie/${tmdbId}?api_key=${TMDB_API_KEY}&language=tr-TR`);
        const d = await tmdbRes.json();
        
        const qTr = normalize(d.title);
        const qEn = normalize(d.original_title);
        const year = (d.release_date || '').slice(0, 4);

        console.error("DEBUG: ARANAN -> " + d.title + " (" + year + ")");

        const m3uRes = await fetch(M3U_URL);
        const text = await m3uRes.text();
        const lines = text.split('\n');
        const results = [];

        for (let i = 0; i < lines.length; i++) {
            if (lines[i].includes('#EXTINF')) {
                const line = lines[i];
                const url = lines[i+1] ? lines[i+1].trim() : '';
                
                // Virgülden sonraki gerçek film adını al (Amansız Takip 1958)
                const lastCommaIndex = line.lastIndexOf(',');
                if (lastCommaIndex === -1) continue;
                
                const m3uFullName = line.substring(lastCommaIndex + 1).trim();
                const m3uNameClean = normalize(m3uFullName);

                let score = 0;

                // 1. Kural: İsim geçiyor mu? (Dangal, Marslı vb.)
                if (m3uNameClean.includes(qTr) || qTr.includes(m3uNameClean) || 
                    m3uNameClean.includes(qEn) || qEn.includes(m3uNameClean)) {
                    score = 70;
                    // 2. Kural: Yıl da varsa (2016, 2015 vb.) tam puan
                    if (m3uFullName.includes(year)) {
                        score += 30;
                    }
                }

                if (score >= 70) {
                    console.error("DEBUG: EŞLEŞTİ -> " + m3uFullName);
                    results.push({
                        url: url,
                        name: m3uFullName,
                        title: "M3U Linki [Skor: " + score + "]",
                        quality: "1080p",
                        score: score
                    });
                }
            }
        }

        return results.sort((a, b) => b.score - a.score).slice(0, 10);

    } catch (e) {
        console.error("DEBUG: HATA -> " + e.message);
        return [];
    }
}

if (typeof module !== 'undefined') module.exports = { getStreams };
