/**
 * Nuvio Local Scraper - DiziBox (Ultimate Fix v8.0)
 * Kaynak: Python/Kotlin Mantığı Entegre Edildi
 */

var cheerio = require("cheerio-without-node-native");

const BASE_URL = 'https://www.dizibox.live';

var getStreams = function(tmdbId, mediaType, seasonNum, episodeNum) {
    console.log("DZBX: Süreç başladı.");

    return new Promise(function(resolve) {
        var tmdbUrl = 'https://api.themoviedb.org/3/' + (mediaType === 'movie' ? 'movie' : 'tv') + '/' + tmdbId + '?language=tr-TR&api_key=4ef0d7355d9ffb5151e987764708ce96';

        fetch(tmdbUrl)
            .then(function(res) { return res.json(); })
            .then(function(data) {
                var query = data.name || data.title;
                console.log("DZBX: Aranan: " + query);
                // Arama sayfası
                return fetch(BASE_URL + '/?s=' + encodeURIComponent(query), {
                    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/122.0.0.0' }
                });
            })
            .then(function(res) { return res.text(); })
            .then(function(html) {
                var $ = cheerio.load(html);
                var targetPath = $('article a').first().attr('href');
                if (!targetPath) throw new Error("Icerik bulunamadi");

                var episodeUrl = targetPath;
                if (mediaType !== 'movie') {
                    episodeUrl = targetPath.replace(/\/$/, "") + '-' + seasonNum + '-sezon-' + episodeNum + '-bolum-izle/';
                }
                console.log("DZBX: Sayfa URL: " + episodeUrl);
                return fetch(episodeUrl);
            })
            .then(function(res) { 
                var currentUrl = res.url || ""; // Python'daki gibi o anki URL'yi sakla
                return res.text().then(function(text) { return { html: text, url: currentUrl }; }); 
            })
            .then(function(obj) {
                var $ = cheerio.load(obj.html);
                var iframe = $('#video-area iframe').attr('src');
                if (!iframe) throw new Error("Iframe bulunamadi");

                // Python mantığı: wmode ekle
                if (iframe.includes('king.php')) {
                    iframe = iframe.replace("king.php?v=", "king.php?wmode=opaque&v=");
                }
                console.log("DZBX: Iframe 1: " + iframe);

                // Python'daki ilk Referer güncellemesi
                return fetch(iframe, { headers: { 'Referer': obj.url } });
            })
            .then(function(res) { return res.text(); })
            .then(function(playerHtml) {
                var $ = cheerio.load(playerHtml);
                var innerIframe = $('#Player iframe').attr('src');
                if (!innerIframe) throw new Error("Inner Iframe bulunamadi");

                console.log("DZBX: Iframe 2: " + innerIframe);
                // Python'daki ikinci Referer güncellemesi
                return fetch(innerIframe, { headers: { 'Referer': BASE_URL + '/' } });
            })
            .then(function(res) { return res.text(); })
            .then(function(finalHtml) {
                var streams = [];
                // Python'daki Regex mantığı
                var dataMatch = finalHtml.match(/CryptoJS\.AES\.decrypt\("(.*?)",/);
                var passMatch = finalHtml.match(/","(.*?)"\);/);

                if (dataMatch && passMatch) {
                    console.log("DZBX: Sifreli veri yakalandı.");
                    try {
                        var CryptoJS = require("crypto-js");
                        var decrypted = CryptoJS.AES.decrypt(dataMatch[1], passMatch[1]).toString(CryptoJS.enc.Utf8);
                        
                        // Python: file: '(.*)',
                        var fileMatch = decrypted.match(/file:\s*'(.*?)'/);
                        if (fileMatch) {
                            console.log("DZBX: Stream bulundu!");
                            streams.push({
                                name: "DiziBox (King)",
                                title: "Otomatik HD",
                                url: fileMatch[1],
                                quality: "1080p",
                                headers: { 'Referer': BASE_URL + '/' },
                                provider: "dizibox_local"
                            });
                        }
                    } catch (e) { console.error("DZBX: Sifre cozme hatasi"); }
                }
                resolve(streams);
            })
            .catch(function(err) {
                console.error("DZBX Hata: " + err.message);
                resolve([]);
            });
    });
};

// GARANTİ EXPORT (Logdaki hatayı çözen kısım)
if (typeof module !== 'undefined' && module.exports) { module.exports = { getStreams: getStreams }; }
if (typeof global !== 'undefined') { global.getStreams = getStreams; }
if (typeof globalThis !== 'undefined') { globalThis.getStreams = getStreams; }
