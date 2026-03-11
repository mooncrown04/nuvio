/**
 * MoOnCrOwN Debug Scraper (Error Log Version)
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
        // BAŞLANGIÇ KONTROLÜ
        console.error("--- DEBUG START ---");
        console.error("Parametreler -> ID: " + tmdbId + " | Tip: " + mediaType);

        var targetM3U = SOURCES[mediaType] || SOURCES.live;
        var tmdbUrl = 'https://api.themoviedb.org/3/' + (mediaType === 'movie' ? 'movie' : 'tv') + '/' + tmdbId + '?language=tr-TR&api_key=4ef0d7355d9ffb5151e987764708ce96';

        console.error("1. TMDB İsteği Hazır: " + tmdbUrl);

        fetch(tmdbUrl)
            .then(function(res) { 
                console.error("2. TMDB Yanıt Durumu: " + res.status);
                return res.json(); 
            })
            .then(function(data) {
                var rawTitle = data.title || data.name;
                var searchTitle = normalizeText(rawTitle);
                
                console.error("3. Bulunan Film/Dizi: " + rawTitle);
                console.error("4. M3U İndirme Başlıyor: " + targetM3U);

                return fetch(targetM3U)
                    .then(function(res) { 
                        console.error("5. M3U Yanıt Durumu: " + res.status);
                        return res.text(); 
                    })
                    .then(function(m3uContent) {
                        return { searchTitle: searchTitle, displayTitle: rawTitle, m3u: m3uContent };
                    });
            })
            .then(function(ctx) {
                var lines = ctx.m3u.split('\n');
                console.error("6. M3U İşleniyor. Toplam Satır: " + lines.length);
                
                var streams = [];
                var matchCount = 0;

                for (var i = 0; i < lines.length; i++) {
                    var line = lines[i];
                    
                    if (line.toUpperCase().indexOf("#EXTINF") !== -1) {
                        // Resim ve İsim Ayrıştırma
                        var logoMatch = line.match(/tvg-logo="([^"]+)"/);
                        var poster = logoMatch ? logoMatch[1] : "";
                        var parts = line.split(',');
                        var m3uNamePart = parts.length > 1 ? parts[parts.length - 1] : line;
                        var normalizedM3UName = normalizeText(m3uNamePart);

                        // Eşleşme Kontrolü
                        if (normalizedM3UName.indexOf(ctx.searchTitle) !== -1) {
                            var streamUrl = lines[i + 1] ? lines[i + 1].trim() : "";
                            
                            if (streamUrl && streamUrl.startsWith("http")) {
                                matchCount++;
                                console.error("7. EŞLEŞME #" + matchCount + ": " + m3uNamePart.trim());
                                
                                streams.push({
                                    name: "MoOnCrOwN",
                                    title: m3uNamePart.trim(),
                                    url: streamUrl,
                                    poster: poster,
                                    quality: "1080p",
                                    provider: "m3u_provider"
                                });
                                if (streams.length >= 10) break;
                            }
                        }
                    }
                }
                
                console.error("8. İşlem Tamamlandı. Döndürülen Sonuç: " + streams.length);
                resolve(streams);
            })
            .catch(function(err) {
                console.error('!!! KRİTİK HATA !!!: ' + err.message);
                resolve([]);
            });
    });
}
