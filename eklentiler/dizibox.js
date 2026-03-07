async function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
    if (mediaType !== 'tv') return [];

    const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';

    try {
        // 1. TMDB Bilgisini çek
        const tmdbRes = await fetch(`https://api.themoviedb.org/3/tv/${tmdbId}?api_key=4ef0d7355d9ffb5151e987764708ce96&language=tr-TR`);
        const tmdbData = await tmdbRes.json();
        const showName = tmdbData.name;

        // 2. ADIM: Arama Sayfası üzerinden içerik arama (Genelde koruma daha zayıftır)
        const searchUrl = `https://www.dizibox.live/?s=${encodeURIComponent(showName)}`;
        const searchRes = await fetch(searchUrl, { headers: { 'User-Agent': UA } });
        const searchHtml = await searchRes.text();

        // 3. Bölüm Slug'ını manuel oluştur (Dizibox standardı)
        const slug = showName.toLowerCase().trim()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '');

        const epUrl = `https://www.dizibox.live/${slug}-${seasonNum}-sezon-${episodeNum}-bolum-hd-izle/`;

        // 4. KRİTİK: Player API'sine sızma denemesi
        // Eğer sayfa inmiyorsa, player'ın direkt URL yapısını tahmin ediyoruz.
        // Dizibox Player'ları genellikle TMDB ID veya belirli bir dizinle çalışmaz, 
        // ancak bazen iframe kaynakları statik kalır.
        
        const response = await fetch(epUrl, { headers: { 'User-Agent': UA, 'Referer': 'https://www.google.com/' } });
        const html = await response.text();
        const streams = [];

        // Regex ile video_id yakalama (Hem tırnaklı hem tırnaksız varyasyonlar)
        const idMatch = html.match(/video_id["']?\s*[:=]\s*["']?(\d+)["']?/i) || 
                        html.match(/data-id=["']?(\d+)["']?/i);

        if (idMatch) {
            streams.push({
                name: "DiziBox | King Player HD",
                url: `https://www.dizibox.live/player/king.php?v=${idMatch[1]}`,
                quality: "1080p",
                headers: { 'Referer': epUrl }
            });
        }

        // Alternatif: Vidmoly/Moly linklerini yakala
        const molyMatch = html.match(/https?:\/\/(?:www\.)?(?:vidmoly|moly)\.[a-z]+\/(?:embed-)?([a-z0-9]+)/gi);
        if (molyMatch) {
            molyMatch.forEach((m, i) => {
                streams.push({
                    name: `DiziBox | Kaynak #${i + 1}`,
                    url: m.startsWith('//') ? 'https:' + m : m,
                    quality: "720p",
                    headers: { 'Referer': epUrl }
                });
            });
        }

        return streams;
    } catch (err) {
        return [];
    }
}

if (typeof exports !== 'undefined') exports.getStreams = getStreams;
if (typeof globalThis !== 'undefined') globalThis.getStreams = globalThis.getStreams || getStreams;
