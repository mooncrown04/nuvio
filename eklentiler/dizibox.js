/**
 * Provider: Dizigom (v23 - Flat Engine)
 */
function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
    var BASE_URL = 'https://dizigom104.com';
    var TMDB_URL = 'https://api.themoviedb.org/3/tv/' + tmdbId + '?api_key=4ef0d7355d9ffb5151e987764708ce96&language=tr-TR';
    
    return new Promise(function(resolve) {
        if (mediaType !== 'tv') return resolve([]);

        // Adım 1: Dizi İsmini Al
        fetch(TMDB_URL)
            .then(function(res) { return res.json(); })
            .then(function(data) {
                var name = data.name || data.original_name;
                // En güvenli slug temizliği
                var slug = name.toLowerCase().trim()
                    .replace(/ /g, '-').replace(/\./g, '').replace(/:/g, '')
                    .replace(/[üçşğöı]/g, function(m) { return {'ü':'u','ç':'c','ş':'s','ğ':'g','ö':'o','ı':'i'}[m]; })
                    .replace(/[^a-z0-9-]/g, '');

                var targetUrl = BASE_URL + '/dizi/' + slug + '-izle-' + seasonNum + '-sezon-' + episodeNum + '-bolum/';
                
                // Adım 2: Dizigom'a "Gerçek Tarayıcı" gibi git
                return fetch(targetUrl, { 
                    headers: { 
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/122.0.0.0 Safari/537.36',
                        'Accept': 'text/html,application/xhtml+xml,xml;q=0.9',
                        'Referer': BASE_URL + '/'
                    } 
                });
            })
            .then(function(res) {
                if (res && res.status === 200) return res.text();
                return null;
            })
            .then(function(html) {
                var streams = [];
                if (!html) return resolve([]);

                // Video kaynaklarını (Vidmoly, Moly vb.) tara
                var regex = /src="([^"]*(?:vidmoly|moly|player|embed|ok\.ru)[^"]*)"/gi;
                var match;
                
                while ((match = regex.exec(html)) !== null) {
                    var src = match[1];
                    if (src.indexOf('//') === 0) src = 'https:' + src;
                    
                    streams.push({
                        name: 'Dizigom | Kaynak',
                        url: src,
                        quality: '1080p',
                        headers: { 'Referer': BASE_URL + '/' }
                    });
                }
                resolve(streams);
            })
            .catch(function() {
                resolve([]); // Hata anında sessizce çık
            });
    });
}

// Global Export
if (typeof module !== 'undefined') { module.exports = { getStreams: getStreams }; }
globalThis.getStreams = getStreams;
