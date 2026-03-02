var BASE_URL = 'https://www.filmmodu.ws';
var UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36';

function getStreams(tmdbId, mediaType) {
    if (mediaType !== 'movie') return Promise.resolve([]);

    var tmdbUrl = 'https://api.themoviedb.org/3/movie/' + tmdbId + '?language=tr-TR&api_key=4ef0d7355d9ffb5151e987764708ce96';

    return fetch(tmdbUrl)
        .then(function(res) { return res.json(); })
        .then(function(data) {
            var searchUrl = BASE_URL + '/film-ara?term=' + encodeURIComponent(data.title || data.original_title);
            return fetch(searchUrl, { headers: { 'User-Agent': UA } });
        })
        .then(function(res) { return res.text(); })
        .then(function(html) {
            var movieMatch = /<div[^>]*class="[^"]*movie[^"]*"[^>]*>[\s\S]*?<a[^>]+href="([^"]+)"/i.exec(html);
            if (!movieMatch) return [];
            
            var movieUrl = movieMatch[1].startsWith('http') ? movieMatch[1] : BASE_URL + movieMatch[1];
            return fetch(movieUrl, { headers: { 'User-Agent': UA } });
        })
        .then(function(res) { return res.text(); })
        .then(function(html) {
            var streams = [];
            var linkPattern = /<a[^>]+href="([^"]+)"[^>]*>([^<]*)<\/a>/gi;
            var match;
            
            // Sadece ilk 2 kaynağı al (hız için)
            var count = 0;
            while ((match = linkPattern.exec(html)) !== null && count < 2) {
                if (match[1].includes('/izle/')) {
                    var stream = extractDirect(match[1], match[2]);
                    if (stream) streams.push(stream);
                    count++;
                }
            }
            return Promise.all(streams);
        })
        .then(function(results) {
            var final = [];
            results.forEach(function(r) { if(r) final = final.concat(r); });
            return final;
        })
        .catch(function() { return []; });
}

function extractDirect(url, label) {
    return fetch(url, { headers: { 'User-Agent': UA } })
        .then(function(res) { return res.text(); })
        .then(function(html) {
            var idMatch = /var\s+videoId\s*=\s*['"]([^'"]+)['"]/i.exec(html);
            var typeMatch = /var\s+videoType\s*=\s*['"]([^'"]+)['"]/i.exec(html);
            if (!idMatch) return null;

            var sourceUrl = BASE_URL + '/get-source?movie_id=' + idMatch[1] + '&type=' + typeMatch[1];
            return fetch(sourceUrl, { 
                headers: { 'X-Requested-With': 'XMLHttpRequest', 'Referer': url, 'User-Agent': UA }
            });
        })
        .then(function(res) { return res ? res.json() : null; })
        .then(function(data) {
            if (!data || !data.sources) return null;
            return data.sources.map(function(s) {
                var streamUrl = s.src.startsWith('http') ? s.src : BASE_URL + s.src;
                return {
                    name: '⌜ FilmModu ⌟',
                    title: label + ' - ' + s.label,
                    url: streamUrl,
                    // PLAYER AYARLARI (MTK HATASINI BURADA ÇÖZÜYORUZ)
                    http_headers: {
                        'User-Agent': UA,
                        'Referer': BASE_URL + '/',
                        'Origin': BASE_URL
                    },
                    // Bu kısım player'ın donanım zorlamasını engeller
                    "force_sw": true, 
                    "hw_decode": 0,
                    "player_config": { "allow_hw": false }
                };
            });
        });
}
