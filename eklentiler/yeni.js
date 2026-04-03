// ============================================================
//  M3U Provider — Global Export & Keskin Eşleştirme (v5.5)
// ============================================================

(function(global) {
    var M3U_URL      = 'https://raw.githubusercontent.com/mooncrown04/m3ubirlestir/refs/heads/main/birlesik_sinema.m3u';
    var TMDB_API_KEY = '500330721680edb6d5f7f12ba7cd9023';

    // --- YARDIMCI FONKSİYONLAR ---
    function normalize(s) {
        return (s || '').toLowerCase()
            .replace(/[\u0130\u0131]/g, 'i').replace(/[\u00fc]/g, 'u').replace(/[\u00f6]/g, 'o')
            .replace(/[\u015f]/g, 's').replace(/[\u011f]/g, 'g').replace(/[\u00e7]/g, 'c')
            .replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
    }

    function parseExtInf(meta, url) {
        var imdbMatch = url.match(/(tt\d+)/);
        var yearTagM = meta.match(/year="(\d{4})"/);
        var titleRaw = meta.replace(/#EXTINF[^,]*,/, '').trim();
        var year = yearTagM ? yearTagM[1] : (titleRaw.match(/\d{4}/) ? titleRaw.match(/\d{4}/)[0] : '');
        var cleanTitle = titleRaw.replace(/\d{4}/g, '').replace(/\(.*\)/g, '').split('-')[0].trim();

        return {
            title: cleanTitle,
            year: year,
            url: url,
            imdbId: imdbMatch ? imdbMatch[1] : null,
            author: (meta.match(/group-author="([^"]+)"/) || [])[1] || 'M3U'
        };
    }

    // --- ANA ÇALIŞTIRICI ---
    async function getStreams(tmdbId, mediaType) {
        if (mediaType === 'tv') return [];
        
        try {
            // 1. TMDB Verisini Al
            const tmdbRes = await fetch(`https://api.themoviedb.org/3/movie/${tmdbId}?api_key=${TMDB_API_KEY}&language=tr-TR&append_to_response=external_ids`);
            const d = await tmdbRes.json();
            const tmdb = {
                titleTr: d.title || '',
                titleEn: d.original_title || '',
                year: (d.release_date || '').slice(0, 4),
                imdbId: d.external_ids ? d.external_ids.imdb_id : null
            };

            // 2. M3U Listesini Al
            const m3uRes = await fetch(M3U_URL);
            const text = await m3uRes.text();
            const lines = text.split('\n');
            const matches = [];

            for (let i = 0; i < lines.length; i++) {
                if (lines[i].startsWith('#EXTINF')) {
                    const url = lines[i+1] ? lines[i+1].trim() : '';
                    if (!url || url.startsWith('#')) continue;

                    const entry = parseExtInf(lines[i], url);
                    
                    // Skorlama
                    let score = 0;
                    if (entry.imdbId && tmdb.imdbId && entry.imdbId === tmdb.imdbId) {
                        score = 1000;
                    } else {
                        const et = normalize(entry.title);
                        const qt = normalize(tmdb.titleTr);
                        const qe = normalize(tmdb.titleEn);
                        if (et === qt || et === qe || qt.includes(et) || et.includes(qt)) {
                            score = 50;
                            if (entry.year === tmdb.year) score += 50;
                        }
                    }

                    if (score >= 40) {
                        matches.push({
                            url: entry.url,
                            name: `${entry.title} (${entry.year || tmdb.year})`,
                            title: entry.author,
                            quality: "1080p",
                            score: score
                        });
                    }
                }
            }

            return matches.sort((a, b) => b.score - a.score).slice(0, 10);

        } catch (e) {
            console.error("Nuvio Stream Hatası:", e);
            return [];
        }
    }

    // --- KRİTİK NOKTA: EXPORT ---
    // Fonksiyonu hem module.exports'a hem de global dünyaya kaydediyoruz.
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = { getStreams: getStreams };
    }
    global.getStreams = getStreams;

})(typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : this);
