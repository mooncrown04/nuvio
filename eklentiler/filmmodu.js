var BASE_URL = 'http://www.filmmodu.ws'; // HTTPS yerine HTTP deniyoruz

function getStreams(tmdbId, mediaType) {
    if (mediaType !== 'movie') return Promise.resolve([]);

    var tmdbUrl = 'https://api.themoviedb.org/3/movie/' + tmdbId + '?api_key=4ef0d7355d9ffb5151e987764708ce96&language=tr-TR';

    return fetch(tmdbUrl)
        .then(function(r) { return r.json(); })
        .then(function(data) {
            var query = data.title || data.original_title;
            // Arama yaparken User-Agent'ı çok eski bir cihaz gibi gösteriyoruz
            return fetch(BASE_URL + '/film-ara?term=' + encodeURIComponent(query), {
                headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64; rv:40.0) Gecko/20100101 Firefox/40.1' }
            });
        })
        .then(function(r) { return r.text(); })
        .then(function(html) {
            // Regex'i en basit hale getirdik: Sadece /izle/ geçen ilk linki al
            var parts = html.split('/izle/');
            if (parts.length < 2) return null;
            
            var slug = parts[1].split('"')[0];
            var movieUrl = BASE_URL + '/izle/' + slug;
            return fetch(movieUrl);
        })
        .then(function(r) { return r ? r.text() : ''; })
        .then(function(html) {
            // Video verilerini en kaba haliyle ayıklıyoruz
            var vId = html.split('videoId')[1].split('"')[1] || html.split('videoId')[1].split("'")[1];
            var vType = html.split('videoType')[1].split('"')[1] || html.split('videoType')[1].split("'")[1];
            
            if (!vId) return [];

            return fetch(BASE_URL + '/get-source?movie_id=' + vId + '&type=' + vType, {
                headers: { 'X-Requested-With': 'XMLHttpRequest' }
            });
        })
        .then(function(r) { return r ? r.json() : null; })
        .then(function(data) {
            if (!data || !data.sources) return [];

            return data.sources.map(function(s) {
                return {
                    name: "⌜ FilmModu ⌟",
                    title: (s.label || "Video"),
                    url: s.src.indexOf('http') === 0 ? s.src : BASE_URL + s.src,
                    is_direct: true,
                    headers: { "Referer": BASE_URL + "/" }
                };
            });
        })
        .catch(function() { 
            return []; 
        });
}
