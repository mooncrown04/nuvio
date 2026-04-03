var M3U_URL      = 'https://raw.githubusercontent.com/mooncrown04/m3ubirlestir/refs/heads/main/birlesik_sinema.m3u';
var TMDB_API_KEY = '500330721680edb6d5f7f12ba7cd9023';
var VERSION      = "5.2.0-FINAL";

// Önbellek için değişkenler (Cihazın her seferinde indirme yapmasını engeller)
let cachedM3U = null;
let lastFetch = 0;

function simpleClean(s) {
    if (!s) return '';
    return s.toString().toLowerCase()
        .replace(/[ıİ]/g, 'i').replace(/[üÜ]/g, 'u').replace(/[öÖ]/g, 'o')
        .replace(/[şŞ]/g, 's').replace(/[ğĞ]/g, 'g').replace(/[çÇ]/g, 'c')
        .replace(/[^a-z0-9\s]/g, '') 
        .trim();
}

async function getStreams(tmdbId, mediaType) {
    if (mediaType === 'tv') return [];

    try {
        // 1. TMDB Verisini Al
        const tmdbRes = await fetch(`https://api.themoviedb.org/3/movie/${tmdbId}?api_key=${TMDB_API_KEY}&language=tr-TR`);
        const d = await tmdbRes.json();
        
        const targetTr = simpleClean(d.title);
        const targetEn = simpleClean(d.original_title);
        const targetYear = (d.release_date || '').slice(0, 4); // Film yılını al

        console.error(`[V${VERSION}] ID:${tmdbId} -> ARANAN: ${targetTr} (${targetYear})`);

        // 2. M3U Dosyasını Önbellekli Çek (10 dakikada bir güncellenir)
        const now = Date.now();
        if (!cachedM3U || (now - lastFetch > 600000)) {
            const m3uRes = await fetch(M3U_URL, { headers: { 'Cache-Control': 'no-cache' } });
            cachedM3U = await m3uRes.text();
            lastFetch = now;
            console.error(`[V${VERSION}] M3U DOSYASI HAFIZAYA ALINDI.`);
        }

        const results = [];
        const entryRegex = /#EXTINF:.*?,(.*?)\n(http[^\s]+)/g;
        let match;

        // 3. Arama Döngüsü
        while ((match = entryRegex.exec(cachedM3U)) !== null) {
            const fullBlock = match[0]; // Python ile eklediğimiz yıl tagını buradan çekeceğiz
            const rawName = match[1].trim();
            const url = match[2].trim();
            const cleanM3UName = simpleClean(rawName);

            // Python kodunun eklediği year="XXXX" tagını yakala
            const yearMatch = fullBlock.match(/year="(\d{4})"/);
            const m3uYear = yearMatch ? yearMatch[1] : "";

            let isMatch = false;
            let score = 0;

            // EŞLEŞME MANTIĞI
            if (cleanM3UName === targetTr || cleanM3UName === targetEn) {
                isMatch = true;
                // Yıl da tutuyorsa en yüksek puanı ver
                score = (m3uYear === targetYear) ? 100 : 95;
            } else if (targetTr.length > 2 && cleanM3UName.includes(targetTr)) {
                isMatch = true;
                score = (m3uYear === targetYear) ? 90 : 85;
            } else if (targetEn.length > 2 && cleanM3UName.includes(targetEn)) {
                isMatch = true;
                score = (m3uYear === targetYear) ? 90 : 85;
            }

            if (isMatch) {
                results.push({
                    url: url,
                    name: rawName,
                    title: `[M3U] ${rawName} ${m3uYear ? '('+m3uYear+')' : ''}`,
                    quality: "1080p",
                    score: score
                });
            }
        }
        
        console.error(`[V${VERSION}] SONUÇ: ${results.length} ADET`);
        return results.sort((a, b) => b.score - a.score);
        
    } catch (e) {
        console.error(`[V${VERSION}] HATA:`, e.message);
        return [];
    }
}

if (typeof module !== 'undefined') module.exports = { getStreams };
