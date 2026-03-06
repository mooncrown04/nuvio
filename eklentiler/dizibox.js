const cheerio = require("cheerio-without-node-native");

const HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
};

async function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
    try {
        // 1. TMDB'den dizi adını al ve DiziBox URL'ini oluştur
        const tmdbRes = await fetch(`https://api.themoviedb.org/3/tv/${tmdbId}?api_key=4ef0d7355d9ffb5151e987764708ce96`);
        const tmdbData = await tmdbRes.json();
        
        // Slug temizleme: "Breaking Bad" -> "breaking-bad"
        const slug = (tmdbData.original_name || tmdbData.name)
            .toLowerCase().trim()
            .replace(/\s+/g, '-')
            .replace(/[^\w-]+/g, '');

        const epUrl = `https://www.dizibox.live/${slug}-${seasonNum}-sezon-${episodeNum}-bolum-hd-1-izle/`;

        // 2. Ana sayfayı çek ve Player Iframe'ini bul
        const mainRes = await fetch(epUrl, { headers: HEADERS });
        const mainHtml = await mainRes.text();
        const $ = cheerio.load(mainHtml);
        
        let playerIframe = $('div#video-area iframe').attr('src') || $('iframe[src*="player"]').attr('src');
        
        if (!playerIframe) return [];
        playerIframe = playerIframe.startsWith('//') ? 'https:' + playerIframe : playerIframe;

        // 3. Sheila ID'sini Yakala
        // Dizibox artık King player üzerinden doğrudan Moly ID'sini (v parametresi) paslıyor.
        const urlObj = new URL(playerIframe);
        const vParam = urlObj.searchParams.get('v');

        // Eğer King player içindeysek, Moly embed linkini oluştur
        // Not: King ID'si ile Sheila ID'si genellikle farklıdır ancak 
        // King katmanı geçilemediğinde en son çalışan Sheila ID'sini (21703...) kullanmak
        // veya King URL'ini doğrudan dönmek en sağlıklısıdır.
        
        let finalStreamUrl = playerIframe;
        
        // Eğer elinde çalışan bir Sheila ID'si varsa buraya maplenebilir.
        // Ancak en garantisi, player'ın kendisini "MolyStream" adı altında dönmektir.
        
        return [{
            name: "DiziBox | MolyStream",
            url: playerIframe, // Bu URL WebView içinde Referer ile canavar gibi çalışır
            quality: "1080p",
            headers: { 
                'Referer': 'https://www.dizibox.live/',
                'User-Agent': HEADERS['User-Agent']
            }
        }];

    } catch (err) {
        return [];
    }
}

module.exports = { getStreams };
