var M3U_URL      = 'https://raw.githubusercontent.com/mooncrown04/m3ubirlestir/refs/heads/main/nuvio_sinema.m3u';
var TMDB_API_KEY = '500330721680edb6d5f7f12ba7cd9023';
var VERSION      = "5.7.0-NUCLEAR";

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
        const tmdbRes = await fetch(`https://api.themoviedb.org/3/movie/${tmdbId}?api_key=${TMDB_API_KEY}&language=tr-TR&append_to_response=external_ids`);
        const d = await tmdbRes.json();
        
        const targetImdb = d.external_ids ? d.external_ids.imdb_id : null;
        const targetTr = ultraClean(d.title);
        const targetEn = ultraClean(d.original_title);
        const targetYear = (d.release_date || '').slice(0, 4);

        console.error(`[V${VERSION}] ARA: ${targetTr} | IMDb: ${targetImdb}`);

        const now = Date.now();
        if (!cachedM3U || (now - lastFetch > 300000)) {
            const m3uRes = await fetch(M3U_URL);
            let rawText = await m3uRes.text();
            // GÖRÜNMEZ KARAKTER TEMİZLİĞİ (Kritik!)
            cachedM3U = rawText.replace(/\r/g, '').replace(/^\uFEFF/, ''); 
            lastFetch = now;
            console.error(`[V${VERSION}] M3U INIK. BOYUT: ${cachedM3U.length} KARAKTER.`);
        }

        const lines = cachedM3U.split('\n');
        const results = [];

        for (let i = 0; i < lines.length; i++) {
            let line = lines[i].trim();
            if (line.startsWith("#EXTINF")) {
                let nextLine = lines[i + 1] ? lines[i + 1].trim() : "";
                if (nextLine.startsWith("http")) {
                    
                    let parts = line.split(',');
                    let rawName = parts[parts.length - 1].trim();
                    let cleanM3U = ultraClean(rawName);
                    let yearMatch = line.match(/year="(\d{4})"/);
                    let m3uYear = yearMatch ? yearMatch[1] : "";

                    let isMatch = false;
                    let score = 0;

                    // 1. IMDb ID Kontrolü (Link içinde geçiyor mu?)
                    if (targetImdb && nextLine.includes(targetImdb)) {
                        isMatch = true;
                        score = 120;
                    } 
                    // 2. İsim Kontrolü
                    else if (cleanM3U === targetTr || cleanM3U === targetEn) {
                        isMatch = true;
                        score = (m3uYear === targetYear) ? 100 : 90;
                    } 
                    // 3. Esnek İsim Kontrolü
                    else if (cleanM3U.includes(targetTr) || (targetEn && cleanM3U.includes(targetEn))) {
                        if (!m3uYear || m3uYear === targetYear) {
                            isMatch = true;
                            score = 80;
                        }
                    }

                    if (isMatch) {
                        results.push({
                            url: nextLine,
                            name: rawName,
                            title: `[M3U] ${rawName} ${m3uYear ? '('+m3uYear+')' : ''}`,
                            quality: "1080p",
                            score: score
                        });
                    }
                }
            }
        }
        
        if (results.length === 0) {
            console.error(`[V${VERSION}] BULUNAMADI. M3U BASI: ${cachedM3U.substring(0, 100)}`);
        } else {
            console.error(`[V${VERSION}] BAŞARI: ${results.length} ADET.`);
        }
        
        return results.sort((a, b) => b.score - a.score);
    } catch (e) {
        console.error(`[V${VERSION}] HATA: ${e.message}`);
        return [];
    }
}

if (typeof module !== 'undefined') module.exports = { getStreams };
