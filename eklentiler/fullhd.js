/**
 * Nuvio Local Scraper - DiziBox (v16.0 Deep-Logging Edition)
 */

var cheerio = require("cheerio-without-node-native");
var CryptoJS = require("crypto-js");

const BASE_URL = 'https://www.dizibox.live';
const COOKIES = "LockUser=true; isTrustedUser=true; dbxu=1743289650198";
const HEADERS = {
    'Cookie': COOKIES,
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Referer': BASE_URL + '/'
};

var getStreams = function(tmdbId, mediaType, seasonNum, episodeNum) {
    return new Promise(function(resolve) {
        console.log("DZBX_START: ID=" + tmdbId + " Type=" + mediaType);

        // 1. TMDB KONTROLÜ
        fetch('https://api.themoviedb.org/3/' + (mediaType === 'movie' ? 'movie' : 'tv') + '/' + tmdbId + '?language=tr-TR&api_key=4ef0d7355d9ffb5151e987764708ce96')
            .then(function(res) { 
                if(!res.ok) throw new Error("TMDB_API_ERROR: HTTP " + res.status);
                return res.json(); 
            })
            .then(function(data) {
                var query = data.name || data.title || data.original_name;
                if (!query) throw new Error("TMDB_DATA_INVALID: Isim bulunamadi");
                console.log("DZBX_QUERY: " + query);

                // 2. ARAMA ADIMI
                return fetch(BASE_URL + '/?s=' + encodeURIComponent(query), { headers: HEADERS });
            })
            .then(function(res) {
                console.log("DZBX_SEARCH_STATUS: " + res.status);
                return res.text();
            })
            .then(function(searchHtml) {
                if (searchHtml.includes("Cloudflare")) console.log("DZBX_WARN: Cloudflare algilandi!");
                
                var $ = cheerio.load(searchHtml);
                // Kotlin'deki iki farkli seçiciyi de deneyelim
                var firstResult = $('article.detailed-article a').first().attr('href') || 
                                 $('article.article-series-poster a').first().attr('href');
                
                if (!firstResult) {
                    console.log("DZBX_HTML_DUMP: " + searchHtml.substring(0, 500)); // Hata aninda HTML basini bas
                    throw new Error("SEARCH_EMPTY: Site sonuc dondurmedi (Cookie veya Yapı sorunu)");
                }

                // 3. BÖLÜM SAYFASI OLUŞTURMA
                var cleanUrl = firstResult.replace(/\/$/, "");
                var targetUrl = cleanUrl + '-' + seasonNum + '-sezon-' + episodeNum + '-bolum-izle/';
                console.log("DZBX_TARGET: " + targetUrl);

                return fetch(targetUrl, { headers: HEADERS });
            })
            .then(function(res) {
                console.log("DZBX_PAGE_STATUS: " + res.status);
                return res.text();
            })
            .then(function(pageHtml) {
                var $ = cheerio.load(pageHtml);
                var sources = [];

                // Player iframe'lerini topla
                var mainIframe = $('#video-area iframe').attr('src');
                if (mainIframe) sources.push({ name: "Main", url: mainIframe });

                $('.video-toolbar option').each(function() {
                    var val = $(this).attr('value');
                    if (val && val.startsWith('http')) sources.push({ name: $(this).text(), url: val });
                });

                if (sources.length === 0) throw new Error("NO_PLAYER: Sayfada video kaynagi bulunamadi");
                console.log("DZBX_SOURCES_FOUND: " + sources.length);

                // 4. KAYNAKLARI TEK TEK DENE (RECURSIVE)
                var processSource = function(index) {
                    if (index >= sources.length) {
                        resolve([]);
                        return;
                    }

                    var s = sources[index];
                    console.log("DZBX_TRYING_SOURCE: " + s.name + " -> " + s.url);

                    var iframeUrl = s.url;
                    if (iframeUrl.includes("king.php") && !iframeUrl.includes("wmode")) {
                        iframeUrl = iframeUrl.replace("king.php?v=", "king.php?wmode=opaque&v=");
                    }

                    fetch(iframeUrl, { headers: { 'Referer': BASE_URL, 'Cookie': COOKIES } })
                        .then(function(r) { return r.text(); })
                        .then(function(phtml) {
                            var match = phtml.match(/decrypt\("(.*?)",\s*"(.*?)"\)/);
                            if (match) {
                                var bytes = CryptoJS.AES.decrypt(match[1], match[2]);
                                var dec = bytes.toString(CryptoJS.enc.Utf8);
                                var fileMatch = dec.match(/file:\s*'(.*?)'/);
                                
                                if (fileMatch) {
                                    console.log("DZBX_SUCCESS: Kaynak bulundu!");
                                    resolve([{
                                        name: "DiziBox (" + s.name + ")",
                                        url: fileMatch[1],
                                        quality: "1080p",
                                        headers: { 'Referer': BASE_URL + '/', 'User-Agent': HEADERS['User-Agent'] },
                                        provider: "dizibox_local"
                                    }]);
                                } else {
                                    console.log("DZBX_WARN: Decrypt edildi ama file URL yok.");
                                    processSource(index + 1);
                                }
                            } else {
                                console.log("DZBX_WARN: Sifreleme kalibi bu kaynakta bulunamadi.");
                                processSource(index + 1);
                            }
                        })
                        .catch(function(e) {
                            console.log("DZBX_SOURCE_ERR: " + e.message);
                            processSource(index + 1);
                        });
                };

                processSource(0);
            })
            .catch(function(err) {
                console.error("DZBX_ERROR_LOG: " + err.message);
                resolve([]);
            });
    });
};

if (typeof module !== 'undefined' && module.exports) { module.exports = { getStreams: getStreams }; }
if (typeof globalThis !== 'undefined') { globalThis.getStreams = getStreams; }
