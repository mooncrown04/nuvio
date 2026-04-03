var M3U_URL      = 'https://raw.githubusercontent.com/mooncrown04/m3ubirlestir/refs/heads/main/birlesik_sinema.m3u';
var TMDB_API_KEY = '500330721680edb6d5f7f12ba7cd9023';
var VERSION      = "4.7.1-LIGHT";

function normalize(s) {
    if (!s) return '';
    return s.toString().toLowerCase()
        .replace(/[\u0130\u0131]/g, 'i').replace(/[\u00fc]/g, 'u').replace(/[\u00f6]/g, 'o')
        .replace(/[\u015f]/g, 's').replace(/[\u011f]/g, 'g').replace(/[\u00e7]/g, 'c')
        .replace(/\s+/g, '') 
        .replace(/[^a-z0-9]/g, '') 
        .trim();
}

async function getStreams(tmdbId, mediaType) {
    console.error(`[V${VERSION}] ARAMA: ${tmdbId}`);
    if (mediaType === 'tv') return [];

    try {
        // IMDB_ID isteği kaldırıldı, sadece temel film bilgileri alınıyor
        const tmdbRes = await fetch(`https://api.themoviedb.org/3/movie/${tmdbId}?api_key=${TMDB_API_KEY}&language=tr-TR`);
        const d = await tmdbRes.json();
        
        const targetTr = normalize(d.title);
        const targetEn = normalize(d.original_title);
        const targetYear = (d.release_date || '').slice(0, 4);

        const m3uRes = await fetch(M3U_URL);
        const text = await m3uRes.text();
        const lines = text.split('\n');
        const results = [];

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            if (!line || !line.includes('#EXTINF')) continue;

            const lastComma = line.lastIndexOf(',');
            const rawName = lastComma !== -1 ? line.substring(lastComma + 1).trim() : "";
            
            const nameParts = rawName.split(/[:\-\(\)]/); 
            let isMatch = false;

            for (let part of nameParts) {
                const cleanPart = normalize(part);
                if (cleanPart !== "" && (cleanPart === targetTr || cleanPart === targetEn || cleanPart.includes(targetTr))) {
                    isMatch = true;
                    break;
                }
            }

            if (isMatch) {
                let url = "";
                if (line.includes('http')) {
                    url = "http" + line.split('http')[1].split(/\s+/)[0];
                } else if (lines[i+1] && lines[i+1].trim().startsWith('http')) {
                    url = lines[i+1].trim();
                }

                if (url) {
                    // Puanlama mantığı: Yıl eşleşirse 95, sadece isim eşleşirse 90
                    let score = 90;
                    if (targetYear && line.includes(targetYear)) score = 95;

                    console.error(`[V${VERSION}] EŞLEŞTİ! -> ${rawName}`);
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
        return [];
    }
}

if (typeof module !== 'undefined') module.exports = { getStreams };
