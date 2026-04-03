var M3U_URL      = 'https://raw.githubusercontent.com/mooncrown04/m3ubirlestir/refs/heads/main/birlesik_sinema.m3u';
var TMDB_API_KEY = '500330721680edb6d5f7f12ba7cd9023';
var VERSION      = "4.9.0-CACHED";

// Dosyayı hafızada tutmak için değişken
let cachedM3U = null;
let lastFetch = 0;

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
    if (mediaType === 'tv') return [];

    try {
        const tmdbRes = await fetch(`https://api.themoviedb.org/3/movie/${tmdbId}?api_key=${TMDB_API_KEY}&language=tr-TR`);
        const d = await tmdbRes.json();
        const targetTr = normalize(d.title);
        const targetEn = normalize(d.original_title);
        const targetYear = (d.release_date || '').slice(0, 4);

        // M3U dosyasını sadece 10 dakikada bir indir, yoksa hafızadakini kullan
        const now = Date.now();
        if (!cachedM3U || (now - lastFetch > 600000)) {
            console.error(`[V${VERSION}] M3U İNDİRİLİYOR...`);
            const m3uRes = await fetch(M3U_URL);
            cachedM3U = await m3uRes.text();
            lastFetch = now;
        }

        const results = [];
        const entryRegex = /#EXTINF:.*?,(.*?)\n(http[^\s]+)/g;
        let match;

        while ((match = entryRegex.exec(cachedM3U)) !== null) {
            const rawName = match[1].trim();
            const url = match[2].trim();
            const cleanName = normalize(rawName);

            if (cleanName !== "" && (
                cleanName === targetTr || 
                cleanName === targetEn || 
                cleanName.includes(targetTr) ||
                (targetEn !== "" && cleanName.includes(targetEn))
            )) {
                let score = 90;
                if (targetYear && match[0].includes(targetYear)) score = 95;
                
                // Eğer link içinde tt (IMDB ID) geçiyorsa en yüksek puanı ver (Dangal için)
                if (url.includes("tt")) score = 100; 

                results.push({
                    url: url,
                    name: rawName,
                    title: `[M3U] ${rawName}`,
                    quality: "1080p",
                    score: score
                });
            }
        }
        return results.sort((a, b) => b.score - a.score);
    } catch (e) {
        return [];
    }
}

if (typeof module !== 'undefined') module.exports = { getStreams };
