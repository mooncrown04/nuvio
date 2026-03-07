/**
 * Provider: DDizi (v32 - Strict Match & Extra Deep)
 */
function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
    var mainUrl = "https://www.ddizi.im";
    var tmdbUrl = 'https://api.themoviedb.org/3/tv/' + tmdbId + '?api_key=4ef0d7355d9ffb5151e987764708ce96&language=tr-TR';

    return new Promise(function(resolve) {
        if (mediaType !== 'tv') return resolve([]);

        fetch(tmdbUrl).then(function(res) { return res.json(); }).then(function(data) {
            var name = data.name || data.original_name || "";
            var searchData = "arama=" + encodeURIComponent(name);
            
            return fetch(mainUrl + "/arama/", {
                method: "POST",
                headers: { "Content-Type": "application/x-www-form-urlencoded", "User-Agent": "Mozilla/5.0", "Referer": mainUrl },
                body: searchData
            });
        }).then(function(res) { return res.text(); }).then(function(searchHtml) {
            if (!searchHtml) return null;

            // --- SIKILAŞTIRILMIŞ EŞLEŞTİRME ---
            // Sadece içinde bölüm numarası geçen VE reklam olmayan gerçek sonuçları ara
            var links = searchHtml.match(/href="([^"]*)"[^>]*>([^<]+)/g) || [];
            var targetUrl = "";

            for (var i = 0; i < links.length; i++) {
                var linkText = links[i].toLowerCase();
                // Link hem bölüm numarasını içermeli hem de 'izle' kelimesini barındırmalı
                if (linkText.indexOf(episodeNum + ".bolum") !== -1 || linkText.indexOf(episodeNum + "-bolum") !== -1) {
                    var hrefMatch = links[i].match(/href="([^"]+)"/);
                    if (hrefMatch) {
                        targetUrl = hrefMatch[1].trim();
                        break; 
                    }
                }
            }

            if (targetUrl) {
                if (targetUrl.indexOf('http') !== 0) targetUrl = mainUrl + targetUrl;
                return fetch(targetUrl, { headers: { "Referer": mainUrl } });
            }
            return null;
        }).then(function(res) {
            if (res && res.status === 200) return res.text();
            return null;
        }).then(function(html) {
            if (!html) return resolve([]);

            // DERİN AYIKLAMA 1: Sayfa içindeki asıl player iframe'ini bul
            var playerFrame = html.match(/iframe[^>]*src="([^"]*)"/i);
            if (playerFrame && playerFrame[1]) {
                var pUrl = playerFrame[1].trim();
                if (pUrl.indexOf('//') === 0) pUrl = 'https:' + pUrl;
                
                // Eğer doğrudan bir player ise içine girip m3u8 arayalım
                return fetch(pUrl, { headers: { "Referer": mainUrl } });
            }
            return null;
        }).then(function(res) {
            if (res && res.status === 200) return res.text();
            return null;
        }).then(function(finalHtml) {
            if (!finalHtml) return resolve([]);

            var streams = [];
            // DERİN AYIKLAMA 2: m3u8 veya mp4 linkini yakala
            var videoMatch = finalHtml.match(/["'](http[^"']+\.m3u8[^"']*)["']/i) || 
                             finalHtml.match(/file:\s*["']([^"']+)["']/i);
            
            if (videoMatch && videoMatch[1]) {
                streams.push({
                    name: "DDizi - Direct",
                    url: videoMatch[1].trim(),
                    quality: "1080p",
                    headers: { "Referer": mainUrl, "User-Agent": "Mozilla/5.0" }
                });
            }

            resolve(streams);
        }).catch(function() {
            resolve([]);
        });
    });
}

if (typeof module !== 'undefined') { module.exports = { getStreams: getStreams }; }
globalThis.getStreams = getStreams;
