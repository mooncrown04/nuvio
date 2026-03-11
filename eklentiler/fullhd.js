/**
 * FullHDFilmizlesene Nuvio Scraper - v16.2 (Final & Official Template)
 * Özellikler: Şablon uyumlu, SSL toleranslı, Hata yakalamalı.
 */

var cheerio = require("cheerio-without-node-native");

// Şablondaki ve loglardaki cihaz kısıtlamalarına uygun header seti
const WORKING_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    'Accept': 'video/webm,video/ogg,video/*;q=0.9,application/ogg;q=0.7,audio/*;q=0.6,*/*;q=0.5',
    'Accept-Language': 'tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7',
    'Accept-Encoding': 'identity',
    'Sec-Fetch-Dest': 'video',
    'Sec-Fetch-Mode': 'no-cors',
    'Sec-Fetch-Site': 'cross-site',
    'DNT': '1',
    'Connection': 'keep-alive'
};

const BASE_URL = "https://www.fullhdfilmizlesene.live";

/**
 * RapidVid şifreli URL'yi çözen fonksiyon (v15.8+ stabil mantık)
 */
function decodeRapidVid(encodedData) {
    try {
        var reversed = encodedData.split('').reverse().join('');
        var binary = atob(reversed.replace(/[^A-Za-z0-9+/=]/g, ""));
        var key = "K9L";
        var adjusted = "";
        for (var i = 0; i < binary.length; i++) {
            var charCode = binary.charCodeAt(i);
            var shift = (key.charCodeAt(i % key.length) % 5) + 1;
            adjusted += String.fromCharCode(charCode - shift);
        }
        var finalUrl = atob(adjusted);
        return finalUrl.replace(/\\/g, "").trim();
    } catch (e) { return null; }
}

function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
    return new Promise(function(resolve) {
        // Şablon gereği sadece film desteği (Dizi ise boş dön)
        if (mediaType !== 'movie') return resolve([]);

        // 1. TMDB'den Film İsmi Al (Arama için)
        var tmdbUrl = 'https://api.themoviedb.org/3/movie/' + tmdbId + '?language=tr-TR&api_key=4ef0d7355d9ffb5151e987764708ce96';

        fetch(tmdbUrl)
            .then(function(res) { return res.json(); })
            .then(function(data) {
                var query = data.title || data.original_title;
                console.error("[FullHD] Arama: " + query);
                // Sitede arama yap
                return fetch(BASE_URL + '/arama/' + encodeURIComponent(query), { headers: { 'User-Agent': WORKING_HEADERS['User-Agent'] } });
            })
            .then(function(res) { return res.text(); })
            .then(function(html) {
                var $ = cheerio.load(html);
                var link = $(".film-listesi a").first().attr("href") || $("a[href*='/film/']").first().attr("href");
                if (!link) throw new Error("Film bulunamadı");
                
                var filmUrl = link.startsWith('http') ? link : BASE_URL + link;
                return fetch(filmUrl, { headers: { 'User-Agent': WORKING_HEADERS['User-Agent'] } });
            })
            .then(function(res) { return res.text(); })
            .then(function(filmHtml) {
                // Video ID (vidid) ayıklama
                var vidIdMatch = filmHtml.match(/vidid\s*[:=]\s*['"]?(\d+)['"]?/i);
                if (!vidIdMatch) throw new Error("ID yok");

                var playerUrl = "https://rapidvid.net/e/" + vidIdMatch[1];
                console.error("[FullHD] Player: " + playerUrl);

                return fetch(playerUrl, { 
                    headers: { 
                        'User-Agent': WORKING_HEADERS['User-Agent'],
                        'Referer': BASE_URL + '/'
                    } 
                });
            })
            .then(function(res) { return res ? res.text() : null; })
            .then(function(embedHtml) {
                if (!embedHtml) return resolve([]);

                // 'av' fonksiyonu içindeki şifreli datayı bul
                var avMatch = embedHtml.match(/av\(['"]([^'"]+)['"]\)/);
                if (avMatch) {
                    var rawUrl = decodeRapidVid(avMatch[1]);
                    if (rawUrl) {
                        var streamLink = rawUrl.startsWith("//") ? "https:" + rawUrl : rawUrl;
                        
                        // Şablonun zorunlu kıldığı çıktı formatı
                        var streams = [{
                            name: "FullHD - Premium",
                            title: "FullHD Film Akışı",
                            url: streamLink,
                            quality: "1080p",
                            size: "Auto",
                            headers: Object.assign({}, WORKING_HEADERS, { 'Referer': 'https://rapidvid.net/' }),
                            provider: "fullhd_scraper"
                        }];

                        console.error("[FullHD] BAŞARILI!");
                        return resolve(streams);
                    }
                }
                resolve([]);
            })
            .catch(function(err) {
                console.error('[FullHD] Hata:', err.message);
                resolve([]); // Hata anında boş dizi zorunlu
            });
    });
}

// Export yapısı (React Native / Nuvio uyumlu)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { getStreams: getStreams };
} else {
    global.getStreams = getStreams;
}
