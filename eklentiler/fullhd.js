/**
 * Nuvio Local Scraper - DiziBox (v15.1 Full Kotlin Port)
 */

var cheerio = require("cheerio-without-node-native");
var CryptoJS = require("crypto-js");

const BASE_URL = 'https://www.dizibox.live';
const COOKIES = "LockUser=true; isTrustedUser=true; dbxu=1743289650198";

var getStreams = function(tmdbId, mediaType, seasonNum, episodeNum) {
    return new Promise(function(resolve) {
        
        // 1. TMDB Bilgisi
        fetch('https://api.themoviedb.org/3/' + (mediaType === 'movie' ? 'movie' : 'tv') + '/' + tmdbId + '?language=tr-TR&api_key=4ef0d7355d9ffb5151e987764708ce96')
            .then(function(res) { return res.json(); })
            .then(function(data) {
                var query = data.name || data.title;
                // Arama isteği
                return fetch(BASE_URL + '/?s=' + encodeURIComponent(query), {
                    headers: { 'Cookie': COOKIES, 'User-Agent': 'Mozilla/5.0' }
                });
            })
            .then(function(res) { return res.text(); })
            .then(function(searchHtml) {
                var $ = cheerio.load(searchHtml);
                var firstResult = $('article.detailed-article a').first().attr('href');
                if (!firstResult) throw new Error("Arama sonucu bulunamadi");

                var targetUrl = firstResult.replace(/\/$/, "") + '-' + seasonNum + '-sezon-' + episodeNum + '-bolum-izle/';
                console.log("DZBX_TARGET: " + targetUrl);
                return fetch(targetUrl, { headers: { 'Cookie': COOKIES } });
            })
            .then(function(res) { return res.text(); })
            .then(function(pageHtml) {
                var $ = cheerio.load(pageHtml);
                
                // Kotlin'deki loadLinks mantığı: Tüm iframe olasılıklarını topla
                var sources = [];
                
                // Ana player
                var mainIframe = $('#video-area iframe').attr('src');
                if (mainIframe) sources.push(mainIframe);

                // Alternatif playerlar (video-toolbar içindeki seçenekler)
                $('.video-toolbar option').each(function() {
                    var val = $(this).attr('value');
                    if (val && val.startsWith('http')) sources.push(val);
                });

                // İlk çalışan kaynağı bulana kadar dön
                var trySource = function(index) {
                    if (index >= sources.length) throw new Error("Hicbir player kaynagi calismadi");

                    var iframeUrl = sources[index];
                    // King Player Fix
                    if (iframeUrl.includes("king.php")) {
                        iframeUrl = iframeUrl.replace("king.php?v=", "king.php?wmode=opaque&v=");
                    }

                    return fetch(iframeUrl, { headers: { 'Referer': BASE_URL, 'Cookie': COOKIES } })
                        .then(function(r) { return r.text(); })
                        .then(function(phtml) {
                            // Şifreli veri kontrolü (AES Decrypt)
                            var match = phtml.match(/decrypt\("(.*?)",\s*"(.*?)"\)/);
                            if (match) {
                                var bytes = CryptoJS.AES.decrypt(match[1], match[2]);
                                var dec = bytes.toString(CryptoJS.enc.Utf8);
                                var fileMatch = dec.match(/file:\s*'(.*?)'/);
                                if (fileMatch) return fileMatch[1];
                            }
                            // Eğer bu kaynakta bulamazsa bir sonrakini dene
                            return trySource(index + 1);
                        })
                        .catch(function() { return trySource(index + 1); });
                };

                return trySource(0);
            })
            .then(function(finalStreamUrl) {
                resolve([{
                    name: "DiziBox",
                    url: finalStreamUrl,
                    quality: "1080p",
                    headers: { 'Referer': BASE_URL + '/', 'User-Agent': 'Mozilla/5.0' },
                    provider: "dizibox_local"
                }]);
            })
            .catch(function(err) {
                console.error("DZBX_FATAL: " + err.message);
                resolve([]);
            });
    });
};

if (typeof module !== 'undefined' && module.exports) { module.exports = { getStreams: getStreams }; }
if (typeof globalThis !== 'undefined') { globalThis.getStreams = getStreams; }
