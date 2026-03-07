function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
    var BASE_URL = 'https://dizigom104.com';
    var HEADERS = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Referer': BASE_URL + '/'
    };

    return new Promise(function(resolve, reject) {
        if (mediaType !== 'tv') return resolve([]);

        // 1. TMDB'den ismi al ve slug oluştur
        var tmdbUrl = 'https://api.themoviedb.org/3/tv/' + tmdbId + '?api_key=4ef0d7355d9ffb5151e987764708ce96&language=tr-TR';

        fetch(tmdbUrl)
            .then(function(res) { return res.json(); })
            .then(function(data) {
                var name = data.original_name || data.name;
                var slug = name.toLowerCase().trim()
                    .replace(/[üçşğöı]/g, function(m) { return {'ü':'u','ç':'c','ş':'s','ğ':'g','ö':'o','ı':'i'}[m]; })
                    .replace(/[^a-z0-9]+/g, '-')
                    .replace(/^-+|-+$/g, '');

                var epUrl = BASE_URL + '/dizi/' + slug + '-' + seasonNum + '-sezon-' + episodeNum + '-bolum/';
                console.log('[Dizigom] Hedef:', epUrl);

                return fetch(epUrl, { headers: HEADERS });
            })
            .then(function(res) { return res.text(); })
            .then(function(html) {
                var streams = [];
                
                // 2. Yöntem: Iframe SRC Yakalama
                var iframeMatch = html.match(/<iframe[^>]+src="([^"]+)"/i);
                if (iframeMatch) {
                    var src = iframeMatch[1].startsWith('//') ? 'https:' + iframeMatch[1] : iframeMatch[1];
                    streams.push({
                        name: '⌜ Dizigom ⌟ | Ana Kaynak',
                        url: src,
                        quality: '1080p',
                        headers: { 'Referer': BASE_URL + '/' }
                    });
                }

                // 3. Yöntem: Gizli Video ID Yakalama (Diziyou benzeri)
                var itemIdMatch = html.match(/data-id="(\d+)"/i) || html.match(/post_id\s*=\s*(\d+)/i);
                if (itemIdMatch) {
                    console.log('[Dizigom] Video ID Bulundu:', itemIdMatch[1]);
                    // Bazı altyapılarda doğrudan Moly/Vidmoly linki bu ID ile oluşur
                }

                resolve(streams);
            })
            .catch(function(err) {
                console.error('[Dizigom] Kritik Hata:', err.message);
                resolve([]);
            });
    });
}

// Global Export
if (typeof module !== 'undefined') { module.exports = { getStreams: getStreams }; }
globalThis.getStreams = getStreams;
