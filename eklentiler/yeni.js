/**
 * Nuvio Local Scraper - SinemaCX (V13 - Nihai Şablon & Kesin Eşleşme)
 * Bu sürüm v4.4 şablonu üzerine V10 arama mantığı ile inşa edilmiştir.
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
    console.error(`[${PROVIDER_NAME}] İşlem Başlatıldı -> TMDB ID: ${tmdbId}`);

    return new Promise(function(resolve) {
        var isMovie = mediaType === 'movie';
        
        // 1. TMDB Bilgilerini Al (Türkçe)
        var tmdbUrl = 'https://api.themoviedb.org/3/' + (isMovie ? 'movie' : 'tv') + '/' + tmdbId + '?language=tr-TR&api_key=4ef0d7355d9ffb5151e987764708ce96';

        axios.get(tmdbUrl, { headers: DEFAULT_HEADERS })
            .then(function(response) {
                var query = (response.data.title || response.data.name).toLowerCase().trim();
                console.error(`[${PROVIDER_NAME}] TMDB Başlığı: ${query}`);
                
                // 2. Site İçi Arama (Türkçe Karakter Korumalı)
                return axios.get(`${BASE_URL}/?s=` + encodeURIComponent(query), { headers: DEFAULT_HEADERS })
                    .then(function(res) { return { html: res.data, query: query }; });
            })
            .then(function(obj) {
                var $search = cheerio.load(obj.html);
                var targetUrl = null;

                // V10 MANTIĞI: Listeyi tara ve TMDB ismiyle karşılaştır (İlk sonucu körü körüne alma!)
                $search("div.icerik div.frag-k").each(function() {
                    var siteTitle = $search(this).find("div.yanac a").text().toLowerCase().trim();
                    
                    // Eğer aranan isim site başlığında geçiyorsa doğru filmdir
                    if (siteTitle.includes(obj.query)) {
                        targetUrl = $search(this).find("div.yanac a").attr("href");
                        console.error(`[${PROVIDER_NAME}] Doğru Eşleşme Onaylandı: ${siteTitle}`);
                        return false; // Döngüyü kır
                    }
                });

                if (!targetUrl) {
                    console.error(`[${PROVIDER_NAME}] HATA: İsim eşleşmedi, alakasız içerik engellendi.`);
                    return resolve(EMPTY_RESULT);
                }

                // Dizi ise URL yapılandırması
                if (!isMovie) {
                    targetUrl = targetUrl.replace(/\/$/, "") + "-sezon-" + seasonNum + "-bolum-" + episodeNum;
                }

                console.error(`[${PROVIDER_NAME}] İçerik Sayfası: ${targetUrl}`);
                return axios.get(targetUrl, { headers: DEFAULT_HEADERS });
            })
            .then(function(pageRes) {
                var $page = cheerio.load(pageRes.data);
                
                // 3. Fragman/Film Ayrımı (Sayfa 2 Kontrolü)
                var iframes = [];
                $page("iframe").each(function() { iframes.push($page(this).attr("data-vsrc") || ""); });
                
                var isTrailer = iframes.every(s => s.includes("youtube") || s.includes("fragman") || s.includes("trailer"));
                if (isTrailer) {
                    console.error(`[${PROVIDER_NAME}] Sadece fragman bulundu, /2/ sayfasına bakılıyor...`);
                    var altUrl = pageRes.config.url.endsWith("/") ? pageRes.config.url + "2/" : pageRes.config.url + "/2/";
                    return axios.get(altUrl, { headers: DEFAULT_HEADERS });
                }
                return pageRes;
            })
            .then(function(finalRes) {
                var $final = cheerio.load(finalRes.data);
                var iframeUrl = "";

                // player.filmizle.in iframe'ini yakala
                $final("iframe").each(function() {
                    var src = $final(this).attr("data-vsrc") || $final(this).attr("src") || "";
                    if (src.includes("player.filmizle.in")) {
                        iframeUrl = src.split("?img=")[0];
                        return false;
                    }
                });

                if (!iframeUrl) {
                    console.error(`[${PROVIDER_NAME}] HATA: Video iframe bulunamadı.`);
                    return resolve(EMPTY_RESULT);
                }

                // 4. getVideo API İsteği (POST)
                var videoId = iframeUrl.split("/").pop();
                var apiUrl = "https://player.filmizle.in/player/index.php?data=" + videoId + "&do=getVideo";

                return axios.post(apiUrl, "data=" + videoId + "&do=getVideo", {
                    headers: {
                        "X-Requested-With": "XMLHttpRequest",
                        "Referer": iframeUrl,
                        "Content-Type": "application/x-www-form-urlencoded"
                    }
                });
            })
            .then(function(apiRes) {
                // 5. Final Linki Paketle
                if (apiRes.data && apiRes.data.securedLink) {
                    var finalLink = apiRes.data.securedLink;
                    console.error(`[${PROVIDER_NAME}] Başarılı! Link Yakalandı.`);
                    
                    resolve([{
                        name: PROVIDER_NAME,
                        title: "SinemaCX - 1080p",
                        url: finalLink,
                        quality: "1080p",
                        headers: { 
                            "User-Agent": DEFAULT_HEADERS["User-Agent"], 
                            "Referer": "https://player.filmizle.in/" 
                        }
                    }]);
                } else {
                    console.error(`[${PROVIDER_NAME}] HATA: securedLink alınamadı.`);
                    resolve(EMPTY_RESULT);
                }
            })
            .catch(function(err) {
                console.error(`[${PROVIDER_NAME}] KRİTİK HATA: ${err.message}`);
                resolve(EMPTY_RESULT);
            });
    });
}

// Module Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { getStreams: getStreams };
}
