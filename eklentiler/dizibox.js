const puppeteer = require('puppeteer');

const BASE_URL = 'https://www.dizibox.live';

const HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
    'Accept-Language': 'tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7',
    'Referer': BASE_URL + '/'
};

const STREAM_HEADERS = {
    'User-Agent': HEADERS['User-Agent'],
    'Accept': 'video/webm,video/ogg,video/*;q=0.9,application/ogg;q=0.7,audio/*;q=0.6,*/*;q=0.5',
    'Accept-Language': 'tr-TR,tr;q=0.9',
    'Accept-Encoding': 'identity',
    'Origin': BASE_URL,
    'Referer': BASE_URL + '/',
    'Sec-Fetch-Dest': 'video',
    'Sec-Fetch-Mode': 'no-cors',
    'Sec-Fetch-Site': 'cross-site',
    'DNT': '1'
};

function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
    return new Promise(async (resolve) => {
        if (mediaType !== 'tv') return resolve([]);

        try {
            // TMDB’den dizi adı çek
            const tmdbUrl = `https://api.themoviedb.org/3/tv/${tmdbId}?api_key=4ef0d7355d9ffb5151e987764708ce96&language=tr-TR`;
            const tmdbRes = await fetch(tmdbUrl);
            const data = await tmdbRes.json();

            const title = data.name || data.original_name || '';
            if (!title) return resolve([]);

            const slug = title.toLowerCase().trim()
                .replace(/[^a-z0-9]+/g, '-')
                .replace(/^-+|-+$/g, '');

            const epUrl = `${BASE_URL}/${slug}-${seasonNum}-sezon-${episodeNum}-bolum-hd-izle/`;
            console.log('[DiziBox] Denenen URL:', epUrl);

            // Puppeteer ile sayfayı aç
            const browser = await puppeteer.launch({ headless: true });
            const page = await browser.newPage();
            await page.setExtraHTTPHeaders(HEADERS);
            await page.goto(epUrl, { waitUntil: 'networkidle2', timeout: 60000 });

            const html = await page.content();
            await browser.close();

            console.log('[DiziBox] HTML boyut:', html.length);

            if (html.length < 100000) {
                console.log('[DiziBox] Cloudflare engeli veya boş sayfa');
                return resolve([]);
            }

            // Video ID ara
            const match = html.match(/video_id["']?\s*[:=]\s*["']?(\d+)["']?/i);
            if (!match) {
                console.log('[DiziBox] Video ID bulunamadı');
                return resolve([]);
            }

            const videoId = match[1];
            const playerUrl = `${BASE_URL}/player/king.php?wmode=opaque&v=${videoId}`;

            resolve([{
                name: '⌜ DiziBox ⌟ | King Player',
                title: `Bölüm ${episodeNum}`,
                url: playerUrl,
                quality: '1080p',
                headers: STREAM_HEADERS,
                provider: 'dizibox'
            }]);
        } catch (err) {
            console.error('[DiziBox] Hata:', err);
            resolve([]);
        }
    });
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { getStreams };
} else {
    global.getStreams = getStreams;
}
