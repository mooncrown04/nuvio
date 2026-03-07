var cheerio = require("cheerio-without-node-native");

var BASE_URL = 'https://www.dizibox.live';

function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
    return new Promise(function(resolve, reject) {
        if (mediaType !== 'tv') return resolve([]);

        console.log('\n--- [DEBUG BAŞLADI] ---');
        console.log('TMDB ID:', tmdbId);
        
        // 1. TMDB'den isim çekme
        var tmdbUrl = 'https://api.themoviedb.org/3/tv/' + tmdbId + '?language=tr-TR&api_key=4ef0d7355d9ffb5151e987764708ce96';

        fetch(tmdbUrl)
            .then(function(res) { return res.json(); })
            .then(function(data) {
                var query = data.name || data.original_name;
                console.log('1. TMDB İsim Bulundu:', query);

                // 2. Arama yapma
                var searchUrl = BASE_URL + '/?s=' + encodeURIComponent(query);
                console.log('2. Arama Yapılıyor:', searchUrl);

                return fetch(searchUrl, { 
                    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' } 
                });
            })
            .then(function(res) { return res.text(); })
            .then(function(html) {
                var $ = cheerio.load(html);
                var firstResult = $('.post-content h2 a').first().attr('href');
                
                if (!firstResult) {
                    console.log('HATA: Arama sonucu bulunamadı (HTML yapısı değişmiş olabilir)');
                    return resolve([]);
                }
                console.log('3. İlk Arama Sonucu:', firstResult);

                // 4. Bölüm URL'si oluşturma
                var slug = firstResult.replace(BASE_URL, '').replace('/dizi/', '').replace(/\//g, '');
                var targetUrl = BASE_URL + '/' + slug + '-' + seasonNum + '-sezon-' + episodeNum + '-bolum-hd-1-izle/';
                console.log('4. Hedef Bölüm URL:', targetUrl);

                return fetch(targetUrl, { 
                    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36', 'Referer': BASE_URL } 
                });
            })
            .then(function(res) {
                console.log('5. Bölüm Sayfası Yanıt Kodu:', res.status);
                return res.text();
            })
            .then(function(html) {
                var $ = cheerio.load(html);
                var iframe = $('div#video-area iframe').attr('src') || $('iframe[src*="player"]').attr('src');

                if (iframe) {
                    if (iframe.startsWith('//')) iframe = 'https:' + iframe;
                    console.log('BAŞARI: Iframe Bulundu:', iframe);
                    
                    resolve([{
                        name: "DiziBox",
                        url: iframe,
                        quality: "1080p",
                        provider: "dizibox"
                    }]);
                } else {
                    console.log('HATA: Sayfa yüklendi ama içinde Iframe (video) bulunamadı.');
                    resolve([]);
                }
            })
            .catch(function(err) {
                console.log('KRİTİK HATA:', err.message);
                resolve([]);
            });
    });
}

// TEST ÇALIŞTIRMASI (Terminal için)
getStreams('1396', 'tv', '1', '1').then(function(res) {
    console.log('\n--- [SONUÇ] ---');
    console.log(JSON.stringify(res, null, 2));
});

module.exports = { getStreams: getStreams };
