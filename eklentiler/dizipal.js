/**
 * DiziPal Nuvio Local Scraper
 * Mimari: SineWix/DiziYou uyumlu Promise yapısı.
 * Kısıtlama: async/await kullanılmamıştır.
 */

var cheerio = require("cheerio-without-node-native");

var BASE_URL = 'https://dizipal1543.com'; // Güncel adresi buradan değiştirin
var CRYPTO_P = "3hPn4uCjTVtfYWcjIcoJQ4cL1WWk1qxXI39egLYOmNv6IblA7eKJz68uU3eLzux1biZLCms0quEjTYniGv5z1JcKbNIsDQFSeIZOBZJz4is6pD7UyWDggWWzTLBQbHcQFpBQdClnuQaMNUHtLHTpzCvZy33p6I7wFBvL4fnXBYH84aUIyWGTRvM2G5cfoNf4705tO2kv";

var HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
    'Referer': BASE_URL + '/'
};

function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
    return new Promise(function(resolve, reject) {
        var isMovie = mediaType === 'movie';
        var tmdbUrl = 'https://api.themoviedb.org/3/' + (isMovie ? 'movie' : 'tv') + '/' + tmdbId + '?language=tr-TR&api_key=4ef0d7355d9ffb5151e987764708ce96';

        console.log('[DiziPal] Başlatılıyor ID:', tmdbId);

        fetch(tmdbUrl)
            .then(function(res) { return res.json(); })
            .then(function(data) {
                var title = data.title || data.name;
                if (!title) throw new Error('TMDB ismi bulunamadı');

                // Türkçe karakter temizleme (Slug Oluşturma)
                var slug = title.toLowerCase()
                    .replace(/[ğ]/g, 'g').replace(/[ü]/g, 'u').replace(/[ş]/g, 's')
                    .replace(/[ı]/g, 'i').replace(/[ö]/g, 'o').replace(/[ç]/g, 'c')
                    .replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-');

                var targetPath = isMovie ? '/film/' + slug : '/bolum/' + slug + '-' + seasonNum + 'x' + episodeNum;
                var targetUrl = BASE_URL + targetPath;
                
                console.log('[DiziPal] Hedef URL:', targetUrl);
                return fetch(targetUrl, { headers: HEADERS });
            })
            .then(function(res) { return res.text(); })
            .then(function(html) {
                // Şifreli veriyi ayıkla
                var match = html.match(/data-rm-k="true"[^>]*>(.*?)<\/div>/);
                if (!match) {
                    console.log('[DiziPal] Şifreli içerik bulunamadı (Bölüm henüz eklenmemiş olabilir).');
                    return resolve([]);
                }

                var encryptedData = JSON.parse(match[1].replace(/&quot;/g, '"').trim());
                
                // PBKDF2 ve AES İşlemi (Blocking ama setTimeout hatası vermez)
                console.log('[DiziPal] Şifre çözülüyor...');
                var salt = CryptoJS.enc.Hex.parse(encryptedData.salt);
                var iv = CryptoJS.enc.Hex.parse(encryptedData.iv);
                
                var key = CryptoJS.PBKDF2(CRYPTO_P, salt, {
                    keySize: 8,
                    iterations: 999,
                    hasher: CryptoJS.algo.SHA512
                });

                var decrypted = CryptoJS.AES.decrypt(encryptedData.ciphertext, key, {
                    iv: iv,
                    padding: CryptoJS.pad.Pkcs7,
                    mode: CryptoJS.mode.CBC
                }).toString(CryptoJS.enc.Utf8).replace(/[\\"]/g, "");

                var videoIdMatch = decrypted.match(/[?&]v=([^&]+)/);
                if (!videoIdMatch) return resolve([]);

                var videoId = videoIdMatch[1];
                var apiUrl = 'https://four.dplayer82.site/source2.php?v=' + videoId;

                return fetch(apiUrl, { headers: { 'Referer': 'https://four.dplayer82.site/' } });
            })
            .then(function(res) { return res.json(); })
            .then(function(source) {
                if (source && source.file) {
                    var finalUrl = source.file.replace(/\\/g, "").replace("m.php", "master.m3u8");
                    
                    resolve([{
                        name: '⌜ DiziPal ⌟',
                        url: finalUrl,
                        quality: 'Auto',
                        headers: { 'Referer': 'https://four.dplayer82.site/' },
                        provider: 'dizipal'
                    }]);
                } else {
                    resolve([]);
                }
            })
            .catch(function(err) {
                console.error('[DiziPal] Hata:', err.message);
                resolve([]);
            });
    });
}

// Nuvio Export Yapısı
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { getStreams: getStreams };
} else {
    global.getStreams = getStreams;
}
