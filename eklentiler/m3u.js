/**
 * MoOnCrOwN - Nuvio Universal Stream Resolver v13.0
 * Film, Dizi ve Canlı TV Destekli - Header (Başlık) Korumalı
 */

var SOURCES = {
    movie: "https://raw.githubusercontent.com/mooncrown04/nuvio/refs/heads/master/liste/film.m3u",
    tv: "https://raw.githubusercontent.com/mooncrown04/nuvio/refs/heads/master/liste/dizi.m3u",
    live: "https://raw.githubusercontent.com/mooncrown04/nuvio/refs/heads/master/liste/canli.m3u"
};

// Karakter temizleme ve eşleşme kolaylaştırma fonksiyonu
function normalize(text) {
    if (!text) return "";
    return text.toString().toLowerCase()
        .replace(/[İı]/g, 'i').replace(/[Ğğ]/g, 'g').replace(/[Üü]/g, 'u')
        .replace(/[Şş]/g, 's').replace(/[Öö]/g, 'o').replace(/[Çç]/g, 'c')
        .replace(/[^a-z0-9]/g, '').trim();
}

var getStreams = function(tmdbId, mediaType, seasonNum, episodeNum) {
    return new Promise(function(resolve) {
        var isLive = (tmdbId && tmdbId.toString().indexOf("iptv_") !== -1);
        var searchKey = "";

        // 1. Arama anahtarını belirle
        var getMeta = function() {
            if (isLive) {
                searchKey = normalize(tmdbId.toString().replace("iptv_", ""));
                return Promise.resolve();
            } else {
                var tmdbUrl = 'https://api.themoviedb.org/3/' + (mediaType === 'movie' ? 'movie' : 'tv') + '/' + tmdbId + '?api_key=4ef0d7355d9ffb5151e987764708ce96&language=tr-TR';
                return fetch(tmdbUrl).then(function(r) { return r.json(); }).then(function(d) {
                    searchKey = normalize(d.title || d.name);
                });
            }
        };

        getMeta().then(function() {
            // Doğru M3U dosyasını seç
            var m3uUrl = isLive ? SOURCES.live : (SOURCES[mediaType] || SOURCES.movie);
            
            fetch(m3uUrl).then(function(res) { return res.text(); }).then(function(content) {
                var lines = content.split('\n');
                var results = [];

                for (var i = 0; i < lines.length; i++) {
                    var line = lines[i];
                    if (line.toUpperCase().indexOf("#EXTINF") !== -1) {
                        // M3U satırındaki tüm bilgiyi ve kanal ismini al
                        var m3uName = normalize(line.split(',').pop());
                        
                        // Esnek eşleşme kontrolü (Kanal ismi anahtar kelimede geçiyor mu?)
                        if (m3uName.indexOf(searchKey) !== -1 || searchKey.indexOf(m3uName) !== -1) {
                            var streamUrl = "";
                            // Bir sonraki satırda URL'yi bulana kadar bak (boş satırları atla)
                            if (lines[i + 1] && lines[i + 1].trim().startsWith("http")) {
                                streamUrl = lines[i + 1].trim();
                            } else if (lines[i + 2] && lines[i + 2].trim().startsWith("http")) {
                                streamUrl = lines[i + 2].trim();
                            }

                            if (streamUrl) {
                                results.push({
                                    name: isLive ? "🔴 CANLI TV" : "🎬 MOONCROWN",
                                    title: line.split(',').pop().trim(),
                                    url: streamUrl,
                                    http_headers: {
                                        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
                                        "Referer": "https://nuvio.app/"
                                    }
                                });
                            }
                        }
                    }
                }
                resolve(results);
            }).catch(function() { resolve([]); });
        }).catch(function() { resolve([]); });
    });
};

// Modül exportları
if (typeof module !== 'undefined' && module.exports) { module.exports = { getStreams: getStreams }; }
if (typeof globalThis !== 'undefined') { globalThis.getStreams = getStreams; }
