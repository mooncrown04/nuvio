const cheerio = require("cheerio-without-node-native");

const BASE_URL = 'https://www.dizibox.live';

const HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    'Referer': BASE_URL + '/',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
};

function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
    return new Promise(function(resolve, reject) {
        console.log('[DiziBox] İstek Başladı:', tmdbId, 'S:', seasonNum, 'E:', episodeNum);

        // 1. TMDB Bilgilerini Al
        const tmdbType = mediaType === 'movie' ? 'movie' : 'tv';
        const tmdbUrl = `https://api.themoviedb.org/3/${tmdbType}/${tmdbId}?language=tr-TR&api_key=4ef0d7355d9ffb5151e987764708ce96`;

        fetch(tmdbUrl)
            .then(function(res) { return res.json(); })
            .then(function(data) {
                const title = data.name || data.title || '';
                const year = (data.first_air_date || data.release_date || '').substring(0, 4);
                
                // URL için slug oluştur (Örn: "Breaking Bad" -> "breaking-bad")
                const slug = (data.original_name || data.original_title || title)
                    .toLowerCase().trim()
                    .replace(/\s+/g, '-')
                    .replace(/[^\w-]+/g, '');

                // 2. DiziBox Bölüm URL'sini oluştur
                let epUrl = '';
                if (mediaType === 'movie') {
                    epUrl = `${BASE_URL}/${slug}-izle/`;
                } else {
                    epUrl = `${BASE_URL}/${slug}-${seasonNum}-sezon-${episodeNum}-bolum-hd-1-izle/`;
                }
                
                console.log('[DiziBox] Hedef URL:', epUrl);
                return fetch(epUrl, { headers: HEADERS })
                    .then(function(res) { return res.text(); })
                    .then(function(html) { return { html, title, year }; });
            })
            .then(function(obj) {
                const $ = cheerio.load(obj.html);
                
                // 3. Iframe'i Yakala
                let playerSrc = $('div#video-area iframe').attr('src') || $('iframe[src*="player"]').attr('src');
                
                if (!playerSrc) {
                    console.log('[DiziBox] Player bulunamadı.');
                    return resolve([]);
                }
                playerSrc = playerSrc.startsWith('//') ? 'https:' + playerSrc : playerSrc;

                // 4. Arayüzün beklediği o meşhur NESNE yapısı
                const streams = [];
                
                streams.push({
                    name: '⌜ DiziBox ⌟ | MolyStream',
                    title: obj.title + (obj.year ? ' (' + obj.year + ')' : '') + ' · 1080p',
                    url: playerSrc, // WebView bunu çözecektir
                    quality: '1080p',
                    size: 'Auto',
                    headers: {
                        'Referer': BASE_URL + '/',
                        'User-Agent': HEADERS['User-Agent']
                    },
                    subtitles: [],
                    provider: 'dizibox'
                });

                console.log('[DiziBox] Sonuç arayüze gönderiliyor.');
                resolve(streams);
            })
            .catch(function(err) {
                console.error('[DiziBox] Hata:', err.message);
                resolve([]);
            });
    });
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { getStreams: getStreams };
} else {
    global.getStreams = getStreams;
}
