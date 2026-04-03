var M3U_URL      = 'https://raw.githubusercontent.com/mooncrown04/m3ubirlestir/refs/heads/main/birlesik_sinema.m3u';
var TMDB_API_KEY = '500330721680edb6d5f7f12ba7cd9023';
var VERSION      = "4.9.5-FINAL-SPEED";

let cachedM3U = null;
let lastFetch = 0;

function normalize(s) {
    if (!s) return '';
    return s.toString().toLowerCase()
        .replace(/[ıİ]/g, 'i').replace(/[üÜ]/g, 'u').replace(/[öÖ]/g, 'o')
        .replace(/[şŞ]/g, 's').replace(/[ğĞ]/g, 'g').replace(/[çÇ]/g, 'c')
        .replace(/[^a-z0-9]/g, '') // Sadece harf ve rakam kalsın, boşlukları bile siler
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

        const now = Date.now();
        // Dosyayı 15 dakikada bir güncelle (Ağı yormamak için süreyi artırdık)
        if (!cachedM3U || (now - lastFetch > 900000)) {
            console.error(`[V${VERSION}] DOSYA CEKILIYOR...`);
            const m3uRes = await fetch(M3U_URL);
            if (!m3uRes.ok) throw new Error("Dosya indirilemedi");
            cachedM3U = await m3uRes.text();
            lastFetch = now;
        }

        const results = [];
        // Regex: En hızlı arama yöntemi
        const entryRegex = /#EXTINF:.*?,(.*?)\n(http[^\s]+)/g;
        let match;

        while ((match = entryRegex.exec(cachedM3U)) !== null) {
            const rawName = match[1].trim();
            const url = match[2].trim();
            const cleanName = normalize(rawName);

            // Dangal gibi filmleri yakalamak için en basit ve hızlı kontrol
            if (cleanName.includes(targetTr) || (targetEn && cleanName.includes(targetEn))) {
                
                let score = 90;
                if (targetYear && match[0].includes(targetYear)) score = 95;
                // Dangal'ın linki photofunny/photostack olsa bile isminden yakalar
                
                results.push({
                    url: url,
                    name: rawName,
                    title: `[M3U] ${rawName}`,
                    quality: "1080p",
                    score: score
                });
            }
        }
        
        console.error(`[V${VERSION}] ${tmdbId} İÇİN ${results.length} SONUÇ BULUNDU.`);
        return results.sort((a, b) => b.score - a.score);
        
    } catch (e) {
        console.error(`[V${VERSION}] KRITIK HATA:`, e.message);
        return [];
    }
}

if (typeof module !== 'undefined') module.exports = { getStreams };
