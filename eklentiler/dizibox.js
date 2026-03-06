/**
 * Nuvio Local Scraper - DiziBox
 * Özellikler: King & Moly Player Desteği, Otomatik AES Decrypt
 */

var cheerio = require("cheerio-without-node-native");

const BASE_URL = 'https://www.dizibox.live';

// DiziBox için kritik headerlar ve çerezler
const WORKING_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
    'Referer': BASE_URL + '/',
    'Cookie': 'LockUser=true; isTrustedUser=true; dbxu=1743289650198'
};

/**
 * CryptoJS AES Decrypt Simülasyonu (King Player Linklerini Çözmek İçin)
 * Ortamda CryptoJS tanımlı olmadığı için bu yardımcı fonksiyon kullanılır.
 */
function solveCryptoJS(cipherText, password) {
    // Not: Bu fonksiyon çok karmaşık olduğu için genellikle ortamda 
    // bir crypto kütüphanesi (crypto-js) varlığı varsayılır. 
    // Nuvio'da hata alırsanız 'manifest.json'a crypto-js ekleyiniz.
    try {
        var CryptoJS = require("crypto-js");
        var bytes = CryptoJS.AES.decrypt(cipherText, password);
        return bytes.toString(CryptoJS.enc.Utf8);
    } catch (e) {
        return "";
    }
}

function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
    return new Promise(function(resolve, reject) {
        
        // 1. TMDB'den isim al
        var tmdbUrl = 'https://api.themoviedb.org/3/' + (mediaType === 'movie' ? 'movie' : 'tv') + '/' + tmdbId + '?language=tr-TR&api_key=4ef0d7355d9ffb5151e987764708ce96';

        fetch(tmdbUrl)
            .then(function(res) { return res.json(); })
            .then(function(data) {
                var query = data.name || data.title;
                console.log('[DiziBox] Aranan:', query);
                return fetch(BASE_URL + '/?s=' + encodeURIComponent(query), { headers: WORKING_HEADERS });
            })
            .then(function(res) { return res.text(); })
            .then(function(html) {
                var $ = cheerio.load(html);
                var firstLink = $('article.detailed-article a, article.article-series-poster a').first().attr('href');

                if (!firstLink) {
                    console.log('[DiziBox] Sonuç bulunamadı.');
                    return resolve([]);
                }

                // 2. Bölüm URL'sini oluştur
                var slug = firstLink.replace(/\/$/, "");
                var epUrl = slug + '-' + seasonNum + '-sezon-' + episodeNum + '-bolum-izle/';
                console.log('[DiziBox] Bölüm Sayfası:', epUrl);
                
                return fetch(epUrl, { headers: WORKING_HEADERS });
            })
            .then(function(res) { return res.text(); })
            .then(function(html) {
                var $ = cheerio.load(html);
                var streams = [];
                var iframeUrl = $('#video-area iframe').attr('src');

                if (!iframeUrl) throw new Error("Ana iframe bulunamadı");

                // King.php bypass (Kaynak koddaki king.php mantığı)
                if (iframeUrl.indexOf('king.php') !== -1) {
                    iframeUrl = iframeUrl.replace("king.php?v=", "king.php?wmode=opaque&v=");
                }

                console.log('[DiziBox] Iframe Çözülüyor:', iframeUrl);
                return fetch(iframeUrl, { headers: { 'Referer': BASE_URL + '/' } });
            })
            .then(function(res) { return res.text(); })
            .then(function(playerHtml) {
                var $ = cheerio.load(playerHtml);
                var subIframe = $('#Player iframe').attr('src');
                
                if (!subIframe) throw new Error("İkincil player bulunamadı");

                return fetch(subIframe, { headers: { 'Referer': BASE_URL + '/' } });
            })
            .then(function(res) { return res.text(); })
            .then(function(jsCode) {
                var results = [];
                
                // 3. CryptoJS AES Decrypt (King Player şifre çözme)
                var cryptData = jsCode.match(/CryptoJS\.AES\.decrypt\("(.*?)","/);
                var cryptPass = jsCode.match(/","(.*?)"\);/);

                if (cryptData && cryptPass) {
                    var decrypted = solveCryptoJS(cryptData[1], cryptPass[1]);
                    var fileUrl = decrypted.match(/file: '(.*?)',/);

                    if (fileUrl) {
                        results.push({
                            name: "⌜ DiziBox ⌟ | King Player",
                            title: "HD Stream",
                            url: fileUrl[1],
                            quality: "1080p",
                            headers: { 'Referer': BASE_URL + '/', 'User-Agent': WORKING_HEADERS['User-Agent'] },
                            provider: "dizibox_local"
                        });
                    }
                }

                resolve(results);
            })
            .catch(function(err) {
                console.error('[DiziBox] Hata:', err.message);
                resolve([]);
            });
    });
}

// React Native / Nuvio Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { getStreams: getStreams };
} else {
    global.getStreams = getStreams;
}
