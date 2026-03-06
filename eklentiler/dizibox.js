var cheerio = require("cheerio-without-node-native");

const BASE_URL = 'https://www.dizibox.live';

// En güncel ve çalışan header seti
const HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
    'Referer': BASE_URL + '/',
    'Accept-Language': 'tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7',
    'Cookie': 'LockUser=true; isTrustedUser=true; dbxu=1743289650198' // DiziBox için zorunlu çerez
};

function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
    return new Promise(function(resolve, reject) {
        
        // ÖNEMLİ: DiziBox'ta film yoktur. Eğer film istenirse direkt boş dön.
        if (mediaType === 'movie') {
            console.log('[DiziBox] Sadece diziler desteklenmektedir. Film sorgusu iptal edildi.');
            return resolve([]);
        }

        // 1. TMDB Bilgilerini Al (Sadece TV için)
        var tmdbUrl = 'https://api.themoviedb.org/3/tv/' + tmdbId + '?language=tr-TR&api_key=4ef0d7355d9ffb5151e987764708ce96';

        fetch(tmdbUrl)
            .then(function(res) { return res.json(); })
            .then(function(data) {
                var query = data.original_name || data.name || '';
                console.log('[DiziBox] Dizi Aranıyor:', query);

                // Arama sayfasına git
                return fetch(BASE_URL + '/?s=' + encodeURIComponent(query), { headers: HEADERS });
            })
            .then(function(res) { 
                if (!res.ok) throw new Error('DiziBox arama motoruna erişilemedi (Status: ' + res.status + ')');
                return res.text(); 
            })
            .then(function(html) {
                var $ = cheerio.load(html);
                
                // Dizi ana sayfasının linkini bul
                var firstLink = $('article.detailed-article a').first().attr('href') || 
                               $('.post-title a').first().attr('href');

                if (!firstLink) {
                    console.log('[DiziBox] Bu isimde bir dizi bulunamadı.');
                    return resolve([]);
                }

                // 2. Bölüm URL'sini oluştur
                // Örnek: https://www.dizibox.live/dizi/breaking-bad/ -> .../breaking-bad-1-sezon-1-bolum-izle/
                var cleanPath = firstLink.replace(/\/$/, "");
                var epUrl = cleanPath + '-' + seasonNum + '-sezon-' + episodeNum + '-bolum-izle/';
                
                console.log('[DiziBox] Bölüm Sayfasına Gidiliyor:', epUrl);
                return fetch(epUrl, { headers: HEADERS });
            })
            .then(function(res) { 
                if (!res.ok) throw new Error('Bölüm sayfası bulunamadı.');
                return res.text(); 
            })
            .then(function(pageHtml) {
                var $ = cheerio.load(pageHtml);
                var streams = [];

                // Video iframe'ini ayıkla
                var playerIframe = $('#video-area iframe').attr('src');

                if (!playerIframe) {
                    console.log('[DiziBox] Video oynatıcı (iframe) bulunamadı.');
                    return resolve([]);
                }

                if (playerIframe.startsWith('//')) playerIframe = 'https:' + playerIframe;

                // 3. Gerçek stream linkini bulmak için iframe'e git
                return fetch(playerIframe, { headers: { 'Referer': BASE_URL + '/' } })
                    .then(function(r) { return r.text(); })
                    .then(function(playerSource) {
                        
                        // m3u8 veya mp4 regex araması (Dizipal tarzı)
                        var fileMatch = playerSource.match(/file\s*:\s*["']([^"']+\.m3u8[^"']*)["']/i) || 
                                        playerSource.match(/file\s*:\s*["']([^"']+\.mp4[^"']*)["']/i);

                        if (fileMatch) {
                            streams.push({
                                name: "DiziBox - " + (fileMatch[1].includes('m3u8') ? "HLS" : "MP4"),
                                url: fileMatch[1],
                                quality: "1080p",
                                headers: { 
                                    'Referer': playerIframe,
                                    'User-Agent': HEADERS['User-Agent']
                                },
                                provider: "dizibox"
                            });
                        }
                        resolve(streams);
                    });
            })
            .catch(function(err) {
                console.log('[DiziBox] Hata:', err.message);
                resolve([]);
            });
    });
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { getStreams: getStreams };
} else {
    global.getStreams = getStreams;
}
