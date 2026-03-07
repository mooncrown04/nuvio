/**
 * Provider: DDizi (v27 - Stable Engine)
 */
function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
    var mainUrl = "https://www.ddizi.im";
    var tmdbUrl = 'https://api.themoviedb.org/3/tv/' + tmdbId + '?api_key=4ef0d7355d9ffb5151e987764708ce96&language=tr-TR';

    return new Promise(function(resolve) {
        if (mediaType !== 'tv') return resolve([]);

        // 1. ADIM: TMDB'den Temiz İsim Al
        fetch(tmdbUrl).then(function(res) {
            return res.json();
        }).then(function(data) {
            var name = data.name || data.original_name || "";
            if (!name) return resolve([]);

            // Slug oluşturma (Hata riski en düşük yöntem)
            var slug = name.toLowerCase().trim()
                .split('ü').join('u').split('ç').join('c')
                .split('ş').join('s').split('ğ').join('g')
                .split('ö').join('o').split('ı').join('i')
                .split(' ').join('-')
                .replace(/[^a-z0-9-]/g, '');

            // DDizi Standart URL Yapısı
            // Örn: breaking-bad-1-sezon-1-bolum-izle
            var targetUrl = mainUrl + "/" + slug + "-" + seasonNum + "-sezon-" + episodeNum + "-bolum-izle";
            
            return fetch(targetUrl, { 
                headers: { 'User-Agent': 'Mozilla/5.0', 'Referer': mainUrl } 
            });
        }).then(function(res) {
            if (res && res.status === 200) return res.text();
            return null;
        }).then(function(html) {
            if (!html) return resolve([]);

            var streams = [];
            
            // 2. ADIM: Video Kaynağını Yakala (og:video)
            // DDizi videoları genelde og:video içinde bir player linki olarak sunar
            var ogMatch = html.match(/property="og:video" content="([^"]+)"/i);
            
            if (ogMatch && ogMatch[1]) {
                var playerUrl = ogMatch[1];
                
                // Eğer player URL'si zaten bir video dosyasıysa (.mp4, .m3u8 vb)
                streams.push({
                    name: "DDizi - Ana Kaynak",
                    url: playerUrl,
                    quality: "720p",
                    headers: { "Referer": mainUrl }
                });
            }

            // Alternatif: Sayfa içindeki iframe'leri tara
            var iframeMatch = html.match(/iframe[^>]*src="([^"]+)"/i);
            if (iframeMatch && iframeMatch[1]) {
                var iUrl = iframeMatch[1];
                if (iUrl.indexOf('//') === 0) iUrl = 'https:' + iUrl;
                
                // YouTube değilse ekle (YouTube genelde fragmandır)
                if (iUrl.indexOf('youtube') === -1) {
                    streams.push({
                        name: "DDizi - Alternatif",
                        url: iUrl,
                        quality: "720p",
                        headers: { "Referer": mainUrl }
                    });
                }
            }

            resolve(streams);
        }).catch(function() {
            resolve([]);
        });
    });
}

// Global Export
if (typeof module !== 'undefined') { module.exports = { getStreams: getStreams }; }
globalThis.getStreams = getStreams;
