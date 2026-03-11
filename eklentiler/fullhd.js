/**
 * Nuvio Local Scraper - DiziBox (v10.0 Mega Debug)
 * Tek Kod, Çoklu Deneme, Full Loglama
 */

var cheerio = require("cheerio-without-node-native");
var CryptoJS = require("crypto-js");

const BASE_URL = 'https://www.dizibox.live';

var getStreams = function(tmdbId, mediaType, seasonNum, episodeNum) {
    console.log("DZBX_START: TMDB=" + tmdbId + " | Type=" + mediaType + " | S:" + seasonNum + " E:" + episodeNum);

    return new Promise(function(resolve) {
        // 1. ADIM: TMDB BİLGİSİ
        fetch('https://api.themoviedb.org/3/' + (mediaType === 'movie' ? 'movie' : 'tv') + '/' + tmdbId + '?language=tr-TR&api_key=4ef0d7355d9ffb5151e987764708ce96')
            .then(function(res) { 
                if(!res.ok) console.error("DZBX_ERR: TMDB API Hatasi - Status: " + res.status);
                return res.json(); 
            })
            .then(function(data) {
                var query = data.name || data.title;
                var slug = query.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-');
                console.log("DZBX_INFO: Medya Adi: " + query + " | Slug: " + slug);

                // --- DENEME 1: DOĞRUDAN URL TAHMİNİ ---
                var guessedUrl = BASE_URL + (mediaType === 'movie' ? '/film/' : '/dizi/') + slug + '-' + seasonNum + '-sezon-' + episodeNum + '-bolum-izle/';
                console.log("DZBX_TRY1: Doğrudan URL deneniyor: " + guessedUrl);
                
                return fetch(guessedUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } }).then(function(r) {
                    if (r.status === 200) {
                        console.log("DZBX_SUCCESS1: Doğrudan URL çalıştı!");
                        return r.text();
                    }
                    // --- DENEME 2: ARAMA MOTORU ÜZERİNDEN GİTME ---
                    console.log("DZBX_TRY2: Arama sayfasina geciliyor...");
                    return fetch(BASE_URL + '/?s=' + encodeURIComponent(query)).then(function(r2) { return r2.text(); });
                });
            })
            .then(function(html) {
                var $ = cheerio.load(html);
                var targetPage = "";

                if (html.includes('video-area')) {
                    targetPage = "ALREADY_LOADED";
                    return html;
                } else {
                    var link = $('article a').first().attr('href');
                    if (!link) {
                        console.error("DZBX_ERR: Arama sonucunda article/link bulunamadi.");
                        throw new Error("Icerik bulunamadi");
                    }
                    targetPage = link.replace(/\/$/, "") + '-' + seasonNum + '-sezon-' + episodeNum + '-bolum-izle/';
                    console.log("DZBX_INFO: Arama sonucu bulunan sayfa: " + targetPage);
                    return fetch(targetPage).then(function(r) { return r.text(); });
                }
            })
            .then(function(episodeHtml) {
                var $ = cheerio.load(episodeHtml);
                var iframe = $('#video-area iframe').attr('src');
                if (!iframe) {
                    console.error("DZBX_ERR: Video alani (iframe) sayfada bulunamadi. DOM Degismis olabilir.");
                    throw new Error("Iframe yok");
                }

                // King Player Fix
                if (iframe.includes('king.php')) iframe = iframe.replace("king.php?v=", "king.php?wmode=opaque&v=");
                
                console.log("DZBX_INFO: Iframe URL yakalandi: " + iframe);
                
                // --- DENEME 3: FARKLI REFERER BAŞLIKLARIYLA PLAYER ÇEKME ---
                return fetch(iframe, { 
                    headers: { 'Referer': BASE_URL + '/', 'User-Agent': 'Mozilla/5.0' } 
                }).catch(function(e) {
                    console.warn("DZBX_WARN: Player çekilirken hata (SSL?), Referer değiştiriliyor...");
                    return fetch(iframe, { headers: { 'User-Agent': 'Mozilla/5.0' } });
                });
            })
            .then(function(res) { return res.text(); })
            .then(function(playerHtml) {
                console.log("DZBX_INFO: Player HTML yuklendi. Sifre cozme basliyor.");
                
                // Kotlin/Python Mantığı ile Regex
                var decData = playerHtml.match(/decrypt\("(.*?)",\s*"(.*?)"\)/);
                if (!decData) {
                    console.error("DZBX_ERR: CryptoJS.decrypt fonksiyonu HTML içinde bulunamadı.");
                    return resolve([]);
                }

                try {
                    console.log("DZBX_INFO: Sifre: " + decData[2].substring(0,5) + "***");
                    var bytes = CryptoJS.AES.decrypt(decData[1], decData[2]);
                    var decryptedText = bytes.toString(CryptoJS.enc.Utf8);
                    
                    var fileMatch = decryptedText.match(/file:\s*'(.*?)'/);
                    if (fileMatch) {
                        console.log("DZBX_FINAL: Stream linki OK!");
                        resolve([{
                            name: "DiziBox - Ultra Debug",
                            url: fileMatch[1],
                            quality: "1080p",
                            headers: { 'Referer': BASE_URL + '/', 'User-Agent': 'Mozilla/5.0' },
                            provider: "dizibox_local"
                        }]);
                    } else {
                        console.error("DZBX_ERR: Desifre basarili ama içinde 'file:' linki yok.");
                        resolve([]);
                    }
                } catch (e) {
                    console.error("DZBX_ERR: Desifreleme sirasinda kiritik hata: " + e.message);
                    resolve([]);
                }
            })
            .catch(function(err) {
                console.error("DZBX_FATAL: Akis kesildi -> " + err.message);
                resolve([]);
            });
    });
};

// EXPORT
if (typeof module !== 'undefined' && module.exports) { module.exports = { getStreams: getStreams }; }
if (typeof globalThis !== 'undefined') { globalThis.getStreams = getStreams; }
