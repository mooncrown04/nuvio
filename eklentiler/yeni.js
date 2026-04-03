var M3U_URL      = 'https://raw.githubusercontent.com/mooncrown04/m3ubirlestir/refs/heads/main/birlesik_sinema.m3u';
var TMDB_API_KEY = '500330721680edb6d5f7f12ba7cd9023';
var VERSION      = "5.3.0-DANGAL-OK";

let cachedM3U = null;
let lastFetch = 0;

// Sadece harf ve rakam bırakır (Boşlukları bile siler ki eşleşme garanti olsun)
function perfectionClean(s) {
    if (!s) return '';
    return s.toString().toLowerCase()
        .replace(/[ıİ]/g, 'i').replace(/[üÜ]/g, 'u').replace(/[öÖ]/g, 'o')
        .replace(/[şŞ]/g, 's').replace(/[ğĞ]/g, 'g').replace(/[çÇ]/g, 'c')
        .replace(/[^a-z0-9]/g, '') 
        .trim();
}

async function getStreams(tmdbId, mediaType) {
    if (mediaType === 'tv') return [];

    try {
        const tmdbRes = await fetch(`https://api.themoviedb.org/3/movie/${tmdbId}?api_key=${TMDB_API_KEY}&language=tr-TR`);
        const d = await tmdbRes.json();
        
        const targetTr = perfectionClean(d.title); // "dangal"
        const targetEn = perfectionClean(d.original_title); // "dangal"
        const targetYear = (d.release_date || '').slice(0, 4); // "2016"

        console.error(`[V${VERSION}] ARANIYOR: ${targetTr} | YIL: ${targetYear}`);

        const now = Date.now();
        if (!cachedM3U || (now - lastFetch > 600000)) {
            const m3uRes = await fetch(M3U_URL, { headers: { 'Cache-Control': 'no-cache' } });
            cachedM3U = await m3uRes.text();
            lastFetch = now;
        }

        const results = [];
        const entryRegex = /#EXTINF:.*?,(.*?)\n(http[^\s]+)/g;
        let match;

        while ((match = entryRegex.exec(cachedM3U)) !== null) {
            const fullLine = match[0]; 
            const rawName = match[1].trim(); // M3U'daki virgülden sonraki isim
            const url = match[2].trim();
            const cleanM3U = perfectionClean(rawName);

            // Python'ın eklediği year="..." tagını oku
            const yearMatch = fullLine.match(/year="(\d{4})"/);
            const m3uYear = yearMatch ? yearMatch[1] : "";

            let isMatch = false;

            // 1. ADIM: İsimler tutuyor mu?
            if (cleanM3U === targetTr || cleanM3U === targetEn || cleanM3U.includes(targetTr) || targetTr.includes(cleanM3U)) {
                
                // 2. ADIM: Yıl kontrolü (Eğer Python yıl bulduysa ve TMDB yılıyla aynıysa)
                if (m3uYear === targetYear) {
                    isMatch = true;
                } 
                // Alternatif: Yıl yoksa bile isim çok net tutuyorsa al (Score düşürerek)
                else if (m3uYear === "" && (cleanM3U === targetTr)) {
                    isMatch = true;
                }
            }

            if (isMatch) {
                results.push({
                    url: url,
                    name: rawName,
                    title: `[M3U] ${rawName} (${m3uYear || '?'})`,
                    quality: "1080p",
                    score: (m3uYear === targetYear) ? 100 : 80
                });
            }
        }
        
        console.error(`[V${VERSION}] BULUNAN: ${results.length}`);
        return results.sort((a, b) => b.score - a.score);
        
    } catch (e) {
        return [];
    }
}

if (typeof module !== 'undefined') module.exports = { getStreams };
