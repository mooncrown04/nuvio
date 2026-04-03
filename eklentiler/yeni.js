var M3U_URL      = 'https://raw.githubusercontent.com/mooncrown04/m3ubirlestir/refs/heads/main/birlesik_sinema.m3u';
var TMDB_API_KEY = '500330721680edb6d5f7f12ba7cd9023';
var VERSION      = "5.6.0-ULTRA-ID";

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
        // 1. TMDB'den hem temel veriyi hem de IMDb ID'yi (external_ids) al
        const tmdbRes = await fetch(`https://api.themoviedb.org/3/movie/${tmdbId}?api_key=${TMDB_API_KEY}&language=tr-TR&append_to_response=external_ids`);
        const d = await tmdbRes.json();
        
        const targetImdb = d.external_ids ? d.external_ids.imdb_id : null; // Örn: tt28150132
        const targetTr = ultraClean(d.title);
        const targetEn = ultraClean(d.original_title);
        const targetYear = (d.release_date || '').slice(0, 4);

        console.error(`[V${VERSION}] ARA: ${targetTr} | IMDb: ${targetImdb || 'Yok'}`);

        const now = Date.now();
        if (!cachedM3U || (now - lastFetch > 300000)) {
            const m3uRes = await fetch(M3U_URL);
            cachedM3U = await m3uRes.text();
            lastFetch = now;
        }

        const lines = cachedM3U.split(/\r?\n/);
        const results = [];

        for (let i = 0; i < lines.length; i++) {
            let line = lines[i];
            
            if (line.startsWith("#EXTINF")) {
                let nextLine = lines[i + 1];
                if (nextLine && nextLine.startsWith("http")) {
                    
                    let url = nextLine.trim();
                    let parts = line.split(',');
                    let rawName = parts[parts.length - 1].trim();
                    let cleanM3U = ultraClean(rawName);

                    // M3U satırındaki yılı çek
                    let yearMatch = line.match(/year="(\d{4})"/);
                    let m3uYear = yearMatch ? yearMatch[1] : "";

                    let isMatch = false;
                    let score = 0;

                    // --- KRİTİK EŞLEŞME KATMANLARI ---

                    // KATMAN 1: IMDb ID Kontrolü (ALTIN VURUŞ)
                    // URL içinde "tt12345" geçiyor mu bakıyoruz (Sondaki / olsa da fark etmez)
                    if (targetImdb && url.includes(targetImdb)) {
                        isMatch = true;
                        score = 110; // En yüksek puan (Kesin doğru film)
                    } 
                    
                    // KATMAN 2: İsim Uyumları (ID yoksa veya tutmadıysa)
                    if (!isMatch) {
                        if (cleanM3U === targetTr || cleanM3U === targetEn) {
                            isMatch = true;
                            score = (m3uYear === targetYear) ? 100 : 90;
                        } else if (cleanM3U.includes(targetTr) || targetTr.includes(cleanM3U)) {
                            if (!m3uYear || m3uYear === targetYear) {
                                isMatch = true;
                                score = 85;
                            }
                        }
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
            }
        }
        
        console.error(`[V${VERSION}] BULUNAN: ${results.length}`);
        return results.sort((a, b) => b.score - a.score);
        
    } catch (e) {
        return [];
    }
}

if (typeof module !== 'undefined') module.exports = { getStreams };
