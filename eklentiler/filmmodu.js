var BASE_URL = 'https://www.filmmodu.ws';

var HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7',
    'Referer': BASE_URL + '/'
};

function findFirst(html, pattern) {
    var regex = new RegExp(pattern, 'i');
    var match = regex.exec(html);
    return match ? match : null;
}

function searchFilmModu(title) {
    var searchUrl = BASE_URL + '/film-ara?term=' + encodeURIComponent(title);
    return fetch(searchUrl, { headers: HEADERS })
        .then(function(res) { return res.text(); })
        .then(function(html) {
            var results = [];
            var moviePattern = /<div[^>]*class="[^"]*movie[^"]*"[^>]*>([\s\S]*?)<\/div>\s*(?=<div[^>]*class="[^"]*movie[^"]*"|$)/gi;
            var movieMatches = html.match(moviePattern) || [];
            
            movieMatches.forEach(function(movieHtml) {
                var linkMatch = findFirst(movieHtml, '<a[^>]+href="([^"]+)"[^>]*>([^<]*)<\\/a>');
                if (!linkMatch) return;
                var href = linkMatch[1];
                var movieTitle = linkMatch[2].trim();
                if (href && movieTitle) {
                    results.push({
                        title: movieTitle,
                        url: href.startsWith('http') ? href : BASE_URL + href
                    });
                }
            });
            return results;
        });
}

function findBestMatch(results, query) {
    if (!results || results.length === 0) return null;
    var queryLower = query.toLowerCase();
    for (var i = 0; i < results.length; i++) {
        if (results[i].title.toLowerCase() === queryLower) return results[i];
    }
    for (var j = 0; j < results.length; j++) {
        if (results[j].title.toLowerCase().includes(queryLower)) return results[j];
    }
    return results[0];
}

function loadMoviePage(url) {
    return fetch(url, { headers: HEADERS })
        .then(function(res) { return res.text(); })
        .then(function(html) {
            var streams = [];
            var altPattern = /<div[^>]*class="[^"]*alternates[^"]*"[^>]*>([\s\S]*?)<\/div>/i;
            var altMatch = html.match(altPattern);
            
            if (altMatch) {
                var altHtml = altMatch[1];
                var linkPattern = /<a[^>]+href="([^"]+)"[^>]*>([^<]*)<\/a>/gi;
                var linkMatch;
                while ((linkMatch = linkPattern.exec(altHtml)) !== null) {
                    var altUrl = linkMatch[1];
                    var altName = linkMatch[2].trim();
                    if (altName === 'Fragman') continue;
                    streams.push({
                        url: altUrl.startsWith('http') ? altUrl : BASE_URL + altUrl,
                        name: altName
                    });
                }
            }
            
            var titleMatch = findFirst(html, '<div[^>]*class="[^"]*titles[^"]*"[^>]*>\\s*<h1[^>]*>([^<]*)<\\/h1>');
            var yearMatch = findFirst(html, '<span[^>]*itemprop="dateCreated"[^>]*>([^<]*)<\\/span>');
            
            return {
                title: titleMatch ? titleMatch[1].trim() : '',
                year: yearMatch ? yearMatch[1].trim() : '',
                alternatives: streams
            };
        });
}

function extractVideoFromAlternate(altUrl, altName, mainTitle, year) {
    return fetch(altUrl, { headers: HEADERS })
        .then(function(res) { return res.text(); })
        .then(function(html) {
            var vidIdMatch = findFirst(html, "var\\s+videoId\\s*=\\s*['\"]([^'\"]+)['\"]");
            var vidTypeMatch = findFirst(html, "var\\s+videoType\\s*=\\s*['\"]([^'\"]+)['\"]");
            
            if (!vidIdMatch || !vidTypeMatch) return [];
            
            var sourceUrl = BASE_URL + '/get-source?movie_id=' + vidIdMatch[1] + '&type=' + vidTypeMatch[1];
            
            return fetch(sourceUrl, { 
                headers: {
                    'User-Agent': HEADERS['User-Agent'],
                    'Accept': 'application/json, text/javascript, */*; q=0.01',
                    'X-Requested-With': 'XMLHttpRequest',
                    'Referer': altUrl,
                    'Origin': BASE_URL
                }
            }).then(function(r) { return r.json(); });
        })
        .then(function(data) {
            if (!data || !data.sources) return [];
            
            var streams = [];
            var subtitles = [];
            
            if (data.subtitle) {
                subtitles.push({
                    label: 'türkçee',
                    url: data.subtitle.startsWith('http') ? data.subtitle : BASE_URL + data.subtitle
                });
            }
            
            data.sources.forEach(function(source, idx) {
                var streamUrl = source.src.startsWith('http') ? source.src : BASE_URL + source.src;
                
                var quality = '720p';
                if (source.label) {
                    var label = source.label.toLowerCase();
                    if (label.includes('1080')) quality = '1080p';
                    else if (label.includes('720')) quality = '720p';
                    else if (label.includes('480')) quality = '480p';
                    else if (label.includes('360')) quality = '360p';
                }
                
       // Sadece değişen kısım (extractVideoFromAlternate içindeki streams.push):


streams.push({
    name: '⌜ FilmModu ⌟ | ' + (altName || 'Kaynak') + ' ' + (idx + 1),
    title: mainTitle + (year ? ' (' + year + ')' : '') + ' · ' + quality,
    url: streamUrl,
    quality: quality,
    size: 'AUTO',
    headers: {
        'User-Agent': HEADERS['User-Agent'],
        'Referer': BASE_URL + '/',
        'Origin': BASE_URL
    },
    subtitles: subtitles,
    provider: 'filmmodu'
    // type belirtmiyoruz - auto detect
});
            });
            
            return streams;
        })
        .catch(function(err) {
            console.error('[FilmModu] Error:', err.message);
            return [];
        });
}

function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
    return new Promise(function(resolve) {
        if (mediaType !== 'movie') {
            resolve([]);
            return;
        }

        var tmdbUrl = 'https://api.themoviedb.org/3/movie/' + tmdbId +
            '?language=tr-TR&api_key=4ef0d7355d9ffb5151e987764708ce96';

        fetch(tmdbUrl)
            .then(function(res) { return res.json(); })
            .then(function(data) {
                var title = data.title || data.original_title || '';
                var year = (data.release_date || '').substring(0, 4);
                
                if (!title) return [];

                return searchFilmModu(title)
                    .then(function(results) {
                        var best = findBestMatch(results, title);
                        if (!best) return [];
                        return loadMoviePage(best.url);
                    })
                    .then(function(movieData) {
                        if (!movieData || !movieData.alternatives) return [];
                        
                        var promises = movieData.alternatives.map(function(alt) {
                            return extractVideoFromAlternate(alt.url, alt.name, 
                                movieData.title || title, movieData.year || year);
                        });
                        
                        return Promise.all(promises);
                    })
                    .then(function(results) {
                        var streams = [];
                        results.forEach(function(r) { 
                            if (r) streams = streams.concat(r); 
                        });
                        return streams;
                    });
            })
            .then(function(streams) { resolve(streams); })
            .catch(function() { resolve([]); });
    });
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { getStreams };
} else {
    global.getStreams = getStreams;
}


