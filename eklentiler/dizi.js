/**
 * Nuvio Dizi Motoru - V2.3.0
 * MANTIK: 
 * 1. Dizi İsmi -> group-title="Dizi Adı" içinden kontrol edilir.
 * 2. Sezon/Bölüm -> Virgül (,) sonrasındaki metinden kontrol edilir.
 */

const DIZI_BASE_URL = 'https://raw.githubusercontent.com/mooncrown04/m3ubirlestir/main/nuvio_dizi_parcalari/';
const TMDB_API_KEY = '500330721680edb6d5f7f12ba7cd9023';

function ultraClean(s) {
    if (!s) return '';
    return s.toString().toLowerCase()
        .replace(/[ıİ]/g, 'i').replace(/[üÜ]/g, 'u').replace(/[öÖ]/g, 'o')
        .replace(/[şŞ]/g, 's').replace(/[ğĞ]/g, 'g').replace(/[çÇ]/g, 'c')
        .replace(/[^a-z0-9]/g, '') 
        .trim();
}

async function getStreams(tmdbId, type, season, episode) {
    console.error(`!!! [NUVIO_LOG] 1. GIRIS -> ID: ${tmdbId} | S:${season} E:${episode}`);
    
    if (type !== 'tv') return [];

    try {
        // 1. TMDB Verilerini Hazırla
        const tmdbRes = await fetch(`https://api.themoviedb.org/3/tv/${tmdbId}?api_key=${TMDB_API_KEY}&language=tr-TR`);
        const d = await tmdbRes.json();
        
        const targetTr = ultraClean(d.name);           // "breakingbad"
        const targetEn = ultraClean(d.original_name);  // "breakingbad"
        const targetSxxExx = `s${season.toString().padStart(2, '0')}e${episode.toString().padStart(2, '0')}`; // "s01e01"
        
        console.error(`!!! [NUVIO_LOG] 2. HEDEF: ${targetTr} | KOD: ${targetSxxExx}`);

        // 2. Dosyayı Belirle ve Çek
        const firstChar = targetTr.charAt(0);
        let fileName = (/[a-z]/.test(firstChar)) ? `dizi_${firstChar}.m3u` : (/[0-9]/.test(firstChar) ? 'dizi_0_9_rakam.m3u' : 'dizi_diger.m3u');
        
        const m3uRes = await fetch(DIZI_BASE_URL + fileName);
        const text = await m3uRes.text();
        const lines = text.split('\n');

        const results = [];

        for (let i = 0; i < lines.length; i++) {
            let line = lines[i].trim();
            if (line.startsWith("#EXTINF")) {
                let nextLine = lines[i + 1] ? lines[i + 1].trim() : "";
                if (!nextLine.startsWith("http")) continue;

                // --- ADIM A: Dizi İsmi Kontrolü (group-title) ---
                let groupTitleMatch = line.match(/group-title="([^"]+)"/);
                let m3uGroupTitle = groupTitleMatch ? ultraClean(groupTitleMatch[1]) : "";
                const isTitleMatch = m3uGroupTitle.includes(targetTr) || m3uGroupTitle.includes(targetEn);

                // --- ADIM B: Sezon/Bölüm Kontrolü (Virgül Sonrası) ---
                let rawName = line.split(',').pop().trim(); // Virgülden sonrası
                let cleanRawName = ultraClean(rawName);
                const isEpMatch = cleanRawName.includes(targetSxxExx);

                // İkisi de tutuyorsa ekle
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
        
        console.error(`!!! [NUVIO_LOG] 3. BITTI. BULUNAN: ${results.length}`);
        return results;

    } catch (err) {
        console.error(`!!! [NUVIO_CRITICAL] HATA: ${err.message}`);
        return [];
    }
}

// DIŞA AKTARMA
if (typeof module !== 'undefined') module.exports = { getStreams };
if (typeof globalThis !== 'undefined') globalThis.getStreams = getStreams;
