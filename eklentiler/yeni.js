/**
 * 666FilmIzle Nuvio Local Scraper - v4.0
 * Hata ayıklama (Debug) için genişletilmiş log desteği eklendi.
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

        console.log('[666Film] TMDB Istegi Atiliyor:', tmdbId);

        fetch(tmdbUrl)
            .then(function(r) { return r.json(); })
            .then(function(data) {
                var title = data.title || data.name || data.original_title;
                console.log('[666Film] TMDB Basligi Bulundu:', title);
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

                console.log('[666Film] Hedef Film Sayfasi:', targetUrl);
                if (!targetUrl) return resolve([]);
                return fetch(targetUrl, { headers: WORKING_HEADERS });
            })
            .then(function(r) { return r.text(); })
            .then(function(pageHtml) {
                var streams = [];
                
                // RAPIDPLAY AYIKLAMA LOGLARI
                var frameMatch = pageHtml.match(/data-frame="([^"]+)"/);
                if (frameMatch) {
                    var rawUrl = frameMatch[1];
                    console.log('[666Film] Ham Frame URL:', rawUrl);

                    var videoId = "";
                    if (rawUrl.indexOf('#') !== -1) {
                        videoId = rawUrl.split('#').pop();
                        console.log('[666Film] Hash (#) Tipinde ID Yakalandi:', videoId);
                    } else if (rawUrl.indexOf('embed/') !== -1) {
                        videoId = rawUrl.split('embed/').pop().split(/[?#]/)[0];
                        console.log('[666Film] Embed Tipinde ID Yakalandi:', videoId);
                    } else {
                        var parts = rawUrl.split('/');
                        videoId = parts[parts.length - 1] || parts[parts.length - 2];
                        console.log('[666Film] Standart ID Yakalandi:', videoId);
                    }

                    if (videoId && videoId.length > 4) {
                        // BURASI KRITIK: 404 hatasini onlemek icin index.m3u8 deniyoruz
                        var streamUrl = "https://p.rapidplay.website/videos/" + videoId + "/index.m3u8";
                        console.log('[666Film] Olusturulan Nihai Stream URL:', streamUrl);

                        streams.push({
                            name: "666Film - Rapidplay",
                            url: streamUrl,
                            quality: "Auto",
                            isM3U8: true,
                            headers: { 
                                'Referer': 'https://666filmizle.site/',
                                'Origin': 'https://666filmizle.site',
                                'User-Agent': WORKING_HEADERS['User-Agent']
                            },
                            provider: "666film"
                        });
                    }
                }

                // VIDMOLY KONTROLU
                var iframeRegex = /<iframe[^>]+src="([^"]+)"/gi;
                var match;
                while ((match = iframeRegex.exec(pageHtml)) !== null) {
                    var src = match[1];
                    if (src.includes("vidmoly") || src.includes("mlycdn")) {
                        console.log('[666Film] Alternatif VidMoly Bulundu:', src);
                        streams.push({
                            name: "666Film - VidMoly",
                            url: src.startsWith("//") ? "https:" + src : src,
                            quality: "HD",
                            provider: "666film"
                        });
                    }
                }

                if (streams.length === 0) console.log('[666Film] HATA: Hicbir stream kaynagi bulunamadi!');
                resolve(streams);
            })
            .catch(function(err) {
                console.error('[666Film] KRITIK HATA:', err.message);
                resolve([]); 
            });
    });
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { getStreams: getStreams };
} else {
    global.getStreams = getStreams;
}
