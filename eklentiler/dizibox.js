/**
 * Provider: Dizigom (v24 - Deep Link)
 */
function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
    var BASE_URL = 'https://dizigom104.com';
    
    return new Promise(function(resolve) {
        if (mediaType !== 'tv') return resolve([]);

        // Adım 1: TMDB İsmi Al
        fetch('https://api.themoviedb.org/3/tv/' + tmdbId + '?api_key=4ef0d7355d9ffb5151e987764708ce96&language=tr-TR')
            .then(function(res) { return res.json(); })
            .then(function(data) {
                var name = data.name || data.original_name;
                var slug = name.toLowerCase().trim()
                    .replace(/[üçşğöı]/g, function(m) { return {'ü':'u','ç':'c','ş':'s','ğ':'g','ö':'o','ı':'i'}[m]; })
                    .replace(/[^a-z0-9]+/g, '-')
                    .replace(/^-+|-+$/g, '');

                // Dizigom'un kullandığı tüm muhtemel URL varyasyonları
                var urlList = [
                    BASE_URL + '/dizi/' + slug + '-izle-' + seasonNum + '-sezon-' + episodeNum + '-bolum/',
                    BASE_URL + '/dizi/' + slug + '-' + seasonNum + '-sezon-' + episodeNum + '-bolum/',
                    BASE_URL + '/' + slug + '-' + seasonNum + '-sezon-' + episodeNum + '-bolum/'
                ];

                // URL'leri sırayla kontrol et (Recursive Check)
                function checkUrl(index) {
                    if (index >= urlList.length) return resolve([]);

                    fetch(urlList[index], { 
                        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/122.0' } 
                    })
                    .then(function(res) {
                        if (res.status === 200) {
                            return res.text().then(function(html) {
                                var streams = [];
                                var regex = /src="([^"]*(?:vidmoly|moly|player|embed|ok\.ru)[^"]*)"/gi;
                                var match;
                                while ((match = regex.exec(html)) !== null) {
                                    var src = match[1];
                                    if (src.indexOf('//') === 0) src = 'https:' + src;
                                    streams.push({
                                        name: 'Dizigom | Kaynak',
                                        url: src,
                                        quality: '1080p',
                                        headers: { 'Referer': urlList[index] }
                                    });
                                }
                                if (streams.length > 0) resolve(streams);
                                else checkUrl(index + 1);
                            });
                        } else {
                            checkUrl(index + 1);
                        }
                    })
                    .catch(function() { checkUrl(index + 1); });
                }

                checkUrl(0);
            })
            .catch(function() { resolve([]); });
    });
}

// Global Export
if (typeof module !== 'undefined') { module.exports = { getStreams: getStreams }; }
globalThis.getStreams = getStreams;
