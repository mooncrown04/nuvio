/**
 * FullHDFilmizlesene Nuvio Scraper - v16.9
 * Hata Ayıklama Logları Eklenmiş Sürüm
 */

var cheerio = require("cheerio-without-node-native");

const STABLE_HEADERS = {
    'User-Agent': 'EasyPlex (Android 14; SM-A546B; Samsung Galaxy A54 5G; tr)',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
    'Accept-Language': 'tr-TR,tr;q=0.9'
};

const BASE_URL = "https://www.fullhdfilmizlesene.live";

function decryptStream(cipherText) {
    try {
        console.log("[FullHD-DEBUG] AES Decrypt işlemi başlatıldı.");
        var reversed = cipherText.split("").reverse().join("");
        var decoded = atob(reversed.replace(/[^A-Za-z0-9+/=]/g, ""));
        var key = "K9L", result = "";
        for (var i = 0; i < decoded.length; i++) {
            var shift = (key.charCodeAt(i % key.length) % 5) + 1;
            result += String.fromCharCode(decoded.charCodeAt(i) - shift);
        }
        var final = atob(result).replace(/\\/g, "").trim();
        console.log("[FullHD-DEBUG] AES Decrypt başarılı.");
        return final;
    } catch (e) { 
        console.log("[FullHD-DEBUG] AES Decrypt HATASI: " + e.message);
        return null; 
    }
}

function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
    return new Promise(function(resolve) {
        if (mediaType !== 'movie') {
            console.log("[FullHD-DEBUG] Sadece film destekleniyor.");
            return resolve([]);
        }

        console.log("[FullHD-DEBUG] İşlem Başladı. TMDB ID: " + tmdbId);

        var tmdbUrl = 'https://api.themoviedb.org/3/movie/' + tmdbId + '?language=tr-TR&api_key=4ef0d7355d9ffb5151e987764708ce96';

        fetch(tmdbUrl)
            .then(function(res) { 
                console.log("[FullHD-DEBUG] TMDB isteği gönderildi.");
                return res.json(); 
            })
            .then(function(data) {
                var query = data.title || data.original_title;
                console.log("[FullHD-DEBUG] Film Adı Bulundu: " + query);
                return fetch(BASE_URL + '/arama/' + encodeURIComponent(query), { headers: STABLE_HEADERS });
            })
            .then(function(res) { 
                console.log("[FullHD-DEBUG] Arama sayfasına erişildi.");
                return res.text(); 
            })
            .then(function(html) {
                var $ = cheerio.load(html);
                var filmPath = $(".film-listesi a").first().attr("href") || $("a[href*='/film/']").first().attr("href");
                
                if (!filmPath) {
                    console.log("[FullHD-DEBUG] Arama sonucunda film bulunamadı.");
                    throw new Error("Film Bulunamaz");
                }
                
                console.log("[FullHD-DEBUG] Film Sayfası Linki: " + filmPath);
                var filmUrl = filmPath.startsWith('http') ? filmPath : BASE_URL + filmPath;
                return fetch(filmUrl, { headers: STABLE_HEADERS });
            })
            .then(function(res) { 
                console.log("[FullHD-DEBUG] Film detay sayfası okundu.");
                return res.text(); 
            })
            .then(function(filmHtml) {
                var vidMatch = filmHtml.match(/vidid\s*[:=]\s*['"]?(\d+)['"]?/i);
                if (!vidMatch) {
                    console.log("[FullHD-DEBUG] Sayfa içinde Video ID bulunamadı.");
                    throw new Error("Video ID Yok");
                }

                console.log("[FullHD-DEBUG] Video ID: " + vidMatch[1]);
                var playerUrl = "https://rapidvid.net/e/" + vidMatch[1];
                return fetch(playerUrl, { 
                    headers: { 'User-Agent': STABLE_HEADERS['User-Agent'], 'Referer': BASE_URL + '/' } 
                });
            })
            .then(function(res) { 
                console.log("[FullHD-DEBUG] RapidVid player sayfasına erişildi.");
                return res.text(); 
            })
            .then(function(embedHtml) {
                var avMatch = embedHtml.match(/av\(['"]([^'"]+)['"]\)/);
                if (avMatch) {
                    console.log("[FullHD-DEBUG] Şifreli veri bulundu, çözülüyor...");
                    var finalLink = decryptStream(avMatch[1]);
                    if (finalLink) {
                        var streamUrl = finalLink.startsWith("//") ? "https:" + finalLink : finalLink;
                        console.log("[FullHD-DEBUG] Link başarıyla oluşturuldu.");
                        
                        resolve([{
                            name: '⌜ FullHD ⌟ | RapidVid',
                            url: streamUrl,
                            quality: '1080p',
                            headers: {
                                'User-Agent': STABLE_HEADERS['User-Agent'],
                                'Referer': 'https://rapidvid.net/'
                            },
                            provider: 'fullhd_scraper'
                        }]);
                        return;
                    }
                }
                console.log("[FullHD-DEBUG] Video datası (av) bulunamadı.");
                resolve([]);
            })
            .catch(function(err) {
                console.log("[FullHD-DEBUG] KRİTİK HATA: " + err.message);
                resolve([]);
            });
    });
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { getStreams: getStreams };
} else {
    global.getStreams = getStreams;
}
