/**
 * JetFilmizle - Videopark "Titan" MoOnCrOwN V34
 * Dinamik Sezon/Bölüm Takibi ve Titan Hash Avcısı
 */

async function getStreams(id, mediaType, season, episode) {
    const BASE_URL = "https://jetfilmizle.net";
    const TMDB_API = "https://api.themoviedb.org/3";
    const API_KEY  = "500330721680edb6d5f7f12ba7cd9023";

    try {
        // 1. TMDB'den doğru ismi alıp slug yapıyoruz
        const type = (mediaType === 'tv') ? 'tv' : 'movie';
        const tmdbRes = await fetch(`${TMDB_API}/${type}/${id}?api_key=${API_KEY}&language=tr-TR`);
        const info = await tmdbRes.json();
        const title = info.name || info.title;
        
        const slug = title.toLowerCase()
            .replace(/ğ/g,'g').replace(/ü/g,'u').replace(/ş/g,'s')
            .replace(/ı/g,'i').replace(/İ/g,'i').replace(/ö/g,'o')
            .replace(/ç/g,'c').replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'');

        // 2. O bölüme özel Jetfilm sayfa URL'sini oluşturuyoruz
        const targetUrl = (mediaType === 'tv') 
            ? `${BASE_URL}/dizi/${slug}/${season}-sezon-${episode}-bolum`
            : `${BASE_URL}/film/${slug}`;

        console.error(`[V34] Sayfa taranıyor: ${targetUrl}`);

        const pageRes = await fetch(targetUrl, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Linux; Android 10)', 'Referer': BASE_URL + '/' }
        });
        const html = await pageRes.text();

        // 3. KRİTİK NOKTA: Sayfa içindeki Titan Hash'ini (DFADX... gibi olanı) buluyoruz
        const titanHashMatch = html.match(/videopark\.top\/titan\/w\/([a-zA-Z0-9_-]+)/);
        
        if (!titanHashMatch) {
            console.error("[V34] Titan Hash bulunamadı! Sayfa boyutu: " + html.length);
            return [];
        }

        const foundHash = titanHashMatch[1]; // O bölüme özel hash artık elimizde
        const playerUrl = `https://videopark.top/titan/w/${foundHash}`;

        console.error(`[V34] Dinamik Link Üretildi: ${playerUrl}`);

        // 4. Senin verdiğin Bypass mantığı başlıyor
        const response = await fetch(playerUrl, {
            headers: {
                'Referer': 'https://jetfilmizle.net/',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
            }
        });
        
        const playerHtml = await response.text();
        const sdMatch = playerHtml.match(/var\s+_sd\s*=\s*({[\s\S]*?});/);
        
        if (sdMatch) {
            const data = JSON.parse(sdMatch[1]);
            const streamUrl = data.stream_url;

            const subtitles = data.subtitles ? data.subtitles.map(s => ({
                url: s.file,
                language: s.label,
                format: "vtt"
            })) : [];

            return [{
                name: "JetFilmizle (Titan)",
                title: `⌜ MoOnCrOwN ⌟ | S${season} E${episode}`,
                url: streamUrl,
                type: "hls",
                subtitles: subtitles,
                headers: {
                    'Referer': 'https://videopark.top/',
                    'User-Agent': 'Mozilla/5.0'
                }
            }];
        }

        return [];

    } catch (err) {
        console.error(`[V34-HATA] ${err.message}`);
        return [];
    }
}

// Nuvio/Cloudstream Export
if (typeof module !== 'undefined') module.exports = { getStreams };
else globalThis.getStreams = getStreams;
