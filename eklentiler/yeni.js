/**
 * JetFilmizle - Nuvio Ultra (v44 The Titan Reborn)
 * Sadece ham veriye ve _sd objesine odaklanır.
 * Altyazı desteği ve doğrudan stream_url yakalayıcı.
 */

var BASE_URL = 'https://jetfilmizle.net';
var TMDB_API_KEY = '500330721680edb6d5f7f12ba7cd9023';

async function getStreams(id, mediaType, season, episode) {
    try {
        const tmdbId = id.toString().replace(/[^0-9]/g, '');
        const tmdbType = (mediaType === 'tv') ? 'tv' : 'movie';
        const tmdbRes = await fetch(`https://api.themoviedb.org/3/${tmdbType}/${tmdbId}?api_key=${TMDB_API_KEY}&language=tr-TR`);
        const info = await tmdbRes.json();
        const slug = (info.name || info.title || "").toLowerCase().replace(/ğ/g,'g').replace(/ü/g,'u').replace(/ş/g,'s').replace(/ı/g,'i').replace(/ö/g,'o').replace(/ç/g,'c').replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'');

        const targetUrl = (mediaType === 'tv') 
            ? `${BASE_URL}/dizi/${slug}/sezon-${season}/bolum-${episode}`
            : `${BASE_URL}/film/${slug}`;

        // 1. ADIM: Sayfanın ham halini çek
        const pageRes = await fetch(targetUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } });
        const html = await pageRes.text();

        // 2. ADIM: Ham kaynak içinden Videopark ID'sini cımbızla çek (DFADX formatı)
        const titanIdMatch = html.match(/titan\/w\/([a-zA-Z0-9_-]+)/i) || html.match(/["'](DFADX[a-zA-Z0-9]+)["']/i);
        
        if (!titanIdMatch) {
            console.error("[TITAN] Sayfada ID bulunamadı, ham metin taraması yapılıyor...");
            // Eğer doğrudan ID yoksa, sayfadaki her türlü 'w/...' yapısını yakala
            const fallbackMatch = html.match(/\/w\/([a-zA-Z0-9]{10,15})/);
            if (fallbackMatch) titanIdMatch = [null, fallbackMatch[1]];
        }

        if (titanIdMatch) {
            const wId = titanIdMatch[1];
            const playerUrl = `https://videopark.top/titan/w/${wId}`;
            console.error(`[TITAN] Hedef: ${playerUrl}`);

            const response = await fetch(playerUrl, {
                headers: {
                    'Referer': BASE_URL,
                    'User-Agent': 'Mozilla/5.0'
                }
            });
            
            const playerHtml = await response.text();

            // 3. ADIM: _sd objesini parçala (Senin paylaştığın o meşhur yöntem)
            const sdMatch = playerHtml.match(/var\s+_sd\s*=\s*({[\s\S]*?});/);
            
            if (sdMatch) {
                const data = JSON.parse(sdMatch[1]);
                const streamUrl = data.stream_url;

                console.error(`[TITAN-SUCCESS] Kaynak Yakalandı!`);

                const subtitles = data.subtitles ? data.subtitles.map(s => ({
                    url: s.file,
                    language: s.label,
                    format: "vtt"
                })) : [];

                return [{
                    name: "Videopark (Jet-Titan)",
                    url: streamUrl,
                    type: "hls",
                    subtitles: subtitles,
                    headers: {
                        'Referer': 'https://videopark.top/',
                        'User-Agent': 'Mozilla/5.0'
                    }
                }];
            }
        }

        // Eğer hala bir şey bulamadıysak, son çare ham HTML içindeki _sd'ye bak
        const directSd = html.match(/var\s+_sd\s*=\s*({[\s\S]*?});/);
        if (directSd) {
            const data = JSON.parse(directSd[1]);
            return [{ name: "Jet-Direct", url: data.stream_url, type: "hls" }];
        }

        return [];
    } catch (err) {
        return [];
    }
}

module.exports = { getStreams };
