/**
 * Nuvio Dizi Motoru - V1.7.0 (FULL LOGGING)
 * Özellik: Her adım console.log ve console.error ile takip edilir.
 * Format: Virgülden sonraki "Dizi Adı S01E01" yapısını baz alır.
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

async function getStreams(type, tmdbId, season, episode) {
    if (type !== 'tv') return [];
    
    console.log(`[NUVIO START] ID: ${tmdbId} | Sezon: ${season} | Bölüm: ${episode}`);

    try {
        // 1. TMDB Aşaması
        const tmdbRes = await fetch(`https://api.themoviedb.org/3/tv/${tmdbId}?api_key=${TMDB_API_KEY}&language=tr-TR`);
        if (!tmdbRes.ok) {
            console.error(`[NUVIO ERROR] TMDB Verisi Alınamadı! Durum: ${tmdbRes.status}`);
            return [];
        }
        
        const d = await tmdbRes.json();
        const targetTr = ultraClean(d.name);
        const targetEn = ultraClean(d.original_name);
        const targetSxxExx = `s${season.toString().padStart(2, '0')}e${episode.toString().padStart(2, '0')}`;
        
        console.log(`[NUVIO INFO] Aranan Dizi: ${targetTr} (${targetEn}) | Kod: ${targetSxxExx}`);

        // 2. Dosya Seçim Aşaması
        const firstChar = targetTr.charAt(0);
        let fileName = (/[a-z]/.test(firstChar)) ? `dizi_${firstChar}.m3u` : (/[0-9]/.test(firstChar) ? 'dizi_0_9_rakam.m3u' : 'dizi_diger.m3u');
        const finalUrl = DIZI_BASE_URL + fileName;
        
        console.log(`[NUVIO FETCH] Hedef Dosya: ${fileName} | URL: ${finalUrl}`);

        // 3. M3U İndirme Aşaması
        const m3uRes = await fetch(finalUrl);
        if (!m3uRes.ok) {
            console.error(`[NUVIO ERROR] M3U dosyasına ulaşılamadı: ${fileName}. GitHub linkini kontrol et!`);
            return [];
        }

        const text = await m3uRes.text();
        const lines = text.split('\n');
        console.log(`[NUVIO LOAD] M3U Okundu. Toplam satır sayısı: ${lines.length}`);

        const results = [];

        // 4. Eşleşme Aşaması
        for (let i = 0; i < lines.length; i++) {
            let line = lines[i].trim();
            if (line.startsWith("#EXTINF")) {
                let nextLine = lines[i + 1] ? lines[i + 1].trim() : "";
                if (!nextLine.startsWith("http")) continue;

                // Virgülden sonrasını al (Senin temiz formatın)
                let rawName = line.split(',').pop().trim(); 
                let cleanRawName = ultraClean(rawName);

                const isTitleMatch = cleanRawName.includes(targetTr) || (targetEn && cleanRawName.includes(targetEn));
                const isEpMatch = cleanRawName.includes(targetSxxExx);

                if (isTitleMatch && isEpMatch) {
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
        
        if (results.length === 0) {
            console.warn(`[NUVIO WARN] Dosya içinde eşleşme bulunamadı. M3U içeriğindeki isimleri ve SXXEXX formatını kontrol et.`);
        } else {
            console.log(`[NUVIO SUCCESS] Toplam ${results.length} kaynak başarıyla listelendi.`);
        }
        
        return results;

    } catch (err) {
        console.error(`[NUVIO CRITICAL HATA]: ${err.message}`);
        return [];
    }
}

// --- SİSTEM ENTEGRASYONU ---
if (typeof module !== 'undefined') module.exports = { getStreams };
if (typeof globalThis !== 'undefined') globalThis.getStreams = getStreams;
