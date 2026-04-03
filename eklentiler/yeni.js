var M3U_URL      = 'https://raw.githubusercontent.com/mooncrown04/m3ubirlestir/refs/heads/main/birlesik_sinema.m3u';
var TMDB_API_KEY = '500330721680edb6d5f7f12ba7cd9023';
var VERSION      = "3.2.0-FINAL";

// Daha yumuşak bir temizlik: Sadece küçük harfe çevir ve gereksiz karakterleri at, boşluğu koru.
function softNormalize(s) {
    if (!s) return '';
    return s.toLowerCase()
        .replace(/[\u0130\u0131]/g, 'i').replace(/[\u00fc]/g, 'u').replace(/[\u00f6]/g, 'o')
        .replace(/[\u015f]/g, 's').replace(/[\u011f]/g, 'g').replace(/[\u00e7]/g, 'c')
        .replace(/[^\w\s]/gi, '') 
        .trim();
}

async function getStreams(tmdbId, mediaType) {
    console.error(`[V${VERSION}] ARAMA BASLADI -> ID: ${tmdbId}`);
    if (mediaType === 'tv') return [];

    try {
        const tmdbRes = await fetch(`https://api.themoviedb.org/3/movie/${tmdbId}?api_key=${TMDB_API_KEY}&language=tr-TR&append_to_response=external_ids`);
        const d = await tmdbRes.json();
        
        const qTr = softNormalize(d.title);
        const qEn = softNormalize(d.original_title);
        const imdbId = d.external_ids ? d.external_ids.imdb_id : null; // Örn: tt5074352
        const year = (d.release_date || '').slice(0, 4);

        const m3uRes = await fetch(M3U_URL);
        const text = await m3uRes.text();
        const lines = text.split('\n');
        const results = [];

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            if (line && line.includes('#EXTINF')) {
                const url = lines[i+1] ? lines[i+1].trim() : '';
                if (!url) continue;

                const lastCommaIndex = line.lastIndexOf(',');
                const m3uFullName = lastCommaIndex !== -1 ? line.substring(lastCommaIndex + 1).trim() : "";
                const m3uNameLower = m3uFullName.toLowerCase();
                const m3uClean = softNormalize(m3uFullName);

                let score = 0;

                // 1. KRİTİK: IMDb ID (tt...) URL İÇİNDE VAR MI?
                if (imdbId && url.includes(imdbId)) {
                    score = 100;
                } 
                // 2. İSİM TAM TUTUYOR MU? (En garanti yöntem)
                else if (m3uClean === qTr || m3uClean === qEn) {
                    score = 95;
                }
                // 3. İSİM İÇİNDE GEÇİYOR MU? (Dangal, Marslı vb.)
                else if (m3uNameLower.includes(d.title.toLowerCase()) || (d.original_title && m3uNameLower.includes(d.original_title.toLowerCase()))) {
                    score = 80;
                    // Yıl bonusu
                    if (year && line.includes(year)) score += 15;
                }

                if (score > 0) {
                    console.error(`[V${VERSION}] ESLESME: ${m3uFullName} | Skor: ${score} | URL: ${url}`);
                    results.push({
                        url: url,
                        name: m3uFullName,
                        title: `[M3U] ${m3uFullName}`,
                        quality: "1080p",
                        score: score
                    });
                }
            }
        }

        return results.sort((a, b) => b.score - a.score);

    } catch (e) {
        console.error(`[V${VERSION}] ERROR: ${e.message}`);
        return [];
    }
}

if (typeof module !== 'undefined') module.exports = { getStreams };
