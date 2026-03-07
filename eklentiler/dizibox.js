/**
 * getStreams - Sistemin bulabilmesi için en tepede ve açık tanımlama
 */
function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
    var BASE_URL = 'https://dizigom104.com';
    
    return new Promise(function(resolve, reject) {
        if (mediaType !== 'tv') return resolve([]);

        // 1. TMDB'den veri çek
        var tmdbUrl = 'https://api.themoviedb.org/3/tv/' + tmdbId + '?api_key=4ef0d7355d9ffb5151e987764708ce96&language=tr-TR';

        fetch(tmdbUrl)
            .then(function(res) { return res.json(); })
            .then(function(data) {
                var name = data.original_name || data.name;
                // Slug oluştur (Türkçe karakterleri temizle)
                var slug = name.toLowerCase().trim()
                    .replace(/[üçşğöı]/g, function(m) { return {'ü':'u','ç':'c','ş':'s','ğ':'g','ö':'o','ı':'i'}[m]; })
                    .replace(/[^a-z0-9]+/g, '-')
                    .replace(/^-+|-+$/g, '');

                var url1 = BASE_URL + '/dizi/' + slug + '-' + seasonNum + '-sezon-' + episodeNum + '-bolum/';
                var url2 = url1.replace(/\/$/, '') + '-hd1/';

                console.log('[Dizigom] Deneniyor: ' + url1);

                // Sırayla fetch et
                return fetch(url1).then(function(r1) {
                    if (r1.status === 200) return r1.text();
                    return fetch(url2).then(function(r2) { return r2.text(); });
                });
            })
            .then(function(html) {
                var streams = [];
                if (!html) return resolve([]);

                // Iframe kaynaklarını regex ile tara
                var videoRegex = /src="([^"]*(?:moly|vidmoly|player|embed|ok\.ru)[^"]*)"/gi;
                var match;
                while ((match = videoRegex.exec(html)) !== null) {
                    var src = match[1];
                    if (src.startsWith('//')) src = 'https:' + src;
                    
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
                console.error('[Dizigom] Hata: ' + err.message);
                resolve([]);
            });
    });
}

// SİSTEMİN FONKSİYONU BULMASI İÇİN TÜM EXPORT YÖNTEMLERİ
if (typeof module !== 'undefined') { module.exports = { getStreams: getStreams }; }
globalThis.getStreams = getStreams;
