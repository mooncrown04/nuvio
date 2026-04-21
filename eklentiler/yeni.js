/**
 * JetFilmizle - Nuvio Provider
 * GİZLİ VERİ AVCI MODU (Sıfır API, %100 HTML Scan)
 */

const BASE_URL = 'https://jetfilmizle.net';

async function getStreams(id, mediaType, season, episode) {
    const s = season || 1;
    const e = episode || 1;
    const url = `${BASE_URL}/dizi/cobra-kai`;

    console.error(`[AVCI] Tarama Başladı: S${s} E${e}`);

    try {
        const response = await fetch(url);
        const html = await response.text();

        // 1. ADIM: Hedef indexi buton üzerinden yakala (Senin logdaki 21)
        const btnRegex = new RegExp(`data-source-index=["'](\\d+)["'][^>]*data-season=["']${s}["'][^>]*data-episode=["']${e}["']`, 'i');
        const btnMatch = html.match(btnRegex);
        if (!btnMatch) {
            console.error('[AVCI-HATA] Buton bulunamadı.');
            return [];
        }
        const sourceIndex = btnMatch[1];
        console.error(`[AVCI-HEDEF] Index bulundu: ${sourceIndex}`);

        // 2. ADIM: Sayfa içindeki TÜM tırnak içindeki uzun Base64 stringlerini topla
        // JetFilm artık 'player_sources' ismini kullanmıyor olabilir, bu yüzden 'kör tarama' yapıyoruz.
        const b64Regex = /["']([A-Za-z0-9+/]{50,}=*)["']/g;
        let match;
        let foundLinks = [];

        while ((match = b64Regex.exec(html)) !== null) {
            try {
                const decoded = atob(match[1]);
                // Eğer çözülen metin bir video hostu içeriyorsa listeye ekle
                if (decoded.includes('http') && (decoded.includes('pixeldrain') || decoded.includes('vidmoly') || decoded.includes('ok.ru'))) {
                    foundLinks.push(decoded);
                }
            } catch (e) { /* Base64 değilse geç */ }
        }

        console.error(`[AVCI-BİLGİ] Toplam ${foundLinks.length} potansiyel kaynak deşifre edildi.`);

        // 3. ADIM: İndex ile eşleşen linki seç
        // JetFilm'de butonlardaki index (21), sayfadaki gizli linklerin sırasıyla birebir eşleşir.
        const finalUrl = foundLinks[sourceIndex];

        if (finalUrl) {
            console.error(`[AVCI-BAŞARI] Link Yakalandı: ${finalUrl}`);
            return [{
                name: "JetFilmizle",
                title: `S${s} E${e} (Kaynak: ${sourceIndex})`,
                url: finalUrl,
                type: "embed"
            }];
        }

        // Eğer index tutmazsa tüm bulunanları göster (Yedek Plan)
        if (foundLinks.length > 0) {
            return foundLinks.slice(0, 3).map((link, i) => ({
                name: "JetFilm - Otomatik",
                title: `S${s} E${e} (Alt ${i + 1})`,
                url: link,
                type: "embed"
            }));
        }

        console.error('[AVCI-HATA] Hiçbir geçerli link deşifre edilemedi.');
        return [];

    } catch (err) {
        console.error(`[AVCI-KRİTİK] ${err.message}`);
        return [];
    }
}

if (typeof module !== 'undefined') module.exports = { getStreams };
else globalThis.getStreams = getStreams;
