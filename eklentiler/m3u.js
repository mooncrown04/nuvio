/**
 * MoOnCrOwN Precision Scraper - v7.0
 * Sadece İstenen İçeriği Getiren Hassas Filtreleme
 */

var cheerio = require("cheerio-without-node-native");

const SOURCES = {
    movie: "https://raw.githubusercontent.com/mooncrown04/nuvio/refs/heads/master/liste/film.m3u",
    tv: "https://raw.githubusercontent.com/mooncrown04/nuvio/refs/heads/master/liste/dizi.m3u",
    live: "https://raw.githubusercontent.com/mooncrown04/nuvio/refs/heads/master/liste/canli.m3u"
};

function normalizeText(text) {
    if (!text) return "";
    return text.toLowerCase()
        .replace(/[İı]/g, 'i').replace(/[Ğğ]/g, 'g').replace(/[Üü]/g, 'u')
        .replace(/[Şş]/g, 's').replace(/[Öö]/g, 'o').replace(/[Çç]/g, 'c')
        .replace(/[^a-z0-9 ]/g, '') // Sadece harf, rakam ve BOŞLUK bırakır
        .trim();
}

function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
    return new Promise(function(resolve, reject) {
        console.error(">>> TALEP GELDİ: " + tmdbId + " | TIP: " + mediaType);
        
        var targetM3U = SOURCES[mediaType] || SOURCES.live;
        var isLive = (mediaType === 'live' || mediaType === 'channel');

        var getMetadata = function() {
            if (isLive) {
                return Promise.resolve({ search: normalizeText(tmdbId) });
            } else {
                var tmdbUrl = 'https://api.themoviedb.org/3/' + (mediaType === 'movie' ? 'movie' : 'tv') + '/' + tmdbId + '?api_key=4ef0d7355d9ffb5151e987764708ce96&language=tr-TR';
                return fetch(tmdbUrl).then(function(res) { return res.json(); }).then(function(data) {
                    var title = data.title || data.name;
                    var original = data.original_title || data.original_name;
                    return { 
                        tr: normalizeText(title), 
                        en: normalizeText(original),
                        raw: title 
                    };
                });
            }
        };

        getMetadata().then(function(keys) {
            console.error(">>> TMDB'DEN GELEN: " + keys.tr);

            return fetch(targetM3U).then(function(res) { return res.text(); }).then(function(m3uContent) {
                var lines = m3uContent.split('\n');
                var streams = [];

                for (var i = 0; i < lines.length; i++) {
                    var line = lines[i];
                    if (line.toUpperCase().indexOf("#EXTINF") !== -1) {
                        var m3uNameRaw = line.split(',').pop().trim();
                        var m3uNameNorm = normalizeText(m3uNameRaw);

                        // --- KRİTİK FİLTRELEME MANTIĞI ---
                        // Sadece 'içinde geçiyor mu' diye bakmıyoruz, 
                        // M3U'daki isim TMDB'deki isme tam eşit mi ona bakıyoruz.
                        var isMatch = (m3uNameNorm === keys.tr || m3uNameNorm === keys.en);

                        // Eğer tam eşitlik yoksa (Yıl farkı vb. olabilir), çok yakın mı diye bak
                        if (!isMatch) {
                           // Örn: Aranan "venom", M3U "venom 2018" -> Bu eşleşsin
                           // Ama aranan "venom", M3U "venom 2" -> Bu eşleşmesin (sayı farkı)
                           if (m3uNameNorm.startsWith(keys.tr + " ") || m3uNameNorm.endsWith(" " + keys.tr)) {
                               isMatch = true;
                           }
                        }

                        if (isMatch) {
                            var streamUrl = lines[i + 1] ? lines[i + 1].trim() : "";
                            if (streamUrl.startsWith("http")) {
                                console.error(">>> EŞLEŞTİ: " + m3uNameRaw);
                                var logoMatch = line.match(/tvg-logo="([^"]+)"/);
                                streams.push({
                                    name: "MoOnCrOwN",
                                    title: m3uNameRaw,
                                    url: streamUrl,
                                    poster: logoMatch ? logoMatch[1] : "",
                                    quality: "1080p"
                                });
                            }
                        }
                    }
                }
                console.error(">>> TOPLAM UYGUN LİNK: " + streams.length);
                resolve(streams);
            });
        }).catch(function(err) {
            console.error(">>> HATA: " + err.message);
            resolve([]);
        });
    });
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { getStreams: getStreams };
} else if (typeof globalThis !== 'undefined') {
    globalThis.getStreams = getStreams;
} else {
    global.getStreams = getStreams;
}
