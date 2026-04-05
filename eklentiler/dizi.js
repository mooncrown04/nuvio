/**
 * Nuvio Dizi Motoru - V2.0.0
 * DÜZELTME: Loglara göre parametre sırası (ID, Type, Season, Episode) olarak güncellendi.
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

// Loglarına göre sıra: tmdbId, type, season, episode
async function getStreams(tmdbId, type, season, episode) {
    
    // LOG: Gelen verileri ERROR olarak basıyoruz ki görelim
    console.error(`!!! [NUVIO_ERROR_LOG] 1. GIRIS -> ID: ${tmdbId} | TYPE: ${type} | S:${season} E:${episode}`);
    
    // Gelen tip "tv" değilse (ikinci parametreye bakıyoruz artık)
    if (type !== 'tv') {
        console.error(`!!! [NUVIO_ERROR_LOG] 1a. TIP 'TV' DEGIL (${type}), IPTAL EDILDI.`);
        return [];
    }

    try {
        console.error(`!!! [NUVIO_ERROR_LOG] 2. TMDB ISTEGI: ${tmdbId}`);
        const tmdbRes = await fetch(`https://api.themoviedb.org/3/tv/${tmdbId}?api_key=${TMDB_API_KEY}&language=tr-TR`);
        
        if (!tmdbRes.ok) {
            console.error(`!!! [NUVIO_ERROR_LOG] 2a. TMDB HATASI: ${tmdbRes.status}`);
            return [];
        }
        
        const d = await tmdbRes.json();
        const targetTr = ultraClean(d.name);
        const targetEn = ultraClean(d.original_name);
        const targetSxxExx = `s${season.toString().padStart(2, '0')}e${episode.toString().padStart(2, '0')}`;
        
        console.error(`!!! [NUVIO_ERROR_LOG] 3. TMDB OK: ${targetTr} | ARANAN: ${targetSxxExx}`);

        const firstChar = targetTr.charAt(0);
        let fileName = (/[a-z]/.test(firstChar)) ? `dizi_${firstChar}.m3u` : (/[0-9]/.test(firstChar) ? 'dizi_0_9_rakam.m3u' : 'dizi_diger.m3u');
        const finalUrl = DIZI_BASE_URL + fileName;
        
        console.error(`!!! [NUVIO_ERROR_LOG] 4. M3U CEKILIYOR: ${fileName}`);

        const m3uRes = await fetch(finalUrl);
        if (!m3uRes.ok) {
            console.error(`!!! [NUVIO_ERROR_LOG] 4a. M3U YOK: ${finalUrl}`);
            return [];
        }

        const text = await m3uRes.text();
        const lines = text.split('\n');
        const results = [];

        for (let i = 0; i < lines.length; i++) {
            let line = lines[i].trim();
            if (line.startsWith("#EXTINF")) {
                let nextLine = lines[i + 1] ? lines[i + 1].trim() : "";
                if (!nextLine.startsWith("http")) continue;

                let rawName = line.split(',').pop().trim(); 
                let cleanRawName = ultraClean(rawName);

                // İsim ve Sezon/Bölüm kontrolü
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
        
        console.error(`!!! [NUVIO_ERROR_LOG] 5. BITTI. BULUNAN: ${results.length}`);
        return results;

    } catch (err) {
        console.error(`!!! [NUVIO_CRITICAL] HATA: ${err.message}`);
        return [];
    }
}

// DIŞA AKTARMA
if (typeof module !== 'undefined') module.exports = { getStreams };
if (typeof globalThis !== 'undefined') globalThis.getStreams = getStreams;
