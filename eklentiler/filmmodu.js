var BASE_URL = 'https://www.filmmodu.ws';

function getStreams(tmdbId, mediaType) {
    if (mediaType !== 'movie') return Promise.resolve([]);

    // 1. Film Adını Al
    var tmdbUrl = 'https://api.themoviedb.org/3/movie/' + tmdbId + '?language=tr-TR&api_key=4ef0d7355d9ffb5151e987764708ce96';

    return fetch(tmdbUrl)
        .then(function(res) { return res.json(); })
        .then(function(data) {
            // 2. FilmModu'nda Ara
            var name = data.title || data.original_title;
            return fetch(BASE_URL + '/film-ara?term=' + encodeURIComponent(name));
        })
        .then(function(res) { return res.text(); })
        .then(function(html) {
            // 3. İlk çıkan film linkini yakala
            var match = html.match(/href="([^"]+\/izle\/[^"]+)"/);
            if (!match) return [];

            var movieUrl = match[1].startsWith('http') ? match[1] : BASE_URL + match[1];
            return fetch(movieUrl);
        })
        .then(function(res) { return res.text(); })
        .then(function(html) {
            // 4. Video ID ve Tipini Bul
            var idMatch = html.match(/var\s+videoId\s*=\s*['"]([^'"]+)['"]/);
            var typeMatch = html.match(/var\s+videoType\s*=\s*['"]([^'"]+)['"]/);
            
            if (!idMatch) return [];

            // 5. Kaynağı Al
            var sourceUrl = BASE_URL + '/get-source?movie_id=' + idMatch[1] + '&type=' + typeMatch[1];
            return fetch(sourceUrl, { headers: { 'X-Requested-With': 'XMLHttpRequest' } });
        })
        .then(function(res) { return res.json(); })
        .then(function(data) {
            if (!data || !data.sources) return [];

            return data.sources.map(function(s) {
                return {
                    name: '⌜ FilmModu ⌟',
                    title: s.label || 'Video',
                    url: s.src.startsWith('http') ? s.src : BASE_URL + s.src,
                    // PLAYER'I ZORLAMAK İÇİN EN TEMEL AYARLAR
                    headers: {
                        'User-Agent': 'Mozilla/5.0',
                        'Referer': BASE_URL + '/'
                    },
                    is_direct: true
                };
            });
        })
        .catch(function() { return []; });
}
