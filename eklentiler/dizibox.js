/**
 * Provider: Dizigom (v22 - Engine Compatible)
 * Hata Giderildi: 'setTimeout' kaldırıldı.
 */
function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
    var BASE_URL = 'https://dizigom104.com';
    
    return new Promise(function(resolve) {
        if (mediaType !== 'tv') {
            return resolve([]);
        }

        // 1. TMDB'den isim al
        fetch('https://api.themoviedb.org/3/tv/' + tmdbId + '?api_key=4ef0d7355d9ffb5151e987764708ce96&language=tr-TR')
            .then(function(res) { 
                return res.json(); 
            })
            .then(function(data) {
                var name = data.name || data.original_name;
                
                // Manuel Slug Oluşturma (Regex yerine basit string operasyonları)
                var slug = name.toLowerCase().trim()
                    .split('ü').join('u').split('ç').join('c')
                    .split('ş').join('s').split('ğ').join('g')
                    .split('ö').join('o').split('ı').join('i')
                    .replace(/[^a-z0-9]+/g, '-')
                    .replace(/^-+|-+$/g, '');

                // Sadece en yaygın Dizigom formatını dene
                var targetUrl = BASE_URL + '/dizi/' + slug + '-izle-' + seasonNum + '-sezon-' + episodeNum + '-bolum/';
                
                return fetch(targetUrl, { 
                    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/124.0.0.0' } 
                });
            })
            .then(function(res) {
                if (res && res.status === 200) {
                    return res.text();
                }
                return null;
            })
            .then(function(html) {
                var streams = [];
                if (!html) return resolve([]);

                // Video kaynaklarını tara
                var videoRegex = /src="([^"]*(?:vidmoly|moly|player|ok\.ru)[^"]*)"/gi;
                var match;
                
                while ((match = videoRegex.exec(html)) !== null) {
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
            .catch(function(err) {
                // Hata durumunda boş dön ki uygulama çökmesin
                resolve([]);
            });
    });
}

// Global Export
if (typeof module !== 'undefined') { module.exports = { getStreams: getStreams }; }
globalThis.getStreams = getStreams;
