var M3U_URL      = 'https://raw.githubusercontent.com/mooncrown04/m3ubirlestir/refs/heads/main/birlesik_sinema.m3u';
var TMDB_API_KEY = '500330721680edb6d5f7f12ba7cd9023';
var VERSION      = "4.3.0-HYBRID";

function cleanName(s) {
    if (!s) return '';
    return s.toLowerCase()
        .replace(/[\u0130\u0131]/g, 'i').replace(/[\u00fc]/g, 'u').replace(/[\u00f6]/g, 'o')
        .replace(/[\u015f]/g, 's').replace(/[\u011f]/g, 'g').replace(/[\u00e7]/g, 'c')
        .replace(/[^a-z0-9]/g, '').trim();
}

async function getStreams(tmdbId, mediaType) {
    console.error(`[V${VERSION}] ARAMA: ${tmdbId}`);
    if (mediaType === 'tv') return [];

    try {
        const tmdbRes = await fetch(`https://api.themoviedb.org/3/movie/${tmdbId}?api_key=${TMDB_API_KEY}&language=tr-TR&append_to_response=external_ids`);
        const d = await tmdbRes.json();
        
        const targetTr = cleanName(d.title);
        const targetEn = cleanName(d.original_title);
        const targetImdb = (d.external_ids && d.external_ids.imdb_id) ? d.external_ids.imdb_id : null;
        const targetYear = (d.release_date || '').slice(0, 4);

        console.error(`[V${VERSION}] HEDEF: ${d.title} | TT: ${targetImdb} | YIL: ${targetYear}`);

        const m3uRes = await fetch(M3U_URL + "?v=" + Date.now());
        const text = await m3uRes.text();
        const lines = text.split('\n');
        const results = [];

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            if (line && line.includes('#EXTINF')) {
                // Linki bulma: Ya bu satırın başındadır ya da bir sonraki satırdadır
                let url = "";
                if (line.startsWith('http')) {
                    url = line.split('#EXTINF')[0].trim();
                } else {
                    url = lines[i+1] ? lines[i+1].trim() : '';
                }
                
                if (!url || !url.startsWith('http')) continue;

                const lastComma = line.lastIndexOf(',');
                const rawName = lastComma !== -1 ? line.substring(lastComma + 1).trim() : "";
                const cleanM3U = cleanName(rawName);

                let score = 0;

                // --- YENİ EŞLEŞME MANTIĞI ---

                // 1. KURAL: TT ID (IMDb) Linkte Geçiyor mu? (Tartışmasız en iyisi)
                if (targetImdb && url.toLowerCase().includes(targetImdb.toLowerCase())) {
                    score = 100;
                } 
                // 2. KURAL: İsim birebir tutuyor mu?
                else if (cleanM3U !== "" && (cleanM3U === targetTr || cleanM3U === targetEn)) {
                    score = 95;
                    if (targetYear && line.includes(targetYear)) score = 98;
                }
                // 3. KURAL (KRİTİK): İsim içinde hedef isim geçiyor mu? 
                // Örn: "Marslı :The Martian" içinde "Marslı" geçiyor mu?
                else if (cleanM3U.includes(targetTr) || (targetEn && cleanM3U.includes(targetEn))) {
                    // Eğer isim tam değilse, yanlış film almamak için YILI zorunlu tutuyoruz (Rocky koruması)
                    if (targetYear && line.includes(targetYear)) {
                        score = 92;
                    }
                }

                if (score >= 90) {
                    console.error(`[V${VERSION}] BULDUM! -> ${rawName} [Puan: ${score}]`);
                    results.push({
                        url: url,
                        name: rawName,
                        title: `[M3U] ${rawName}`,
                        quality: "1080p",
                        score: score
                    });
                }
            }
        }
        
        // Aynı linkleri temizle
        const unique = Array.from(new Set(results.map(a => a.url))).map(u => results.find(a => a.url === u));
        return unique.sort((a, b) => b.score - a.score);

    } catch (e) {
        return [];
    }
}

if (typeof module !== 'undefined') module.exports = { getStreams };
