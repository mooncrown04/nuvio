/**
 * FullHDFilmizlesene Nuvio Scraper - v10.1
 * Değişiklik: API isteği POST'tan GET'e çevrildi + Headerlar sadeleştirildi.
 */

var cheerio = require("cheerio-without-node-native");
var BASE_URL = "https://www.fullhdfilmizlesene.live";

var NUVIO_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    'Accept': 'application/json, text/javascript, */*; q=0.01',
    'Accept-Language': 'tr-TR,tr;q=0.9',
    'X-Requested-With': 'XMLHttpRequest',
    'DNT': '1'
};

function decodeContentX(encodedData) {
    try {
        var reversed = encodedData.split('').reverse().join('');
        var binary = atob(reversed.replace(/[^A-Za-z0-9+/=]/g, ""));
        var key = "K9L";
        var result = "";
        for (var i = 0; i < binary.length; i++) {
            var charCode = binary.charCodeAt(i);
            var shift = (key.charCodeAt(i % key.length) % 5) + 1;
            result += String.fromCharCode(charCode - shift);
        }
        return result;
    } catch (e) { return null; }
}

function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
    return new Promise(function(resolve, reject) {
        if (mediaType !== 'movie') return resolve([]);

        var tmdbUrl = 'https://api.themoviedb.org/3/movie/' + tmdbId + '?language=tr-TR&api_key=4ef0d7355d9ffb5151e987764708ce96';

        fetch(tmdbUrl)
            .then(function(res) { return res.json(); })
            .then(function(data) {
                var query = data.title || data.original_title;
                console.error("[FullHD] v10.1 Başladı: " + query);
                return fetch(BASE_URL + '/arama/' + encodeURIComponent(query), { headers: { 'User-Agent': NUVIO_HEADERS['User-Agent'] } });
            })
            .then(function(res) { return res.text(); })
            .then(function(html) {
                var $ = cheerio.load(html);
                var link = $(".film-listesi a").first().attr("href") || $("a[href*='/film/']").first().attr("href");
                if (!link) throw new Error("Film Bulunamadı");

                var filmUrl = link.indexOf('http') === 0 ? link : BASE_URL + link;
                return fetch(filmUrl, { headers: { 'User-Agent': NUVIO_HEADERS['User-Agent'] } });
            })
            .then(function(res) {
                var setCookie = res.headers.get('set-cookie');
                if (setCookie) NUVIO_HEADERS['Cookie'] = setCookie.split(';')[0];
                return res.text();
            })
            .then(function(filmHtml) {
                var vididMatch = filmHtml.match(/vidid\s*[:=]\s*['"]?(\d+)['"]?/i);
                if (!vididMatch) throw new Error("vidid eksik");
                
                var vidid = vididMatch[1];
                
                // --- STRATEJİ DEĞİŞİKLİĞİ ---
                // POST yerine sadece GET kullanarak JSON yanıtı zorluyoruz.
                // Eğer site hala HTML dönüyorsa, 'type' değerini '1' veya '3' olarak deneyeceğiz.
                var finalApiUrl = BASE_URL + "/player/api.php?id=" + vidid + "&type=t&get=video";
                
                console.error("[FullHD] API GET Sorgusu: " + vidid);

                return fetch(finalApiUrl, {
                    method: "GET",
                    headers: NUVIO_HEADERS
                });
            })
            .then(function(res) { return res.text(); })
            .then(function(apiText) {
                // Eğer hala HTML geliyorsa, logda içeriği daha fazla görmek için:
                console.error("[FullHD] Yanıt (İlk 100): " + apiText.substring(0, 100));
                
                if (apiText.indexOf("<html") > -1) {
                    throw new Error("API hala HTML donuyor, JSON bekleniyor");
                }

                var urls = apiText.match(/https?:\/\/[^"'\s<>\\ ]+/g) || [];
                var embedUrl = urls.find(function(u) { return u.indexOf("rapid") > -1 || u.indexOf("moly") > -1; }) || urls[0];
                
                if (!embedUrl) throw new Error("Embed bulunamadı");
                return fetch(embedUrl.replace(/\\/g, ""), { headers: { 'Referer': BASE_URL + '/' } });
            })
            .then(function(res) { return res.text(); })
            .then(function(embedHtml) {
                var avMatch = embedHtml.match(/av\(['"]([^'"]+)['"]\)/);
                if (avMatch) {
                    var decrypted = decodeContentX(avMatch[1]);
                    if (decrypted) {
                        resolve([{
                            name: "FullHD v10.1 Fix",
                            title: "FullHD Premium",
                            url: decrypted.indexOf("//") === 0 ? "https:" + decrypted : decrypted,
                            quality: "1080p",
                            headers: { 'Referer': 'https://rapidvid.net/', 'User-Agent': NUVIO_HEADERS['User-Agent'] },
                            provider: "fullhd_scraper"
                        }]);
                        return;
                    }
                }
                resolve([]);
            })
            .catch(function(err) {
                console.error("[FullHD] HATA: " + err.message);
                resolve([]);
            });
    });
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { getStreams: getStreams };
} else {
    global.getStreams = getStreams;
}
