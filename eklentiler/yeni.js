/**
 * JetFilmizle - Röntgen Modu
 * Tahmin yok, sadece ham veriyi dökme var.
 */

const BASE_URL = 'https://jetfilmizle.net';

async function getStreams(id, mediaType, season, episode) {
    const s = season || 1;
    const e = episode || 1;
    const url = `${BASE_URL}/dizi/cobra-kai`; 

    try {
        console.error(`[RONTGEN] Başlatılıyor: S${s} E${e}`);
        
        const response = await fetch(url);
        const html = await response.text();

        // 1. Token ve ID'leri al (Burası zaten çalışıyor)
        const token = html.match(/name="csrf-token"\s+content="([^"]+)"/i)?.[1];
        const filmId = html.match(/data-film-id=["'](\d+)["']/i)?.[1] || html.match(/name=["']film_id["']\s*value=["'](\d+)["']/i)?.[1];
        const btnMatch = html.match(new RegExp(`data-source-index=["'](\\d+)["'][^>]*data-season=["']${s}["']`, 'i'));

        if (!filmId || !btnMatch) {
            console.error("[RONTGEN-HATA] Ana sayfadan veri çekilemedi.");
            return [];
        }

        // 2. Jetplayer POST isteği
        const playerRes = await fetch(`${BASE_URL}/jetplayer`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
                'X-Requested-With': 'XMLHttpRequest',
                'X-CSRF-TOKEN': token,
                'Referer': url
            },
            body: `film_id=${filmId}&source_index=${btnMatch[1]}&player_type=dublaj&is_series=1`
        });

        const playerRaw = await playerRes.text();
        const iframeSrc = playerRaw.match(/src=['"]([^'"]+)['"]/i)?.[1];

        if (!iframeSrc) {
            console.error(`[RONTGEN-HAM-YANIT] ${playerRaw}`);
            return [];
        }

        // 3. ASIL RÖNTGEN BURADA: Videopark (veya diğer) sayfasının içine sızıyoruz
        const targetUrl = iframeSrc.startsWith('//') ? 'https:' + iframeSrc : iframeSrc;
        console.error(`[RONTGEN-HEDEF] Player Sayfası: ${targetUrl}`);

        const videoPageRes = await fetch(targetUrl);
        const videoPageHtml = await videoPageRes.text();

        // Sayfa içindeki tüm m3u8, mp4 veya 'file' içeren JS değişkenlerini döküyoruz
        console.error("--- HAM VERİ BAŞLANGICI ---");
        
        // Özellikle 'file', 'sources', 'playlist' kelimelerini ara
        const scripts = videoPageHtml.match(/<script\b[^>]*>([\s\S]*?)<\/script>/gm);
        scripts?.forEach((s, i) => {
            if (s.includes('file') || s.includes('source') || s.includes('m3u8')) {
                console.error(`[RONTGEN-JS-BLOK-${i}] ${s.substring(0, 500).replace(/\n/g, ' ')}...`);
            }
        });

        // Varsa meta etiketlerini dök
        const metaVideo = videoPageHtml.match(/<meta[^>]+content=["'](https?:\/\/[^"']+\.(?:m3u8|mp4)[^"']*)["']/gi);
        if (metaVideo) console.error(`[RONTGEN-META] ${metaVideo.join(' | ')}`);

        console.error("--- HAM VERİ BİTİŞİ ---");

        return []; // Sadece veri topluyoruz, henüz link döndürmüyoruz

    } catch (err) {
        console.error(`[RONTGEN-KRITIK] ${err.message}`);
        return [];
    }
}

if (typeof module !== 'undefined') module.exports = { getStreams };
else globalThis.getStreams = getStreams;
