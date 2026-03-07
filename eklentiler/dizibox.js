var cheerio = require("cheerio-without-node-native");

// Eğer .tv hata veriyorsa .org veya güncel uzantıyı deneyin
var BASE_URL = 'https://www.dizibox.tv'; 

var HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    'Referer': BASE_URL + '/',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8'
};

function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
    return new Promise(function(resolve, reject) {
        if (mediaType !== 'tv') return resolve([]);

        // TMDB İsteği (Genelde bu kısım sertifika hatası vermez)
        var tmdbUrl = 'https://api.themoviedb.org/3/tv/' + tmdbId + '?language=tr-TR&api_key=4ef0d7355d9ffb5151e987764708ce96';

        fetch(tmdbUrl)
            .then(function(res) { return res.json(); })
            .then(function(data) {
                var query = data.name || '';
                // Sertifika hatasını aşmak için: Arama işlemini "http" üzerinden dene (Lite cihazlarda işe yarayabilir)
                var searchUrl = BASE_URL.replace('https', 'http') + '/?s=' + encodeURIComponent(query);
                
                return fetch(searchUrl, { headers: HEADERS });
            })
            .then(function(res) { return res.text(); })
            .then(function(html) {
                var $ = cheerio.load(html);
                var firstMatch = $('.post-title a').first().attr('href');
                
                if (!firstMatch) throw new Error('Dizi bulunamadı');

                var epUrl = firstMatch.replace(/\/$/, '') + '-sezon-' + seasonNum + '-bolum-' + episodeNum + '-izle/';
                
                return fetch(epUrl, { headers: HEADERS });
            })
            .then(function(res) { return res.text(); })
            .then(function(epHtml) {
                var $ = cheerio.load(epHtml);
                var streams = [];

                // Dizibox Player'larını Yakala
                $('iframe').each(function() {
                    var src = $(this).attr('src') || '';
                    if (src.includes('vidmoly') || src.includes('dizibox')) {
                        // Linkleri temizle ve HTTPS'e geri döndür (Video player genelde HTTPS ister)
                        var finalUrl = src.startsWith('//') ? 'https:' + src : src;
                        streams.push({
                            name: 'Dizibox - ' + (src.includes('vidmoly') ? 'Vidmoly' : 'Kaynak'),
                            url: finalUrl,
                            quality: 'Auto',
                            headers: { 'Referer': BASE_URL }
                        });
                    }
                });

                resolve(streams);
            })
            .catch(function(err) {
                console.error('[Dizibox] Engel:', err.message);
                // Eğer hata "Trust anchor" ise kullanıcıya DNS/Saat uyarısı verilebilir
                resolve([]);
            });
    });
}

module.exports = { getStreams: getStreams };
