var cheerio = require("cheerio-without-node-native");

const BASE_URL = 'https://www.dizibox.live';

const HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
    'Referer': BASE_URL + '/',
    'Accept-Language': 'tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7'
};

function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
    return new Promise(function(resolve, reject) {
        
        // DiziBox genellikle filmleri barındırmaz, ancak hata almamak için kontrolü esnetiyoruz
        var tmdbType = mediaType === 'movie' ? 'movie' : 'tv';
        var tmdbUrl = 'https://api.themoviedb.org/3/' + tmdbType + '/' + tmdbId + 
            '?language=tr-TR&api_key=4ef0d7355d9ffb5151e987764708ce96';

        fetch(tmdbUrl)
            .then(function(res) { return res.json(); })
            .then(function(data) {
                // Sitede daha iyi sonuç bulmak için hem Türkçe hem Orijinal ismi deneyeceğiz
                var title = data.name || data.title || '';
                var originalTitle = data.original_name || data.original_title || '';
                
                // Arama sorgusu (DiziBox orijinal isimleri daha iyi anlar)
                var query = originalTitle || title;
                console.log('[DiziBox] Aranıyor:', query);

                return fetch(BASE_URL + '/?s=' + encodeURIComponent(query), { headers: HEADERS });
            })
            .then(function(res) { 
                if (!res.ok) throw new Error('Arama isteği başarısız');
                return res.text(); 
            })
            .then(function(html) {
                var $ = cheerio.load(html);
                
                // Seçiciyi genişletiyoruz: Hem makale içindeki hem başlıktaki linkler
                var firstLink = $('article.detailed-article a').first().attr('href') || 
                               $('.post-title a').first().attr('href');

                if (!firstLink) {
                    console.log('[DiziBox] Sitede sonuç bulunamadı.');
                    return resolve([]);
                }

                var targetUrl = firstLink;

                // Sadece TV/Dizi ise bölüm yolunu ekle
                if (mediaType === 'tv' && seasonNum && episodeNum) {
                    targetUrl = firstLink.replace(/\/$/, "") + '-' + seasonNum + '-sezon-' + episodeNum + '-bolum-izle/';
                }

                console.log('[DiziBox] Hedef Sayfa:', targetUrl);
                return fetch(targetUrl, { headers: HEADERS });
            })
            .then(function(res) { 
                if (!res.ok) throw new Error('İçerik sayfası yüklenemedi');
                return res.text(); 
            })
            .then(function(pageHtml) {
                var $ = cheerio.load(pageHtml);
                var streams = [];

                // Player iframe'ini bulma (Dizipal'deki gibi çoklu kontrol)
                var playerIframe = $('#video-area iframe').attr('src') || 
                                  $('.video-toolbar option').first().val();

                if (!playerIframe) {
                    console.log('[DiziBox] Player bulunamadı.');
                    return resolve([]);
                }

                if (playerIframe.startsWith('//')) playerIframe = 'https:' + playerIframe;

                // Iframe'in içine girip gerçek m3u8/mp4 linkini ayıkla
                return fetch(playerIframe, { headers: { 'Referer': BASE_URL + '/' } })
                    .then(function(r) { return r.text(); })
                    .then(function(playerSource) {
                        // Regex ile link ayıklama
                        var fileMatch = playerSource.match(/file\s*:\s*["']([^"']+\.m3u8[^"']*)["']/i) || 
                                        playerSource.match(/["']?file["']?\s*[:=]\s*["']([^"']+)["']/i);

                        if (fileMatch) {
                            var streamUrl = fileMatch[1];
                            streams.push({
                                name: "DiziBox - " + (streamUrl.includes('m3u8') ? "HLS" : "MP4"),
                                url: streamUrl,
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
                console.log('[DiziBox] İşlem Sırasında Hata:', err.message);
                resolve([]);
            });
    });
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { getStreams: getStreams };
} else {
    global.getStreams = getStreams;
}
