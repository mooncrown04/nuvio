/**
 * Nuvio Local Scraper - DiziBox (v15.0 Kekik-Style)
 */

var cheerio = require("cheerio-without-node-native");
var CryptoJS = require("crypto-js");

const BASE_URL = 'https://www.dizibox.live';
// Kotlin kodundaki "Güvenilir Kullanıcı" cookie'leri
const COOKIES = "LockUser=true; isTrustedUser=true; dbxu=1743289650198";

var getStreams = function(tmdbId, mediaType, seasonNum, episodeNum) {
    return new Promise(function(resolve) {
        // 1. Önce TMDB'den ismi al
        fetch('https://api.themoviedb.org/3/' + (mediaType === 'movie' ? 'movie' : 'tv') + '/' + tmdbId + '?language=tr-TR&api_key=4ef0d7355d9ffb5151e987764708ce96')
            .then(function(res) { return res.json(); })
            .then(function(data) {
                var query = data.name || data.title;
                console.log("DZBX_SEARCH: " + query);

                // 2. Cookie'lerle Arama Yap (Kritik nokta)
                return fetch(BASE_URL + '/?s=' + encodeURIComponent(query), {
                    headers: { 'Cookie': COOKIES, 'User-Agent': 'Mozilla/5.0' }
                });
            })
            .then(function(res) { return res.text(); })
            .then(function(searchHtml) {
                var $ = cheerio.load(searchHtml);
                // Kotlin kodundaki select("article.detailed-article") seçicisi
                var firstResult = $('article.detailed-article a').first().attr('href');
                
                if (!firstResult) throw new Error("Arama sonucu bos dondu");
                
                // URL'yi Bölüm Formatına Çevir
                var targetUrl = firstResult.replace(/\/$/, "") + '-' + seasonNum + '-sezon-' + episodeNum + '-bolum-izle/';
                console.log("DZBX_TARGET: " + targetUrl);

                return fetch(targetUrl, { headers: { 'Cookie': COOKIES } });
            })
            .then(function(res) { return res.text(); })
            .then(function(pageHtml) {
                var $ = cheerio.load(pageHtml);
                // Ana player veya alternatifleri bul
                var iframe = $('#video-area iframe').attr('src');
                
                if (!iframe) throw new Error("Iframe bulunamadi");
                
                // King Player İşleme (Kotlin'deki iframeDecode mantığı)
                if (iframe.includes("king.php")) {
                    iframe = iframe.replace("king.php?v=", "king.php?wmode=opaque&v=");
                }

                return fetch(iframe, { headers: { 'Referer': BASE_URL, 'Cookie': COOKIES } });
            })
            .then(function(res) { return res.text(); })
            .then(function(playerHtml) {
                // Şifreli veriyi çöz
                var match = playerHtml.match(/decrypt\("(.*?)",\s*"(.*?)"\)/);
                if (!match) throw new Error("Sifreleme cozulemedi");

                var bytes = CryptoJS.AES.decrypt(match[1], match[2]);
                var dec = bytes.toString(CryptoJS.enc.Utf8);
                var file = dec.match(/file:\s*'(.*?)'/);

                if (file) {
                    resolve([{
                        name: "DiziBox (Direct)",
                        url: file[1],
                        quality: "1080p",
                        headers: { 'Referer': BASE_URL + '/' },
                        provider: "dizibox_local"
                    }]);
                } else {
                    resolve([]);
                }
            })
            .catch(function(err) {
                console.error("DZBX_ERROR: " + err.message);
                resolve([]);
            });
    });
};

if (typeof module !== 'undefined' && module.exports) { module.exports = { getStreams: getStreams }; }
if (typeof globalThis !== 'undefined') { globalThis.getStreams = getStreams; }
