/**
 * Nuvio Dizi Motoru - V1.2.0 (DEBUG MODE)
 * Özellik: Detaylı hata takibi ve adım adım loglama.
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

async function getDiziStreams(tmdbId, season, episode) {
    console.log(`[NUVIO DEBUG] İşlem Başladı: ID:${tmdbId} S:${season} E:${episode}`);

    try {
        // 1. TMDB Verisi Çekme
        const tmdbRes = await fetch(`https://api.themoviedb.org/3/tv/${tmdbId}?api_key=${TMDB_API_KEY}&language=tr-TR`);
        if (!tmdbRes.ok) throw new Error(`TMDB Bağlantı Hatası! Kod: ${tmdbRes.status}`);
        
        const d = await tmdbRes.json();
        const targetTr = ultraClean(d.name);
        const targetEn = ultraClean(d.original_name);
        const targetSxxExx = `s${season.toString().padStart(2, '0')}e${episode.toString().padStart(2, '0')}`;

        console.log(`[NUVIO DEBUG] TMDB Bilgisi: TR:${targetTr} | EN:${targetEn} | Aranan:${targetSxxExx}`);

        // 2. Harf Dosyası Belirleme
        const firstChar = targetTr.charAt(0);
        let fileName = (/[a-z]/.test(firstChar)) ? `dizi_${firstChar}.m3u` : (/[0-9]/.test(firstChar) ? 'dizi_0_9_rakam.m3u' : 'dizi_diger.m3u');
        const selectedURL = DIZI_BASE_URL + fileName;

        console.log(`[NUVIO DEBUG] Hedef Dosya: ${selectedURL}`);

        // 3. M3U İndirme
        const m3uRes = await fetch(selectedURL);
        if (!m3uRes.ok) {
            console.warn(`[NUVIO DEBUG] M3U Dosyası Bulunamadı: ${fileName} (404 veya Bağlantı Sorunu)`);
            return [];
        }

        const text = await m3uRes.text();
        const lines = text.split('\n');
        console.log(`[NUVIO DEBUG] Dosya İndi. Toplam Satır: ${lines.length}`);

        const results = [];
        let matchCount = 0;

        // 4. Arama Döngüsü
        for (let i = 0; i < lines.length; i++) {
            let line = lines[i].trim();
            if (line.startsWith("#EXTINF")) {
                let nextLine = lines[i + 1] ? lines[i + 1].trim() : "";
                if (!nextLine.startsWith("http")) continue;

                let rawName = line.split(',').pop().trim();
                let cleanLine = ultraClean(rawName);

                // Eşleşme Kontrolü
                const hasEpisode = cleanLine.includes(targetSxxExx);
                const hasTitle = cleanLine.includes(targetTr) || (targetEn && cleanLine.includes(targetEn));

                if (hasEpisode && hasTitle) {
                    matchCount++;
                    let authorMatch = line.match(/group-author="([^"]+)"/);
                    let sourceTag = authorMatch ? authorMatch[1] : "MoOnCrOwN";

                    results.push({
                        url: nextLine,
                        name: rawName,
                        title: `[NUVIO] ${rawName}`,
                        quality: sourceTag,
                        score: 100
                    });
                }
            }
        }

        console.log(`[NUVIO DEBUG] Arama Bitti. Bulunan Eşleşme: ${matchCount}`);
        return results;

    } catch (error) {
        console.error(`[NUVIO KRİTİK HATA]: ${error.message}`);
        return [];
    }
}
