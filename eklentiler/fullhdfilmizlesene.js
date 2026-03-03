var cheerio = require("cheerio-without-node-native");

// Dökümantasyonda belirtilen gerçek çalışan header yapısı
const WORKING_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    'Accept': 'video/webm,video/ogg,video/*;q=0.9,application/ogg;q=0.7,audio/*;q=0.6,*/*;q=0.5',
    'Accept-Language': 'en-US,en;q=0.9',
    'Accept-Encoding': 'identity',
    'Origin': 'https://www.fullhdfilmizlesene.live',
    'Referer': 'https://www.fullhdfilmizlesene.live/',
    'Sec-Fetch-Dest': 'video',
    'Sec-Fetch-Mode': 'no-cors',
    'Sec-Fetch-Site': 'cross-site',
    'DNT': '1'
};

function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
    return new Promise(function(resolve, reject) {
        
        console.log('FullHD_LOG: İşlem Başladı | ID: ' + tmdbId);

        // Nuvio sadece Promise-based yaklaşımı destekler
        if (mediaType !== 'movie') {
            console.log('FullHD_LOG: Bu scraper sadece film destekler.');
            return resolve([]);
        }

        var tmdbUrl = 'https://api.themoviedb.org/3/movie/' + tmdbId + '?language=tr-TR&api_key=4ef0d7355d9ffb5151e987764708ce96';

        fetch(tmdbUrl)
            .then(function(res) { return res.json(); })
            .then(function(data) {
                var movieTitle = data.title;
                if (!movieTitle) throw new Error('Film adı bulunamadı');

                var searchUrl = 'https://www.fullhdfilmizlesene.live/arama/' + encodeURIComponent(movieTitle);
                return fetch(searchUrl, { headers: { 'User-Agent': WORKING_HEADERS['User-Agent'] } });
            })
            .then(function(res) { return res.text(); })
            .then(function(html) {
                var $ = cheerio.load(html);
                var filmLink = $('li.film a').first().attr('href');

                if (!filmLink) {
                    console.log('FullHD_LOG: Film bulunamadı.');
                    return resolve([]);
                }

                // BURASI ÖNEMLİ: Nuvio'nun beklediği Stream Objesi Formatı
                var streams = [];
                streams.push({
                    name: "FullHD - VIP Server",       // Sunucu adı
                    title: "Film Linki Bulundu",       // Başlık
                    url: filmLink,                      // Şimdilik sayfa linki (Buraya video linki gelecek)
                    quality: "1080p",                  // Kalite
                    size: "Unknown",                   // Opsiyonel
                    headers: WORKING_HEADERS,           // Oynatma için gerekli headerlar
                    provider: "fullhd_scraper"          // Manifest'teki ID ile aynı olmalı
                });

                console.log('FullHD_LOG: Stream objesi oluşturuldu.');
                resolve(streams);
            })
            .catch(function(err) {
                console.log('FullHD_LOG: Hata: ' + err.message);
                resolve([]); // Hata anında boş dizi
            });
    });
}

// React Native ve Sandbox uyumluluğu için export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { getStreams: getStreams };
} else {
    global.getStreams = getStreams;
}
