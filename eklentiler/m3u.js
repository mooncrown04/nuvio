/**
 * MoOnCrOwN Ultimate Scraper - v8.0
 * Live TV (TRT 2 vb.) ve Film (Iron Man) Tam Uyumluluk
 */

var cheerio = require("cheerio-without-node-native");

const SOURCES = {
    movie: "https://raw.githubusercontent.com/mooncrown04/nuvio/refs/heads/master/liste/film.m3u",
    tv: "https://raw.githubusercontent.com/mooncrown04/nuvio/refs/heads/master/liste/dizi.m3u",
    live: "https://raw.githubusercontent.com/mooncrown04/nuvio/refs/heads/master/liste/canli.m3u"
};

function normalizeText(text) {
    if (!text) return "";
    return text.toString().toLowerCase()
        .replace(/[İı]/g, 'i').replace(/[Ğğ]/g, 'g').replace(/[Üü]/g, 'u')
        .replace(/[Şş]/g, 's').replace(/[Öö]/g, 'o').replace(/[Çç]/g, 'c')
        .replace(/[^a-z0-9]/g, '')
        .trim();
}

function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
    return new Promise(function(resolve, reject) {
        var isLive = (mediaType === 'live' || mediaType === 'channel');
        
        // KRİTİK KONTROL: Eğer tmdbId bir sayı değilse, bu bir kanal ismidir.
        if (isNaN(tmdbId)) {
            isLive = true;
        }

        console.error(">>> SORGULANIYOR: " + tmdbId + " | MOD: " + (isLive ? "CANLI" : "FILM"));

        var getMetadata = function() {
            if (isLive) {
                // TRT 2 gibi metin aramaları için
                var cleanSearch = normalizeText(tmdbId);
                return Promise.resolve({ tr: cleanSearch, en: cleanSearch });
            } else {
                // Iron Man gibi katalog aramaları için
                var tmdbUrl = 'https://api.themoviedb.org/3/' + (mediaType === 'movie' ? 'movie' : 'tv') + '/' + tmdbId + '?api_key=4ef0d7355d9ffb5151e987764708ce96&language=tr-TR';
                return fetch(tmdbUrl).then(function(res) { return res.json(); }).then(function(data) {
                    return { 
                        tr: normalizeText(data.title || data.name), 
                        en: normalizeText(data.original_title || data.original_name) 
                    };
                });
            }
        };

        getMetadata().then(function(keys) {
            var targetM3U = isLive ? SOURCES.live : (SOURCES[mediaType] || SOURCES.movie);
            
            console.error(">>> KAYNAK M3U: " + targetM3U);

            return fetch(targetM3U).then(function(res) { return res.text(); }).then(function(m3uContent) {
                var lines = m3uContent.split('\n');
                var streams = [];

                for (var i = 0; i < lines.length; i++) {
                    var line = lines[i];
                    if (line.toUpperCase().indexOf("#EXTINF") !== -1) {
                        var m3uNameRaw = line.split(',').pop().trim();
                        var m3uNameNorm = normalizeText(m3uNameRaw);

                        // Canlı TV'de "içinde geçme" (indexOf) daha sağlıklıdır çünkü listede "TRT 2 HD" yazabilir
                        var isMatch = false;
                        if (isLive) {
                            isMatch = (m3uNameNorm.indexOf(keys.tr) !== -1);
                        } else {
                            // Filmlerde hala tam eşleşme (Precision) kullanıyoruz
                            isMatch = (m3uNameNorm === keys.tr || m3uNameNorm === keys.en || m3uNameNorm.startsWith(keys.tr + " "));
                        }

                        if (isMatch) {
                            var streamUrl = lines[i + 1] ? lines[i + 1].trim() : "";
                            if (streamUrl.startsWith("http")) {
                                var logoMatch = line.match(/tvg-logo="([^"]+)"/);
                                streams.push({
                                    name: isLive ? "CANLI YAYIN" : "MoOnCrOwN",
                                    title: m3uNameRaw,
                                    url: streamUrl,
                                    poster: logoMatch ? logoMatch[1] : "",
                                    quality: isLive ? "LIVE" : "1080p"
                                });
                                if (isLive && streams.length >= 5) break; 
                            }
                        }
                    }
                }
                console.error(">>> SONUÇ: " + streams.length + " adet bulundu.");
                resolve(streams);
            });
        }).catch(function(err) {
            console.error(">>> HATA: " + err.message);
            resolve([]);
        });
    });
}

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { getStreams: getStreams };
} else if (typeof globalThis !== 'undefined') {
    globalThis.getStreams = globalThis.getStreams || getStreams;
} else {
    global.getStreams = getStreams;
}
