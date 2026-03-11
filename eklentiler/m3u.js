/**
 * MoOnCrOwN Ultimate Scraper - v5.0
 * Katalog (Film/Dizi) + Manuel Arama (Canlı TV) Tam Destek
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
        console.error("--- İşlem Başladı ---");
        
        var targetM3U = SOURCES[mediaType] || SOURCES.live;
        var isLive = (mediaType === 'live' || mediaType === 'channel');

        // 1. ADIM: Metadata Hazırlama (Film mi? Canlı mı?)
        var getMetadata = function() {
            if (isLive) {
                // Canlı yayınlarda tmdbId direkt kanal adıdır
                console.error("Mod: Canlı Yayın | Aranan: " + tmdbId);
                return Promise.resolve({ 
                    tr: normalizeText(tmdbId), 
                    en: normalizeText(tmdbId) 
                });
            } else {
                // Film veya Dizi ise TMDB'ye git
                var tmdbUrl = 'https://api.themoviedb.org/3/' + (mediaType === 'movie' ? 'movie' : 'tv') + '/' + tmdbId + '?api_key=4ef0d7355d9ffb5151e987764708ce96&language=tr-TR';
                console.error("Mod: Katalog | TMDB Sorgusu: " + tmdbUrl);
                
                return fetch(tmdbUrl)
                    .then(function(res) { return res.json(); })
                    .then(function(data) {
                        return { 
                            tr: normalizeText(data.title || data.name), 
                            en: normalizeText(data.original_title || data.original_name) 
                        };
                    });
            }
        };

        // 2. ADIM: M3U İndirme ve Eşleştirme
        getMetadata()
            .then(function(keys) {
                console.error("Arama Anahtarları -> TR: " + keys.tr + " | EN: " + keys.en);

                return fetch(targetM3U)
                    .then(function(res) { return res.text(); })
                    .then(function(m3uContent) {
                        var lines = m3uContent.split('\n');
                        var streams = [];

                        for (var i = 0; i < lines.length; i++) {
                            var line = lines[i];
                            
                            if (line.toUpperCase().indexOf("#EXTINF") !== -1) {
                                // M3U ismini virgülden ayırarak al
                                var parts = line.split(',');
                                var m3uName = parts[parts.length - 1];
                                var normalizedM3U = normalizeText(m3uName);

                                // Eşleşme Kontrolü: TR veya EN isim geçiyor mu?
                                if (normalizedM3U.indexOf(keys.tr) !== -1 || normalizedM3U.indexOf(keys.en) !== -1) {
                                    var streamUrl = lines[i + 1] ? lines[i + 1].trim() : "";
                                    
                                    if (streamUrl && streamUrl.startsWith("http")) {
                                        var logoMatch = line.match(/tvg-logo="([^"]+)"/);
                                        
                                        streams.push({
                                            name: isLive ? "CANLI TV" : "MoOnCrOwN",
                                            title: m3uName.trim(),
                                            url: streamUrl,
                                            poster: logoMatch ? logoMatch[1] : "",
                                            quality: isLive ? "LIVE" : "1080p",
                                            provider: "m3u_provider"
                                        });
                                        if (streams.length >= 10) break;
                                    }
                                }
                            }
                        }
                        console.error("Bulunan Sonuç: " + streams.length);
                        resolve(streams);
                    });
            })
            .catch(function(err) {
                console.error("Kritik Hata: " + err.message);
                resolve([]);
            });
    });
}

// Nuvio/QuickJS Export Köprüsü
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { getStreams: getStreams };
} else if (typeof globalThis !== 'undefined') {
    globalThis.getStreams = getStreams;
} else {
    global.getStreams = getStreams;
}
