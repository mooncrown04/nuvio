/**
 * Nuvio Local Scraper - SinemaCX (V12 - Şablon Düzeltilmiş Sürüm)
 */

var cheerio = require("cheerio-without-node-native");
var axios = require("axios");

const PROVIDER_NAME = "SinemaCX";
const BASE_URL = "https://www.sinema.news";
const EMPTY_RESULT = [];
const DEFAULT_HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:137.0) Gecko/20100101 Firefox/137.0",
    "X-Requested-With": "XMLHttpRequest"
};

function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
    console.error(`[${PROVIDER_NAME}] Başlatıldı -> ID: ${tmdbId}`);

    return new Promise(function(resolve) {
        var isMovie = mediaType === 'movie';
        var tmdbUrl = 'https://api.themoviedb.org/3/' + (isMovie ? 'movie' : 'tv') + '/' + tmdbId + '?language=tr-TR&api_key=4ef0d7355d9ffb5151e987764708ce96';

        axios.get(tmdbUrl, { headers: DEFAULT_HEADERS })
            .then(function(response) {
                var query = (response.data.title || response.data.name).toLowerCase().trim();
                console.error(`[${PROVIDER_NAME}] Aranan: ${query}`);
                
                return axios.get(`${BASE_URL}/?s=` + encodeURIComponent(query), { headers: DEFAULT_HEADERS })
                    .then(function(res) { return { html: res.data, query: query }; });
            })
            .then(function(obj) {
                // --- HATALI KISIM BURADA DÜZELTİLDİ ---
                var $search = cheerio.load(obj.html);
                var targetUrl = null;

                // Şablondaki results[0] yerine tüm sonuçları tara
                $search("div.icerik div.frag-k").each(function() {
                    var siteTitle = $search(this).find("div.yanac a").text().toLowerCase().trim();
                    
                    // Kesin isim eşleşmesi kontrolü (Türkçe karakter duyarlı)
                    if (siteTitle.includes(obj.query)) {
                        targetUrl = $search(this).find("div.yanac a").attr("href");
                        console.error(`[${PROVIDER_NAME}] Doğru eşleşme bulundu: ${siteTitle}`);
                        return false; // Bulduk, döngüyü kır
                    }
                });

                if (!targetUrl) {
                    console.error(`[${PROVIDER_NAME}] HATA: İsim eşleşmedi, yanlış film açılmaması için durduruldu.`);
                    return resolve(EMPTY_RESULT);
                }
                // --- DÜZELTME BİTTİ ---

                if (!isMovie) {
                    targetUrl = targetUrl.replace(/\/$/, "") + "-sezon-" + seasonNum + "-bolum-" + episodeNum;
                }

                console.error(`[${PROVIDER_NAME}] Sayfa URL: ${targetUrl}`);
                return axios.get(targetUrl, { headers: DEFAULT_HEADERS });
            })
            .then(function(pageRes) {
                var $page = cheerio.load(pageRes.data);
                
                // Fragman Atlatma Mantığı
                var iframes = [];
                $page("iframe").each(function() { iframes.push($page(this).attr("data-vsrc") || ""); });
                if (iframes.every(s => s.includes("youtube") || s.includes("fragman"))) {
                    var altUrl = pageRes.config.url.endsWith("/") ? pageRes.config.url + "2/" : pageRes.config.url + "/2/";
                    return axios.get(altUrl, { headers: DEFAULT_HEADERS });
                }
                return pageRes;
            })
            .then(function(finalRes) {
                var $final = cheerio.load(finalRes.data);
                var iframeUrl = "";

                $final("iframe").each(function() {
                    var src = $final(this).attr("data-vsrc") || $final(this).attr("src") || "";
                    if (src.includes("player.filmizle.in")) {
                        iframeUrl = src.split("?img=")[0];
                        return false;
                    }
                });

                if (!iframeUrl) return resolve(EMPTY_RESULT);

                var videoId = iframeUrl.split("/").pop();
                return axios.post("https://player.filmizle.in/player/index.php?data=" + videoId + "&do=getVideo", 
                    "data=" + videoId + "&do=getVideo", {
                    headers: {
                        "X-Requested-With": "XMLHttpRequest",
                        "Referer": iframeUrl,
                        "Content-Type": "application/x-www-form-urlencoded"
                    }
                });
            })
            .then(function(apiRes) {
                if (apiRes.data && apiRes.data.securedLink) {
                    resolve([{
                        name: PROVIDER_NAME,
                        title: "SinemaCX",
                        url: apiRes.data.securedLink,
                        quality: "1080p",
                        headers: { "User-Agent": DEFAULT_HEADERS["User-Agent"], "Referer": "https://player.filmizle.in/" }
                    }]);
                } else { resolve(EMPTY_RESULT); }
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
