var M3U_URL      = 'https://raw.githubusercontent.com/mooncrown04/m3ubirlestir/refs/heads/main/birlesik_sinema.m3u';
var TMDB_API_KEY = '500330721680edb6d5f7f12ba7cd9023';

/**
 * Karakterleri temizler ama kelime bütünlüğünü bozmamak için boşlukları korur.
 */
function normalize(s) {
    if (!s) return '';
    return s.toLowerCase()
        .replace(/[\u0130\u0131]/g, 'i') // İ/ı -> i
        .replace(/[\u00fc]/g, 'u')      // ü -> u
        .replace(/[\u00f6]/g, 'o')      // ö -> o
        .replace(/[\u015f]/g, 's')      // ş -> s
        .replace(/[\u011f]/g, 'g')      // ğ -> g
        .replace(/[\u00e7]/g, 'c')      // ç -> c
        .replace(/[^a-z0-9\s]/g, '')    // Özel karakterleri sil, BOŞLUKLARI TUT
        .replace(/\s+/g, ' ')           // Çift boşlukları teke indir
        .trim();
}

async function getStreams(tmdbId, mediaType) {
    // Sadece film araması yapıyoruz (Senin kuralın)
    if (mediaType === 'tv') return [];

    try {
        // 1. TMDB Verisini Çek
        const tmdbRes = await fetch(`https://api.themoviedb.org/3/movie/${tmdbId}?api_key=${TMDB_API_KEY}&language=tr-TR`);
        const d = await tmdbRes.json();
        
        const qTr = normalize(d.title);
        const qEn = normalize(d.original_title);
        const year = (d.release_date || '').slice(0, 4);

        console.error("DEBUG: ARANAN -> " + d.title + " (" + year + ")");

        // 2. M3U Listesini Çek
        const m3uRes = await fetch(M3U_URL);
        const text = await m3uRes.text();
        const lines = text.split('\n');
        const results = [];

        // 3. Satır Satır Tara
        for (let i = 0; i < lines.length; i++) {
            if (lines[i].includes('#EXTINF')) {
                const line = lines[i];
                const url = lines[i+1] ? lines[i+1].trim() : '';
                
                // Virgülden sonraki film adını al
                const lastCommaIndex = line.lastIndexOf(',');
                if (lastCommaIndex === -1) continue;
                
                const m3uFullName = line.substring(lastCommaIndex + 1).trim();
                const m3uNameClean = normalize(m3uFullName);

                let score = 0;

                // EŞLEŞME KONTROLLERİ
                const hasTr = qTr && m3uNameClean.includes(qTr);
                const hasEn = qEn && m3uNameClean.includes(qEn);
                const hasYear = year && m3uFullName.includes(year);

                if (hasTr || hasEn) {
                    score = 70; // Temel isim eşleşmesi

                    // Kelime Kontrolü (Örn: "Marslı" ararken "Marslılar" gelmesin diye)
                    // Aranan kelime m3u içindeki kelimelerden birine tam eşit mi?
                    const m3uWords = m3uNameClean.split(' ');
                    const isExactWord = m3uWords.includes(qTr) || m3uWords.includes(qEn);
                    
                    if (isExactWord) score += 15; // Tam kelime varsa puan artır
                    if (hasYear) score += 15;     // Yıl da varsa puan artır
                }

                // EŞİĞİ YÜKSELTTİK: Sadece isim yetmez, ya yıl tutmalı ya da tam kelime olmalı.
                if (score >= 85) {
                    console.error("DEBUG: EŞLEŞTİ -> " + m3uFullName + " [Skor: " + score + "]");
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

        // Skorlara göre sırala ve en iyi 10 sonucu döndür
        return results.sort((a, b) => b.score - a.score).slice(0, 10);

    } catch (e) {
        console.error("DEBUG: HATA -> " + e.message);
        return [];
    }
}

if (typeof module !== 'undefined') module.exports = { getStreams };
