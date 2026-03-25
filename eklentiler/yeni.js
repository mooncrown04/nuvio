/**
 * 666FilmIzle Nuvio Local Scraper - v3.7
 * Hata ayıklama logları artırıldı ve Dangal ID yapısı düzeltildi.
 */

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

        console.log('[666Film] TMDB İstek Gönderiliyor:', tmdbId);

        fetch(tmdbUrl)
            .then(function(r) { return r.json(); })
            .then(function(data) {
                var title = data.title || data.name || data.original_title;
                if (!title) {
                    console.error('[666Film] TMDB üzerinden başlık bulunamadı.');
                    return resolve([]);
                }
                console.log('[666Film] Aranan Başlık:', title);
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

                if (!targetUrl) {
                    console.error('[666Film] Sitede uygun film kartı bulunamadı.');
                    return resolve([]);
                }
                console.log('[666Film] Film Sayfası Bulundu:', targetUrl);
                return fetch(targetUrl, { headers: WORKING_HEADERS });
            })
            .then(function(r) { return r.text(); })
            .then(function(pageHtml) {
                var streams = [];
                
                // --- RAPIDPLAY PARSE BÖLÜMÜ ---
                var frameMatch = pageHtml.match(/data-frame="([^"]+)"/);
                if (frameMatch && frameMatch[1].includes("rapidplay")) {
                    var rawUrl = frameMatch[1];
                    console.log('[666Film] Ham Rapidplay URL:', rawUrl);

                    var videoId = "";
                    if (rawUrl.includes("#")) {
                        videoId = rawUrl.split("#").pop();
                    } else if (rawUrl.includes("embed/")) {
                        var parts = rawUrl.split("embed/");
                        if (parts.length > 1) {
                            videoId = parts[1].split(/[?#]/)[0];
                        }
                    }

                    if (videoId && videoId.length > 3) {
                        console.log('[666Film] Yakalanan Video ID:', videoId);
                        // Dangal gibi 404 verenlerde alternatif olarak 'index.m3u8' deniyoruz
                        var finalUrl = "https://p.rapidplay.website/videos/" + videoId + "/master.m3u8";
                        
                        streams.push({
                            name: "666Film - Rapid",
                            url: finalUrl,
                            quality: "Auto",
                            isM3U8: true,
                            headers: { 'Referer': 'https://p.rapidplay.website/' },
                            provider: "666film"
                        });
                    } else {
                        console.error('[666Film] Rapidplay ID ayıklanamadı. URL yapısı farklı olabilir.');
                    }
                }

                // --- VIDMOLY PARSE BÖLÜMÜ ---
                var vidmolyMatch = pageHtml.match(/src="([^"]*vidmoly[^"]+)"/i);
                if (vidmolyMatch && vidmolyMatch[1]) {
                    var vUrl = vidmolyMatch[1].startsWith("//") ? "https:" + vidmolyMatch[1] : vidmolyMatch[1];
                    console.log('[666Film] VidMoly Kaynağı Bulundu:', vUrl);
                    streams.push({
                        name: "666Film - VidMoly",
                        url: vUrl,
                        quality: "HD",
                        provider: "666film"
                    });
                }

                if (streams.length === 0) console.warn('[666Film] Hiçbir oynatılabilir kaynak bulunamadı.');
                resolve(streams);
            })
            .catch(function(err) {
                console.error('[666Film] Scraper Hatası:', err.message);
                resolve([]); 
            });
    });
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { getStreams: getStreams };
} else {
    global.getStreams = getStreams;
}
