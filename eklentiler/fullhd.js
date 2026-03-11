/**
 * FullHDFilmizlesene Nuvio Scraper - v23.0
 * Özellikler: Tam Şifre Çözme, Çift Katman Base64 Fix, Nuvio Şablon Uyumu.
 */

var cheerio = require("cheerio-without-node-native");

const BASE_URL = "https://www.fullhdfilmizlesene.live";

const WORKING_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    'Accept': 'video/webm,video/ogg,video/*;q=0.9,application/ogg;q=0.7,audio/*;q=0.6,*/*;q=0.5',
    'Accept-Language': 'tr-TR,tr;q=0.9',
    'Connection': 'keep-alive'
};

/**
 * RapidVid'in karmaşık şifreleme duvarını yıkan fonksiyon
 */
function decodeRapidVid(encodedData) {
    try {
        // 1. ADIM: Ters çevir ve Base64'ten kurtar
        var reversed = encodedData.split('').reverse().join('');
        var step1 = atob(reversed.replace(/[^A-Za-z0-9+/=]/g, ""));
        
        // 2. ADIM: K9L Karakter Kaydırma Algoritması
        var key = "K9L";
        var step2 = "";
        for (var i = 0; i < step1.length; i++) {
            var shift = (key.charCodeAt(i % key.length) % 5) + 1;
            step2 += String.fromCharCode(step1.charCodeAt(i) - shift);
        }
        
        // 3. ADIM: SON KATMAN (Loglardaki ==Qe... kısmını çözen yer)
        var finalUrl = "";
        try {
            // Eğer step2 hala Base64 ise (URL değilse) tekrar decode et
            if (!step2.startsWith("http") && !step2.startsWith("//")) {
                finalUrl = atob(step2).replace(/\\/g, "").trim();
            } else {
                finalUrl = step2.replace(/\\/g, "").trim();
            }
        } catch (e) {
            finalUrl = step2.replace(/\\/g, "").trim();
        }

        return finalUrl.startsWith("//") ? "https:" + finalUrl : finalUrl;
    } catch (e) { 
        return null; 
    }
}

function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
    return new Promise(function(resolve) {
        if (mediaType !== 'movie') return resolve([]);

        var tmdbUrl = 'https://api.themoviedb.org/3/movie/' + tmdbId + '?language=tr-TR&api_key=4ef0d7355d9ffb5151e987764708ce96';

        fetch(tmdbUrl)
            .then(function(res) { return res.json(); })
            .then(function(data) {
                var query = data.title || data.original_title;
                // Sitede arama yap
                return fetch(BASE_URL + '/arama/' + encodeURIComponent(query), { headers: WORKING_HEADERS });
            })
            .then(function(res) { return res.text(); })
            .then(function(html) {
                var $ = cheerio.load(html);
                var link = $(".film-listesi a").first().attr("href") || $("a[href*='/film/']").first().attr("href");
                if (!link) throw new Error("Film bulunamadı");
                
                var filmUrl = link.startsWith('http') ? link : BASE_URL + link;
                return fetch(filmUrl, { headers: WORKING_HEADERS });
            })
            .then(function(res) { return res.text(); })
            .then(function(filmHtml) {
                var vidIdMatch = filmHtml.match(/vidid\s*[:=]\s*['"]?(\d+)['"]?/i);
                if (!vidIdMatch) throw new Error("ID yok");

                // RapidVid Embed Sayfasına Git
                return fetch("https://rapidvid.net/e/" + vidIdMatch[1], { 
                    headers: { 'Referer': BASE_URL + '/', 'User-Agent': WORKING_HEADERS['User-Agent'] } 
                });
            })
            .then(function(res) { return res.text(); })
            .then(function(embedHtml) {
                var avMatch = embedHtml.match(/av\(['"]([^'"]+)['"]\)/);
                if (avMatch) {
                    var streamLink = decodeRapidVid(avMatch[1]);
                    
                    if (streamLink && streamLink.includes("http")) {
                        resolve([{
                            name: "FullHD - v23.0",
                            url: streamLink,
                            quality: "1080p",
                            headers: Object.assign({}, WORKING_HEADERS, { 'Referer': 'https://rapidvid.net/' }),
                            provider: "fullhd_scraper"
                        }]);
                    } else {
                        resolve([]);
                    }
                } else {
                    resolve([]);
                }
            })
            .catch(function(err) {
                console.error('[FullHD] Hata:', err.message);
                resolve([]);
            });
    });
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { getStreams: getStreams };
} else {
    global.getStreams = getStreams;
}
