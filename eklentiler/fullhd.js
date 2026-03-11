/**
 * Nuvio Local Scraper - DiziBox (Lightning v4.0)
 * Odak: Timeout (Zaman Aşımı) ve Hız Optimizasyonu
 */

var cheerio = require("cheerio-without-node-native");

const BASE_URL = 'https://www.dizibox.live';

// En hızlı yanıt veren "Temiz" Headerlar
const FAST_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/122.0.0.0 Safari/537.36',
    'Accept': 'text/html',
    'Referer': BASE_URL + '/'
};

function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
    return new Promise(function(resolve) {
        
        // TMDB bilgilerini hızlıca çek
        var tmdbUrl = 'https://api.themoviedb.org/3/' + (mediaType === 'movie' ? 'movie' : 'tv') + '/' + tmdbId + '?language=tr-TR&api_key=4ef0d7355d9ffb5151e987764708ce96';

        fetch(tmdbUrl)
            .then(function(res) { return res.json(); })
            .then(function(data) {
                var query = data.name || data.title;
                var year = (data.release_date || data.first_air_date || "").split('-')[0];
                
                // Arama işlemini başlat
                return fetch(BASE_URL + '/?s=' + encodeURIComponent(query), { headers: FAST_HEADERS })
                    .then(function(res) { return res.text(); })
                    .then(function(html) { return { html: html, year: year }; });
            })
            .then(function(resObj) {
                var $ = cheerio.load(resObj.html);
                var targetUrl = "";

                // Hızlı tarama: Sadece ana linklere odaklan
                $('article a').each(function() {
                    var link = $(this).attr('href');
                    var text = $(this).text().toLowerCase();
                    if (link && (text.includes(resObj.year) || resObj.year === "")) {
                        targetUrl = link;
                        return false;
                    }
                });

                if (!targetUrl) targetUrl = $('article a').first().attr('href');
                if (!targetUrl) throw new Error("TIMEOUT_PREVENT: Link bulunamadı");

                // URL'yi oluştur
                var finalPage = targetUrl;
                if (mediaType !== 'movie') {
                    finalPage = targetUrl.replace(/\/$/, "") + '-' + seasonNum + '-sezon-' + episodeNum + '-bolum-izle/';
                }

                return fetch(finalPage, { headers: FAST_HEADERS });
            })
            .then(function(res) { return res.text(); })
            .then(function(html) {
                // Iframe bulma
                var iframeMatch = html.match(/<iframe.*?src="(.*?king\.php.*?)"/i) || html.match(/iframe.*?src="(.*?)"/i);
                if (!iframeMatch) throw new Error("Kaynak Yok");

                var playerUrl = iframeMatch[1].startsWith('http') ? iframeMatch[1] : 'https:' + iframeMatch[1];
                
                return fetch(playerUrl, { headers: { 'Referer': BASE_URL } });
            })
            .then(function(res) { return res.text(); })
            .then(function(playerHtml) {
                var streams = [];
                // AES şifreli veriyi yakala
                var data = playerHtml.match(/decrypt\("(.*?)",\s*"(.*?)"\)/);
                
                if (data) {
                    try {
                        var CryptoJS = require("crypto-js");
                        var dec = CryptoJS.AES.decrypt(data[1], data[2]).toString(CryptoJS.enc.Utf8);
                        var file = dec.match(/file["']?\s*:\s*["'](.*?)["']/);
                        
                        if (file) {
                            streams.push({
                                name: "DiziBox",
                                title: "Otomatik Kalite",
                                url: file[1],
                                quality: "1080p",
                                headers: { 'Referer': BASE_URL + '/', 'User-Agent': FAST_HEADERS['User-Agent'] },
                                provider: "dizibox_local"
                            });
                        }
                    } catch(e) { console.error("Crypto Hatası"); }
                }
                resolve(streams);
            })
            .catch(function(err) {
                console.error("Dizibox Hata:", err.message);
                resolve([]); // Hata olsa bile sessizce boş dön
            });
    });
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { getStreams: getStreams };
} else {
    global.getStreams = getStreams;
}
