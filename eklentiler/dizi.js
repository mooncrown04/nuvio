/**
 * Nuvio Dizi Motoru - V5.0.0
 * STRATEJİ: Harf + Sezon bazlı nokta atışı dosya çekimi.
 * AVANTAJ: Maksimum hız, minimum RAM kullanımı.
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
        // 1. TMDB'den dizi adını öğren
        const tmdbRes = await fetch(`https://api.themoviedb.org/3/tv/${tmdbId}?api_key=${TMDB_API_KEY}&language=tr-TR`);
        const d = await tmdbRes.json();
        
        const targetTr = ultraClean(d.name);
        const targetEn = ultraClean(d.original_name);
        // Aranan Bölüm Kodu (Örn: s01e01)
        const targetSxxExx = `s${season.toString().padStart(2, '0')}e${episode.toString().padStart(2, '0')}`;
        
        // 2. Nokta Atışı Dosya Belirleme
        // Python artık dosyaları dizi_harf_sSezon.m3u formatında kaydediyor.
        const firstChar = targetTr.charAt(0);
        let harfGrubu = (/[a-z]/.test(firstChar)) ? firstChar : (/[0-9]/.test(firstChar) ? '0_9_rakam' : 'diger');
        
        const fileName = `dizi_${harfGrubu}_s${season}.m3u`;
        
        console.error(`!!! [NUVIO] HEDEF DOSYA: ${fileName} | ARANAN: ${targetSxxExx}`);

        // 3. Dosyayı Çek
        const m3uRes = await fetch(`${DIZI_BASE_URL}${fileName}?v=${Date.now()}`);
        
        // Eğer o sezon dosyası GitHub'da yoksa (404), boş dön
        if (!m3uRes.ok) {
            console.error(`!!! [NUVIO] DOSYA BULUNAMADI: ${fileName}`);
            return [];
        }

        const content = await m3uRes.text();
        const results = [];
        const blocks = content.split('#EXTINF');

        for (let i = 1; i < blocks.length; i++) {
            const block = blocks[i];
            const lowerBlock = block.toLowerCase();

            // Önce bölüm kodu var mı?
            if (!lowerBlock.includes(targetSxxExx)) continue;

            // Sonra isim uyuşuyor mu?
            const cleanBlock = ultraClean(block);
            if (cleanBlock.includes(targetTr) || (targetEn && cleanBlock.includes(targetEn))) {
                
                const lines = block.split('\n');
                const infoLine = lines[0]; 
                const urlLine = lines.find(l => l.trim().startsWith('http'));

                if (urlLine) {
                    let authorMatch = infoLine.match(/group-author="([^"]+)"/);
                    results.push({
                        url: urlLine.trim(),
                        name: infoLine.split(',').pop().trim(),
                        title: `[NUVIO] ${authorMatch ? authorMatch[1] : "KAYNAK"}`,
                        quality: authorMatch ? authorMatch[1] : "HD"
                    });
                }
            }
        }

        console.error(`!!! [NUVIO] ISLEM TAMAMLANDI. BULUNAN: ${results.length}`);
        return results;

    } catch (err) {
        console.error(`!!! [NUVIO_CRITICAL] ${err.message}`);
        return [];
    }
}

// DIŞA AKTARMA
if (typeof module !== 'undefined') module.exports = { getStreams };
if (typeof globalThis !== 'undefined') globalThis.getStreams = getStreams;
