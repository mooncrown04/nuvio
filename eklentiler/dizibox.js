/**
 * DDizi Nuvio Provider - v2 (Stable)
 */
function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
    var mainUrl = "https://www.ddizi.im";
    
    return new Promise(function(resolve) {
        if (mediaType !== 'tv') return resolve([]);

        // 1. TMDB Bilgisini Al
        fetch('https://api.themoviedb.org/3/tv/' + tmdbId + '?api_key=4ef0d7355d9ffb5151e987764708ce96&language=tr-TR')
            .then(function(res) { return res.json(); })
            .then(function(data) {
                var query = data.name || data.original_name;
                // Slug oluşturma (En basit yöntem)
                var slug = query.toLowerCase().trim()
                    .split(' ').join('-')
                    .replace(/[üçşğöı]/g, function(m) { 
                        return {'ü':'u','ç':'c','ş':'s','ğ':'g','ö':'o','ı':'i'}[m]; 
                    });

                // DDizi URL yapısını kur
                var targetUrl = mainUrl + "/" + slug + "-" + seasonNum + "-sezon-" + episodeNum + "-bolum-izle";
                
                return fetch(targetUrl, { 
                    headers: { 'User-Agent': 'Mozilla/5.0', 'Referer': mainUrl } 
                });
            })
            .then(function(res) {
                if (res && res.status === 200) return res.text();
                return null;
            })
            .then(function(html) {
                if (!html) return resolve([]);

                var streams = [];
                
                // 1. Video Kaynağını Bul (og:video veya iframe)
                // Nuvio'da regex.exec kullanımı bazen 'not a function' hatası verebilir, string.match kullanalım.
                var ogVideo = html.match(/property="og:video" content="([^"]+)"/);
                var iframeSrc = html.match(/iframe[^>]*src="([^"]+)"/);

                if (ogVideo && ogVideo[1]) {
                    streams.push({
                        name: "DDizi - Player",
                        url: ogVideo[1],
                        quality: "720p",
                        headers: { "Referer": mainUrl }
                    });
                }

                if (iframeSrc && iframeSrc[1]) {
                    var src = iframeSrc[1];
                    if (src.indexOf('//') === 0) src = 'https:' + src;
                    
                    streams.push({
                        name: "DDizi - Alt Kaynak",
                        url: src,
                        quality: "720p",
                        headers: { "Referer": mainUrl }
                    });
                }

                resolve(streams);
            })
            .catch(function(err) {
                // Hata mesajını loglayalım ki nerede koptuğunu görelim
                console.log("DDizi Hata: " + (err ? err.message : "Bilinmiyor"));
                resolve([]);
            });
    });
}

// Global Export
if (typeof module !== 'undefined') { module.exports = { getStreams: getStreams }; }
globalThis.getStreams = getStreams;
