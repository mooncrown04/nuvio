/**
 * FullHD Scraper - Nuvio v2.0
 * Kısıtlamalar: async/await YASAK, Promise/then() ZORUNLU.
 */

var cheerio = require("cheerio-without-node-native");

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
        
        if (mediaType !== 'movie') return resolve([]);

        // 1. TMDB Sorgusu
        var tmdbUrl = 'https://api.themoviedb.org/3/movie/' + tmdbId + '?language=tr-TR&api_key=4ef0d7355d9ffb5151e987764708ce96';

        fetch(tmdbUrl)
            .then(function(res) { return res.json(); })
            .then(function(data) {
                var query = data.title;
                if (!query) throw new Error('Film adi bulunamadi');

                // 2. Sitede Arama
                var searchUrl = 'https://www.fullhdfilmizlesene.live/arama/' + encodeURIComponent(query);
                return fetch(searchUrl, { headers: { 'User-Agent': WORKING_HEADERS['User-Agent'] } });
            })
            .then(function(res) { return res.text(); })
            .then(function(html) {
                var $ = cheerio.load(html);
                var filmPageLink = $('li.film a').first().attr('href');

                if (!filmPageLink) return resolve([]);

                // 3. Film Sayfasına Gir ve Kaynağı Bul (3003 hatasını önleyen kısım)
                return fetch(filmPageLink, { headers: WORKING_HEADERS });
            })
            .then(function(res) { return res.text(); })
            .then(function(pageHtml) {
                var $ = cheerio.load(pageHtml);
                
                // Sitenin video oynatıcısını barındıran iframe'i yakala
                var iframeSrc = $('#player iframe').attr('src') || $('iframe').attr('src'); 

                if (!iframeSrc) return resolve([]);

                // Nuvio'nun beklediği zorunlu format
                var streams = [{
                    name: "FullHD - Otomatik",
                    title: "Movie Source Found",
                    url: iframeSrc,           // Artık sadece sayfa linki değil, video kaynağı
                    quality: "1080p",
                    headers: WORKING_HEADERS,  // Playback için zorunlu headerlar
                    provider: "fullhd_scraper" // manifest.json'daki id ile aynı olmalı
                }];

                resolve(streams);
            })
            .catch(function(err) {
                console.error('Scraper Hata:', err.message);
                resolve([]);
            });
    });
}

// React Native ve Sandbox uyumluluğu
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { getStreams: getStreams };
} else {
    global.getStreams = getStreams;
}
