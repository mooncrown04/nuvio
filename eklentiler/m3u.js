/**
 * Geliştirilmiş Nuvio M3U Scraper - v3.5
 * Destek: Film, Dizi, Canlı TV (Ayrı Linkler)
 */

var cheerio = require("cheerio-without-node-native");

// M3U Linklerini Buraya Girin
const SOURCES = {
    movie: "https://raw.githubusercontent.com/mooncrown04/nuvio/refs/heads/master/liste/film.m3u",
    tv: "https://raw.githubusercontent.com/mooncrown04/nuvio/refs/heads/master/liste/dizi.m3u",
    live: "https://raw.githubusercontent.com/mooncrown04/nuvio/refs/heads/master/liste/canli.m3u"
};

// İsim Temizleme Fonksiyonu (Eşleşme oranını artırır)
function normalizeText(text) {
    return text.toLowerCase()
        .replace(/[İı]/g, 'i')
        .replace(/[Ğğ]/g, 'g')
        .replace(/[Üü]/g, 'u')
        .replace(/[Şş]/g, 's')
        .replace(/[Öö]/g, 'o')
        .replace(/[Çç]/g, 'c')
        .replace(/[^a-z0-9]/g, ''); // Sadece harf ve rakam bırakır
}

function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
    return new Promise(function(resolve, reject) {
        
        // 1. Kaynak Seçimi
        // Nuvio'da canlı tv araması genellikle farklı tetiklenir ama 
        // buradaki mantık mediaType'a göre doğru M3U'ya gider.
        var targetM3U = SOURCES[mediaType] || SOURCES.live;
        
        var tmdbUrl = 'https://api.themoviedb.org/3/' + (mediaType === 'movie' ? 'movie' : 'tv') + '/' + tmdbId + '?language=tr-TR&api_key=4ef0d7355d9ffb5151e987764708ce96';

        fetch(tmdbUrl)
            .then(function(res) { return res.json(); })
            .then(function(data) {
                var rawTitle = data.title || data.name;
                var searchTitle = normalizeText(rawTitle);
                
                // Dizi ise sezon ve bölüm bilgisini başlığa ekleyerek daha spesifik arama yapabiliriz
                if (mediaType === 'tv') {
                    var s = seasonNum < 10 ? "s0" + seasonNum : "s" + seasonNum;
                    var e = episodeNum < 10 ? "e0" + episodeNum : "e" + episodeNum;
                    searchTitle += normalizeText(s + e); 
                }

                return fetch(targetM3U)
                    .then(function(res) { return res.text(); })
                    .then(function(m3uContent) {
                        return { searchTitle: searchTitle, displayTitle: rawTitle, m3u: m3uContent };
                    });
            })
            .then(function(ctx) {
                var lines = ctx.m3u.split('\n');
                var streams = [];

                for (var i = 0; i < lines.length; i++) {
                    var line = lines[i];
                    
                    if (line.toUpperCase().indexOf("#EXTINF") !== -1) {
                        var normalizedLine = normalizeText(line);
                        
                        // Eğer M3U satırı temizlenmiş başlığı içeriyorsa
                        if (normalizedLine.indexOf(ctx.searchTitle) !== -1) {
                            var streamUrl = lines[i + 1] ? lines[i + 1].trim() : "";
                            
                            if (streamUrl && streamUrl.startsWith("http")) {
                                streams.push({
                                    name: "MoOnCrOwN IPTV - " + mediaType.toUpperCase(),
                                    title: ctx.displayTitle + (mediaType === 'tv' ? " S" + seasonNum + "E" + episodeNum : ""),
                                    url: streamUrl,
                                    quality: "1080p",
                                    provider: "m3u_provider"
                                });
                                // Çok fazla sonuç dönmemek için ilk 3 eşleşmede durabiliriz
                                if (streams.length >= 3) break;
                            }
                        }
                    }
                }
                resolve(streams);
            })
            .catch(function(err) {
                console.error('Hata:', err.message);
                resolve([]);
            });
    });
}
