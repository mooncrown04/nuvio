var cheerio = require("cheerio-without-node-native");

function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
    return new Promise(function(resolve, reject) {
        // TERMINALDE BU SATIRI GÖRMELİSİN
        console.log('!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!');
        console.log('FullHD_LOG: Eklenti Simdi Calisti | ID: ' + tmdbId);
        console.log('!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!');

        if (mediaType !== 'movie') {
            console.log('FullHD_LOG: Sadece film destekleniyor.');
            return resolve([]);
        }

        // TMDB Sorgusu (API Anahtarını ve URL'yi kontrol ettim, doğru)
        var tmdbUrl = 'https://api.themoviedb.org/3/movie/' + tmdbId + '?language=tr-TR&api_key=4ef0d7355d9ffb5151e987764708ce96';

        console.log('FullHD_LOG: TMDB Baglantisi Kuruluyor: ' + tmdbUrl);

        fetch(tmdbUrl)
            .then(function(res) { 
                console.log('FullHD_LOG: TMDB Cevap Verdi. Status: ' + res.status);
                return res.json(); 
            })
            .then(function(data) {
                var movieTitle = data.title;
                console.log('FullHD_LOG: Aranan Film: ' + movieTitle);

                if (!movieTitle) {
                    console.log('FullHD_LOG: Film adi bulunamadi, durduruldu.');
                    return resolve([]);
                }

                var searchUrl = 'https://www.fullhdfilmizlesene.live/arama/' + encodeURIComponent(movieTitle);
                console.log('FullHD_LOG: Siteye Gidiliyor: ' + searchUrl);

                return fetch(searchUrl, {
                    headers: { 'User-Agent': 'Mozilla/5.0' }
                });
            })
            .then(function(res) { return res.text(); })
            .then(function(html) {
                console.log('FullHD_LOG: Arama sayfasi alindi. Link taranıyor...');
                var $ = cheerio.load(html);
                var filmLink = $('li.film a').first().attr('href');

                if (!filmLink) {
                    console.log('FullHD_LOG: Sitede bu film bulunamadi.');
                    return resolve([]);
                }

                console.log('FullHD_LOG: Bulunan Film Sayfasi: ' + filmLink);
                // Burada simdilik duruyorum, amacimiz buraya kadar gelmek.
                resolve([]); 
            })
            .catch(function(err) {
                console.log('FullHD_LOG: KRITIK HATA: ' + err.message);
                resolve([]);
            });
    });
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { getStreams: getStreams };
} else {
    global.getStreams = getStreams;
}
