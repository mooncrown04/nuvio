/**
 * MoOnCrOwN - Kesin Çözüm v12.0
 * Fonksiyon Bulunamadı Hatası Giderildi
 */

// Global kaynaklar
var SOURCES = {
    movie: "https://raw.githubusercontent.com/mooncrown04/nuvio/refs/heads/master/liste/film.m3u",
    tv: "https://raw.githubusercontent.com/mooncrown04/nuvio/refs/heads/master/liste/dizi.m3u",
    live: "https://raw.githubusercontent.com/mooncrown04/nuvio/refs/heads/master/liste/canli.m3u"
};

function normalize(text) {
    if (!text) return "";
    return text.toString().toLowerCase()
        .replace("iptv_", "")
        .replace(/[İı]/g, 'i').replace(/[Ğğ]/g, 'g').replace(/[Üü]/g, 'u')
        .replace(/[Şş]/g, 's').replace(/[Öö]/g, 'o').replace(/[Çç]/g, 'c')
        .replace(/[^a-z0-9]/g, '').trim();
}

// ANA FONKSİYON
var getStreams = function(tmdbId, mediaType, seasonNum, episodeNum) {
    return new Promise(function(resolve, reject) {
        // ID "iptv_" ile başlıyorsa bu bir CANLI yayındır
        var isLive = (tmdbId && tmdbId.toString().indexOf("iptv_") !== -1);
        
        console.error(">>> SORGULANIYOR: " + tmdbId + " | CANLI MI: " + isLive);

        // Metadata alma süreci
        var getMeta = function() {
            if (isLive) {
                var cleanId = normalize(tmdbId);
                return Promise.resolve({ k: cleanId });
            } else {
                var tmdbUrl = 'https://api.themoviedb.org/3/' + (mediaType === 'movie' ? 'movie' : 'tv') + '/' + tmdbId + '?api_key=4ef0d7355d9ffb5151e987764708ce96&language=tr-TR';
                return fetch(tmdbUrl).then(function(r) { return r.json(); }).then(function(d) {
                    return { k: normalize(d.title || d.name) };
                });
            }
        };

        getMeta().then(function(meta) {
            var m3uUrl = isLive ? SOURCES.live : (SOURCES[mediaType] || SOURCES.movie);
            
            fetch(m3uUrl).then(function(res) { return res.text(); }).then(function(content) {
                var lines = content.split('\n');
                var results = [];
                var searchKey = meta.k;

                for (var i = 0; i < lines.length; i++) {
                    if (lines[i].toUpperCase().indexOf("#EXTINF") !== -1) {
                        var m3uName = normalize(lines[i].split(',').pop());
                        
                        // Eşleşme Kontrolü
                        if (m3uName.indexOf(searchKey) !== -1 || searchKey.indexOf(m3uName) !== -1) {
                            var streamUrl = lines[i + 1] ? lines[i + 1].trim() : "";
                            if (streamUrl.startsWith("http")) {
                                results.push({
                                    name: isLive ? "CANLI" : "FILM",
                                    title: lines[i].split(',').pop().trim(),
                                    url: streamUrl,
                                    quality: "1080p"
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

// --- KRİTİK DÜZELTME: UYGULAMANIN FONKSİYONU GÖRMESİNİ SAĞLAR ---
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { getStreams: getStreams };
}
// Bazı sistemler direkt global arar
if (typeof global !== 'undefined') { global.getStreams = getStreams; }
if (typeof globalThis !== 'undefined') { globalThis.getStreams = getStreams; }
// -------------------------------------------------------------
