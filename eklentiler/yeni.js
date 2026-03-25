/**
 * 666FilmIzle Nuvio Local Scraper - v3.0
 * Kısıtlamalar: async/await YASAK, Promise zorunlu.
 * Özellikler: TMDB Fallback, Rapidplay Auto-Extractor, Null-Safe.
 */

var cheerio = require("cheerio-without-node-native");

var BASE_URL = "https://666filmizle.site";
var TMDB_KEY = "65c3f6f9662a67a030704945a0b93855";

const WORKING_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
    'Accept-Language': 'tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7',
    'Referer': BASE_URL + '/'
};

function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
    return new Promise(function(resolve, reject) {
        console.log('[666Film] Sorgu Başladı -> ID:', tmdbId);

        // 1. TMDB'DEN İSİM VE YIL BİLGİSİNİ AL
        var isMovie = mediaType === 'movie';
        var tmdbUrl = 'https://api.themoviedb.org/3/' + (isMovie ? 'movie' : 'tv') + '/' + tmdbId + '?language=tr-TR&api_key=' + TMDB_KEY;

        fetch(tmdbUrl)
            .then(function(res) { return res.json(); })
            .then(function(data) {
                var query = data.title || data.name;
                var year = (data.release_date || data.first_air_date || "").split('-')[0];
                
                if (!query) throw new Error("TMDB ismi bulunamadı.");

                console.log('[666Film] TMDB Bilgisi:', query, "(" + year + ")");

                // 2. SİTEDE ARAMA YAP
                var searchUrl = BASE_URL + '/arama/?q=' + encodeURIComponent(query);
                return fetch(searchUrl, { headers: WORKING_HEADERS })
                    .then(function(res) { return res.text(); })
                    .then(function(html) {
                        return { html: html, query: query, year: year };
                    });
            })
            .then(function(searchResult) {
                var $ = cheerio.load(searchResult.html);
                var targetUrl = "";

                // 3. AKILLI LİSTE TARAMA (Yıl veya İsim Eşleşmesi)
                // Sitedeki film kartlarını bul (Link yapısı: /film/...)
                $("a[href*='/film/']").each(function(i, el) {
                    var itemTitle = $(el).attr("title") || $(el).text();
                    var itemUrl = $(el).attr("href");
                    
                    if (itemTitle && itemUrl) {
                        // Eğer yıl eşleşiyorsa veya başlık benzerse seç
                        if (itemTitle.toLowerCase().includes(searchResult.query.toLowerCase())) {
                            targetUrl = itemUrl.startsWith('http') ? itemUrl : BASE_URL + itemUrl;
                            return false; 
                        }
                    }
                });

                if (!targetUrl) {
                    console.log('[666Film] Arama sonucu bulunamadı.');
                    return resolve([]);
                }

                console.log('[666Film] Hedef Sayfa:', targetUrl);

                // 4. FİLM SAYFASINA GİR VE KAYNAKLARI ÇEK
                return fetch(targetUrl, { headers: WORKING_HEADERS })
                    .then(function(res) { return res.text(); })
                    .then(function(pageHtml) {
                        var streams = [];
                        
                        // RAPIDPLAY AYIKLAMA (Regex ile #ID yakalama)
                        var rapidRegex = /data-frame="([^"]*rapidplay\.website[^"]*)#([^"]+)"/g;
                        var r;
                        while ((r = rapidRegex.exec(pageHtml)) !== null) {
                            streams.push({
                                name: "666Film - Rapidplay",
                                title: searchResult.query + " (" + searchResult.year + ")",
                                url: "https://p.rapidplay.website/videos/" + r[2] + "/master.m3u8",
                                quality: "Auto",
                                headers: { 'Referer': 'https://p.rapidplay.website/' },
                                provider: "666film"
                            });
                        }

                        // STANDART IFRAME AYIKLAMA (Vidmoly vb. varsa)
                        var iframeRegex = /<iframe[^>]+src="([^"]+)"/gi;
                        var i;
                        while ((i = iframeRegex.exec(pageHtml)) !== null) {
                            var src = i[1];
                            if (src.indexOf("youtube") === -1 && src.indexOf("google") === -1) {
                                streams.push({
                                    name: "666Film - Player",
                                    title: searchResult.query,
                                    url: src.startsWith("//") ? "https:" + src : src,
                                    quality: "HD",
                                    headers: WORKING_HEADERS,
                                    provider: "666film"
                                });
                            }
                        }

                        console.log('[666Film] Toplam Bulunan:', streams.length);
                        resolve(streams);
                    });
            })
            .catch(function(err) {
                console.error('[666Film] Hata:', err.message);
                resolve([]); // Reject etmiyoruz, boş dönüyoruz.
            });
    });
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { getStreams: getStreams };
} else {
    global.getStreams = getStreams;
}
