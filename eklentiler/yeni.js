// ============================================================
//  M3U Provider — Performans & Hata Ayıklama (v5.9)
// ============================================================

var M3U_URL      = 'https://raw.githubusercontent.com/mooncrown04/m3ubirlestir/refs/heads/main/birlesik_sinema.m3u';
var TMDB_API_KEY = '500330721680edb6d5f7f12ba7cd9023';

function normalize(s) {
    return (s || '').toLowerCase()
        .replace(/[\u0130\u0131]/g, 'i').replace(/[\u00fc]/g, 'u').replace(/[\u00f6]/g, 'o')
        .replace(/[\u015f]/g, 's').replace(/[\u011f]/g, 'g').replace(/[\u00e7]/g, 'c')
        .replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
}

async function getStreams(tmdbId, mediaType) {
    if (mediaType === 'tv') return [];

    try {
        // 1. TMDB Bilgisini Çek
        const tmdbRes = await fetch(`https://api.themoviedb.org/3/movie/${tmdbId}?api_key=${TMDB_API_KEY}&language=tr-TR&append_to_response=external_ids`);
        const d = await tmdbRes.json();
        const tmdb = {
            titleTr: d.title || '',
            titleEn: d.original_title || '',
            year: (d.release_date || '').slice(0, 4),
            imdbId: d.external_ids ? d.external_ids.imdb_id : null
        };

        console.error("DEBUG: ARANAN -> " + tmdb.titleTr + " (" + tmdb.year + ") ID: " + tmdb.imdbId);

        // 2. M3U Listesini Çek
        const m3uRes = await fetch(M3U_URL);
        const text = await m3uRes.text();
        const lines = text.split('\n');
        const matches = [];

        console.error("DEBUG: M3U okundu, satır sayısı: " + lines.length);

        for (let i = 0; i < lines.length; i++) {
            if (lines[i].indexOf('#EXTINF') === 0) {
                const meta = lines[i];
                const url = lines[i+1] ? lines[i+1].trim() : '';
                if (!url || url.indexOf('#') === 0) continue;

                // --- HIZLI FİLTRELEME ---
                let score = 0;
                
                // IMDb ID Kontrolü (En hızlısı)
                if (tmdb.imdbId && url.indexOf(tmdb.imdbId) !== -1) {
                    score = 1000;
                } else {
                    // İsim Kontrolü
                    const commaIdx = meta.lastIndexOf(',');
                    const rawTitle = (commaIdx !== -1) ? meta.substring(commaIdx + 1).trim() : "";
                    const cleanM3uTitle = normalize(rawTitle.replace(/\d{4}/g, '').split('-')[0]);
                    
                    const qTr = normalize(tmdb.titleTr);
                    const qEn = normalize(tmdb.titleEn);

                    if (cleanM3uTitle && (cleanM3uTitle === qTr || cleanM3uTitle === qEn || qTr.indexOf(cleanM3uTitle) !== -1)) {
                        score = 50;
                        if (meta.indexOf(tmdb.year) !== -1) score += 50;
                    }
                }

                if (score >= 40) {
                    console.error("DEBUG: EŞLEŞTİ -> " + url.substring(0, 40));
                    matches.push({
                        url: url,
                        name: (score === 1000 ? "ID Match: " : "") + tmdb.titleTr,
                        title: "M3U Link [Skor: " + score + "]",
                        quality: "1080p",
                        score: score
                    });
                }
            }
        }

        return matches.sort((a, b) => b.score - a.score).slice(0, 10);

    } catch (e) {
        console.error("DEBUG: KRİTİK HATA -> " + e.message);
        return [];
    }
}

if (typeof module !== 'undefined') module.exports = { getStreams };
