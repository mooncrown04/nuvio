var M3U_URL      = 'https://raw.githubusercontent.com/mooncrown04/m3ubirlestir/refs/heads/main/birlesik_sinema.m3u';
var TMDB_API_KEY = '500330721680edb6d5f7f12ba7cd9023';
var VERSION      = "5.0.0-PRO-SPEED";

// Daha geniş bir temizlik: Boşlukları ve özel karakterleri tamamen yok eder
function superNormalize(s) {
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
        
        const targetTr = superNormalize(d.title);
        const targetEn = superNormalize(d.original_title);

        console.error(`[V${VERSION}] ${tmdbId} ARANIYOR: ${targetTr} / ${targetEn}`);

        const m3uRes = await fetch(M3U_URL);
        const text = await m3uRes.text();
        
        const results = [];
        // Regex ile tüm blokları hafızayı yormadan tara
        const entryRegex = /#EXTINF:.*?,(.*?)\n(http[^\s]+)/g;
        let match;

        while ((match = entryRegex.exec(text)) !== null) {
            const rawName = match[1].trim();
            const url = match[2].trim();
            const cleanName = superNormalize(rawName);

            // Dangal'ı yakalamak için en kritik yer: 
            // Listedeki isim "Dangal" iken TMDB ismi "Dangal 2016" olsa bile yakalar.
            if (cleanName !== "" && (
                cleanName.includes(targetTr) || 
                targetTr.includes(cleanName) || 
                (targetEn !== "" && cleanName.includes(targetEn))
            )) {
                results.push({
                    url: url,
                    name: rawName,
                    title: `[M3U] ${rawName}`,
                    quality: "1080p",
                    score: cleanName === targetTr ? 100 : 90 // Tam eşleşmeye bonus puan
                });
            }
        }
        
        console.error(`[V${VERSION}] ${tmdbId} İÇİN ${results.length} SONUÇ BULUNDU.`);
        return results.sort((a, b) => b.score - a.score);
        
    } catch (e) {
        return [];
    }
}

if (typeof module !== 'undefined') module.exports = { getStreams };
