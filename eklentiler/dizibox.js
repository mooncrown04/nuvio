var BASE_URL = 'https://dizigom104.com';

/**
 * Fonksiyonu doğrudan global nesneye bağlıyoruz ki sistem kesinlikle bulabilsin.
 */
var getStreams = function(tmdbId, mediaType, seasonNum, episodeNum) {
    return new Promise(function(resolve, reject) {
        if (mediaType !== 'tv') return resolve([]);

        var tmdbUrl = 'https://api.themoviedb.org/3/tv/' + tmdbId + '?api_key=4ef0d7355d9ffb5151e987764708ce96&language=tr-TR';

        fetch(tmdbUrl)
            .then(function(res) { return res.json(); })
            .then(function(data) {
                var name = data.original_name || data.name;
                var slug = name.toLowerCase().trim()
                    .replace(/[üçşğöı]/g, function(m) { return {'ü':'u','ç':'c','ş':'s','ğ':'g','ö':'o','ı':'i'}[m]; })
                    .replace(/[^a-z0-9]+/g, '-')
                    .replace(/^-+|-+$/g, '');

                // Denenecek URL'ler
                var url1 = BASE_URL + '/dizi/' + slug + '-' + seasonNum + '-sezon-' + episodeNum + '-bolum/';
                var url2 = url1.replace(/\/$/, '') + '-hd1/';

                console.log('[Dizigom] Deneniyor:', url1);

                return fetch(url1).then(function(r1) {
                    if (r1.status === 200) return r1.text();
                    console.log('[Dizigom] İlk URL bulunamadı, HD1 deneniyor...');
                    return fetch(url2).then(function(r2) { return r2.text(); });
                });
            })
            .then(function(html) {
                if (!html) return resolve([]);

                var streams = [];
                // Dizigom'un kullandığı video sağlayıcıları yakala
                var videoRegex = /src="([^"]*(?:moly|vidmoly|player|embed|ok\.ru)[^"]*)"/gi;
                var match;
                while ((match = videoRegex.exec(html)) !== null) {
                    var src = match[1];
                    if (src.startsWith('//')) src = 'https:' + src;
                    
                    streams.push({
                        name: 'Dizigom | ' + (src.includes('moly') ? 'Moly' : 'Kaynak'),
                        url: src,
                        quality: '1080p',
                        headers: { 'Referer': BASE_URL + '/' }
                    });
                }
                resolve(streams);
            })
            .catch(function(err) {
                console.error('[Dizigom] Hata:', err.message);
                resolve([]);
            });
    });
};

// Fonksiyonu hem module.exports hem de globalThis içine açıkça ekliyoruz
if (typeof module !== 'undefined') { module.exports = { getStreams: getStreams }; }
if (typeof globalThis !== 'undefined') { globalThis.getStreams = getStreams; }
if (typeof window !== 'undefined') { window.getStreams = getStreams; }
