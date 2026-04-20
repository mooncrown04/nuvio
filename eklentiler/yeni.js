// Version: 5.0 (DEŞİFRE MODU - Sadece Analiz)
// Note: console.error ile ham veri avcılığı.

var cheerio = require("cheerio-without-node-native");

const PROVIDER_NAME = "HDFilmCehennemi";
const BASE_URL = "https://www.hdfilmcehennemi.nl";
const DEFAULT_HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept-Language": "tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7"
};

function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
    console.error("[" + PROVIDER_NAME + "] v5.0 DEŞİFRE MODU BAŞLATILDI");
    
    return new Promise(function(resolve) {
        var isMovie = mediaType === 'movie';
        var tmdbUrl = 'https://api.themoviedb.org/3/' + (isMovie ? 'movie' : 'tv') + '/' + tmdbId + '?language=tr-TR&api_key=4ef0d7355d9ffb5151e987764708ce96';

        fetch(tmdbUrl, { headers: DEFAULT_HEADERS })
            .then(function(res) { return res.json(); })
            .then(function(tmdbData) {
                var query = (tmdbData.title || tmdbData.name || "").replace(/['":]/g, "").trim();
                return fetch(BASE_URL + "/search?q=" + encodeURIComponent(query), { headers: DEFAULT_HEADERS });
            })
            .then(function(res) { return res.json(); })
            .then(function(searchData) {
                var results = searchData.results || [];
                if (results.length === 0) throw new Error("Arama sonucu yok.");
                
                var $search = cheerio.load(results[0]);
                var targetUrl = $search("a").first().attr("href");
                console.error("[" + PROVIDER_NAME + "] ANALİZ EDİLEN URL -> " + targetUrl);
                return fetch(targetUrl, { headers: DEFAULT_HEADERS });
            })
            .then(function(res) { return res.text(); })
            .then(function(pageHtml) {
                // --- DEŞİFRE ALANI ---
                // 1. Script etiketlerini sayalım ve ilk 100 karakterlerini görelim
                var $ = cheerio.load(pageHtml);
                var scripts = [];
                $("script").each(function(i, el) {
                    var src = $(el).attr("src");
                    var content = $(el).html().substring(0, 40).replace(/\s+/g, " ");
                    scripts.push(src ? "SRC: " + src : "INT: " + content);
                });
                console.error("[" + PROVIDER_NAME + "] SCRIPT HARİTASI -> " + JSON.stringify(scripts.slice(0, 5)));

                // 2. Video container'ın içini olduğu gibi basalım
                var playerArea = $(".player-container").html() || "PLAYER_CONTAINER_YOK";
                console.error("[" + PROVIDER_NAME + "] PLAYER ALANI (HAM) -> " + playerArea.substring(0, 200));

                // 3. ID olabilecek gizli inputlar
                var inputs = [];
                $("input[type='hidden']").each(function(i, el) {
                    inputs.push($(el).attr("id") + "=" + $(el).val());
                });
                console.error("[" + PROVIDER_NAME + "] GİZLİ INPUTLAR -> " + JSON.stringify(inputs));

                throw new Error("ANALİZ TAMAMLANDI - LOGLARI KONTROL ET");
            })
            .catch(function(err) {
                console.error("[" + PROVIDER_NAME + "] DURUM -> " + err.message);
                resolve([]);
            });
    });
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { getStreams: getStreams };
}
