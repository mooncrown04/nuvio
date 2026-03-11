/**
 * MoOnCrOwN Nuvio M3U Scraper - Tam Sürüm
 * Destek: Film, Dizi, Canlı TV & Otomatik Resim/İsim Eşleştirme
 */

var cheerio = require("cheerio-without-node-native");

// 1. M3U Kaynak Linklerin
const SOURCES = {
    movie: "https://raw.githubusercontent.com/mooncrown04/nuvio/refs/heads/master/liste/film.m3u",
    tv: "https://raw.githubusercontent.com/mooncrown04/nuvio/refs/heads/master/liste/dizi.m3u",
    live: "https://raw.githubusercontent.com/mooncrown04/nuvio/refs/heads/master/liste/canli.m3u"
};

// 2. İsim Temizleme Fonksiyonu (Büyük/Küçük harf ve Türkçe karakter duyarsızlığı için)
function normalizeText(text) {
    if (!text) return "";
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
        console.error("--- Arama Başlatıldı ---");
        
        var targetM3U = SOURCES[mediaType] || SOURCES.live;
        var tmdbUrl = 'https://api.themoviedb.org/3/' + (mediaType === 'movie' ? 'movie' : 'tv') + '/' + tmdbId + '?language=tr-TR&api_key=4ef0d7355d9ffb5151e987764708ce96';

        console.error("Hedef Kaynak: " + targetM3U);

        // Önce TMDB'den film/dizi ismini alıyoruz
        fetch(tmdbUrl)
            .then(function(res) { return res.json(); })
            .then(function(data) {
                var rawTitle = data.title || data.name;
                var searchTitle = normalizeText(rawTitle);
                
                // Dizi ise sezon ve bölüm takısı ekle (Örn: taxi s01e01)
                if (mediaType === 'tv') {
                    var s = seasonNum < 10 ? "s0" + seasonNum : "s" + seasonNum;
                    var e = episodeNum < 10 ? "e0" + episodeNum : "e" + episodeNum;
                    searchTitle += normalizeText(s + e); 
                }

                console.error("TMDB'den Gelen Başlık: " + rawTitle);

                // Şimdi M3U dosyasını indiriyoruz
                return fetch(targetM3U)
                    .then(function(res) { return res.text(); })
                    .then(function(m3uContent) {
                        return { searchTitle: searchTitle, displayTitle: rawTitle, m3u: m3uContent };
                    });
            })
            .then(function(ctx) {
                var lines = ctx.m3u.split('\n');
                var streams = [];
                console.error("M3U Taranıyor... Toplam Satır: " + lines.length);

                for (var i = 0; i < lines.length; i++) {
                    var line = lines[i];
                    
                    if (line.toUpperCase().indexOf("#EXTINF") !== -1) {
                        // Resim linkini (logo) yakala
                        var logoMatch = line.match(/tvg-logo="([^"]+)"/);
                        var poster = logoMatch ? logoMatch[1] : "";

                        // Virgül sonrasındaki gerçek adı yakala
                        var parts = line.split(',');
                        var m3uNamePart = parts.length > 1 ? parts[parts.length - 1] : line;
                        var normalizedM3UName = normalizeText(m3uNamePart);

                        // Eşleşme kontrolü
                        if (normalizedM3UName.indexOf(ctx.searchTitle) !== -1) {
                            var streamUrl = lines[i + 1] ? lines[i + 1].trim() : "";
                            
                            if (streamUrl && streamUrl.startsWith("http")) {
                                console.error("Bulundu: " + m3uNamePart.trim());
                                streams.push({
                                    name: "MoOnCrOwN",
                                    title: m3uNamePart.trim(),
                                    url: streamUrl,
                                    poster: poster,
                                    quality: "1080p",
                                    provider: "m3u_provider"
                                });
                                // İlk 5 sonucu al ve dur
                                if (streams.length >= 5) break;
                            }
                        }
                    }
                }
                resolve(streams);
            })
            .catch(function(err) {
                console.error('Hata oluştu: ' + err.message);
                resolve([]);
            });
    });
}

// 3. KRİTİK NOKTA: Nuvio'nun fonksiyonu tanıması için export kısmı
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { getStreams: getStreams };
} else if (typeof globalThis !== 'undefined') {
    globalThis.getStreams = getStreams;
} else {
    global.getStreams = getStreams;
}
