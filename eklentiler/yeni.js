/**
 * JetFilmizle - Röntgen v2 (Hata Düzeltildi)
 */

const BASE_URL = 'https://jetfilmizle.net';

async function getStreams(id, mediaType, season, episode) {
    const s = season || 1;
    const e = episode || 1;
    const url = `${BASE_URL}/dizi/cobra-kai`; 

    try {
        const response = await fetch(url);
        const html = await response.text();

        const token = html.match(/name="csrf-token"\s+content="([^"]+)"/i)?.[1];
        const filmId = html.match(/data-film-id=["'](\d+)["']/i)?.[1] || html.match(/name=["']film_id["']\s*value=["'](\d+)["']/i)?.[1];
        const btnMatch = html.match(new RegExp(`data-source-index=["'](\\d+)["'][^>]*data-season=["']${s}["']`, 'i'));

        if (!filmId || !btnMatch) return [];

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

        let playerRaw = await playerRes.text();
        console.error(`[RONTGEN-GELEN-HAM] ${playerRaw}`);

        // EĞER GELEN VERİ SADECE BİR YOL İSE (Örn: /public/embed.js)
        let targetUrl = "";
        if (playerRaw.trim().startsWith('/') && !playerRaw.includes('<iframe')) {
            targetUrl = BASE_URL + playerRaw.trim();
        } else {
            // EĞER GELEN VERİ HTML İSE İÇİNDEKİ SRC'Yİ AL
            const m = playerRaw.match(/src=['"]([^'"]+)['"]/i);
            if (m) {
                targetUrl = m[1].startsWith('/') ? BASE_URL + m[1] : m[1];
            }
        }

        if (!targetUrl) {
            console.error("[RONTGEN] Hedef URL belirlenemedi.");
            return [];
        }

        console.error(`[RONTGEN-HEDEF] Sızılıyor: ${targetUrl}`);

        const targetRes = await fetch(targetUrl);
        const targetContent = await targetRes.text();

        console.error("--- VERİ DÖKÜMÜ BAŞLADI ---");
        // Logcat'te satır sınırı olduğu için veriyi parçalara bölerek basıyoruz
        const parts = targetContent.match(/.{1,800}/g);
        parts?.forEach((part, i) => {
            console.error(`[PART-${i}] ${part.replace(/\n/g, ' ')}`);
        });
        console.error("--- VERİ DÖKÜMÜ BİTTİ ---");

        return []; 

    } catch (err) {
        console.error(`[RONTGEN-HATA] ${err.message}`);
        return [];
    }
}

if (typeof module !== 'undefined') module.exports = { getStreams };
else globalThis.getStreams = getStreams;
