var M3U_URL      = 'https://raw.githubusercontent.com/mooncrown04/m3ubirlestir/refs/heads/main/birlesik_sinema.m3u';
var TMDB_API_KEY = '500330721680edb6d5f7f12ba7cd9023';
var VERSION      = "3.4.0-BYPASS";

function normalize(s) {
    if (!s) return '';
    return s.toLowerCase()
        .replace(/[\u0130\u0131]/g, 'i').replace(/[\u00fc]/g, 'u').replace(/[\u00f6]/g, 'o')
        .replace(/[\u015f]/g, 's').replace(/[\u011f]/g, 'g').replace(/[\u00e7]/g, 'c')
        .replace(/[^a-z0-9]/g, '').trim();
}

async function getStreams(tmdbId, mediaType) {
    console.error(`[V${VERSION}] ARAMA BASLADI -> ID: ${tmdbId}`);
    if (mediaType === 'tv') return [];

    // Cihazın takılmasını önlemek için 10 saniyelik zaman aşımı bekçisi
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); 

    try {
        // 1. TMDB Verisi (Cache bozucu ekledik)
        const tmdbRes = await fetch(`https://api.themoviedb.org/3/movie/${tmdbId}?api_key=${TMDB_API_KEY}&language=tr-TR&append_to_response=external_ids&t=${Date.now()}`);
        const d = await tmdbRes.json();
        
        const targetTr = normalize(d.title);
        const targetEn = normalize(d.original_title);
        const targetImdb = d.external_ids ? d.external_ids.imdb_id : null;
        const targetYear = (d.release_date || '').slice(0, 4);

        console.error(`[V${VERSION}] HEDEF: ${d.title} | TT: ${targetImdb} | YIL: ${targetYear}`);

        // 2. M3U Dosyası (Cihazı Kandırma: Cache ve Sertifika Bypass denemesi)
        // URL sonuna eklenen t=${Date.now()} cihazın dosyayı her seferinde internetten çekmesini sağlar
        const m3uRes = await fetch(`${M3U_URL}?t=${Date.now()}`, {
            signal: controller.signal,
            headers: { 'Cache-Control': 'no-cache', 'Pragma': 'no-cache' }
        });
        
        clearTimeout(timeoutId); // Bağlantı kurulduysa zaman aşımını iptal et

        const text = await m3uRes.text();
        const lines = text.split('\n');
        const results = [];

        // 3. Dosyayı Tara
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            if (line && line.includes('#EXTINF')) {
                const url = lines[i+1] ? lines[i+1].trim() : '';
                if (!url) continue;

                const lastCommaIndex = line.lastIndexOf(',');
                const m3uNameRaw = lastCommaIndex !== -1 ? line.substring(lastCommaIndex + 1).trim() : "";
                const m3uNameClean = normalize(m3uNameRaw);

                let score = 0;

                // KURAL 1: TT ID (IMDb) URL içinde varsa direkt al
                if (targetImdb && url.includes(targetImdb)) {
                    score = 100;
                } 
                // KURAL 2: Birebir isim eşleşmesi
                else if (m3uNameClean !== "" && (m3uNameClean === targetTr || m3uNameClean === targetEn)) {
                    score = 95;
                }
                // KURAL 3: İsim ve Yıl aynı anda varsa al
                else if (m3uNameClean !== "" && (m3uNameClean.includes(targetTr) || m3uNameClean.includes(targetEn))) {
                    if (targetYear && (line.includes(targetYear) || m3uNameRaw.includes(targetYear))) {
                        score = 90;
                    }
                }

                if (score >= 90) {
                    console.error(`[V${VERSION}] BULDUM: ${m3uNameRaw} [Puan: ${score}]`);
                    results.push({
                        url: url,
                        name: m3uNameRaw,
                        title: `[V${VERSION}] ${m3uNameRaw}`,
                        quality: "1080p",
                        score: score
                    });
                }
            }
        }

        return results.sort((a, b) => b.score - a.score);

    } catch (e) {
        if (e.name === 'AbortError') {
            console.error(`[V${VERSION}] HATA: Cihaz cok yavas, baglanti zaman asimina ugradi!`);
        } else {
            console.error(`[V${VERSION}] HATA: ${e.message}`);
        }
        return [];
    }
}

if (typeof module !== 'undefined') module.exports = { getStreams };
