/**
 * Nuvio Local Scraper - DiziBox (Ultimate v3.0)
 * Geliştirmeler: Buffer Koruması, Gelişmiş Referer, Hata Yönetimi.
 */

var cheerio = require("cheerio-without-node-native");

const BASE_URL = 'https://www.dizibox.live';
const WORKING_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
    'Referer': BASE_URL + '/'
};

// --- ÖĞRENDİĞİMİZ YARDIMCI ARAÇLAR ---
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
        var originalText = bytes.toString(CryptoJS.enc.Utf8);
        return originalText;
    } catch (e) {
        console.error("Dizibox: AES Decrypt Başarısız. Kütüphane eksik olabilir.");
        return "";
    }
}

function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
    return new Promise(function(resolve, reject) {
        
        // 1. Film/Dizi Ayrımı ve TMDB Bilgisi
        var tmdbUrl = 'https://api.themoviedb.org/3/' + (mediaType === 'movie' ? 'movie' : 'tv') + '/' + tmdbId + '?language=tr-TR&api_key=4ef0d7355d9ffb5151e987764708ce96';

        fetch(tmdbUrl)
            .then(function(res) { return res.json(); })
            .then(function(data) {
                var query = data.name || data.title;
                var year = (data.release_date || data.first_air_date || "").split('-')[0];
                return fetch(BASE_URL + '/?s=' + encodeURIComponent(query), { headers: WORKING_HEADERS })
                    .then(function(res) { return res.text(); })
                    .then(function(html) { return { html: html, year: year }; });
            })
            .then(function(searchObj) {
                var $ = cheerio.load(searchObj.html);
                // Yıl doğrulamalı sonuç bulma (Öğrendiğimiz yöntem)
                var targetPath = "";
                $('article.detailed-article, article.article-series-poster').each(function() {
                    var title = $(this).text();
                    if (title.includes(searchObj.year) || searchObj.year === "") {
                        targetPath = $(this).find('a').first().attr('href');
                        return false;
                    }
                });

                if (!targetPath) targetPath = $('article.detailed-article a').first().attr('href');
                if (!targetPath) throw new Error("Dizi/Film bulunamadı.");

                // 2. Bölüm URL Yapılandırması (Dizi ise)
                var finalUrl = targetPath;
                if (mediaType !== 'movie') {
                    finalUrl = targetPath.replace(/\/$/, "") + '-' + seasonNum + '-sezon-' + episodeNum + '-bolum-izle/';
                }
                
                return fetch(finalUrl, { headers: WORKING_HEADERS });
            })
            .then(function(res) { return res.text(); })
            .then(function(html) {
                var $ = cheerio.load(html);
                var iframes = [];

                // Video alanlarını tara
                $('#video-area iframe, .video-toolbar option').each(function() {
                    var src = $(this).attr('src') || $(this).attr('value');
                    if (src && src.includes('http')) iframes.push(src);
                });

                if (iframes.length === 0) throw new Error("Kaynak bulunamadı.");
                
                // İlk iframe'i (genellikle King Player) çek
                return fetch(iframes[0], { headers: { 'Referer': BASE_URL } });
            })
            .then(function(res) { return res.text(); })
            .then(function(playerHtml) {
                // Şifreli veri regex'i
                var dataMatch = playerHtml.match(/CryptoJS\.AES\.decrypt\("(.*?)",\s*"(.*?)"\)/);
                var streams = [];

                if (dataMatch) {
                    var decrypted = decryptAES(dataMatch[1], dataMatch[2]);
                    // m3u8 veya mp4 linkini ayıkla
                    var fileMatch = decrypted.match(/file["']?\s*:\s*["'](.*?)["']/);
                    
                    if (fileMatch) {
                        streams.push({
                            name: "DiziBox (AES-Secure)",
                            title: "HD Yayın",
                            url: fileMatch[1],
                            quality: "1080p",
                            headers: { 'Referer': 'https://dizibox.live/', 'User-Agent': WORKING_HEADERS['User-Agent'] },
                            provider: "dizibox_local"
                        });
                    }
                }
                resolve(streams);
            })
            .catch(function(err) {
                console.error('Dizibox Hatası:', err.message);
                resolve([]); 
            });
    });
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { getStreams: getStreams };
} else {
    global.getStreams = getStreams;
}
