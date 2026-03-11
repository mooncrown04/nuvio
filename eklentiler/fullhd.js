/**
 * FullHDFilmizlesene Nuvio Scraper - v16. (Debug)
 * Promise tabanlı, async/await yok, hata yakalama zorunlu.
 */

var cheerio = require("cheerio-without-node-native");

const WORKING_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
    'Accept': 'video/webm,video/ogg,video/*;q=0.9,*/*;q=0.5',
    'Accept-Language': 'tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7',
    'Accept-Encoding': 'identity',
    'Origin': 'https://www.fullhdfilmizlesene.live',
    'Referer': 'https://www.fullhdfilmizlesene.live/',
    'DNT': '1'
};

const BASE_URL = "https://www.fullhdfilmizlesene.live";

function decodeRapidVid(encodedData) {
    try {
        console.log("[Decode] Gelen data:", encodedData);
        var reversed = encodedData.split('').reverse().join('');
        var binary = Buffer.from(reversed.replace(/[^A-Za-z0-9+/=]/g, ""), 'base64').toString('binary');
        var key = "K9L";
        var adjusted = "";
        for (var i = 0; i < binary.length; i++) {
            var charCode = binary.charCodeAt(i);
            var shift = (key.charCodeAt(i % key.length) % 5) + 1;
            adjusted += String.fromCharCode(charCode - shift);
        }
        var finalUrl = Buffer.from(adjusted, 'base64').toString('utf8');
        console.log("[Decode] Çözülen URL:", finalUrl);
        return finalUrl.replace(/\\/g, "").trim();
    } catch (e) {
        console.error("[Decode Error]:", e.message);
        return null;
    }
}

function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
    return new Promise(function(resolve) {
        if (mediaType !== 'movie') {
            console.log("[Scraper] Dizi tipi desteklenmiyor.");
            return resolve([]);
        }

        var tmdbUrl = 'https://api.themoviedb.org/3/movie/' + tmdbId + '?language=tr-TR&api_key=4ef0d7355d9ffb5151e987764708ce96';
        console.log("[Scraper] TMDB URL:", tmdbUrl);

        fetch(tmdbUrl)
            .then(function(res) { return res.json(); })
            .then(function(data) {
                var query = data.title || data.original_title;
                console.log("[Scraper] TMDB Title:", query);
                return fetch(BASE_URL + '/arama/' + encodeURIComponent(query), { headers: WORKING_HEADERS });
            })
            .then(function(res) { return res.text(); })
            .then(function(html) {
                console.log("[Scraper] Arama sonucu geldi.");
                var $ = cheerio.load(html);
                var link = $(".film-listesi a").first().attr("href") || $("a[href*='/film/']").first().attr("href");
                console.log("[Scraper] Bulunan film linki:", link);
                if (!link) throw new Error("Film bulunamadı");
                var filmUrl = link.startsWith('http') ? link : BASE_URL + link;
                console.log("[Scraper] Film URL:", filmUrl);
                return fetch(filmUrl, { headers: WORKING_HEADERS });
            })
            .then(function(res) { return res.text(); })
            .then(function(filmHtml) {
                console.log("[Scraper] Film sayfası çekildi.");
                var vidIdMatch = filmHtml.match(/vidid\s*[:=]\s*['"]?(\d+)['"]?/i);
                console.log("[Scraper] vidid eşleşmesi:", vidIdMatch);
                if (!vidIdMatch) throw new Error("ID yok");
                var playerUrl = "https://rapidvid.net/e/" + vidIdMatch[1];
                console.log("[Scraper] RapidVid URL:", playerUrl);
                return fetch(playerUrl, { headers: Object.assign({}, WORKING_HEADERS, { 'Referer': BASE_URL + '/' }) });
            })
            .then(function(res) { return res.text(); })
            .then(function(embedHtml) {
                console.log("[Scraper] RapidVid embed sayfası çekildi.");
                var avMatch = embedHtml.match(/av\(['"]([^'"]+)['"]\)/);
                console.log("[Scraper] av(...) eşleşmesi:", avMatch);
                if (avMatch) {
                    var rawUrl = decodeRapidVid(avMatch[1]);
                    if (rawUrl) {
                        var streamLink = rawUrl.startsWith("//") ? "https:" + rawUrl : rawUrl;
                        console.log("[Scraper] Final stream link:", streamLink);
                        var streams = [{
                            name: "FullHD - Premium",
                            title: "FullHD Film Akışı",
                            url: streamLink,
                            quality: "1080p",
                            size: "Auto",
                            headers: Object.assign({}, WORKING_HEADERS, { 'Referer': 'https://rapidvid.net/' }),
                            provider: "fullhd_scraper"
                        }];
                        return resolve(streams);
                    }
                }
                console.log("[Scraper] Stream bulunamadı.");
                resolve([]);
            })
            .catch(function(err) {
                console.error('[FullHD Scraper Error]:', err && err.message ? err.message : err);
                resolve([]);
            });
    });
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { getStreams };
} else {
    global.getStreams = getStreams;
}

