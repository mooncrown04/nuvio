/**
 * Provider: DDizi (v31 - Deep Extractor)
 */
function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
    var mainUrl = "https://www.ddizi.im";
    var tmdbUrl = 'https://api.themoviedb.org/3/tv/' + tmdbId + '?api_key=4ef0d7355d9ffb5151e987764708ce96&language=tr-TR';

    return new Promise(function(resolve) {
        if (mediaType !== 'tv') return resolve([]);

        fetch(tmdbUrl).then(function(res) { return res.json(); }).then(function(data) {
            var name = data.name || data.original_name || "";
            // Arama doğruluğu için ismi temizle
            var searchData = "arama=" + encodeURIComponent(name);
            return fetch(mainUrl + "/arama/", {
                method: "POST",
                headers: { "Content-Type": "application/x-www-form-urlencoded", "User-Agent": "Mozilla/5.0", "Referer": mainUrl },
                body: searchData
            });
        }).then(function(res) { return res.text(); }).then(function(searchHtml) {
            if (!searchHtml) return null;

            // ÖNEMLİ: Sadece aradığımız sezon/bölüm numarasını içeren linki seç
            // Örn: Sahtekarlar'ı değil, sadece Arafta'yı alması için RegExp'i daralttım
            var pattern = new RegExp('href="([^"]*[^/]*' + episodeNum + '-bolum-izle[^"]*)"', 'i');
            var match = searchHtml.match(pattern);

            if (match && match[1]) {
                var targetUrl = match[1].trim();
                if (targetUrl.indexOf('http') !== 0) targetUrl = mainUrl + targetUrl;
                return fetch(targetUrl, { headers: { "Referer": mainUrl } });
            }
            return null;
        }).then(function(res) {
            if (res && res.status === 200) return res.text();
            return null;
        }).then(function(html) {
            if (!html) return resolve([]);

            // DERİN AYIKLAMA (Deep Extraction)
            // Sayfa içindeki 'og:video' linkine gitmemiz lazım, o link de genelde bir iframe/player sayfasıdır
            var ogMatch = html.match(/property="og:video" content="([^"]+)"/i);
            if (ogMatch && ogMatch[1]) {
                var playerUrl = ogMatch[1].trim();
                // Player sayfasının içine giriyoruz (Asıl m3u8 burada saklı)
                return fetch(playerUrl, { headers: { "Referer": mainUrl } });
            }
            return null;
        }).then(function(res) {
            if (res && res.status === 200) return res.text();
            return null;
        }).then(function(playerHtml) {
            if (!playerHtml) return resolve([]);

            var streams = [];
            // JWPlayer veya benzeri kaynaklarda 'file: "..."' arıyoruz
            var fileMatch = playerHtml.match(/file:\s*["']([^"']+)["']/i) || playerHtml.match(/src="([^"]*\.m3u8[^"]*)"/i);
            
            if (fileMatch && fileMatch[1]) {
                var finalUrl = fileMatch[1].trim();
                if (finalUrl.indexOf('//') === 0) finalUrl = 'https:' + finalUrl;
                
                streams.push({
                    name: "DDizi - HLS",
                    url: finalUrl,
                    quality: "1080p",
                    headers: { "Referer": mainUrl }
                });
            }

            // Alternatif Vidmoly/Moly iframe'leri
            var iframeMatch = playerHtml.match(/iframe[^>]*src="([^"]+)"/i);
            if (iframeMatch && iframeMatch[1] && iframeMatch[1].indexOf('youtube') === -1) {
                var iUrl = iframeMatch[1].trim();
                if (iUrl.indexOf('//') === 0) iUrl = 'https:' + iUrl;
                streams.push({ name: "DDizi - Alternatif", url: iUrl, quality: "720p" });
            }

            resolve(streams);
        }).catch(function() {
            resolve([]);
        });
    });
}

if (typeof module !== 'undefined') { module.exports = { getStreams: getStreams }; }
globalThis.getStreams = getStreams;
