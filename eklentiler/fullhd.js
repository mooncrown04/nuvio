/**
 * Nuvio Local Scraper - DiziBox (v11.0 - URL Pattern Fix)
 * Kullanıcının ilettiği "-hd-izle" yapısı entegre edildi.
 */

var cheerio = require("cheerio-without-node-native");
var CryptoJS = require("crypto-js");

const BASE_URL = 'https://www.dizibox.live';

var getStreams = function(tmdbId, mediaType, seasonNum, episodeNum) {
    console.log("DZBX_START: " + tmdbId + " S:" + seasonNum + " E:" + episodeNum);

    return new Promise(function(resolve) {
        // 1. TMDB Bilgisini Al
        fetch('https://api.themoviedb.org/3/' + (mediaType === 'movie' ? 'movie' : 'tv') + '/' + tmdbId + '?language=tr-TR&api_key=4ef0d7355d9ffb5151e987764708ce96')
            .then(function(res) { return res.json(); })
            .then(function(data) {
                var query = data.name || data.title;
                console.log("DZBX_INFO: Arama Basliyor: " + query);

                // Arama Sayfasına Git
                return fetch(BASE_URL + '/?s=' + encodeURIComponent(query));
            })
            .then(function(res) { return res.text(); })
            .then(function(html) {
                var $ = cheerio.load(html);
                var mainPageLink = $('article h2 a').attr('href') || $('article a').first().attr('href');
                
                if (!mainPageLink) {
                    console.error("DZBX_ERR: Arama sonucu bulunamadi.");
                    throw new Error("Icerik bulunamadi");
                }

                var cleanBase = mainPageLink.replace(/\/$/, "");
                
                // --- ÇOKLU URL DENEME SİSTEMİ ---
                // Sitenin kullanabileceği tüm varyasyonları bir diziye koyuyoruz
                var suffix = '-' + seasonNum + '-sezon-' + episodeNum + '-bolum';
                var patterns = [
                    cleanBase + suffix + '-hd-izle/', // Senin tarayıcıda gördüğün: -hd-izle
                    cleanBase + suffix + '-izle/',    // Standart: -izle
                    cleanBase + suffix + '-full-hd-izle/' // Alternatif: -full-hd-izle
                ];

                console.log("DZBX_INFO: Varyasyonlar deneniyor...");

                // Recursive (özyinelemeli) fetch ile ilk çalışan URL'yi bul
                var tryPattern = function(index) {
                    if (index >= patterns.length) {
                        console.error("DZBX_ERR: Hicbir URL varyasyonu calismadi.");
                        throw new Error("Sayfa bulunamadi");
                    }

                    console.log("DZBX_TRY_" + index + ": " + patterns[index]);
                    return fetch(patterns[index]).then(function(res) {
                        if (res.status === 200) {
                            console.log("DZBX_SUCCESS: URL Bulundu -> " + patterns[index]);
                            return res.text();
                        }
                        return tryPattern(index + 1); // Bir sonrakini dene
                    });
                };

                return tryPattern(0);
            })
            .then(function(episodeHtml) {
                var $ = cheerio.load(episodeHtml);
                // Video alanını bul (Çoklu seçici)
                var iframe = $('#video-area iframe').attr('src') || $('iframe[src*="king.php"]').attr('src');
                
                if (!iframe) {
                    console.error("DZBX_ERR: Iframe bulunamadi. Sayfa HTML boyutu: " + episodeHtml.length);
                    throw new Error("Player bulunamadi");
                }

                if (iframe.includes('king.php')) iframe = iframe.replace("king.php?v=", "king.php?wmode=opaque&v=");
                
                console.log("DZBX_STEP: Player Iframe -> " + iframe);
                return fetch(iframe, { headers: { 'Referer': BASE_URL + '/' } });
            })
            .then(function(res) { return res.text(); })
            .then(function(playerHtml) {
                // SIFRE COZME
                var match = playerHtml.match(/decrypt\("(.*?)",\s*"(.*?)"\)/);
                if (!match) {
                    console.error("DZBX_ERR: Sifreli veri yakalanamadi.");
                    return resolve([]);
                }

                try {
                    var bytes = CryptoJS.AES.decrypt(match[1], match[2]);
                    var dec = bytes.toString(CryptoJS.enc.Utf8);
                    var file = dec.match(/file:\s*'(.*?)'/);
                    
                    if (file) {
                        console.log("DZBX_FINAL: Islem Basarili!");
                        resolve([{
                            name: "DiziBox",
                            url: file[1],
                            quality: "1080p",
                            headers: { 'Referer': BASE_URL + '/', 'User-Agent': 'Mozilla/5.0' },
                            provider: "dizibox_local"
                        }]);
                    } else {
                        console.error("DZBX_ERR: Dosya linki ayiklanamadi.");
                        resolve([]);
                    }
                } catch (e) {
                    console.error("DZBX_ERR: CryptoJS Hatasi: " + e.message);
                    resolve([]);
                }
            })
            .catch(function(err) {
                console.error("DZBX_FATAL: " + err.message);
                resolve([]);
            });
    });
};

if (typeof module !== 'undefined' && module.exports) { module.exports = { getStreams: getStreams }; }
if (typeof globalThis !== 'undefined') { globalThis.getStreams = getStreams; }
