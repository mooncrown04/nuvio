/**
 * Nuvio Dizi Motoru - V1.8.0
 * KRİTİK: Sistem logları log görmediği için TÜM çıktılar console.error ile basılır.
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
    
    // Her adımı ERROR olarak basıyoruz ki loglarda görünsün
    console.error(`!!! [NUVIO_LOG] BASLADI -> ID: ${tmdbId} S:${season} E:${episode}`);

    try {
        const tmdbRes = await fetch(`https://api.themoviedb.org/3/tv/${tmdbId}?api_key=${TMDB_API_KEY}&language=tr-TR`);
        if (!tmdbRes.ok) {
            console.error(`!!! [NUVIO_ERROR] TMDB PATLADI: ${tmdbRes.status}`);
            return [];
        }
        
        const d = await tmdbRes.json();
        const targetTr = ultraClean(d.name);
        const targetEn = ultraClean(d.original_name);
        const targetSxxExx = `s${season.toString().padStart(2, '0')}e${episode.toString().padStart(2, '0')}`;
        
        console.error(`!!! [NUVIO_LOG] ARANAN: ${targetTr} | EN: ${targetEn} | KOD: ${targetSxxExx}`);

        const firstChar = targetTr.charAt(0);
        let fileName = (/[a-z]/.test(firstChar)) ? `dizi_${firstChar}.m3u` : (/[0-9]/.test(firstChar) ? 'dizi_0_9_rakam.m3u' : 'dizi_diger.m3u');
        const finalUrl = DIZI_BASE_URL + fileName;

        console.error(`!!! [NUVIO_LOG] DOSYA YOLU: ${finalUrl}`);

        const m3uRes = await fetch(finalUrl);
        if (!m3uRes.ok) {
            console.error(`!!! [NUVIO_ERROR] M3U INDIRILEMEDI: ${fileName}`);
            return [];
        }

        const text = await m3uRes.text();
        const lines = text.split('\n');
        console.error(`!!! [NUVIO_LOG] M3U SATIR SAYISI: ${lines.length}`);

        const results = [];

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
        
        console.error(`!!! [NUVIO_LOG] BITTI. BULUNAN KAYNAK: ${results.length}`);
        return results;

    } catch (err) {
        console.error(`!!! [NUVIO_CRITICAL] CÖKME: ${err.message}`);
        console.error(`!!! [NUVIO_STACK]: ${err.stack}`);
        return [];
    }
}

// --- SISTEM DISA AKTARIM ---
if (typeof module !== 'undefined') module.exports = { getStreams };
if (typeof globalThis !== 'undefined') globalThis.getStreams = getStreams;
