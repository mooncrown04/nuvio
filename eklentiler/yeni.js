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
 * CS3'teki dcHello/unmix mantığının Nuvio uyarlaması
 */
function decodeSource(parts) {
    try {
        console.error(`[${PROVIDER_NAME}] Çözücü: ${parts.length} parça işleniyor...`);
        let joined = parts.join("").split("").reverse().join("");
        let rot13 = joined.replace(/[a-zA-Z]/g, function(c) {
            return String.fromCharCode((c <= "Z" ? 90 : 122) >= (c = c.charCodeAt(0) + 13) ? c : c - 26);
        });
        let decodedBytes = Buffer.from(rot13, 'base64');
        let unmixed = "";
        for (let i = 0; i < decodedBytes.length; i++) {
            let charCode = decodedBytes[i] & 0xFF;
            let newChar = (charCode - (399756995 % (i + 5)) + 256) % 256;
            unmixed += String.fromCharCode(newChar);
        }
        const finalUrl = unmixed.includes("https") ? "https" + unmixed.split("https")[1] : unmixed;
        console.error(`[${PROVIDER_NAME}] Çözülen URL Başarılı.`);
        return finalUrl;
    } catch (e) {
        console.error(`[${PROVIDER_NAME}] Çözücü Hatası: ${e.message}`);
        return null;
    }
}

function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
    console.error(`[${PROVIDER_NAME}] --- İŞLEM BAŞLATILDI ---`);
    console.error(`[${PROVIDER_NAME}] Parametreler -> ID: ${tmdbId}, Tip: ${mediaType}, S:${seasonNum} E:${episodeNum}`);

    return new Promise(function(resolve) {
        var isMovie = mediaType === 'movie';
        var tmdbUrl = 'https://api.themoviedb.org/3/' + (isMovie ? 'movie' : 'tv') + '/' + tmdbId + '?language=tr-TR&api_key=4ef0d7355d9ffb5151e987764708ce96';

        axios.get(tmdbUrl, { headers: DEFAULT_HEADERS })
            .then(function(response) {
                var query = response.data.title || response.data.name;
                console.error(`[${PROVIDER_NAME}] TMDB Başlık: ${query}`);
                return axios.get(`${BASE_URL}/search?q=` + encodeURIComponent(query), { headers: DEFAULT_HEADERS });
            })
            .then(function(res) {
                var searchData = res.data; 
                console.error(`[${PROVIDER_NAME}] Arama Yanıtı Alındı. Sonuç Sayısı: ${searchData.results ? searchData.results.length : 0}`);
                
                var firstResultHtml = (searchData.results && searchData.results.length > 0) ? searchData.results[0] : null;
                if (!firstResultHtml) {
                    console.error(`[${PROVIDER_NAME}] HATA: Arama sonucu boş döndü (Site başlığı bulamadı).`);
                    return resolve(EMPTY_RESULT);
                }

                var $search = cheerio.load(firstResultHtml);
                var targetUrl = $search("a").first().attr("href");
                if (!targetUrl) {
                    console.error(`[${PROVIDER_NAME}] HATA: Sonuç HTML içinde href bulunamadı.`);
                    return resolve(EMPTY_RESULT);
                }

                if (!isMovie) {
                    targetUrl = targetUrl.replace(/\/$/, "") + "-sezon-" + seasonNum + "-bolum-" + episodeNum;
                }
                console.error(`[${PROVIDER_NAME}] Hedef Sayfa: ${targetUrl}`);
                return axios.get(targetUrl, { headers: DEFAULT_HEADERS });
            })
            .then(function(pageRes) {
                var $page = cheerio.load(pageRes.data);
                var videoID = $page("button.alternative-link").first().attr("data-video");
                
                if (!videoID) {
                    console.error(`[${PROVIDER_NAME}] HATA: Sayfada video ID (data-video) bulunamadı.`);
                    return resolve(EMPTY_RESULT);
                }
                console.error(`[${PROVIDER_NAME}] Video ID Bulundu: ${videoID}`);
                return axios.get(`${BASE_URL}/video/${videoID}/`, { 
                    headers: DEFAULT_HEADERS, 
                    referer: pageRes.config.url 
                });
            })
            .then(function(apiRes) {
                console.error(`[${PROVIDER_NAME}] Video API Yanıtı Alındı.`);
                var iframeMatch = apiRes.data.match(/data-src=\\"([^"]+)/);
                var iframeUrl = iframeMatch ? iframeMatch[1].replace(/\\/g, "") : "";

                if (iframeUrl.includes("rapidrame")) {
                    iframeUrl = BASE_URL + "/rplayer/" + iframeUrl.split("?rapidrame_id=")[1];
                }
                
                if (!iframeUrl) {
                    console.error(`[${PROVIDER_NAME}] HATA: Iframe URL ayıklanamadı.`);
                    return resolve(EMPTY_RESULT);
                }
                console.error(`[${PROVIDER_NAME}] Çözülecek Iframe: ${iframeUrl}`);
                return axios.get(iframeUrl, { headers: DEFAULT_HEADERS });
            })
            .then(function(playerRes) {
                var fileLinkMatch = playerRes.data.match(/file_link=\"(.*?)\"/);
                if (!fileLinkMatch) {
                    console.error(`[${PROVIDER_NAME}] HATA: Player içinde file_link regex eşleşmedi.`);
                    return resolve(EMPTY_RESULT);
                }

                var partsMatch = fileLinkMatch[1].match(/\"(.*?)\"/g);
                var parts = partsMatch ? partsMatch.map(p => p.replace(/\"/g, "")) : [];
                
                console.error(`[${PROVIDER_NAME}] Şifreli Parçalar Yakalandı, dcHello Başlatılıyor...`);
                var finalLink = decodeSource(parts);

                if (finalLink) {
                    console.error(`[${PROVIDER_NAME}] TAMAMLANDI: Yayın linki oluşturuldu.`);
                    resolve([{
                        name: PROVIDER_NAME,
                        title: "HDFC - Full HD",
                        url: finalLink,
                        quality: "1080p",
                        headers: { 
                            "User-Agent": DEFAULT_HEADERS["User-Agent"], 
                            "Referer": BASE_URL + "/" 
                        }
                    }]);
                } else { 
                    console.error(`[${PROVIDER_NAME}] HATA: Çözücüden boş link döndü.`);
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
