/**
 * Nuvio Local Scraper - DiziBox (v13.0 Slug-Master)
 * Arama yapmaz, doğrudan URL varyasyonlarını dener.
 */

var cheerio = require("cheerio-without-node-native");
var CryptoJS = require("crypto-js");

const BASE_URL = 'https://www.dizibox.live';

var getStreams = function(tmdbId, mediaType, seasonNum, episodeNum) {
    console.log("DZBX_START: v13 Direct Mode -> TMDB: " + tmdbId);

    return new Promise(function(resolve) {
        // 1. TMDB Bilgilerini Al (Hem Türkçe hem Orijinal isim için)
        fetch('https://api.themoviedb.org/3/' + (mediaType === 'movie' ? 'movie' : 'tv') + '/' + tmdbId + '?language=tr-TR&api_key=4ef0d7355d9ffb5151e987764708ce96')
            .then(function(res) { return res.json(); })
            .then(function(data) {
                var trName = (data.name || data.title || "").toLowerCase();
                var orgName = (data.original_name || data.original_title || "").toLowerCase();
                
                // Slug Temizleme Fonksiyonu
                var toSlug = function(text) {
                    return text.replace(/[^\w\s-]/g, '').trim().replace(/\s+/g, '-');
                };

                var slugs = [toSlug(trName), toSlug(orgName)];
                var suffix = '-' + seasonNum + '-sezon-' + episodeNum + '-bolum';
                
                // Denenecek tüm olasılıkları topla
                var targets = [];
                slugs.forEach(function(s) {
                    if(!s) return;
                    targets.push(BASE_URL + '/' + s + suffix + '-izle/');
                    targets.push(BASE_URL + '/' + s + suffix + '-hd-izle/');
                });

                console.log("DZBX_INFO: Denenecek URL sayisi: " + targets.length);

                // URL'leri sırayla kontrol et (Saniyeler içinde biter)
                var tryTargets = function(index) {
                    if (index >= targets.length) throw new Error("Hicbir varyasyon tutmadi.");

                    console.log("DZBX_TRY_" + index + ": " + targets[index]);
                    return fetch(targets[index], { method: 'HEAD' }).then(function(res) {
                        if (res.status === 200) {
                            console.log("DZBX_MATCH: Sayfa bulundu! Veri cekiliyor...");
                            return fetch(targets[index]).then(function(r) { 
                                return r.text().then(function(t) { return { html: t, url: targets[index] }; }); 
                            });
                        }
                        return tryTargets(index + 1);
                    });
                };

                return tryTargets(0);
            })
            .then(function(resObj) {
                var $ = cheerio.load(resObj.html);
                var iframe = $('#video-area iframe').attr('src') || $('iframe[src*="king.php"]').attr('src');
                
                if (!iframe) throw new Error("Iframe yok");

                if (iframe.includes('king.php')) iframe = iframe.replace("king.php?v=", "king.php?wmode=opaque&v=");
                
                console.log("DZBX_STEP: Player -> " + iframe);
                return fetch(iframe, { headers: { 'Referer': resObj.url } });
            })
            .then(function(res) { return res.text(); })
            .then(function(playerHtml) {
                var match = playerHtml.match(/decrypt\("(.*?)",\s*"(.*?)"\)/);
                if (!match) throw new Error("Sifreleme bulunamadi.");

                var bytes = CryptoJS.AES.decrypt(match[1], match[2]);
                var dec = bytes.toString(CryptoJS.enc.Utf8);
                var file = dec.match(/file:\s*'(.*?)'/);
                
                if (file) {
                    console.log("DZBX_FINAL: Link Hazir!");
                    resolve([{
                        name: "DiziBox",
                        url: file[1],
                        quality: "1080p",
                        headers: { 'Referer': BASE_URL + '/', 'User-Agent': 'Mozilla/5.0' },
                        provider: "dizibox_local"
                    }]);
                } else {
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
