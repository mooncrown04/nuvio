var cheerio = require("cheerio-without-node-native");

var BASE_URL = "https://666filmizle.site";
var TMDB_API_KEY = "500330721680edb6d5f7f12ba7cd9023";

var WORKING_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept-Language': 'tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7',
    'Referer': BASE_URL + '/'
};

function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
    return new Promise(function(resolve) {
        var type = (mediaType === 'tv' || mediaType === 'series') ? 'tv' : 'movie';
        var tmdbUrl = 'https://api.themoviedb.org/3/' + type + '/' + tmdbId + '?api_key=' + TMDB_API_KEY + '&language=tr-TR';

        fetch(tmdbUrl)
            .then(function(r) { return r.json(); })
            .then(function(data) {
                var title = data.title || data.name || data.original_title;
                if (!title) return resolve([]);
                
                var searchUrl = BASE_URL + '/arama/?q=' + encodeURIComponent(title);
                return fetch(searchUrl, { headers: WORKING_HEADERS });
            })
            .then(function(res) { return res.text(); })
            .then(function(html) {
                var $ = cheerio.load(html);
                var targetUrl = "";

                $(".film-card").each(function() {
                    var cardLink = $(this).find("a.film-card__link").attr("href");
                    if (cardLink) {
                        targetUrl = cardLink.startsWith('http') ? cardLink : BASE_URL + cardLink;
                        return false; 
                    }
                });

                if (!targetUrl) return resolve([]);
                return fetch(targetUrl, { headers: WORKING_HEADERS });
            })
            .then(function(r) { return r.text(); })
            .then(function(pageHtml) {
                var streams = [];
                
                try {
                    // 1. RAPIDPLAY - Sadece 'data-frame' içindeki ID'yi alıyoruz
                    var rapidMatch = pageHtml.match(/data-frame="([^"]*rapidplay\.website\/embed\/([^"#?]+)[^"]*)"/i);
                    if (rapidMatch && rapidMatch[2]) {
                        streams.push({
                            name: "666Film - Rapidplay",
                            url: "https://p.rapidplay.website/videos/" + rapidMatch[2] + "/index.m3u8",
                            quality: "Auto",
                            isM3U8: true,
                            headers: { 'Referer': 'https://p.rapidplay.website/' },
                            provider: "666film"
                        });
                    }

                    // 2. VIDMOLY - Sadece 'vidmoly' içerenleri al, belirsiz playerları alma
                    var iframeRegex = /<iframe[^>]+src="([^"]+)"/gi;
                    var frame;
                    while ((frame = iframeRegex.exec(pageHtml)) !== null) {
                        var src = frame[1];
                        if (src && (src.includes("vidmoly") || src.includes("moly"))) {
                            streams.push({
                                name: "666Film - VidMoly",
                                url: src.startsWith("//") ? "https:" + src : src,
                                quality: "HD",
                                provider: "666film"
                            });
                        }
                    }
                } catch (e) {
                    // Kodun içinde bir hata olursa uygulama çökmesin diye boş dönüyoruz
                    console.log("[666Film] Parse error: " + e.message);
                }

                resolve(streams);
            })
            .catch(function(err) {
                console.log("[666Film] Error: " + err.message);
                resolve([]); 
            });
    });
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { getStreams: getStreams };
} else {
    global.getStreams = getStreams;
}
