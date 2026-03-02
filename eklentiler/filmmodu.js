var BASE_URL = 'https://www.filmmodu.ws';

// FilmModu için özel tarayıcı kimlikleri
var HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
    'Referer': BASE_URL + '/'
};

// Player'ın videoyu çekerken kullanacağı başlıklar (MTK Hatasını Önlemek İçin Kritik)
var STREAM_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    'Origin': BASE_URL,
    'Referer': BASE_URL + '/',
    'Sec-Fetch-Dest': 'video',
    'Sec-Fetch-Mode': 'no-cors',
    'Sec-Fetch-Site': 'cross-site'
};

function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
    return new Promise(function(resolve, reject) {
        // Sadece filmleri destekler
        if (mediaType !== 'movie') {
            return resolve([]);
        }

        var tmdbUrl = 'https://api.themoviedb.org/3/movie/' + tmdbId +
            '?language=tr-TR&api_key=4ef0d7355d9ffb5151e987764708ce96';

        console.log('[FilmModu] Başlatılıyor:', tmdbId);

        fetch(tmdbUrl)
            .then(function(res) { return res.json(); })
            .then(function(data) {
                var title = data.title || data.original_title || '';
                var year = (data.release_date || '').substring(0, 4);
                
                if (!title) return resolve([]);

                // 1. FilmModu'nda Arama Yap
                var searchUrl = BASE_URL + '/film-ara?term=' + encodeURIComponent(title);
                return fetch(searchUrl, { headers: HEADERS })
                    .then(function(res) { return res.text(); })
                    .then(function(html) {
                        // Regex ile ilk film linkini yakala
                        var movieMatch = html.match(/href="([^"]*\/izle\/[^"]*)"/i);
                        if (!movieMatch) return [];

                        var movieUrl = movieMatch[1].indexOf('http') === 0 ? movieMatch[1] : BASE_URL + movieMatch[1];
                        
                        // 2. Film Sayfasını Yükle
                        return fetch(movieUrl, { headers: HEADERS })
                            .then(function(res) { return res.text(); })
                            .then(function(html) {
                                // 3. Video ID ve Tipi Ayıkla
                                var vIdMatch = html.match(/var\s+videoId\s*=\s*['"]([^'"]+)['"]/);
                                var vTypeMatch = html.match(/var\s+videoType\s*=\s*['"]([^'"]+)['"]/);
                                
                                if (!vIdMatch) return [];

                                var sourceUrl = BASE_URL + '/get-source?movie_id=' + vIdMatch[1] + '&type=' + vTypeMatch[1];
                                
                                // 4. AJAX ile Kaynakları Al
                                return fetch(sourceUrl, {
                                    headers: { 
                                        'X-Requested-With': 'XMLHttpRequest',
                                        'Referer': movieUrl,
                                        'User-Agent': HEADERS['User-Agent']
                                    }
                                }).then(function(res) { return res.json(); });
                            })
                            .then(function(data) {
                                if (!data || !data.sources) return [];

                                // 5. Player'a Uygun Formatla Gönder
                                return data.sources.map(function(s) {
                                    return {
                                        name: '⌜ FilmModu ⌟',
                                        title: title + (year ? ' (' + year + ')' : '') + ' · ' + (s.label || 'HD'),
                                        url: s.src.indexOf('http') === 0 ? s.src : BASE_URL + s.src,
                                        quality: s.label || 'HD',
                                        headers: STREAM_HEADERS, // Player için özel başlıklar
                                        is_direct: true,
                                        provider: 'filmmodu'
                                    };
                                });
                            });
                    });
            })
            .then(function(streams) {
                resolve(streams || []);
            })
            .catch(function(err) {
                console.error('[FilmModu] Hata:', err.message);
                resolve([]);
            });
    });
}

// Modül export yapısı (Örneklerdeki gibi)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { getStreams };
} else {
    global.getStreams = getStreams;
}
