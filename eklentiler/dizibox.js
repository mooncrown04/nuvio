const cheerio = require("cheerio-without-node-native");

const HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
};

async function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
    if (mediaType !== 'tv') return [];

    try {
        // 1. TMDB Bilgisi
        const tmdbRes = await fetch(`https://api.themoviedb.org/3/tv/${tmdbId}?api_key=4ef0d7355d9ffb5151e987764708ce96&language=tr-TR`);
        const tmdbData = await tmdbRes.json();
        
        const slug = (tmdbData.original_name || tmdbData.name)
            .toLowerCase().trim()
            .replace(/\s+/g, '-')
            .replace(/[^\w-]+/g, '');

        // Varyasyonları deniyoruz (Senin tarayıcıda çalışan format öncelikli)
        const urls = [
            `https://www.dizibox.live/${slug}-${seasonNum}-sezon-${episodeNum}-bolum-hd-izle/`,
            `https://www.dizibox.live/${slug}-${seasonNum}-sezon-${episodeNum}-bolum-hd-1-izle/`
        ];

        for (const epUrl of urls) {
            console.log(`[Dizibox] Deneniyor: ${epUrl}`);
            const mainRes = await fetch(epUrl, { headers: HEADERS });
            
            if (mainRes.status !== 200) continue;

            const mainHtml = await mainRes.text();
            const $ = cheerio.load(mainHtml);
            
            // Player'ı bulma: Farklı alanları kontrol ediyoruz
            let playerIframe = $('div#video-area iframe').attr('src') || 
                               $('iframe[src*="player"]').attr('src') ||
                               $('iframe[src*="king"]').attr('src');
            
            if (playerIframe) {
                playerIframe = playerIframe.startsWith('//') ? 'https:' + playerIframe : playerIframe;
                
                console.log(`[Dizibox] Player Bulundu: ${playerIframe}`);

                return [{
                    name: "DiziBox | MolyStream",
                    url: playerIframe,
                    quality: "1080p",
                    headers: { 
                        'Referer': 'https://www.dizibox.live/',
                        'User-Agent': HEADERS['User-Agent']
                    }
                }];
            }
        }

        return [];

    } catch (err) {
        console.log(`[Dizibox] Hata: ${err.message}`);
        return [];
    }
}

module.exports = { getStreams };
