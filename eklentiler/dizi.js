/**
 * Nuvio Dizi Motoru - V1.9.0
 * SADECE console.error KULLANIR (Sistem loglarında görünmesi için).
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
    // 1. TETIKLENME KONTROLÜ
    console.error(`!!! [NUVIO_ERROR_LOG] 1. FONKSIYON CAGRI ALDI: Type=${type}, ID=${tmdbId}`);
    
    if (type !== 'tv') {
        console.error("!!! [NUVIO_ERROR_LOG] 1a. TIP 'TV' DEGIL, IPTAL.");
        return [];
    }

    try {
        // 2. TMDB KONTROLÜ
        console.error("!!! [NUVIO_ERROR_LOG] 2. TMDB'YE ISTEK ATILIYOR...");
        const tmdbRes = await fetch(`https://api.themoviedb.org/3/tv/${tmdbId}?api_key=${TMDB_API_KEY}&language=tr-TR`);
        
        if (!tmdbRes.ok) {
            console.error(`!!! [NUVIO_ERROR_LOG] 2a. TMDB HATASI! Kod: ${tmdbRes.status}`);
            return [];
        }
        
        const d = await tmdbRes.json();
        const targetTr = ultraClean(d.name);
        const targetEn = ultraClean(d.original_name);
        const targetSxxExx = `s${season.toString().padStart(2, '0')}e${episode.toString().padStart(2, '0')}`;
        
        console.error(`!!! [NUVIO_ERROR_LOG] 3. TMDB OK: ${targetTr} | SXXEXX: ${targetSxxExx}`);

        // 3. DOSYA KONTROLÜ
        const firstChar = targetTr.charAt(0);
        let fileName = (/[a-z]/.test(firstChar)) ? `dizi_${firstChar}.m3u` : (/[0-9]/.test(firstChar) ? 'dizi_0_9_rakam.m3u' : 'dizi_diger.m3u');
        const finalUrl = DIZI_BASE_URL + fileName;
        
        console.error(`!!! [NUVIO_ERROR_LOG] 4. M3U ISTENIYOR: ${finalUrl}`);

        const m3uRes = await fetch(finalUrl);
        if (!m3uRes.ok) {
            console.error(`!!! [NUVIO_ERROR_LOG] 4a. M3U CEKILEMEDI! Url: ${finalUrl}`);
            return [];
        }

        const text = await m3uRes.text();
        const lines = text.split('\n');
        console.error(`!!! [NUVIO_ERROR_LOG] 5. M3U INDİ. SATIR SAYISI: ${lines.length}`);

        const results = [];

        // 4. EŞLEŞME DÖNGÜSÜ
        for (let i = 0; i < lines.length; i++) {
            let line = lines[i].trim();
            if (line.startsWith("#EXTINF")) {
                let nextLine = lines[i + 1] ? lines[i + 1].trim() : "";
                if (!nextLine.startsWith("http")) continue;

                let rawName = line.split(',').pop().trim(); 
                let cleanRawName = ultraClean(rawName);

                if ((cleanRawName.includes(targetTr) || cleanRawName.includes(targetEn)) && cleanRawName.includes(targetSxxExx)) {
                    let authorMatch = line.match(/group-author="([^"]+)"/);
                    results.push({
                        url: nextLine,
                        name: rawName,
                        title: `[NUVIO] ${rawName}`,
                        quality: authorMatch ? authorMatch[1] : "MoOnCrOwN"
                    });
                }
            }
        }
        
        console.error(`!!! [NUVIO_ERROR_LOG] 6. ISLEM BITTI. SONUC: ${results.length}`);
        return results;

    } catch (err) {
        console.error(`!!! [NUVIO_CRITICAL_ERROR] COKME: ${err.message}`);
        console.error(`!!! [NUVIO_STACK] ${err.stack}`);
        return [];
    }
}

// DIŞA AKTARMA (STREMIO STANDARTI)
if (typeof module !== 'undefined') module.exports = { getStreams };
if (typeof globalThis !== 'undefined') globalThis.getStreams = getStreams;
