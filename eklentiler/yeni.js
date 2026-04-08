/**
 * Nuvio Local Scraper - HDFilmCehennemi Adaptasyonu
 * NOT: Tüm loglar console.error olmalıdır.
 */

var cheerio = require("cheerio-without-node-native");
var axios = require("axios");

const PROVIDER_NAME = "HDFilmCehennemi";
const BASE_URL = "https://www.hdfilmcehennemi.nl";
const EMPTY_RESULT = [];

const DEFAULT_HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:137.0) Gecko/20100101 Firefox/137.0",
    "X-Requested-With": "fetch"
};

/**
 * Kotlin'deki dcHello fonksiyonunun JavaScript karşılığı
 */
function decodeSource(parts) {
    try {
        // 1. Birleştir ve Tersine Çevir
        let joined = parts.join("").split("").reverse().join("");

        // 2. ROT13 Uygula
        let rot13 = joined.replace(/[a-zA-Z]/g, function(c) {
            return String.fromCharCode((c <= "Z" ? 90 : 122) >= (c = c.charCodeAt(0) + 13) ? c : c - 26);
        });

        // 3. Base64 Decode (Buffer kullanıyoruz)
        let decodedBytes = Buffer.from(rot13, 'base64');

        // 4. Unmix (Matematiksel Döngü)
        let unmixed = "";
        for (let i = 0; i < decodedBytes.length; i++) {
            let charCode = decodedBytes[i] & 0xFF;
            let newChar = (charCode - (399756995 % (i + 5)) + 256) % 256;
            unmixed += String.fromCharCode(newChar);
        }

        return unmixed.includes("https") ? "https" + unmixed.split("https")[1] : unmixed;
    } catch (e) {
        console.error(`[${PROVIDER_NAME}] Çözücü Hatası: ${e.message}`);
        return null;
    }
}

function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
    console.error(`[${PROVIDER_NAME}] Başlatıldı -> ID: ${tmdbId}`);

    return new Promise(function(resolve) {
        var isMovie = mediaType === 'movie';
        var tmdbUrl = 'https://api.themoviedb.org/3/' + (isMovie ? 'movie' : 'tv') + '/' + tmdbId + '?language=tr-TR&api_key=4ef0d7355d9ffb5151e987764708ce96';

        axios.get(tmdbUrl, { headers: DEFAULT_HEADERS })
            .then(function(response) {
                var query = response.data.title || response.data.name;
                console.error(`[${PROVIDER_NAME}] Aranan: ${query}`);

                // Arama İsteği (Kotlin'deki /search?q= mantığı)
                return axios.get(`${BASE_URL}/search?q=` + encodeURIComponent(query), { headers: DEFAULT_HEADERS });
            })
            .then(function(res) {
                // Kotlin'deki JSON sonuç yapısını simüle ediyoruz (Results data class)
                var searchData = res.data; 
                var firstResultHtml = (searchData.results && searchData.results.length > 0) ? searchData.results[0] : null;

                if (!firstResultHtml) {
                    console.error(`[${PROVIDER_NAME}] HATA: Site içi arama sonucu boş.`);
                    return resolve(EMPTY_RESULT);
                }

                var $search = cheerio.load(firstResultHtml);
                var targetUrl = $search("a").first().attr("href");

                if (!targetUrl) return resolve(EMPTY_RESULT);

                // TV ise sezon/bölüm URL yapısını ayarla (Kotlin mantığına uygun)
                if (!isMovie) {
                    // Not: HDFC genelde dizi linklerini farklı yapıda tutabilir, burayı siteye göre özelleştirebilirsin
                    targetUrl = targetUrl.replace(/\/$/, "") + "-sezon-" + seasonNum + "-bolum-" + episodeNum;
                }

                console.error(`[${PROVIDER_NAME}] Sayfa URL: ${targetUrl}`);
                return axios.get(targetUrl, { headers: DEFAULT_HEADERS });
            })
            .then(function(pageRes) {
                var $page = cheerio.load(pageRes.data);
                
                // Kotlin'deki loadLinks mantığı: "alternative-link" butonlarını bul
                var videoID = $page("button.alternative-link").first().attr("data-video");

                if (!videoID) {
                    console.error(`[${PROVIDER_NAME}] HATA: Video ID bulunamadı.`);
                    return resolve(EMPTY_RESULT);
                }

                // Video API isteği
                return axios.get(`${BASE_URL}/video/${videoID}/`, { 
                    headers: DEFAULT_HEADERS,
                    referer: pageRes.config.url 
                });
            })
            .then(function(apiRes) {
                var apiData = apiRes.data; // JSON String
                
                // Kotlin: Regex("""data-src=\\"([^"]+)""").find(apiGet)
                var iframeMatch = apiData.match(/data-src=\\"([^"]+)/);
                var iframeUrl = iframeMatch ? iframeMatch[1].replace(/\\/g, "") : "";

                if (iframeUrl.contains("rapidrame")) {
                    iframeUrl = BASE_URL + "/rplayer/" + iframeUrl.split("?rapidrame_id=")[1];
                }

                console.error(`[${PROVIDER_NAME}] Iframe/Player URL: ${iframeUrl}`);
                return axios.get(iframeUrl, { headers: DEFAULT_HEADERS });
            })
            .then(function(playerRes) {
                // Kotlin'deki getAndUnpack ve dcHello mantığı
                var scriptContent = playerRes.data;
                var fileLinkMatch = scriptContent.match(/file_link="(.*?)"/);
                
                if (!fileLinkMatch) {
                    console.error(`[${PROVIDER_NAME}] HATA: file_link bulunamadı.`);
                    return resolve(EMPTY_RESULT);
                }

                // Base64 parçalarını ayıkla (Kotlin: Regex("\"(.*?)\"").findAll(base64Input))
                var partsMatch = fileLinkMatch[1].match(/"(.*?)"/g);
                var parts = partsMatch ? partsMatch.map(p => p.replace(/"/g, "")) : [];

                var finalLink = decodeSource(parts);

                if (finalLink) {
                    console.error(`[${PROVIDER_NAME}] BAŞARILI LİNK: ${finalLink}`);
                    
                    resolve([{
                        name: PROVIDER_NAME,
                        title: "HDFC - HD",
                        url: finalLink,
                        quality: "1080p",
                        headers: {
                            "User-Agent": DEFAULT_HEADERS["User-Agent"],
                            "Referer": BASE_URL + "/"
                        }
                    }]);
                } else {
                    resolve(EMPTY_RESULT);
                }
            })
            .catch(function(err) {
                console.error(`[${PROVIDER_NAME}] KRİTİK HATA: ${err.message}`);
                resolve(EMPTY_RESULT);
            });
    });
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { getStreams: getStreams };
}
