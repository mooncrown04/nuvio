/**
 * FullHDFilmizlesene Nuvio Scraper - v7.6
 * Donanım Hızlandırma & SSL Fix
 */

var cheerio = require("cheerio-without-node-native");

const BASE_URL = "https://www.fullhdfilmizlesene.live";

// Firestick'i standart bir tarayıcı gibi göstererek SSL kısıtlamalarını azaltır
const HEADERS = {
    'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    'Referer': BASE_URL + '/'
};

function rapidDecode(input) {
    try {
        // Çift katmanlı çözme mantığı
        var rev = input.split('').reverse().join('');
        var s1 = atob(rev.replace(/[^A-Za-z0-9+/=]/g, ""));
        var key = "K9L";
        var s2 = "";
        for (var i = 0; i < s1.length; i++) {
            var shift = (key.charCodeAt(i % 3) % 5) + 1;
            s2 += String.fromCharCode(s1.charCodeAt(i) - shift);
        }
        var final = s2.includes("http") ? s2 : atob(s2.replace(/[^A-Za-z0-9+/=]/g, ""));
        final = final.replace(/\\/g, "").trim();
        return final.startsWith("//") ? "https:" + final : final;
    } catch (e) { return null; }
}

function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
    return new Promise(function(resolve) {
        if (mediaType !== 'movie') return resolve([]);

        var tmdbUrl = 'https://api.themoviedb.org/3/movie/' + tmdbId + '?language=tr-TR&api_key=4ef0d7355d9ffb5151e987764708ce96';

        fetch(tmdbUrl)
            .then(function(res) { return res.json(); })
            .then(function(data) {
                var query = data.title || data.original_title;
                return fetch(BASE_URL + '/arama/' + encodeURIComponent(query), { headers: HEADERS });
            })
            .then(function(res) { return res.text(); })
            .then(function(html) {
                var $ = cheerio.load(html);
                var path = $(".film-listesi a").first().attr("href") || $("a[href*='/film/']").first().attr("href");
                if (!path) throw new Error("404");
                return fetch(path.startsWith('http') ? path : BASE_URL + path, { headers: HEADERS });
            })
            .then(function(res) { return res.text(); })
            .then(function(filmHtml) {
                var vidId = filmHtml.match(/vidid\s*[:=]\s*['"]?(\d+)['"]?/i);
                if (!vidId) throw new Error("ID");

                return fetch("https://rapidvid.net/e/" + vidId[1], { 
                    headers: { 'Referer': BASE_URL + '/', 'User-Agent': HEADERS['User-Agent'] } 
                });
            })
            .then(function(res) { return res.text(); })
            .then(function(embedHtml) {
                var av = embedHtml.match(/av\(['"]([^'"]+)['"]\)/);
                if (av && av[1]) {
                    var stream = rapidDecode(av[1]);
                    if (stream && stream.startsWith("http")) {
                        resolve([{
                            name: "FullHD - v7.6 (Donanım Fix)",
                            url: stream,
                            quality: "1080p",
                            headers: { 
                                'Referer': 'https://rapidvid.net/', 
                                'User-Agent': HEADERS['User-Agent'],
                                'X-Requested-With': 'com.google.android.youtube' // Bazı kısıtlamaları aşmak için
                            },
                            provider: "fullhd_scraper"
                        }]);
                    } else { resolve([]); }
                } else { resolve([]); }
            })
            .catch(function() { resolve([]); });
    });
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { getStreams: getStreams };
} else {
    global.getStreams = getStreams;
}
