/**
 * Videopark Titan Unpacker
 * Gizli JavaScript bloklarını deşifre eder.
 */

async function getStreams(id, mediaType, season, episode) {
    const playerUrl = "https://videopark.top/titan/w/DFADXFgPDU4";

    try {
        console.error(`[UNPACKER] Sayfa çekiliyor: ${playerUrl}`);

        const response = await fetch(playerUrl, {
            headers: {
                'Referer': 'https://jetfilmizle.net/',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            }
        });
        
        const html = await response.text();

        // KRİTİK: Tüm script bloklarını yakala
        const scripts = html.match(/<script\b[^>]*>([\s\S]*?)<\/script>/gm);
        
        if (!scripts) {
            console.error("[UNPACKER-HATA] Sayfada script bulunamadı!");
            return [];
        }

        console.error(`[UNPACKER] ${scripts.length} adet script bloğu bulundu.`);

        scripts.forEach((s, i) => {
            // Eğer script içinde 'eval', 'p,a,c,k,e,d' veya 'Base64' geçiyorsa bu linkin saklandığı yerdir
            if (s.includes('eval') || s.includes('p,a,c,k,e,d') || s.length > 500) {
                // Logcat satır sınırına takılmamak için scripti parçalayarak basalım
                const cleanScript = s.replace(/<script\b[^>]*>/, '').replace(/<\/script>/, '').trim();
                console.error(`[GIZLI-BLOK-${i}] START`);
                console.error(cleanScript.substring(0, 800)); // İlk 800 karakter
                if (cleanScript.length > 800) {
                    console.error(cleanScript.substring(800, 1600)); // Sonraki 800 karakter
                }
                console.error(`[GIZLI-BLOK-${i}] END`);
            }
        });

        // Alternatif: Direkt 'configs' veya 'sources' araması
        const configMatch = html.match(/var\s+configs\s*=\s*({.*?});/i);
        if (configMatch) {
            console.error(`[CONFIG-BULDUM] ${configMatch[1]}`);
        }

        return []; // Linki henüz dönmüyoruz, önce logları görmeliyiz

    } catch (err) {
        console.error(`[UNPACKER-KRITIK] ${err.message}`);
        return [];
    }
}

if (typeof module !== 'undefined') module.exports = { getStreams };
else globalThis.getStreams = getStreams;
