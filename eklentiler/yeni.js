var M3U_URL      = 'https://raw.githubusercontent.com/mooncrown04/m3ubirlestir/refs/heads/main/birlesik_sinema.m3u';
var TMDB_API_KEY = '500330721680edb6d5f7f12ba7cd9023';
var VERSION      = "5.4.0-PREDATOR";

let cachedM3U = null;
let lastFetch = 0;

function ultraClean(s) {
    if (!s) return '';
    return s.toString().toLowerCase()
        .replace(/[ıİ]/g, 'i').replace(/[üÜ]/g, 'u').replace(/[öÖ]/g, 'o')
        .replace(/[şŞ]/g, 's').replace(/[ğĞ]/g, 'g').replace(/[çÇ]/g, 'c')
        .replace(/[^a-z0-9]/g, '').trim();
}

async function getStreams(tmdbId, mediaType) {
    if (mediaType === 'tv') return [];

    try {
        const tmdbRes = await fetch(`https://api.themoviedb.org/3/movie/${tmdbId}?api_key=${TMDB_API_KEY}&language=tr-TR`);
        const d = await tmdbRes.json();
        
        const targetTr = ultraClean(d.title);
        const targetEn = ultraClean(d.original_title);
        const targetYear = (d.release_date || '').slice(0, 4);

        console.error(`[V${VERSION}] ARA: ${targetTr} | YIL: ${targetYear}`);

        const now = Date.now();
        if (!cachedM3U || (now - lastFetch > 300000)) { // 5 dk cache
            const m3uRes = await fetch(M3U_URL);
            cachedM3U = await m3uRes.text();
            lastFetch = now;
        }

        // Satır sonu karakterlerine göre (Windows veya Linux) parçala
        const lines = cachedM3U.split(/\r?\n/);
        const results = [];

        for (let i = 0; i < lines.length; i++) {
            let line = lines[i];
            
            if (line.startsWith("#EXTINF")) {
                let nextLine = lines[i + 1];
                if (nextLine && nextLine.startsWith("http")) {
                    
                    // Virgülden sonrasını (film adını) al
                    let parts = line.split(',');
                    let rawName = parts[parts.length - 1].trim();
                    let cleanM3U = ultraClean(rawName);

                    // Year bilgisini satırın içinden çek
                    let yearMatch = line.match(/year="(\d{4})"/);
                    let m3uYear = yearMatch ? yearMatch[1] : "";

                    // EŞLEŞME MANTIĞI (En esnek hali)
                    let isMatch = false;
                    if (cleanM3U === targetTr || cleanM3U === targetEn) isMatch = true;
                    else if (cleanM3U.includes(targetTr) || targetTr.includes(cleanM3U)) isMatch = true;

                    if (isMatch) {
                        // Yıl kontrolü: Eğer M3U'da yıl varsa ve uyuşmuyorsa ele (yanlış film gelmesin)
                        if (m3uYear && targetYear && m3uYear !== targetYear) {
                            isMatch = false; 
                        }
                    }

                    if (isMatch) {
                        results.push({
                            url: nextLine.trim(),
                            name: rawName,
                            title: `[M3U] ${rawName} (${m3uYear || '?'})`,
                            quality: "1080p",
                            score: (m3uYear === targetYear) ? 100 : 80
                        });
                    }
                }
            }
        }
        
        console.error(`[V${VERSION}] BULUNAN: ${results.length}`);
        return results.sort((a, b) => b.score - a.score);
        
    } catch (e) {
        console.error(`[V${VERSION}] HATA:`, e);
        return [];
    }
}

if (typeof module !== 'undefined') module.exports = { getStreams };
