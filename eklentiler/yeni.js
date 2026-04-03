var M3U_URL      = 'https://raw.githubusercontent.com/mooncrown04/m3ubirlestir/refs/heads/main/birlesik_sinema.m3u';
var TMDB_API_KEY = '500330721680edb6d5f7f12ba7cd9023';

function normalize(s) {
    if (!s) return '';
    return s.toLowerCase()
        .replace(/[\u0130\u0131]/g, 'i').replace(/[\u00fc]/g, 'u').replace(/[\u00f6]/g, 'o')
        .replace(/[\u015f]/g, 's').replace(/[\u011f]/g, 'g').replace(/[\u00e7]/g, 'c')
        .replace(/[^a-z0-9]/g, '') // En agresif temizlik: Sadece harf ve rakam
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

        console.error("DEBUG: ARANAN -> " + d.title + " ID: " + tmdbId);

        const m3uRes = await fetch(M3U_URL);
        const text = await m3uRes.text();
        const lines = text.split('\n');
        const results = [];

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            if (line && line.includes('#EXTINF')) {
                const url = lines[i+1] ? lines[i+1].trim() : '';
                if (!url || !url.startsWith('http')) continue;

                // Satır içindeki ID kontrolü (Örn: tmdb-id="360814")
                const hasIdMatch = line.includes(tmdbId.toString());
                
                const lastCommaIndex = line.lastIndexOf(',');
                const m3uFullName = lastCommaIndex !== -1 ? line.substring(lastCommaIndex + 1).trim() : "";
                const m3uNameClean = normalize(m3uFullName);

                let score = 0;

                if (hasIdMatch) {
                    score = 100; // ID eşleşmesi varsa rakipsizdir
                } else if (m3uNameClean === qTr || m3uNameClean === qEn) {
                    score = 95; // İsim birebir (temizlenmiş haliyle) aynı
                } else if (m3uNameClean.includes(qTr) || (qEn && m3uNameClean.includes(qEn))) {
                    score = 70; // İsim bir şekilde içinde geçiyor
                    if (year && m3uFullName.includes(year)) {
                        score += 20; // Yıl da varsa bonus
                    }
                }

                // EĞER SKOR VARSA (ID eşleştiyse veya isim geçiyorsa) EKLE
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

        // Skorlara göre diz, en iyileri döndür
        return results.sort((a, b) => b.score - a.score);

    } catch (e) {
        console.error("DEBUG: HATA -> " + e.message);
        return [];
    }
}

if (typeof module !== 'undefined') module.exports = { getStreams };
