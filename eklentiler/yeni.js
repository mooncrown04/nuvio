var M3U_URL      = 'https://raw.githubusercontent.com/mooncrown04/m3ubirlestir/refs/heads/main/birlesik_sinema.m3u';
var TMDB_API_KEY = '500330721680edb6d5f7f12ba7cd9023';
var VERSION      = "4.1.0-NET-NAME";

function normalize(s) {
    if (!s) return '';
    return s.toLowerCase()
        .replace(/[\u0130\u0131]/g, 'i').replace(/[\u00fc]/g, 'u').replace(/[\u00f6]/g, 'o')
        .replace(/[\u015f]/g, 's').replace(/[\u011f]/g, 'g').replace(/[\u00e7]/g, 'c')
        .replace(/[^a-z0-9]/g, '').trim();
}

async function getStreams(tmdbId, mediaType) {
    console.error(`[V${VERSION}] ARAMA: ${tmdbId}`);
    if (mediaType === 'tv') return [];

    try {
        const tmdbRes = await fetch(`https://api.themoviedb.org/3/movie/${tmdbId}?api_key=${TMDB_API_KEY}&language=tr-TR&append_to_response=external_ids`);
        const d = await tmdbRes.json();
        
        const targetTr = normalize(d.title);
        const targetEn = normalize(d.original_title);
        const targetImdb = (d.external_ids && d.external_ids.imdb_id) ? d.external_ids.imdb_id : null;
        const targetYear = (d.release_date || '').slice(0, 4);

        console.error(`[V${VERSION}] HEDEF: ${d.title} | YIL: ${targetYear}`);

        const m3uRes = await fetch(M3U_URL + "?v=" + Date.now());
        const text = await m3uRes.text();
        const lines = text.split('\n');
        const results = [];

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            if (line && line.includes('#EXTINF')) {
                const url = lines[i+1] ? lines[i+1].trim() : '';
                if (!url || !url.startsWith('http')) continue;

                const lastCommaIndex = line.lastIndexOf(',');
                const m3uNameRaw = lastCommaIndex !== -1 ? line.substring(lastCommaIndex + 1).trim() : "";
                const m3uNameClean = normalize(m3uNameRaw);

                let score = 0;

                // 1. ÖNCELİK: Linkte TT ID (IMDb) eşleşirse direkt al.
                if (targetImdb && url.toLowerCase().includes(targetImdb.toLowerCase())) {
                    score = 100;
                } 
                // 2. ÖNCELİK: İsim Birebir Tutuyorsa AL.
                else if (m3uNameClean !== "" && (m3uNameClean === targetTr || m3uNameClean === targetEn)) {
                    score = 95;
                    // Ekstra Kontrol: İsim tutarken bir de YIL tutuyorsa puanı yükselt.
                    if (targetYear && line.includes(targetYear)) {
                        score = 98;
                    }
                }
                // 3. ÖNCELİK: İsim kısmen içeriyorsa ama YIL kesin tutuyorsa al.
                else if ((m3uNameClean.includes(targetTr) || (targetEn && m3uNameClean.includes(targetEn))) && targetYear && line.includes(targetYear)) {
                    score = 90;
                }

                if (score >= 90) {
                    console.error(`[V${VERSION}] BULDUM! -> ${m3uNameRaw} [Puan: ${score}]`);
                    results.push({
                        url: url,
                        name: m3uNameRaw,
                        title: `[M3U] ${m3uNameRaw}`,
                        quality: "1080p",
                        score: score
                    });
                }
            }
        }

        return results.sort((a, b) => b.score - a.score);

    } catch (e) {
        console.error(`[V${VERSION}] HATA: ${e.message}`);
        return [];
    }
}

if (typeof module !== 'undefined') module.exports = { getStreams };
