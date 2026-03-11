/**
 * FullHDFilmizlesene Nuvio Scraper - v16.0 (Official Template)
 * Şablona tam uyumlu, SSL ve Header optimizasyonlu.
 */

var cheerio = require("cheerio-without-node-native");

// Şablondaki gerçek çalışan header yapısı
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

// RapidVid Deşifre Fonksiyonu (Kotlin Port)
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
    return new Promise(function(resolve, reject) {
        if (mediaType !== 'movie') return resolve([]);

        // 1. TMDB'den Film Adını Çek (Arama İçin)
        var tmdbUrl = 'https://api.themoviedb.org/3/movie/' + tmdbId + '?language=tr-TR&api_key=4ef0d7355d9ffb5151e987764708ce96';

        fetch(tmdbUrl)
            .then(function(res) { return res.json(); })
            .then(function(data) {
                var query = data.title || data.original_title;
                console.error("[FullHD] Arama Başlatıldı: " + query);
                return fetch(BASE_URL + '/arama/' + encodeURIComponent(query), { headers: { 'User-Agent': WORKING_HEADERS['User-Agent'] } });
            })
            .then(function(res) { return res.text(); })
            .then(function(html) {
                var $ = cheerio.load(html);
                var link = $(".film-listesi a").first().attr("href") || $("a[href*='/film/']").first().attr("href");
                if (!link) throw new Error("Film Bulunamadı");
                
                var filmFullUrl = link.startsWith('http') ? link : BASE_URL + link;
                return fetch(filmFullUrl, { headers: { 'User-Agent': WORKING_HEADERS['User-Agent'] } });
            })
            .then(function(res) { return res.text(); })
            .then(function(filmHtml) {
                // VidID Yakalama
                var vidIdMatch = filmHtml.match(/vidid\s*[:=]\s*['"]?(\d+)['"]?/i);
                if (!vidIdMatch) throw new Error("Video ID bulunamadı");

                var targetPlayer = "https://rapidvid.net/e/" + vidIdMatch[1];
                console.error("[FullHD] Player Bulundu: " + targetPlayer);

                return fetch(targetPlayer, { 
                    headers: { 
                        'User-Agent': WORKING_HEADERS['User-Agent'],
                        'Referer': BASE_URL + '/'
                    } 
                });
            })
            .then(function(res) { return res ? res.text() : null; })
            .then(function(embedHtml) {
                if (!embedHtml) return resolve([]);

                var avMatch = embedHtml.match(/av\(['"]([^'"]+)['"]\)/);
                if (avMatch) {
                    var streamUrl = decodeRapidVid(avMatch[1]);
                    if (streamUrl) {
                        var finalUrl = streamUrl.startsWith("//") ? "https:" + streamUrl : streamUrl;
                        
                        // Şablon formatındaki zorunlu çıktı
                        var streams = [{
                            name: "FullHD - RapidVid", 
                            title: "FullHD Movie Stream",
                            url: finalUrl,
                            quality: "1080p",
                            size: "Unknown",
                            headers: Object.assign({}, WORKING_HEADERS, { 'Referer': 'https://rapidvid.net/' }),
                            provider: "fullhd_scraper"
                        }];

                        console.error("[FullHD] Akış Hazır!");
                        return resolve(streams);
                    }
                }
                resolve([]);
            })
            .catch(function(err) {
                console.error('[FullHD] Hata:', err.message);
                resolve([]); 
            });
    });
}

// React Native / Nuvio Export Yapısı
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { getStreams: getStreams };
} else {
    global.getStreams = getStreams;
}
