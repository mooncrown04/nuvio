/**
 * Nuvio Dizi Motoru - V5.6.0
 * STRATEJİ: Kesin/Yakın Eşleşme Skoru + Çift İsim Kontrolü + Tam Dışa Aktarma
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
    // Nuvio ve Stremio için sadece TV tipini destekliyoruz
    if (type !== 'tv') return [];

    try {
        // 1. TMDB Verisini Al (Hem Türkçe hem Orijinal İsim)
        const tmdbRes = await fetch(`https://api.themoviedb.org/3/tv/${tmdbId}?api_key=${TMDB_API_KEY}&language=tr-TR`);
        const d = await tmdbRes.json();
        
        const targetTr = ultraClean(d.name);           
        const targetEn = ultraClean(d.original_name);  
        const targetSxxExx = `s${season.toString().padStart(2, '0')}e${episode.toString().padStart(2, '0')}`;
        
        // 2. Klasörleme mantığına göre doğru M3U dosyasını belirle
        const firstChar = targetTr.charAt(0);
        let harfGrubu = (/[a-z]/.test(firstChar)) ? firstChar : (/[0-9]/.test(firstChar) ? '0_9_rakam' : 'diger');
        const fileName = `dizi_${harfGrubu}_s${season}.m3u`;

        // 3. M3U dosyasını indir
        const m3uRes = await fetch(`${DIZI_BASE_URL}${fileName}?v=${Date.now()}`);
        if (!m3uRes.ok) return [];

        const content = await m3uRes.text();
        const results = [];
        const blocks = content.split('#EXTINF');

        for (let i = 1; i < blocks.length; i++) {
            const block = blocks[i];
            const lines = block.split('\n');
            const infoLine = lines[0];

            // --- SEZON/BÖLÜM FİLTRESİ ---
            const displayPart = infoLine.split(',').pop().toLowerCase();
            if (!displayPart.includes(targetSxxExx)) continue;

            // --- GRUP ADI VE İSİM EŞLEŞTİRME ---
            const groupMatch = infoLine.match(/group-title="([^"]+)"/);
            const groupTitle = groupMatch ? groupMatch[1] : "";
            const cleanGroup = ultraClean(groupTitle);

            /**
             * AKILLI FİLTRELEME: 
             * 1. Tam eşitlik var mı?
             * 2. Veya isim içinde geçiyor mu? 
             * 3. (ÖNEMLİ) İsim içinde geçiyorsa uzunluk farkı 3 karakterden fazla mı? 
             * (Bu, "From" ararken "Tales from the Loop" gelmesini engeller)
             */
            const checkMatch = (targetName) => {
                if (!targetName) return false;
                if (cleanGroup === targetName) return true;
                if (cleanGroup.includes(targetName)) {
                    // Eğer aranan kelime içinde geçiyorsa, toplam uzunluk farkına bak
                    return Math.abs(cleanGroup.length - targetName.length) <= 4;
                }
                return false;
            };

            if (checkMatch(targetTr) || checkMatch(targetEn)) {
                const urlLine = lines.find(l => l.trim().startsWith('http'));

                if (urlLine) {
                    const authorMatch = infoLine.match(/group-author="([^"]+)"/);
                    // Nuvio'nun beklediği nesne yapısı
                    results.push({
                        url: urlLine.trim(),
                        name: infoLine.split(',').pop().trim(),
                        title: `[NUVIO] ${authorMatch ? authorMatch[1] : "KAYNAK"}`,
                        quality: authorMatch ? authorMatch[1] : "HD"
                    });
                }
            }
        }

        console.log(`[NUVIO] Arama tamamlandı. ID: ${tmdbId} | Sonuç: ${results.length}`);
        return results;

    } catch (err) {
        console.error(`[NUVIO_CRITICAL] Hata: ${err.message}`);
        return [];
    }
}

// --- DIŞA AKTARMA (EXPORT) BÖLÜMÜ - Nuvio/Stremio bu kısmı bekler ---
if (typeof module !== 'undefined') {
    module.exports = { getStreams };
}
if (typeof globalThis !== 'undefined') {
    globalThis.getStreams = getStreams;
}
