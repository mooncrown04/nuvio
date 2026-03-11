/**
 * Nuvio Local Scraper - DiziBox (Timeout & Connection Fix)
 * v3.1 - Paralel Fetch ve Hata Toleransı Eklendi
 */

var cheerio = require("cheerio-without-node-native");

const BASE_URL = 'https://www.dizibox.live';
const WORKING_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
    'Accept-Language': 'tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7',
    'Cache-Control': 'no-cache',
    'Pragma': 'no-cache',
    'Referer': BASE_URL + '/',
    'Upgrade-Insecure-Requests': '1'
};

function universalAtob(str) {
    try {
        if (typeof atob === 'function') return atob(str);
        var chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
        var out = ''; str = String(str).replace(/[=]+$/, '');
        for (var bc = 0, bs, buffer, idx = 0; buffer = str.charAt(idx++); ~buffer && (bs = bc % 4 ? bs * 64 + buffer : buffer, bc++ % 4) ? out += String.fromCharCode(255 & bs >> (-2 * bc & 6)) : 0) {
            buffer = chars.indexOf(buffer);
        }
        return out;
    } catch (e) { return null; }
}

function decryptAES(cipherText, password) {
    try {
        var CryptoJS = require("crypto-js");
        var bytes = CryptoJS.AES.decrypt(cipherText, password);
        return bytes.toString(CryptoJS.enc.Utf8);
    } catch (e) { return ""; }
}

function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
    return new Promise(function(resolve) {
        // TMDB verisini çek
        var tmdbUrl = 'https://api.themoviedb.org/3/' + (mediaType === 'movie' ? 'movie' : 'tv') + '/' + tmdbId + '?language=tr-TR&api_key=4ef0d7355d9ffb5151e987764708ce96';

        fetch(tmdbUrl)
            .then(function(res) { return res.json(); })
            .then(function(data) {
                var query = data.name || data.title;
                var year = (data.release_date || data.first_air_date || "").split('-')[0];
                
                // Timeout'u önlemek için doğrudan arama URL'sine istek at
                var searchUrl = BASE_URL + '/?s=' + encodeURIComponent(query);
                return fetch(searchUrl, { headers: WORKING_HEADERS, method: 'GET' })
                    .then(function(res) { return res.text(); })
                    .then(function(html) { return { html: html, year: year }; });
            })
            .then(function(searchObj) {
                var $ = cheerio.load(searchObj.html);
                var targetPath = "";
                
                // Daha geniş bir arama alanı tara (Timeout'u azaltmak için seçicileri optimize et)
                $('article').each(function() {
                    var title = $(this).text().toLowerCase();
                    if (searchObj.year && title.includes(searchObj.year)) {
                        targetPath = $(this).find('a').first().attr('href');
                        return false;
                    }
                });

                if (!targetPath) targetPath = $('article a').first().attr('href');
                if (!targetPath) throw new Error("Dizi/Film bulunamadı.");

                var finalUrl = targetPath;
                if (mediaType !== 'movie') {
                    // Dizi box link yapısını doğrula
                    finalUrl = targetPath.replace(/\/$/, "") + '-' + seasonNum + '-sezon-' + episodeNum + '-bolum-izle/';
                }
                
                return fetch(finalUrl, { headers: WORKING_HEADERS });
            })
            .then(function(res) { return res.text(); })
            .then(function(html) {
                var $ = cheerio.load(html);
                var iframeSrc = $('#video-area iframe').attr('src') || $('.video-toolbar option').first().attr('value');

                if (!iframeSrc) throw new Error("Video alanı boş.");
                
                // Referer'ı her adımda güncelle
                var playerHeaders = Object.assign({}, WORKING_HEADERS, { 'Referer': BASE_URL });
                return fetch(iframeSrc, { headers: playerHeaders });
            })
            .then(function(res) { return res.text(); })
            .then(function(playerHtml) {
                var streams = [];
                // Dizibox AES şifreleme kalıbını ara
                var dataMatch = playerHtml.match(/CryptoJS\.AES\.decrypt\("(.*?)",\s*"(.*?)"\)/);

                if (dataMatch) {
                    var decrypted = decryptAES(dataMatch[1], dataMatch[2]);
                    var fileMatch = decrypted.match(/file["']?\s*:\s*["'](.*?)["']/);
                    
                    if (fileMatch) {
                        streams.push({
                            name: "DiziBox - Ana Sunucu",
                            title: "HD Kalite",
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
                console.error('Dizibox Log:', err.message);
                resolve([]); 
            });
    });
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { getStreams: getStreams };
} else {
    global.getStreams = getStreams;
}
