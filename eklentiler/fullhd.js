/**
 * FullHDFilmizlesene Nuvio Scraper - v16.3
 * SineWix/Dizipal mantığı ile stabilize edilmiş, sistem hatalarına dirençli sürüm.
 */

var cheerio = require("cheerio-without-node-native");

// SineWix.js'den alınan ve cihazında çalışan en güvenli header seti
const STREAM_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    'Accept': 'video/webm,video/ogg,video/*;q=0.9,application/ogg;q=0.7,audio/*;q=0.6,*/*;q=0.5',
    'Accept-Language': 'tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7',
    'Accept-Encoding': 'identity',
    'Referer': 'https://www.fullhdfilmizlesene.live/',
    'Origin': 'https://www.fullhdfilmizlesene.live',
    'Sec-Fetch-Dest': 'video',
    'Sec-Fetch-Mode': 'no-cors',
    'Sec-Fetch-Site': 'cross-site',
    'DNT': '1'
};

const BASE_URL = "https://www.fullhdfilmizlesene.live";

/**
 * RapidVid linklerini çözen motor
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
        // FullHD sadece filmleri destekler (SineWix formatında kısıtlama)
        if (mediaType !== 'movie') return resolve([]);

        var tmdbUrl = 'https://api.themoviedb.org/3/movie/' + tmdbId + '?language=tr-TR&api_key=4ef0d7355d9ffb5151e987764708ce96';

        console.log('[FullHD] İşlem Başlatıldı:', tmdbId);

        fetch(tmdbUrl)
            .then(function(res) { return res.json(); })
            .then(function(data) {
                var title = data.title || data.original_title;
                var year = (data.release_date || "").substring(0, 4);
                console.log('[FullHD] TMDB Başlık:', title);
                
                // Sitede Arama (Dizipal mantığı ile)
                return fetch(BASE_URL + '/arama/' + encodeURIComponent(title), { headers: { 'User-Agent': STREAM_HEADERS['User-Agent'] } })
                    .then(function(res) { return res.text(); })
                    .then(function(html) {
                        var $ = cheerio.load(html);
                        var link = $(".film-listesi a").first().attr("href");
                        if (!link) throw new Error("Film Bulunamadı");
                        
                        var filmUrl = link.startsWith('http') ? link : BASE_URL + link;
                        return fetch(filmUrl, { headers: { 'User-Agent': STREAM_HEADERS['User-Agent'] } });
                    })
                    .then(function(res) { return res.text(); })
                    .then(function(filmHtml) {
                        var vidIdMatch = filmHtml.match(/vidid\s*[:=]\s*['"]?(\d+)['"]?/i);
                        if (!vidIdMatch) throw new Error("vidid Ayıklanamadı");

                        var playerUrl = "https://rapidvid.net/e/" + vidIdMatch[1];
                        console.log('[FullHD] Player URL:', playerUrl);

                        return fetch(playerUrl, { 
                            headers: { 'User-Agent': STREAM_HEADERS['User-Agent'], 'Referer': BASE_URL + '/' } 
                        });
                    })
                    .then(function(res) { return res.text(); })
                    .then(function(embedHtml) {
                        var avMatch = embedHtml.match(/av\(['"]([^'"]+)['"]\)/);
                        if (avMatch) {
                            var rawUrl = decodeRapidVid(avMatch[1]);
                            if (rawUrl) {
                                var streamLink = rawUrl.startsWith("//") ? "https:" + rawUrl : rawUrl;
                                
                                // SineWix.js ile aynı çıktı formatı
                                resolve([{
                                    name: '⌜ FullHD ⌟ | RapidVid',
                                    title: title + (year ? ' (' + year + ')' : ''),
                                    url: streamLink,
                                    quality: '1080p',
                                    size: 'Auto',
                                    headers: Object.assign({}, STREAM_HEADERS, { 'Referer': 'https://rapidvid.net/' }),
                                    provider: 'fullhd_scraper'
                                }]);
                                return;
                            }
                        }
                        resolve([]);
                    });
            })
            .catch(function(err) {
                console.error('[FullHD] Kritik Hata:', err.message);
                resolve([]);
            });
    });
}

// Global Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { getStreams: getStreams };
} else {
    global.getStreams = getStreams;
}
