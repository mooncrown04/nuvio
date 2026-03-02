var BASE_URL = 'https://www.filmmodu.ws';

function getStreams(tmdbId, mediaType) {
    if (mediaType !== 'movie') return [];

    // 1. TMDB'den Film Adını Al
    var tmdbUrl = 'https://api.themoviedb.org/3/movie/' + tmdbId + '?language=tr-TR&api_key=4ef0d7355d9ffb5151e987764708ce96';
    
    try {
        var tmdbRes = JSON.parse(http.get(tmdbUrl));
        var movieName = tmdbRes.title || tmdbRes.original_title;
        
        // 2. FilmModu'nda Ara
        var searchUrl = BASE_URL + '/film-ara?term=' + encodeURIComponent(movieName);
        var searchHtml = http.get(searchUrl);
        
        // Regex ile film sayfa linkini bul
        var movieLinkMatch = searchHtml.match(/href="([^"]+\/izle\/[^"]+)"/);
        if (!movieLinkMatch) return [];
        
        var moviePageUrl = movieLinkMatch[1].indexOf('http') === 0 ? movieLinkMatch[1] : BASE_URL + movieLinkMatch[1];
        var movieHtml = http.get(moviePageUrl);
        
        // 3. Video ID ve Tipini Bul
        var videoId = movieHtml.match(/var\s+videoId\s*=\s*['"]([^'"]+)['"]/)[1];
        var videoType = movieHtml.match(/var\s+videoType\s*=\s*['"]([^'"]+)['"]/)[1];
        
        // 4. Kaynak Linklerini Al (AJAX isteği simülasyonu)
        var sourceUrl = BASE_URL + '/get-source?movie_id=' + videoId + '&type=' + videoType;
        var sourcesJson = JSON.parse(http.get(sourceUrl, {
            "headers": { "X-Requested-With": "XMLHttpRequest", "Referer": moviePageUrl }
        }));
        
        if (!sourcesJson || !sourcesJson.sources) return [];
        
        // 5. Player'a Gönder
        return sourcesJson.sources.map(function(s) {
            return {
                "name": "⌜ FilmModu ⌟",
                "title": s.label || "Video",
                "url": s.src.indexOf('http') === 0 ? s.src : BASE_URL + s.src,
                "headers": {
                    "User-Agent": "Mozilla/5.0",
                    "Referer": BASE_URL + "/"
                }
            };
        });
    } catch (e) {
        return [];
    }
}
