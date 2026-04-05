/**
 * Nuvio Dizi Motoru - V1.0.0
 * Özellik: Harf bazlı klasörleme ve SXXEXX (Sezon/Bölüm) nokta atışı.
 */

const DIZI_BASE_URL = 'https://raw.githubusercontent.com/mooncrown04/m3ubirlestir/main/nuvio_dizi_parcalari/';
const TMDB_API_KEY = '500330721680edb6d5f7f12ba7cd9023';

function ultraClean(s) {
    if (!s) return '';
    return s.toString().toLowerCase()
        .replace(/[ıİ]/g, 'i').replace(/[üÜ]/g, 'u').replace(/[öÖ]/g, 'o')
        .replace(/[şŞ]/g, 's').replace(/[ğĞ]/g, 'g').replace(/[çÇ]/g, 'c')
        .replace(/[^a-z0-9]/g, '').trim();
}

/**
 * İsmin ilk harfine göre doğru Dizi M3U dosyasını seçer.
 */
function getTargetDiziM3U(cleanTitle) {
    if (!cleanTitle) return DIZI_BASE_URL + 'dizi_diger.m3u';
    const firstChar = cleanTitle.charAt(0);
    
    if (/[0-9]/.test(firstChar)) return DIZI_BASE_URL + 'dizi_0_9_rakam.m3u';
    if (/[a-z]/.test(firstChar)) return DIZI_BASE_URL + `dizi_${firstChar}.m3u`;
    
    return DIZI_BASE_URL + 'dizi_diger.m3u';
}

async function getDiziStreams(tmdbId, season, episode) {
    try {
        // 1. TMDb'den Dizinin Türkçe Adını Al
        const tmdbRes = await fetch(`https://api.themoviedb.org/3/tv/${tmdbId}?api_key=${TMDB_API_KEY}&language=tr-TR`);
        const d = await tmdbRes.json();
        
        const targetTitle = ultraClean(d.name); 
        // Sezon ve Bölümü S01E01 formatına getir (Örn: Sezon 1 Bölüm 5 -> s01e05)
        const targetSxxExx = `s${season.toString().padStart(2, '0')}e${episode.toString().padStart(2, '0')}`;

        // 2. Doğru Harf Dosyasını Belirle
        const selectedURL = getTargetDiziM3U(targetTitle);

        // 3. M3U Dosyasını Oku
        const m3uRes = await fetch(selectedURL);
        if (!m3uRes.ok) return [];
        const rawText = await m3uRes.text();
        const lines = rawText.replace(/\r/g, '').split('\n');
        
        const results = [];

        // 4. İçerik Eşleştirme
        for (let i = 0; i < lines.length; i++) {
            let line = lines[i].trim();
            if (line.startsWith("#EXTINF")) {
                let nextLine = lines[i + 1] ? lines[i + 1].trim() : "";
                if (nextLine.startsWith("http")) {
                    
                    // Kaynak Etiketini (Zerk, MoOnCrOwN vb.) çek
                    let authorMatch = line.match(/group-author="([^"]+)"/);
                    let sourceTag = authorMatch ? authorMatch[1] : "MoOnCrOwN";

                    let parts = line.split(',');
                    let rawName = parts[parts.length - 1].trim();
                    let cleanLine = ultraClean(rawName);

                    // KRİTİK EŞLEŞME: Satırda hem dizi adı hem de S01E01 geçiyor mu?
                    if (cleanLine.includes(targetTitle) && cleanLine.includes(targetSxxExx)) {
                        results.push({
                            url: nextLine,
                            name: rawName,
                            title: `[NUVIO] ${rawName}`,
                            quality: sourceTag, // Kaynak ismi sağdaki etiket kutusunda
                            score: 100
                        });
                    }
                }
            }
        }
        
        return results;

    } catch (e) {
        console.error("Dizi Motoru Hatası:", e);
        return [];
    }
}

if (typeof module !== 'undefined') module.exports = { getDiziStreams };
