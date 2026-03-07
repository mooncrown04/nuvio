/**
 * Provider: Dizigom (v21 - Lightweight & Timeout Protected)
 */
function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
    var BASE_URL = 'https://dizigom104.com';
    
    return new Promise(function(resolve) {
        if (mediaType !== 'tv') return resolve([]);

        // Emniyet Kilidi: 8 saniye sonra otomatik iptal (Time-out hatasını önlemek için)
        var timeout = setTimeout(function() {
            console.log('[Dizigom] Zaman asimi koruması devreye girdi.');
            resolve([]);
        }, 8000);

        // 1. TMDB'den isim al
        fetch('https://api.themoviedb.org/3/tv/' + tmdbId + '?api_key=4ef0d7355d9ffb5151e987764708ce96&language=tr-TR')
            .then(function(res) { return res.json(); })
            .then(function(data) {
                var name = data.name || data.original_name;
                var slug = name.toLowerCase().trim()
                    .replace(/[üçşğöı]/g, function(m) { return {'ü':'u','ç':'c','ş':'s','ğ':'g','ö':'o','ı':'i'}[m]; })
                    .replace(/[^a-z0-9]+/g, '-')
                    .replace(/^-+|-+$/g, '');

                // Sadece en garanti URL'yi dene (Hız için)
                var targetUrl = BASE_URL + '/dizi/' + slug + '-izle-' + seasonNum + '-sezon-' + episodeNum + '-bolum/';
                
                return fetch(targetUrl, { 
                    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/124.0.0.0' } 
                });
            })
            .then(function(res) {
                if (res.status !== 200) throw new Error('404');
                return res.text();
            })
            .then(function(html) {
                clearTimeout(timeout); // Başarılı olursa süreyi durdur
                
                var streams = [];
                // Sadece vidmoly ve moly odaklı regex
                var regex = /src="([^"]*(?:vidmoly|moly|player|ok\.ru)[^"]*)"/gi;
                var match;
                
                while ((match = regex.exec(html)) !== null) {
                    var src = match[1].startsWith('//') ? 'https:' + match[1] : match[1];
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
                clearTimeout(timeout);
                resolve([]);
            });
    });
}

// Global Export
if (typeof module !== 'undefined') { module.exports = { getStreams: getStreams }; }
globalThis.getStreams = getStreams;
