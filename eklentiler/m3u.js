/**
 * MoOnCrOwN - Nuvio AIO (All-In-One) Stream Resolver v15.0
 * Film, Dizi ve Canlı TV (Logo + İsim Korumalı)
 */

var SOURCES = {
    movie: "https://raw.githubusercontent.com/mooncrown04/nuvio/refs/heads/master/liste/film.m3u",
    tv: "https://raw.githubusercontent.com/mooncrown04/nuvio/refs/heads/master/liste/dizi.m3u",
    live: "https://raw.githubusercontent.com/mooncrown04/nuvio/refs/heads/master/liste/canli.m3u"
};

// Karakter temizleme fonksiyonu (Eşleşme kalitesini artırır)
function normalize(text) {
    if (!text) return "";
    return text.toString().toLowerCase()
        .replace(/[İı]/g, 'i').replace(/[Ğğ]/g, 'g').replace(/[Üü]/g, 'u')
        .replace(/[Şş]/g, 's').replace(/[Öö]/g, 'o').replace(/[Çç]/g, 'c')
        .replace(/[^a-z0-9]/g, '').trim();
}

// M3U satırındaki tvg-logo ve tvg-name gibi detayları çeker
function parseM3uAttributes(line) {
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
        var isLive = (tmdbId && tmdbId.toString().indexOf("iptv_") !== -1);
        var searchKey = "";

        // ANA İŞLEM FONKSİYONU
        var processM3u = function(finalSearchKey) {
            var m3uUrl = isLive ? SOURCES.live : (SOURCES[mediaType] || SOURCES.movie);
            
            fetch(m3uUrl).then(function(res) { return res.text(); }).then(function(content) {
                var lines = content.split('\n');
                var results = [];
                var cleanSearchKey = normalize(finalSearchKey);

                for (var i = 0; i < lines.length; i++) {
                    if (lines[i].toUpperCase().indexOf("#EXTINF") !== -1) {
                        var attrs = parseM3uAttributes(lines[i]);
                        var m3uNameClean = normalize(attrs.name);

                        // Esnek eşleşme kontrolü
                        if (m3uNameClean.indexOf(cleanSearchKey) !== -1 || cleanSearchKey.indexOf(m3uNameClean) !== -1) {
                            var streamUrl = "";
                            if (lines[i+1] && lines[i+1].trim().startsWith("http")) streamUrl = lines[i+1].trim();
                            else if (lines[i+2] && lines[i+2].trim().startsWith("http")) streamUrl = lines[i+2].trim();

                            if (streamUrl) {
                                results.push({
                                    name: isLive ? "🔴 CANLI" : "🎬 MOONCROWN",
                                    title: attrs.name || "Bilinmeyen",
                                    url: streamUrl,
                                    poster: attrs.logo || "", // M3U'daki logo burada işlenir
                                    http_headers: {
                                        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
                                        "Referer": "https://nuvio.app/"
                                    }
                                });
                            }
                        }
                    }
                }
                resolve(results);
            }).catch(function() { resolve([]); });
        };

        // KARAR MEKANİZMASI
        if (isLive) {
            // Canlı TV ise TMDB'yi hiç karıştırma, ID'den ismi çıkar ve ara
            var liveName = tmdbId.toString().replace("iptv_", "");
            processM3u(liveName);
        } else if (tmdbId) {
            // Film/Dizi ise TMDB'yi dene, hata alırsan ID ile devam et (Kilitlenmeyi önler)
            var tmdbUrl = 'https://api.themoviedb.org/3/' + (mediaType === 'movie' ? 'movie' : 'tv') + '/' + tmdbId + '?api_key=4ef0d7355d9ffb5151e987764708ce96&language=tr-TR';
            fetch(tmdbUrl)
                .then(function(r) { return r.json(); })
                .then(function(d) { processM3u(d.title || d.name || tmdbId); })
                .catch(function() { processM3u(tmdbId); }); // Loglardaki "cancelled" hatası burada yakalanır
        } else {
            resolve([]);
        }
    });
};

// Uygulama entegrasyonu
if (typeof module !== 'undefined' && module.exports) { module.exports = { getStreams: getStreams }; }
if (typeof globalThis !== 'undefined') { globalThis.getStreams = getStreams; }
