/**
 * MoOnCrOwN Hepsi Bir Arada Scraper
 * Film, Dizi ve Canlı TV aramalarını otomatik ayırır.
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
        .replace(/[^a-z0-9]/g, '');
}

function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
    return new Promise(function(resolve, reject) {
        var targetM3U = SOURCES[mediaType] || SOURCES.live;
        
        // --- CANLI TV VE FİLM AYRIMI ---
        var isLive = (mediaType === 'live' || mediaType === 'channel');

        var fetchMetadata = function() {
            if (isLive) {
                // Canlı TV ise: tmdbId zaten aranan kanal adıdır.
                console.error("Canlı TV Aranıyor: " + tmdbId);
                return Promise.resolve({ 
                    tr: normalizeText(tmdbId), 
                    en: normalizeText(tmdbId) 
                });
            } else {
                // Film/Dizi ise: TMDB'den isimleri çek.
                var tmdbUrl = 'https://api.themoviedb.org/3/' + (mediaType === 'movie' ? 'movie' : 'tv') + '/' + tmdbId + '?api_key=4ef0d7355d9ffb5151e987764708ce96';
                return fetch(tmdbUrl).then(function(res) { return res.json(); }).then(function(data) {
                    return { 
                        tr: normalizeText(data.title || data.name), 
                        en: normalizeText(data.original_title || data.original_name) 
                    };
                });
            }
        };

        fetchMetadata()
            .then(function(keys) {
                return fetch(targetM3U)
                    .then(function(res) { return res.text(); })
                    .then(function(m3u) {
                        var lines = m3u.split('\n');
                        var streams = [];

                        for (var i = 0; i < lines.length; i++) {
                            var line = lines[i];
                            if (line.toUpperCase().indexOf("#EXTINF") !== -1) {
                                var parts = line.split(',');
                                var m3uName = parts[parts.length - 1];
                                var normalizedM3U = normalizeText(m3uName);

                                // Eşleşme Kontrolü
                                if (normalizedM3U.indexOf(keys.tr) !== -1 || normalizedM3U.indexOf(keys.en) !== -1) {
                                    var url = lines[i + 1] ? lines[i + 1].trim() : "";
                                    if (url.startsWith("http")) {
                                        var logoMatch = line.match(/tvg-logo="([^"]+)"/);
                                        streams.push({
                                            name: isLive ? "CANLI" : "MoOnCrOwN",
                                            title: m3uName.trim(),
                                            url: url,
                                            poster: logoMatch ? logoMatch[1] : "",
                                            quality: isLive ? "LIVE" : "1080p"
                                        });
                                        if (streams.length >= 10) break;
                                    }
                                }
                            }
                        }
                        resolve(streams);
                    });
            })
            .catch(function(e) { console.error("Hata: " + e.message); resolve([]); });
    });
}

// Export kısmı (Hata almamak için)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { getStreams: getStreams };
} else if (typeof globalThis !== 'undefined') {
    globalThis.getStreams = getStreams;
} else {
    global.getStreams = getStreams;
}
