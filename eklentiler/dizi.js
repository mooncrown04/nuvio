/**
 * Nuvio Dizi Motoru - V4.0.0 (High Speed Edition)
 * SORUN: Veri çok olduğu için alt satırlara ulaşamıyor.
 * ÇÖZÜM: Ağır döngü yerine hızlı string tarama ve hafıza yönetimi.
 */

const DIZI_BASE_URL = 'https://raw.githubusercontent.com/mooncrown04/m3ubirlestir/main/nuvio_dizi_parcalari/';
const TMDB_API_KEY = '500330721680edb6d5f7f12ba7cd9023';

function ultraClean(s) {
    if (!s) return '';
    return s.toString().toLowerCase()
        .replace(/[ıİ]/g, 'i').replace(/[üÜ]/g, 'u').replace(/[öÖ]/g, 'o')
        .replace(/[şŞ]/g, 's').replace(/[ğĞ]/g, 'g').replace(/[çÇ]/g, 'c')
        .replace(/[^a-z0-9]/g, '');
}

async function getStreams(tmdbId, type, season, episode) {
    if (type !== 'tv') return [];

    try {
        // 1. TMDB Bilgilerini Al
        const tmdbRes = await fetch(`https://api.themoviedb.org/3/tv/${tmdbId}?api_key=${TMDB_API_KEY}&language=tr-TR`);
        const d = await tmdbRes.json();
        
        const targetTr = ultraClean(d.name);
        const targetEn = ultraClean(d.original_name);
        const targetSxxExx = `s${season.toString().padStart(2, '0')}e${episode.toString().padStart(2, '0')}`;
        
        console.error(`!!! [NUVIO] TARANIYOR: ${targetTr} - ${targetSxxExx}`);

        // 2. M3U Dosyasını Çek (Cache Kırıcı ile)
        const fileName = `dizi_${targetTr.charAt(0)}.m3u`;
        const m3uRes = await fetch(`${DIZI_BASE_URL}${fileName}?v=${Date.now()}`);
        const content = await m3uRes.text();

        const results = [];
        // Satır satır bölmek yerine blok blok tarayalım (Daha hızlıdır)
        const blocks = content.split('#EXTINF');

        // İlk bloğu (header) atla
        for (let i = 1; i < blocks.length; i++) {
            const block = blocks[i];
            
            // Performans için: Önce Sezon/Bölüm var mı diye bak (En hızlı filtre)
            const lowerBlock = block.toLowerCase();
            if (!lowerBlock.includes(targetSxxExx)) continue;

            // Sezon/Bölüm varsa, isim kontrolü yap
            const cleanBlock = ultraClean(block);
            if (cleanBlock.includes(targetTr) || (targetEn && cleanBlock.includes(targetEn))) {
                
                const lines = block.split('\n');
                const infoLine = lines[0]; // Virgüllü kısım buradadır
                const urlLine = lines.find(l => l.trim().startsWith('http'));

                if (urlLine) {
                    let authorMatch = infoLine.match(/group-author="([^"]+)"/);
                    results.push({
                        url: urlLine.trim(),
                        name: infoLine.split(',').pop().trim(),
                        title: `[NUVIO] ${authorMatch ? authorMatch[1] : "KAYNAK"}`,
                        quality: "HD"
                    });
                }
            }
        }

        console.error(`!!! [NUVIO] ISLEM BITTI. TOPLAM: ${results.length}`);
        return results;

    } catch (err) {
        console.error(`!!! [NUVIO_ERROR] ${err.message}`);
        return [];
    }
}

if (typeof module !== 'undefined') module.exports = { getStreams };
if (typeof globalThis !== 'undefined') globalThis.getStreams = getStreams;
