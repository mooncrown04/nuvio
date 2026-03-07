var BASE_URL = 'https://dizigom104.com';

var HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    'Referer': BASE_URL + '/'
};

function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
    return new Promise(function(resolve, reject) {
        if (mediaType !== 'tv') return resolve([]);

        // 1. TMDB Bilgisi
        var tmdbUrl = 'https://api.themoviedb.org/3/tv/' + tmdbId + '?api_key=4ef0d7355d9ffb5151e987764708ce96&language=tr-TR';

        fetch(tmdbUrl)
            .then(function(res) { return res.json(); })
            .then(function(data) {
                var name = data.original_name || data.name;
                var slug = name.toLowerCase().trim()
                    .replace(/[üçşğöı]/g, function(m) { return {'ü':'u','ç':'c','ş':'s','ğ':'g','ö':'o','ı':'i'}[m]; })
                    .replace(/[^a-z0-9]+/g, '-')
                    .replace(/^-+|-+$/g, '');

                // 2. Denenecek URL kombinasyonları
                var urls = [
                    BASE_URL + '/dizi/' + slug + '-' + seasonNum + '-sezon-' + episodeNum + '-bolum/',
                    BASE_URL + '/dizi/' + slug + '-' + seasonNum + '-sezon-' + episodeNum + '-bolum-hd1/',
                    BASE_URL + '/' + slug + '-' + seasonNum + '-sezon-' + episodeNum + '-bolum/'
                ];

                // 3. Sırayla dene (İlk çalışan linki al)
                return tryUrls(urls);
            })
            .then(function(html) {
                if (!html) return resolve([]);
                
                var streams = [];
                // Iframe ve Video Linklerini ayıkla
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
}

// Yardımcı Fonksiyon: URL listesini sırayla dener
async function tryUrls(urls) {
    for (var url of urls) {
        try {
            console.log('[Dizigom] Deneniyor:', url);
            var res = await fetch(url, { headers: HEADERS });
            if (res.status === 200) {
                var text = await res.text();
                if (text.length > 5000) return text; // Sayfa doluysa döndür
            }
        } catch (e) {
            continue;
        }
    }
    return null;
}
