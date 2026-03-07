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

                // Dizigom'un muhtemel URL varyasyonlarını sırayla deneyeceğiz
                var epUrl = BASE_URL + '/dizi/' + slug + '-' + seasonNum + '-sezon-' + episodeNum + '-bolum/';
                console.log('[Dizigom] Sayfa Analiz Ediliyor: ' + epUrl);

                return fetch(epUrl, { headers: HEADERS });
            })
            .then(function(res) { 
                if(res.status === 404) {
                    // Eğer 404 ise bir de sonuna -hd1 ekleyip dene (Breaking Bad örneğindeki gibi)
                    return fetch(res.url.replace(/\/$/, '') + '-hd1/', { headers: HEADERS });
                }
                return res;
            })
            .then(function(res) { return res.text(); })
            .then(function(html) {
                var streams = [];
                
                // 1. Yöntem: Standart Iframe Yakalama (Vidmoly, Moly vb.)
                var iframeRegex = /src="([^"]*(?:vidmoly|moly|player|embed|ok\.ru)[^"]*)"/gi;
                var match;
                while ((match = iframeRegex.exec(html)) !== null) {
                    var src = match[1].startsWith('//') ? 'https:' + match[1] : match[1];
                    if (!streams.find(s => s.url === src)) {
                        streams.push({
                            name: '⌜ Dizigom ⌟ | Kaynak',
                            url: src,
                            quality: '1080p',
                            headers: { 'Referer': BASE_URL + '/' }
                        });
                    }
                }

                // 2. Yöntem: Sayfa içindeki gizli ID'yi yakala (DiziYou mantığı)
                var idMatch = html.match(/data-id="(\d+)"/i) || html.match(/post_id\s*[:=]\s*(\d+)/i);
                if (idMatch && streams.length === 0) {
                    console.log('[Dizigom] Gizli ID bulundu: ' + idMatch[1]);
                    // Gelecekte bu ID ile doğrudan API isteği atılabilir
                }

                console.log('[Dizigom] İşlem bitti. Bulunan link: ' + streams.length);
                resolve(streams);
            })
            .catch(function(err) {
                console.error('[Dizigom] Hata: ' + err.message);
                resolve([]);
            });
    });
}

// Global Export (Nuvio / SineWix Uyumluluğu)
if (typeof module !== 'undefined') { module.exports = { getStreams: getStreams }; }
globalThis.getStreams = getStreams;
