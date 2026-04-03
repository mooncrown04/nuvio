var M3U_URL      = 'https://raw.githubusercontent.com/mooncrown04/m3ubirlestir/refs/heads/main/birlesik_sinema.m3u';
var TMDB_API_KEY = '500330721680edb6d5f7f12ba7cd9023';

function normalize(s) {
    if (!s) return '';
    return s.toLowerCase()
        .replace(/[\u0130\u0131]/g, 'i').replace(/[\u00fc]/g, 'u').replace(/[\u00f6]/g, 'o')
        .replace(/[\u015f]/g, 's').replace(/[\u011f]/g, 'g').replace(/[\u00e7]/g, 'c')
        .replace(/[^a-z0-9]/g, '') // Boşluk dahil her şeyi siler, en temiz eşleşmeyi sağlar
        .trim();
}

async function getStreams(tmdbId, mediaType) {
    if (mediaType === 'tv') return [];

    try {
        // 1. TMDB'den hem Türkçe hem İngilizce isimleri ve harici ID'leri al
        const tmdbRes = await fetch(`https://api.themoviedb.org/3/movie/${tmdbId}?api_key=${TMDB_API_KEY}&language=tr-TR&append_to_response=external_ids`);
        const d = await tmdbRes.json();
        
        const qTr = normalize(d.title);
        const qEn = normalize(d.original_title);
        const imdbId = d.external_ids ? d.external_ids.imdb_id : null; // Örn: tt5074352
        const year = (d.release_date || '').slice(0, 4);

        const m3uRes = await fetch(M3U_URL);
        const text = await m3uRes.text();
        const lines = text.split('\n');
        const results = [];

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            if (line && line.includes('#EXTINF')) {
                const url = lines[i+1] ? lines[i+1].trim() : '';
                if (!url || !url.startsWith('http')) continue;

                const lastCommaIndex = line.lastIndexOf(',');
                const m3uFullName = lastCommaIndex !== -1 ? line.substring(lastCommaIndex + 1).trim() : "";
                const m3uNameClean = normalize(m3uFullName);

                let score = 0;

                // --- GELİŞMİŞ EŞLEŞME MANTIĞI ---

                // 1. IMDb ID EŞLEŞMESİ (URL içinde tt5074352 geçiyor mu?)
                if (imdbId && url.includes(imdbId)) {
                    score = 100; 
                } 
                // 2. TMDB ID EŞLEŞMESİ (Satır içinde numara geçiyor mu?)
                else if (line.includes(tmdbId.toString())) {
                    score = 98;
                }
                // 3. TAM İSİM EŞLEŞMESİ
                else if (m3uNameClean === qTr || m3uNameClean === qEn) {
                    score = 95;
                }
                // 4. KISMİ İSİM EŞLEŞMESİ
                else if ((qTr && m3uNameClean.includes(qTr)) || (qEn && m3uNameClean.includes(qEn))) {
                    score = 75;
                    // Yıl kontrolü (Örn: year="2016" satırda var mı?)
                    if (year && line.includes(year)) {
                        score += 15;
                    }
                }

                if (score > 0) {
                    results.push({
                        url: url,
                        name: m3uFullName,
                        title: "M3U [" + score + "]",
                        quality: "1080p",
                        score: score
                    });
                }
            }
        }

        return results.sort((a, b) => b.score - a.score);

    } catch (e) {
        return [];
    }
}

if (typeof module !== 'undefined') module.exports = { getStreams };
