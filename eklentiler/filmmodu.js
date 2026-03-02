var BASE_URL = 'https://www.filmmodu.ws';

function getStreams(tmdbId, mediaType) {
    if (mediaType !== 'movie') return Promise.resolve([]);

    var tmdbUrl = 'https://api.themoviedb.org/3/movie/' + tmdbId + '?language=tr-TR&api_key=4ef0d7355d9ffb5151e987764708ce96';

    return fetch(tmdbUrl)
        .then(function(res) { return res.json(); })
        .then(function(data) {
            var movieName = data.title || data.original_title;
            // Arama sayfasını çek
            return fetch(BASE_URL + '/film-ara?term=' + encodeURIComponent(movieName));
        })
        .then(function(res) { return res.text(); })
        .then(function(html) {
            // Film sayfasının linkini daha geniş bir regex ile arayalım
            var linkMatch = html.match(/href="([^"]*\/izle\/[^"]*)"/i);
            if (!linkMatch) return null;

            var movieUrl = linkMatch[1].indexOf('http') === 0 ? linkMatch[1] : BASE_URL + linkMatch[1];
            return fetch(movieUrl);
        })
        .then(function(res) { 
            if(!res) return null;
            return res.text(); 
        })
        .then(function(html) {
            if(!html) return [];

            // ID ve Type'ı yakala
            var videoIdMatch = html.match(/videoId\s*[:=]\s*['"]?([^'"]+)['"]?/i);
            var videoTypeMatch = html.match(/videoType\s*[:=]\s*['"]?([^'"]+)['"]?/i);

            if (!videoIdMatch || !videoTypeMatch) return [];

            var sourceUrl = BASE_URL + '/get-source?movie_id=' + videoIdMatch[1] + '&type=' + videoTypeMatch[1];
            
            return fetch(sourceUrl, {
                headers: { 'X-Requested-With': 'XMLHttpRequest' }
            });
        })
        .then(function(res) { 
            return res ? res.json() : null; 
        })
        .then(function(data) {
            if (!data || !data.sources) return [];

            return data.sources.map(function(s) {
                var streamUrl = s.src.indexOf('http') === 0 ? s.src : BASE_URL + s.src;
                return {
                    name: "⌜ FilmModu ⌟",
                    title: (s.label || "Video"),
                    url: streamUrl,
                    is_direct: true,
                    // Player için kritik başlıklar
                    headers: {
                        "User-Agent": "Mozilla/5.0 (Linux; Android 10) AppleWebKit/537.36",
                        "Referer": BASE_URL + "/",
                        "Origin": BASE_URL
                    }
                };
            });
        })
        .catch(function(err) {
            // Hata durumunda boş liste dön ki uygulama çökmesin
            return [];
        });
}
