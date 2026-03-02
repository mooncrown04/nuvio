var BASE_URL = 'https://www.filmmodu.ws';

var HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7',
    'Referer': BASE_URL + '/'
};

var STREAM_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': '*/*',
    'Accept-Language': 'tr-TR,tr;q=0.9',
    'Accept-Encoding': 'identity',
    'Referer': BASE_URL + '/',
    'Origin': BASE_URL,
    'Sec-Fetch-Dest': 'video',
    'Sec-Fetch-Mode': 'no-cors',
    'Sec-Fetch-Site': 'cross-site'
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

function fetchM3u8(url) {
    return fetch(url, { headers: STREAM_HEADERS, redirect: 'follow' })
        .then(function(res) { return res.text(); })
        .then(function(text) { return { url: url, content: text }; })
        .catch(function() { return null; });
}

function parseMasterM3u8(masterUrl, m3u8Content) {
    var lines = m3u8Content.split('\n');
    var streams = [];
    var basePath = masterUrl.substring(0, masterUrl.lastIndexOf('/') + 1);
    
    for (var i = 0; i < lines.length; i++) {
        var line = lines[i].trim();
        if (line.startsWith('#EXT-X-STREAM-INF:')) {
            var resMatch = line.match(/RESOLUTION=(\d+x\d+)/);
            var bwMatch = line.match(/BANDWIDTH=(\d+)/);
            var nextLine = lines[i + 1] ? lines[i + 1].trim() : '';
            
            if (nextLine && !nextLine.startsWith('#')) {
                var streamUrl = nextLine.startsWith('http') ? nextLine : basePath + nextLine;
                var resolution = resMatch ? resMatch[1] : '';
                var bandwidth = bwMatch ? parseInt(bwMatch[1]) : 0;
                
                var quality = '720p';
                if (resolution.includes('1920')) quality = '1080p';
                else if (resolution.includes('1280')) quality = '720p';
                else if (resolution.includes('854')) quality = '480p';
                else if (resolution.includes('640')) quality = '360p';
                
                streams.push({
                    url: streamUrl,
                    quality: quality,
                    resolution: resolution,
                    bandwidth: bandwidth
                });
            }
        }
    }
    
    streams.sort(function(a, b) { return b.bandwidth - a.bandwidth; });
    return streams;
}

function extractVideoFromAlternate(altUrl, altName, mainTitle, year) {
    return fetch(altUrl, { headers: HEADERS })
        .then(function(res) { return res.text(); })
        .then(function(html) {
            var vidIdMatch = findFirst(html, "var\\s+videoId\\s*=\\s*['\"]([^'\"]+)['\"]");
            var vidTypeMatch = findFirst(html, "var\\s+videoType\\s*=\\s*['\"]([^'\"]+)['\"]");
            
            if (!vidIdMatch || !vidTypeMatch) return null;
            
            var sourceUrl = BASE_URL + '/get-source?movie_id=' + vidIdMatch[1] + '&type=' + vidTypeMatch[1];
            return fetch(sourceUrl, { headers: HEADERS }).then(function(r) { return r.json(); });
        })
        .then(function(data) {
            if (!data || !data.sources) return [];
            
            var subtitles = [];
            if (data.subtitle) {
                subtitles.push({
                    label: 'türkçee',
                    url: data.subtitle.startsWith('http') ? data.subtitle : BASE_URL + data.subtitle
                });
            }
            
            var allStreams = [];
            
            return Promise.all(data.sources.map(function(source) {
                var streamUrl = source.src.startsWith('http') ? source.src : BASE_URL + source.src;
                
                return fetchM3u8(streamUrl).then(function(m3u8Data) {
                    if (!m3u8Data) return [];
                    
                    var parsed = parseMasterM3u8(m3u8Data.url, m3u8Data.content);
                    
                    parsed.forEach(function(s) {
                        allStreams.push({
                            name: '⌜ FilmModu ⌟ | ' + (altName || 'Kaynak') + ' | ' + s.quality,
                            title: mainTitle + (year ? ' (' + year + ')' : '') + ' · ' + s.quality,
                            url: s.url,
                            quality: s.quality,
                            size: 'HLS',
                            headers: STREAM_HEADERS,
                            subtitles: subtitles,
                            provider: 'filmmodu',
                            type: 'hls'
                        });
                    });
                    
                    return allStreams;
                });
            })).then(function() { return allStreams; });
        })
        .catch(function() { return []; });
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
                        results.forEach(function(r) { if (r) streams = streams.concat(r); });
                        return streams;
                    });
            })
            .then(function(streams) { resolve(streams || []); })
            .catch(function() { resolve([]); });
    });
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { getStreams };
} else {
    global.getStreams = getStreams;
}
