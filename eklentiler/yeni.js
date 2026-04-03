var M3U_URL      = 'https://raw.githubusercontent.com/mooncrown04/m3ubirlestir/refs/heads/main/birlesik_sinema.m3u';
var TMDB_API_KEY = '500330721680edb6d5f7f12ba7cd9023';
var VERSION      = "4.6.0-LIGHTWEIGHT";

function normalize(s) {
    if (!s) return '';
    return s.toLowerCase()
        .replace(/[\u0130\u0131]/g, 'i').replace(/[\u00fc]/g, 'u').replace(/[\u00f6]/g, 'o')
        .replace(/[\u015f]/g, 's').replace(/[\u011f]/g, 'g').replace(/[\u00e7]/g, 'c')
        .replace(/[^a-z0-9]/g, '').trim();
}

async function getStreams(tmdbId, mediaType) {
    console.error(`[V${VERSION}] ARAMA BASLADI: ${tmdbId}`);
    if (mediaType === 'tv') return [];

    try {
        const tmdbRes = await fetch(`https://api.themoviedb.org/3/movie/${tmdbId}?api_key=${TMDB_API_KEY}&language=tr-TR&append_to_response=external_ids`);
        const d = await tmdbRes.json();
        
        const targetTr = normalize(d.title);
        const targetEn = normalize(d.original_title);
        const targetImdb = (d.external_ids && d.external_ids.imdb_id) ? d.external_ids.imdb_id : null;
        const targetYear = (d.release_date || '').slice(0, 4);

        // RAM Tasarrufu: Sadece lazımsa M3U'yu çek
        const m3uRes = await fetch(M3U_URL);
        const text = await m3uRes.text();
        const lines = text.split('\n');
        const results = [];

        console.error(`[V${VERSION}] M3U OKUNDU: ${lines.length} SATIR`);

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            if (!line || !line.includes('#EXTINF')) continue;

            const lastComma = line.lastIndexOf(',');
            const rawName = lastComma !== -1 ? line.substring(lastComma + 1).trim() : "";
            const cleanM3U = normalize(rawName);

            // ÇOK ESNEK ARAMA: Eğer hedef isim M3U'daki ismin içinde geçiyorsa (Hangi dilde olursa olsun)
            if (cleanM3U.includes(targetTr) || (targetEn && cleanM3U.includes(targetEn))) {
                
                // Linki bul (Ya bu satırda ya bir sonrakinde)
                let url = "";
                if (line.includes('http')) {
                    url = "http" + line.split('http')[1].split(/\s+/)[0];
                } else if (lines[i+1] && lines[i+1].includes('http')) {
                    url = lines[i+1].trim();
                }

                if (url && url.startsWith('http')) {
                    let score = 80;
                    if (targetImdb && url.includes(targetImdb)) score = 100;
                    else if (cleanM3U === targetTr || cleanM3U === targetEn) score = 95;
                    else if (targetYear && line.includes(targetYear)) score = 90;

                    console.error(`[V${VERSION}] EŞLEŞTİ! -> ${rawName} [Skor: ${score}]`);
                    results.push({
                        url: url,
                        name: rawName,
                        title: `[M3U] ${rawName}`,
                        quality: "1080p",
                        score: score
                    });
                }
            }
        }

        return results.sort((a, b) => b.score - a.score);

    } catch (e) {
        console.error(`[V${VERSION}] KRITIK HATA: ${e.message}`);
        return [];
    }
}

if (typeof module !== 'undefined') module.exports = { getStreams };
