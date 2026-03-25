/**
 * 666FilmIzle Nuvio Local Scraper - v3.1
 * TMDB Çözücü ve Arama Mantığı Güçlendirildi.
 */

var cheerio = require("cheerio-without-node-native");

var BASE_URL = "https://666filmizle.site";
var TMDB_API_KEY = "500330721680edb6d5f7f12ba7cd9023"; // Paylaştığın JetFilmizle key'i ile güncellendi

var WORKING_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
    'Accept-Language': 'tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7',
    'Referer': BASE_URL + '/'
};

function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
    return new Promise(function(resolve) {
        console.log('[666Film] İşlem başladı. ID:', tmdbId);

        // 1. TMDB BİLGİSİNİ ÇEK (JetFilmizle mantığı: movie/tv fallback)
        var type = (mediaType === 'tv' || mediaType === 'series') ? 'tv' : 'movie';
        var tmdbUrl = 'https://api.themoviedb.org/3/' + type + '/' + tmdbId + '?api_key=' + TMDB_API_KEY + '&language=tr-TR';

        fetch(tmdbUrl)
            .then(function(r) { return r.json(); })
            .then(function(data) {
                var title = data.title || data.name || data.original_title || data.original_name;
                if (!title) throw new Error("İsim bulunamadı");
                
                var year = (data.release_date || data.first_air_date || "").split('-')[0];
                console.log('[666Film] TMDB Bulundu:', title, year);

                // 2. SİTEDE ARAMA YAP
                var searchUrl = BASE_URL + '/arama/?q=' + encodeURIComponent(title);
                return fetch(searchUrl, { headers: WORKING_HEADERS })
                    .then(function(res) { return res.text(); })
                    .then(function(html) {
                        return { html: html, title: title, year: year };
                    });
            })
            .then(function(res) {
                var $ = cheerio.load(res.html);
                var targetUrl = "";

                // 3. ARAMA SONUCUNU ANALİZ ET
                // Sitedeki film kartlarını tarıyoruz
                $(".film-card").each(function() {
                    var cardTitle = $(this).find(".film-card__title, h3").text().trim();
                    var cardLink = $(this).find("a.film-card__link").attr("href");

                    // Basit bir benzerlik kontrolü (Title içeriyorsa)
                    if (cardLink && cardTitle.toLowerCase().includes(res.title.toLowerCase().substring(0, 5))) {
                        targetUrl = cardLink.startsWith('http') ? cardLink : BASE_URL + cardLink;
                        return false; 
                    }
                });

                // Eğer yukarıdaki döngü bulamazsa ilk linki dene
                if (!targetUrl) {
                    var firstMatch = $("a[href*='/film/']").first().attr("href");
                    if (firstMatch) targetUrl = firstMatch.startsWith('http') ? firstMatch : BASE_URL + firstMatch;
                }

                if (!targetUrl) {
                    console.log('[666Film] Sitede eşleşme bulunamadı.');
                    return resolve([]);
                }

                console.log('[666Film] Sayfa URL:', targetUrl);

                // 4. SAYFAYI ÇÖZÜMLE
                return fetch(targetUrl, { headers: WORKING_HEADERS })
                    .then(function(r) { return r.text(); })
                    .then(function(pageHtml) {
                        var streams = [];
                        
                        // RAPIDPLAY ÇEKİCİ (Regex)
                        var rapidRegex = /data-frame="([^"]*rapidplay\.website[^"]*)#([^"]+)"/g;
                        var m;
                        while ((m = rapidRegex.exec(pageHtml)) !== null) {
                            streams.push({
                                name: "666Film - Rapidplay",
                                title: res.title + " (" + res.year + ")",
                                url: "https://p.rapidplay.website/videos/" + m[2] + "/master.m3u8",
                                quality: "Auto",
                                headers: { 'Referer': 'https://p.rapidplay.website/' },
                                isM3U8: true,
                                provider: "666film"
                            });
                        }

                        // ALTERNATİF IFRAME ÇEKİCİ
                        var iframes = pageHtml.match(/<iframe[^>]+src="([^"]+)"/gi);
                        if (iframes) {
                            iframes.forEach(function(frame) {
                                var src = frame.match(/src="([^"]+)"/i)[1];
                                if (src && !src.includes("youtube") && !src.includes("google")) {
                                    streams.push({
                                        name: "666Film - Player",
                                        title: res.title,
                                        url: src.startsWith("//") ? "https:" + src : src,
                                        quality: "HD",
                                        provider: "666film"
                                    });
                                }
                            });
                        }

                        console.log('[666Film] Sonuç:', streams.length);
                        resolve(streams);
                    });
            })
            .catch(function(err) {
                console.error('[666Film] Hata Yakalandı:', err.message);
                resolve([]); 
            });
    });
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { getStreams: getStreams };
} else {
    global.getStreams = global.getStreams || getStreams;
}
