var cheerio = require("cheerio-without-node-native");

const BASE_URL = 'https://www.dizibox.live';

const HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
    'Referer': BASE_URL + '/',
    'Cookie': 'LockUser=true; isTrustedUser=true; dbxu=1743289650198'
};

function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
    return new Promise(function(resolve, reject) {
        
        if (mediaType === 'movie') return resolve([]);

        var tmdbUrl = 'https://api.themoviedb.org/3/tv/' + tmdbId + '?language=tr-TR&api_key=4ef0d7355d9ffb5151e987764708ce96';

        fetch(tmdbUrl)
            .then(function(res) { return res.json(); })
            .then(function(data) {
                var query = data.original_name || data.name || '';
                console.log('[DiziBox] Aranan:', query);
                return fetch(BASE_URL + '/?s=' + encodeURIComponent(query), { headers: HEADERS });
            })
            .then(function(res) { return res.text(); })
            .then(function(html) {
                var $ = cheerio.load(html);
                
                // 1. ADIM: Arama sonucundan ana dizi sayfasını bul
                var firstLink = $('article.detailed-article a').first().attr('href') || 
                               $('.post-title a').first().attr('href');

                if (!firstLink) throw new Error("Dizi bulunamadı");

                // 2. ADIM: Bölüm sayfasını bul (DiziBox bazen URL'ye '-izle-2' ekler)
                // Bu yüzden doğrudan URL tahmin etmek yerine dizi sayfasına gidip bölümü oradan seçiyoruz
                console.log('[DiziBox] Dizi Sayfası:', firstLink);
                return fetch(firstLink, { headers: HEADERS });
            })
            .then(function(res) { return res.text(); })
            .then(function(diziHtml) {
                var $ = cheerio.load(diziHtml);
                var targetEpUrl = '';

                // Sayfa içindeki tüm linklerde Sezon ve Bölüm numarasını ara
                $('a').each(function() {
                    var href = $(this).attr('href') || '';
                    var text = $(this).text().toLowerCase();
                    if (href.includes(seasonNum + '-sezon') && href.includes(episodeNum + '-bolum')) {
                        targetEpUrl = href;
                        return false; // Döngüden çık
                    }
                });

                if (!targetEpUrl) throw new Error("Bölüm linki sayfa içinde bulunamadı");
                
                console.log('[DiziBox] Gerçek Bölüm Sayfası:', targetEpUrl);
                return fetch(targetEpUrl, { headers: HEADERS });
            })
            .then(function(res) { return res.text(); })
            .then(function(epHtml) {
                var $ = cheerio.load(epHtml);
                
                // 3. ADIM: Iframe Seçicilerini Genişletiyoruz
                var iframeUrl = $('#video-area iframe').attr('src') || 
                                $('iframe[src*="king"]').attr('src') || 
                                $('iframe[src*="moly"]').attr('src') ||
                                $('.video-content iframe').attr('src');

                if (!iframeUrl) throw new Error("Video oynatıcı bulunamadı");
                if (iframeUrl.startsWith('//')) iframeUrl = 'https:' + iframeUrl;

                console.log('[DiziBox] Iframe Çözülüyor:', iframeUrl);
                return fetch(iframeUrl, { headers: { 'Referer': BASE_URL + '/' } });
            })
            .then(function(res) { return res.text(); })
            .then(function(playerHtml) {
                var streams = [];
                
                // M3U8 Regex (Dizipal'deki çalışan mantık)
                var m3u8Match = playerHtml.match(/file\s*:\s*["']([^"']+\.m3u8[^"']*)["']/i);
                
                if (!m3u8Match) {
                    // Alternatif: unescape edilmiş m3u8 ara
                    var decoded = decodeURIComponent(playerHtml);
                    m3u8Match = decoded.match(/file\s*:\s*["']([^"']+\.m3u8[^"']*)["']/i);
                }

                if (m3u8Match) {
                    streams.push({
                        name: "⌜ DiziBox ⌟ | King Sunucu",
                        url: m3u8Match[1],
                        quality: "1080p",
                        headers: { 
                            'Referer': BASE_URL + '/',
                            'User-Agent': HEADERS['User-Agent']
                        },
                        provider: "dizibox"
                    });
                }

                resolve(streams);
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
