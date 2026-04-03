var M3U_URL      = 'https://raw.githubusercontent.com/mooncrown04/m3ubirlestir/refs/heads/main/birlesik_sinema.m3u';
var TMDB_API_KEY = '500330721680edb6d5f7f12ba7cd9023';
var VERSION      = "4.5.0-BACK-TO-BASICS";

function normalize(s) {
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
        
        const targetTr = normalize(d.title);
        const targetEn = normalize(d.original_title);
        const targetImdb = (d.external_ids && d.external_ids.imdb_id) ? d.external_ids.imdb_id : null;
        const targetYear = (d.release_date || '').slice(0, 4);

        const m3uRes = await fetch(M3U_URL + "?v=" + Date.now());
        const text = await m3uRes.text();
        const lines = text.split('\n');
        const results = [];

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            if (line && line.includes('#EXTINF')) {
                // Linki her iki ihtimale göre yakala (Satır içi veya Alt satır)
                let url = "";
                if (line.includes('http')) {
                    url = "http" + line.split('http')[1].split(' ')[0];
                } else {
                    url = lines[i+1] ? lines[i+1].trim() : '';
                }

                if (!url || !url.startsWith('http')) continue;

                const lastComma = line.lastIndexOf(',');
                const rawName = lastComma !== -1 ? line.substring(lastComma + 1).trim() : "";
                const cleanM3U = normalize(rawName);

                let score = 0;

                // --- EN ESNEK EŞLEŞME ---
                
                // 1. Linkte ID varsa direkt al (En üstte çıksın)
                if (targetImdb && url.toLowerCase().includes(targetImdb.toLowerCase())) {
                    score = 100;
                }
                // 2. İsim birebir tutuyorsa al (Tarih olsun olmasın)
                else if (cleanM3U !== "" && (cleanM3U === targetTr || cleanM3U === targetEn)) {
                    score = 95;
                }
                // 3. İsim içeriyorsa (Örn: Marslı :The Martian) ve Yıl da tutuyorsa al
                else if ((cleanM3U.includes(targetTr) || (targetEn && cleanM3U.includes(targetEn))) && targetYear && line.includes(targetYear)) {
                    score = 90;
                }
                // 4. Sadece isim içeriyorsa (Daha önce çalışan en basit halimiz)
                else if (cleanM3U.includes(targetTr) || (targetEn && cleanM3U.includes(targetEn))) {
                    score = 80;
                }

                if (score >= 80) {
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

        // Aynı linkleri temizle ve puana göre diz
        const unique = Array.from(new Set(results.map(a => a.url))).map(u => results.find(a => a.url === u));
        return unique.sort((a, b) => b.score - a.score);

    } catch (e) {
        return [];
    }
}

if (typeof module !== 'undefined') module.exports = { getStreams };
