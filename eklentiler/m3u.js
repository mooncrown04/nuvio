/**
 * MoOnCrOwN Manifest-Uyumlu Scraper - v11.0
 * Stremio/Nuvio Katalog Yapısına %100 Uyumlu
 */

const SOURCES = {
    movie: "https://raw.githubusercontent.com/mooncrown04/nuvio/refs/heads/master/liste/film.m3u",
    tv: "https://raw.githubusercontent.com/mooncrown04/nuvio/refs/heads/master/liste/dizi.m3u",
    live: "https://raw.githubusercontent.com/mooncrown04/nuvio/refs/heads/master/liste/canli.m3u"
};

function normalizeText(text) {
    if (!text) return "";
    return text.toString().toLowerCase()
        .replace("iptv_", "") // "iptv_trt2" gelirse "trt2" yapar
        .replace(/[İı]/g, 'i').replace(/[Ğğ]/g, 'g').replace(/[Üü]/g, 'u')
        .replace(/[Şş]/g, 's').replace(/[Öö]/g, 'o').replace(/[Çç]/g, 'c')
        .replace(/[^a-z0-9]/g, '')
        .trim();
}

function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
    return new Promise(function(resolve, reject) {
        // --- KRİTİK AYRIM: iptv_ ile başlıyorsa veya mediaType tv ise ---
        var isIptvPrefix = (tmdbId && tmdbId.toString().startsWith("iptv_"));
        
        // Eğer katalogdan geliyorsa ID "iptv_" ile başlar.
        // Bu durumda mediaType 'tv' olsa bile bu bir CANLI kanaldır.
        var isLive = isIptvPrefix || mediaType === 'live' || mediaType === 'channel';

        console.error(">>> GIRDI: " + tmdbId + " | TIP: " + mediaType + " | MOD: " + (isLive ? "CANLI" : "KATALOG"));

        var getMetadata = function() {
            if (isLive) {
                // iptv_trt2 -> trt2 yapar
                var clean = normalizeText(tmdbId);
                console.error(">>> CANLI ARAMA ANAHTARI: " + clean);
                return Promise.resolve({ tr: clean, en: clean });
            } else {
                // Gerçek Film/Dizi katalog araması
                var url = 'https://api.themoviedb.org/3/' + (mediaType === 'movie' ? 'movie' : 'tv') + '/' + tmdbId + '?api_key=4ef0d7355d9ffb5151e987764708ce96&language=tr-TR';
                return fetch(url).then(function(res) { return res.json(); }).then(function(data) {
                    return { 
                        tr: normalizeText(data.title || data.name), 
                        en: normalizeText(data.original_title || data.original_name) 
                    };
                });
            }
        };

        getMetadata().then(function(keys) {
            // Eğer isLive ise canli.m3u'yu, değilse ilgili m3u'yu seç
            var targetM3U = isLive ? SOURCES.live : (SOURCES[mediaType] || SOURCES.movie);
            
            console.error(">>> HEDEF DOSYA: " + targetM3U);

            return fetch(targetM3U).then(function(res) { return res.text(); }).then(function(m3u) {
                var lines = m3u.split('\n');
                var streams = [];

                for (var i = 0; i < lines.length; i++) {
                    var line = lines[i];
                    if (line.toUpperCase().indexOf("#EXTINF") !== -1) {
                        var rawName = line.split(',').pop().trim();
                        var normName = normalizeText(rawName);

                        // Canlı TV'de "içinde geçme" araması
                        var match = isLive ? (normName.indexOf(keys.tr) !== -1) : (normName === keys.tr || normName === keys.en);

                        if (match) {
                            var url = lines[i + 1] ? lines[i + 1].trim() : "";
                            if (url && url.startsWith("http")) {
                                var logoMatch = line.match(/tvg-logo="([^"]+)"/);
                                streams.push({
                                    name: isLive ? "IPTV" : "MoOnCrOwN",
                                    title: rawName,
                                    url: url,
                                    poster: logoMatch ? logoMatch[1] : "",
                                    quality: isLive ? "LIVE" : "1080p"
                                });
                            }
                        }
                    }
                }
                console.error(">>> BULUNAN: " + streams.length);
                resolve(streams);
            });
        }).catch(function(e) { 
            console.error(">>> HATA: " + e.message); 
            resolve([]); 
        });
    });
}
