var cheerio = require("cheerio-without-node-native");

// Dizibox bazen .tv bazen .org olur, güncel domaini buraya yazmalısın
var BASE_URL = 'https://www.dizibox.tv'; 

var HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    'Referer': BASE_URL + '/',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8'
};

function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
    return new Promise(function(resolve, reject) {
        if (mediaType !== 'tv') return resolve([]);

        // 1. TMDB'den ismi al
        var tmdbUrl = 'https://api.themoviedb.org/3/tv/' + tmdbId + '?language=tr-TR&api_key=4ef0d7355d9ffb5151e987764708ce96';

        fetch(tmdbUrl, { timeout: 10000 }) // Lite için timeout ekledik
            .then(function(res) { return res.json(); })
            .then(function(data) {
                var query = data.name || '';
                // 2. Sitede arama yap (Doğrudan URL oluşturmak yerine arama daha sağlamdır)
                var searchUrl = BASE_URL + '/?s=' + encodeURIComponent(query);
                console.log('[Dizibox] Aranıyor:', query);
                return fetch(searchUrl, { headers: HEADERS, timeout: 15000 });
            })
            .then(function(res) { return res.text(); })
            .then(function(html) {
                var $ = cheerio.load(html);
                // Arama sonuçlarından ilk diziyi yakala
                var firstMatch = $('.post-title a').first().attr('href');
                
                if (!firstMatch) throw new Error('Dizi bulunamadı');

                // 3. Bölüm URL'sini oluştur
                // Genelde: domain.com/dizi-adi/sezon-1/bolum-1.html veya benzeri
                var episodeUrl = firstMatch.replace(/\/$/, '') + '-sezon-' + seasonNum + '-bolum-' + episodeNum + '-izle/';
                console.log('[Dizibox] Hedef URL:', episodeUrl);
                
                return fetch(episodeUrl, { headers: HEADERS, timeout: 15000 });
            })
            .then(function(res) { return res.text(); })
            .then(function(epHtml) {
                var $ = cheerio.load(epHtml);
                var streams = [];

                // 4. Iframe veya Vidmoly linklerini ayıkla
                // Dizibox'ın player yapısı karmaşıktır, iframe'leri tarayalım
                $('iframe').each(function() {
                    var src = $(this).attr('src') || '';
                    if (src.includes('vidmoly') || src.includes('dizibox')) {
                        streams.push({
                            name: 'Dizibox - Kaynak',
                            url: src.startsWith('//') ? 'https:' + src : src,
                            quality: 'Auto',
                            headers: { 'Referer': BASE_URL }
                        });
                    }
                });

                resolve(streams);
            })
            .catch(function(err) {
                console.error('[Dizibox] Hata:', err.message);
                resolve([]);
            });
    });
}

module.exports = { getStreams: getStreams };
