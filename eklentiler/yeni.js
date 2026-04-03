var M3U_URL      = 'https://raw.githubusercontent.com/mooncrown04/m3ubirlestir/refs/heads/main/birlesik_sinema.m3u';
var TMDB_API_KEY = '500330721680edb6d5f7f12ba7cd9023';
var VERSION      = "4.8.0-ULTRA_SPEED";

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
        // TMDB Verisini Çek
        const tmdbRes = await fetch(`https://api.themoviedb.org/3/movie/${tmdbId}?api_key=${TMDB_API_KEY}&language=tr-TR`);
        const d = await tmdbRes.json();
        
        const targetTr = normalize(d.title);
        const targetEn = normalize(d.original_title);
        const targetYear = (d.release_date || '').slice(0, 4);

        // Dev M3U Dosyasını Çek
        const m3uRes = await fetch(M3U_URL);
        const text = await m3uRes.text();
        
        const results = [];
        
        /** * REGEX AÇIKLAMASI: 
         * Büyük dosyalarda split('\n') yerine bu yöntem kullanılır.
         * #EXTINF satırını ve altındaki linki bir bütün olarak yakalar.
         */
        const entryRegex = /#EXTINF:.*?,(.*?)\n(http[^\s]+)/g;
        let match;

        while ((match = entryRegex.exec(text)) !== null) {
            const rawName = match[1].trim();
            const url = match[2].trim();
            
            // "Dangal" gibi isimleri normalize et
            const cleanName = normalize(rawName);
            
            // Eşleşme Kontrolü
            let isMatch = false;
            // TMDB TR başlığı, EN başlığı veya dosyadaki ismin TMDB başlığını içermesi durumu
            if (cleanName !== "" && (
                cleanName === targetTr || 
                cleanName === targetEn || 
                cleanName.includes(targetTr) ||
                (targetEn !== "" && cleanName.includes(targetEn))
            )) {
                isMatch = true;
            }

            if (isMatch) {
                let score = 90;
                // Yıl kontrolü (Ham satırda veya linkte yıl geçiyorsa puanı artır)
                if (targetYear && (match[0].includes(targetYear))) score = 95;

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

        // Skorlara göre sırala ve döndür
        return results.sort((a, b) => b.score - a.score);

    } catch (e) {
        console.error(`[V${VERSION}] HATA:`, e);
        return [];
    }
}

if (typeof module !== 'undefined') module.exports = { getStreams };
