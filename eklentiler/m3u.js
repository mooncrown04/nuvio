/**
 * MoOnCrOwN - Ultimate Zero-Lag v18.0
 * TMDB TAMAMEN DEVRE DIŞI - %100 GitHub M3U Odaklı
 */

var SOURCES = {
    movie: "https://raw.githubusercontent.com/mooncrown04/nuvio/refs/heads/master/liste/film.m3u",
    tv: "https://raw.githubusercontent.com/mooncrown04/nuvio/refs/heads/master/liste/dizi.m3u",
    live: "https://raw.githubusercontent.com/mooncrown04/nuvio/refs/heads/master/liste/canli.m3u"
};

function normalize(text) {
    if (!text) return "";
    return text.toString().toLowerCase()
        .replace(/[İı]/g, 'i').replace(/[Ğğ]/g, 'g').replace(/[Üü]/g, 'u')
        .replace(/[Şş]/g, 's').replace(/[Öö]/g, 'o').replace(/[Çç]/g, 'c')
        .replace(/[^a-z0-9]/g, '').trim();
}

function parseAttributes(line) {
    var attrs = { logo: "", name: "" };
    var logoMatch = line.match(/tvg-logo="([^"]+)"/i);
    if (logoMatch) attrs.logo = logoMatch[1];
    var nameMatch = line.match(/tvg-name="([^"]+)"/i);
    if (nameMatch) attrs.name = nameMatch[1];
    if (!attrs.name) {
        var parts = line.split(',');
        if (parts.length > 1) attrs.name = parts.pop().trim();
    }
    return attrs;
}

var getStreams = function(tmdbId, mediaType, seasonNum, episodeNum) {
    return new Promise(function(resolve) {
        // Canlı mı yoksa içerik mi kontrolü
        var isLive = (tmdbId && tmdbId.toString().indexOf("iptv_") !== -1);
        var targetUrl = isLive ? SOURCES.live : (SOURCES[mediaType] || SOURCES.movie);
        
        // Arama anahtarını hazırla (iptv_ önekini temizle veya tmdbId'yi kullan)
        var rawKey = isLive ? tmdbId.toString().replace("iptv_", "") : tmdbId;
        var searchKey = normalize(rawKey);

        fetch(targetUrl)
            .then(function(res) { return res.text(); })
            .then(function(content) {
                var lines = content.split('\n');
                var results = [];

                for (var i = 0; i < lines.length; i++) {
                    if (lines[i].toUpperCase().indexOf("#EXTINF") !== -1) {
                        var attrs = parseAttributes(lines[i]);
                        var m3uNameClean = normalize(attrs.name);

                        // EŞLEŞME: M3U'daki isim ile gelen ID eşleşiyor mu?
                        if (m3uNameClean.indexOf(searchKey) !== -1 || searchKey.indexOf(m3uNameClean) !== -1) {
                            var streamUrl = "";
                            if (lines[i+1] && lines[i+1].trim().startsWith("http")) streamUrl = lines[i+1].trim();
                            else if (lines[i+2] && lines[i+2].trim().startsWith("http")) streamUrl = lines[i+2].trim();

                            if (streamUrl) {
                                results.push({
                                    name: isLive ? "🔴 CANLI" : "🎬 MOONCROWN",
                                    title: attrs.name.trim(),
                                    url: streamUrl,
                                    poster: attrs.logo || "",
                                    http_headers: {
                                        "User-Agent": "Mozilla/5.0",
                                        "Referer": "https://nuvio.app/"
                                    }
                                });
                            }
                        }
                    }
                }
                resolve(results);
            })
            .catch(function() { resolve([]); });
    });
};

if (typeof module !== 'undefined' && module.exports) { module.exports = { getStreams: getStreams }; }
if (typeof globalThis !== 'undefined') { globalThis.getStreams = getStreams; }
