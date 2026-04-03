var M3U_URL      = 'https://raw.githubusercontent.com/mooncrown04/m3ubirlestir/refs/heads/main/birlesik_sinema.m3u';
var TMDB_API_KEY = '500330721680edb6d5f7f12ba7cd9023';

function normalize(s) {
    if (!s) return '';
    return s.toLowerCase()
        .replace(/[\u0130\u0131]/g, 'i').replace(/[\u00fc]/g, 'u').replace(/[\u00f6]/g, 'o')
        .replace(/[\u015f]/g, 's').replace(/[\u011f]/g, 'g').replace(/[\u00e7]/g, 'c')
        .replace(/[^a-z0-9\s]/g, '') 
        .replace(/\s+/g, ' ')
        .trim();
}

async function getStreams(tmdbId, mediaType) {
    if (mediaType === 'tv') return [];

    try {
        const tmdbRes = await fetch(`https://api.themoviedb.org/3/movie/${tmdbId}?api_key=${TMDB_API_KEY}&language=tr-TR`);
        const d = await tmdbRes.json();
        
        const qTr = normalize(d.title);
        const qEn = normalize(d.original_title);
        const year = (d.release_date || '').slice(0, 4);

        console.error("DEBUG: ARANAN -> " + d.title + " (" + year + ") ID: " + tmdbId);

        const m3uRes = await fetch(M3U_URL);
        const text = await m3uRes.text();
        const lines = text.split('\n');
        const results = [];

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            if (line && line.includes('#EXTINF')) {
                const url = lines[i+1] ? lines[i+1].trim() : '';
                if (!url || url.startsWith('#')) continue;

                const lastCommaIndex = line.lastIndexOf(',');
                if (lastCommaIndex === -1) continue;
                
                const m3uFullName = line.substring(lastCommaIndex + 1).trim();
                const m3uNameClean = normalize(m3uFullName);

                let score = 0;

                // 1. KRİTİK KONTROL: ID EŞLEŞMESİ (Eğer M3U içinde tmdb-id varsa direkt 100 puan)
                if (line.includes(`tmdb-id="${tmdbId}"`) || line.includes(`tmdbid="${tmdbId}"`)) {
                    score = 100;
                } 
                // 2. TAM İSİM EŞLEŞMESİ (Birebir aynıysa 95 puan)
                else if (m3uNameClean === qTr || m3uNameClean === qEn) {
                    score = 95;
                }
                // 3. KISMİ EŞLEŞME (İsim geçiyorsa)
                else if (m3uNameClean.includes(qTr) || (qEn && m3uNameClean.includes(qEn))) {
                    score = 70;
                    // Yıl varsa puanı yükselt (70 + 20 = 90)
                    if (year && m3uFullName.includes(year)) {
                        score += 20;
                    }
                }

                // Skor 70 ve üzeriyse listeye ekle (Yani isim geçmesi yeterli)
                if (score >= 70) {
                    results.push({
                        url: url,
                        name: m3uFullName,
                        title: "M3U Linki [Skor: " + score + "]",
                        quality: "1080p",
                        score: score
                    });
                }
            }
        }

        // Skorları büyükten küçüğe sırala
        return results.sort((a, b) => b.score - a.score).slice(0, 15);

    } catch (e) {
        console.error("DEBUG: HATA -> " + e.message);
        return [];
    }
}

if (typeof module !== 'undefined') module.exports = { getStreams };
