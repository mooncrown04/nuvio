/**
 * FullHD Scraper - Nuvio v2.0
 * Kısıtlamalar: async/await YASAK, Promise ve .then() ZORUNLU.
 */

var cheerio = require("cheerio-without-node-native");

// Nuvio dökümantasyonundaki gerçek çalışan header örneği
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
        
        if (mediaType !== 'movie') {
            console.log('FullHD: Sadece film desteklenir.');
            return resolve([]);
        }

        // 1. ADIM: TMDB'den film adını al
        var tmdbUrl = 'https://api.themoviedb.org/3/movie/' + tmdbId + '?language=tr-TR&api_key=4ef0d7355d9ffb5151e987764708ce96';

        fetch(tmdbUrl)
            .then(function(res) { return res.json(); })
            .then(function(data) {
                var movieTitle = data.title;
                if (!movieTitle) throw new Error('Film adi bulunamadi');

                // 2. ADIM: Sitede arama yap
                var searchUrl = 'https://www.fullhdfilmizlesene.live/arama/' + encodeURIComponent(movieTitle);
                return fetch(searchUrl, { headers: { 'User-Agent': WORKING_HEADERS['User-Agent'] } });
            })
            .then(function(res) { return res.text(); })
            .then(function(html) {
                var $ = cheerio.load(html);
                var filmLink = $('li.film a').first().attr('href');

                if (!filmLink) {
                    console.log('FullHD: Film sonuc sayfasinda bulunamadi.');
                    return resolve([]);
                }

                // 3. ADIM: Film sayfasının içine gir (Extractor Aşaması)
                return fetch(filmLink, { headers: WORKING_HEADERS });
            })
            .then(function(res) { return res.text(); })
            .then(function(pageHtml) {
                var $ = cheerio.load(pageHtml);
                
                // NOT: Gerçek bir akış için iframe veya video kaynağı (m3u8) aranır.
                // Sitenin kullandığı yaygın bir seçiciyi (iframe) hedefliyoruz.
                var videoSource = $('#player iframe').attr('src') || $('iframe').attr('src'); 

                if (!videoSource) {
                    console.log('FullHD: Video kaynagi tespit edilemedi.');
                    return resolve([]);
                }

                // 4. ADIM: Dökümantasyona uygun Stream Objesi oluştur
                var streams = [{
                    name: "FullHD - Otomatik Sunucu",   // Provider + server name
                    title: "Film Kaynagi Bulundu",     // Media title
                    url: videoSource,                  // Direct stream URL
                    quality: "1080p",                  // Quality
                    size: "Unknown",                   // Optional file size
                    headers: WORKING_HEADERS,          // Required headers for playback
                    provider: "fullhd_scraper"         // Provider identifier
                }];

                console.log('FullHD: Islem basariyla tamamlandi.');
                resolve(streams);
            })
            .catch(function(err) {
                console.log('FullHD Hata: ' + err.message);
                resolve([]); // Hata durumunda boş dizi dönmek zorunludur
            });
    });
}

// React Native ve Sandbox uyumluluğu için export bloğu
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { getStreams: getStreams };
} else {
    global.getStreams = getStreams;
}
