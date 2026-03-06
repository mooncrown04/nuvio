/**
 * Nuvio Local Scraper - DiziBox (Gelişmiş Versiyon)
 */

var cheerio = require("cheerio-without-node-native");

const BASE_URL = 'https://www.dizibox.live';
const WORKING_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    'Accept': '*/*',
    'Referer': BASE_URL + '/',
    'Cookie': 'LockUser=true; isTrustedUser=true; dbxu=1743289650198'
};

// Basit bir Base64/Crypto simülasyonu veya kütüphane kontrolü
function decryptAES(cipherText, password) {
    // Eğer ortamda CryptoJS yoksa, bu kısım hata verebilir.
    // Nuvio'da CryptoJS genellikle 'crypto-js' olarak require edilebilir.
    try {
        var CryptoJS = require("crypto-js");
        var bytes = CryptoJS.AES.decrypt(cipherText, password);
        return bytes.toString(CryptoJS.enc.Utf8);
    } catch (e) {
        console.error("CryptoJS yüklenemedi, lütfen modül listesini kontrol edin.");
        return "";
    }
}

function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
    return new Promise(function(resolve, reject) {
        
        var tmdbUrl = 'https://api.themoviedb.org/3/' + (mediaType === 'movie' ? 'movie' : 'tv') + '/' + tmdbId + '?language=tr-TR&api_key=4ef0d7355d9ffb5151e987764708ce96';

        fetch(tmdbUrl)
            .then(function(res) { return res.json(); })
            .then(function(data) {
                var query = data.name || data.title;
                return fetch(BASE_URL + '/?s=' + encodeURIComponent(query), { headers: WORKING_HEADERS });
            })
            .then(function(res) { return res.text(); })
            .then(function(html) {
                var $ = cheerio.load(html);
                var targetPath = $('article.detailed-article a, article.article-series-poster a').first().attr('href');

                if (!targetPath) throw new Error("Dizi bulunamadı.");

                // Bölüm URL'sini oluştur
                var episodeUrl = targetPath.replace(/\/$/, "") + '-' + seasonNum + '-sezon-' + episodeNum + '-bolum-izle/';
                return fetch(episodeUrl, { headers: WORKING_HEADERS });
            })
            .then(function(res) { return res.text(); })
            .then(function(html) {
                var $ = cheerio.load(html);
                var streams = [];
                var iframes = [];

                // Ana video alanındaki iframe'i al
                var mainIframe = $('#video-area iframe').attr('src');
                if (mainIframe) iframes.push(mainIframe);

                // Alternatif playerları (Moly, Haydi vb.) topla
                $('.video-toolbar option').each(function() {
                    var val = $(this).attr('value');
                    if (val && val.includes('http')) iframes.push(val);
                });

                // İlk çalışan iframe üzerinden ilerle (Basitleştirme için)
                if (iframes.length === 0) throw new Error("Video kaynağı bulunamadı.");
                
                var targetIframe = iframes[0];
                if (targetIframe.includes("king.php")) {
                    targetIframe = targetIframe.replace("king.php?v=", "king.php?wmode=opaque&v=");
                }

                return fetch(targetIframe, { headers: { 'Referer': BASE_URL + '/' } });
            })
            .then(function(res) { return res.text(); })
            .then(function(playerHtml) {
                var $ = cheerio.load(playerHtml);
                var finalIframe = $('#Player iframe').attr('src');

                if (!finalIframe) throw new Error("Oynatıcı yüklenemedi.");

                return fetch(finalIframe, { headers: { 'Referer': BASE_URL + '/' } });
            })
            .then(function(res) { return res.text(); })
            .then(function(finalJs) {
                var streams = [];
                
                // Şifreli veriyi ayıkla
                var dataMatch = finalJs.match(/CryptoJS\.AES\.decrypt\("(.*?)","/);
                var passMatch = finalJs.match(/","(.*?)"\);/);

                if (dataMatch && passMatch) {
                    var decrypted = decryptAES(dataMatch[1], passMatch[1]);
                    var fileMatch = decrypted.match(/file: '(.*?)',/);

                    if (fileMatch) {
                        streams.push({
                            name: "DiziBox - Hızlı Sunucu",
                            title: "HD Yayın",
                            url: fileMatch[1],
                            quality: "1080p",
                            headers: { 'Referer': BASE_URL + '/', 'User-Agent': WORKING_HEADERS['User-Agent'] },
                            provider: "dizibox_local"
                        });
                    }
                }
                
                resolve(streams);
            })
            .catch(function(err) {
                console.error('Hata:', err);
                resolve([]); 
            });
    });
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { getStreams: getStreams };
} else {
    global.getStreams = getStreams;
}