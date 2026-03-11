/**
 * Nuvio Local Scraper - DiziBox (v9.1 - CryptoJS Standard)
 * Kotlin CryptoJS.kt mantığı JS'e uyarlandı.
 */

var cheerio = require("cheerio-without-node-native");
var CryptoJS = require("crypto-js"); // Modülün yüklü olduğundan emin olmalısın

const BASE_URL = 'https://www.dizibox.live';

var getStreams = function(tmdbId, mediaType, seasonNum, episodeNum) {
    console.log("DZBX: Surec basladi (v9.1)");

    return new Promise(function(resolve) {
        var tmdbUrl = 'https://api.themoviedb.org/3/' + (mediaType === 'movie' ? 'movie' : 'tv') + '/' + tmdbId + '?language=tr-TR&api_key=4ef0d7355d9ffb5151e987764708ce96';

        fetch(tmdbUrl)
            .then(function(res) { return res.json(); })
            .then(function(data) {
                var query = data.name || data.title;
                console.log("DZBX: Aranan: " + query);
                return fetch(BASE_URL + '/?s=' + encodeURIComponent(query), {
                    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0' }
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
                return fetch(episodeUrl);
            })
            .then(function(res) { return res.text(); })
            .then(function(episodeHtml) {
                var $ = cheerio.load(episodeHtml);
                var iframe = $('#video-area iframe').attr('src');
                if (!iframe) throw new Error("Iframe 1 bulunamadi");
                
                // King Player Fix (Kotlin/Python uyumu)
                if (iframe.includes('king.php')) iframe = iframe.replace("king.php?v=", "king.php?wmode=opaque&v=");
                
                return fetch(iframe, { headers: { 'Referer': BASE_URL } });
            })
            .then(function(res) { return res.text(); })
            .then(function(playerHtml) {
                // Şifreli veriyi yakala: decrypt("VERI", "SIFRE")
                var match = playerHtml.match(/decrypt\("(.*?)",\s*"(.*?)"\)/);
                if (!match) throw new Error("Sifreli veri bulunamadi");

                console.log("DZBX: Desifreleme yapiliyor...");
                
                /**
                 * KOTLIN CryptoJS.kt MANTIĞI:
                 * JS'deki CryptoJS.AES.decrypt fonksiyonu, Kotlin'deki 
                 * salt ayıklama ve evpkdf işlemlerini otomatik yapar.
                 */
                var bytes = CryptoJS.AES.decrypt(match[1], match[2]);
                var decryptedText = bytes.toString(CryptoJS.enc.Utf8);

                var streams = [];
                // file: 'https://...' formatını yakala
                var fileMatch = decryptedText.match(/file:\s*'(.*?)'/);
                
                if (fileMatch) {
                    console.log("DZBX: Stream URL Hazir.");
                    streams.push({
                        name: "DiziBox (King)",
                        title: "1080p - Otomatik",
                        url: fileMatch[1],
                        quality: "1080p",
                        headers: { 'Referer': BASE_URL + '/', 'User-Agent': 'Mozilla/5.0' },
                        provider: "dizibox_local"
                    });
                }
                
                resolve(streams);
            })
            .catch(function(err) {
                console.error("DZBX Hata: " + err.message);
                resolve([]);
            });
    });
};

// EXPORT YAPISI (Garantili)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { getStreams: getStreams };
} else {
    this.getStreams = getStreams;
}
