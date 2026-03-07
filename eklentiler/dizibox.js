/**
 * Provider: DDizi (v33 - Safe Mode & System Stability)
 */
function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
    var mainUrl = "https://www.ddizi.im";
    var tmdbUrl = 'https://api.themoviedb.org/3/tv/' + tmdbId + '?api_key=4ef0d7355d9ffb5151e987764708ce96&language=tr-TR';

    return new Promise(function(resolve) {
        if (mediaType !== 'tv') return resolve([]);

        // Adım 1: TMDB Verisi
        fetch(tmdbUrl).then(function(res) { return res.json(); }).then(function(data) {
            var name = data.name || data.original_name || "";
            if (!name) throw "Name missing";

            // Arama verisini hazırla
            var searchData = "arama=" + encodeURIComponent(name);
            
            // Adım 2: Arama (POST)
            return fetch(mainUrl + "/arama/", {
                method: "POST",
                headers: { 
                    "Content-Type": "application/x-www-form-urlencoded",
                    "User-Agent": "Mozilla/5.0",
                    "Referer": mainUrl 
                },
                body: searchData
            });
        }).then(function(res) { return res.text(); }).then(function(searchHtml) {
            if (!searchHtml) return null;

            // Aradığımız bölümü içeren linki ayıkla (Sahtekarlar'ı elemek için kontrol)
            var links = searchHtml.match(/href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi) || [];
            var finalTarget = "";

            for (var i = 0; i < links.length; i++) {
                var singleLink = links[i].toLowerCase();
                var bolumStr = episodeNum + ".bolum";
                // Hem bölüm no hem dizi ismi (name) kontrolü yaparak sistem yükünü azalt
                if (singleLink.indexOf(bolumStr) !== -1) {
                    var hrefMatch = links[i].match(/href="([^"]+)"/i);
                    if (hrefMatch) {
                        finalTarget = hrefMatch[1].trim();
                        break;
                    }
                }
            }

            if (!finalTarget) return null;
            if (finalTarget.indexOf('http') !== 0) finalTarget = mainUrl + finalTarget;

            return fetch(finalTarget, { headers: { "Referer": mainUrl } });
        }).then(function(res) {
            if (res && res.status === 200) return res.text();
            return null;
        }).then(function(html) {
            if (!html) return resolve([]);

            var streams = [];
            // Sayfa içindeki 'og:video' (iframe player) yakala
            var ogVideo = html.match(/property="og:video" content="([^"]+)"/i);
            
            if (ogVideo && ogVideo[1]) {
                var streamUrl = ogVideo[1].trim();
                // Eğer doğrudan mp4/m3u8 değilse (genelde player'dır)
                streams.push({
                    name: "DDizi - Player",
                    url: streamUrl,
                    quality: "1080p",
                    headers: { "Referer": mainUrl }
                });
            }

            resolve(streams);
        }).catch(function(err) {
            // Sistem hatası almamak için sessizce kapat
            resolve([]);
        });
    });
}

if (typeof module !== 'undefined') { module.exports = { getStreams: getStreams }; }
globalThis.getStreams = getStreams;
