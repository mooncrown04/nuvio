var M3U_URL      = 'https://raw.githubusercontent.com/mooncrown04/m3ubirlestir/refs/heads/main/birlesik_sinema.m3u';
var TMDB_API_KEY = '500330721680edb6d5f7f12ba7cd9023';
var VERSION      = "5.2.1-ULTRA-FIX";

let cachedM3U = null;
let lastFetch = 0;

// İsim eşleşmesini garantiye alan fonksiyon
function ultraClean(s) {
    if (!s) return '';
    return s.toString().toLowerCase()
        .replace(/ı/g, 'i').replace(/İ/g, 'i')
        .replace(/ü/g, 'u').replace(/Ü/g, 'u')
        .replace(/ö/g, 'o').replace(/Ö/g, 'o')
        .replace(/ş/g, 's').replace(/Ş/g, 's')
        .replace(/ğ/g, 'g').replace(/Ğ/g, 'g')
        .replace(/ç/g, 'c').replace(/Ç/g, 'c')
        .replace(/[^a-z0-9]/g, '') // Boşluklar dahil her şeyi siler: "er ryani" -> "erryani"
        .trim();
}

async function getStreams(tmdbId, mediaType) {
    if (mediaType === 'tv') return [];
    try {
        const tmdbRes = await fetch(`https://api.themoviedb.org/3/movie/${tmdbId}?api_key=${TMDB_API_KEY}&language=tr-TR`);
        const d = await tmdbRes.json();
        
        const targetTr = ultraClean(d.title);
        const targetEn = ultraClean(d.original_title);
        const targetYear = (d.release_date || '').slice(0, 4);

        console.error(`[V${VERSION}] ID:${tmdbId} -> HEDEF: ${targetTr}`);

        const now = Date.now();
        if (!cachedM3U || (now - lastFetch > 600000)) {
            const m3uRes = await fetch(M3U_URL, { headers: { 'Cache-Control': 'no-cache' } });
            cachedM3U = await m3uRes.text();
            lastFetch = now;
        }

        const results = [];
        // Regex: Satır satır değil, tüm blokları yakalar
        const entryRegex = /#EXTINF:.*?,(.*?)\n(http[^\s]+)/g;
        let match;

        while ((match = entryRegex.exec(cachedM3U)) !== null) {
            const fullBlock = match[0];
            const rawName = match[1].trim();
            const url = match[2].trim();
            const cleanM3UName = ultraClean(rawName);

            const yearMatch = fullBlock.match(/year="(\d{4})"/);
            const m3uYear = yearMatch ? yearMatch[1] : "";

            // EŞLEŞME: İsimlerden biri diğerinin içinde geçiyor mu? (erryani içerir ryani)
            if (cleanM3UName.includes(targetTr) || targetTr.includes(cleanM3UName) || 
               (targetEn && cleanM3UName.includes(targetEn))) {
                
                let score = 80;
                if (cleanM3UName === targetTr) score += 10;
                if (m3uYear === targetYear) score += 10;

                results.push({
                    url: url,
                    name: rawName,
                    title: `[M3U] ${rawName} (${m3uYear || '?'})`,
                    quality: "1080p",
                    score: score
                });
            }
        }
        
        console.error(`[V${VERSION}] ${tmdbId} İÇİN ${results.length} SONUÇ.`);
        return results.sort((a, b) => b.score - a.score);
    } catch (e) {
        return [];
    }
}

if (typeof module !== 'undefined') module.exports = { getStreams };
