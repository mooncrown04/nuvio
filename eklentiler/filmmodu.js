var BASE_URL = 'https://www.filmmodu.ws';

var HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    'Accept-Language': 'tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7',
    'Accept-Encoding': 'gzip, deflate, br',
    'Referer': BASE_URL + '/',
    'Connection': 'keep-alive'
};

var STREAM_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': '*/*',
    'Accept-Language': 'tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7',
    'Accept-Encoding': 'identity;q=1, *;q=0',
    'Referer': BASE_URL + '/',
    'Origin': BASE_URL,
    'Sec-Fetch-Dest': 'video',
    'Sec-Fetch-Mode': 'no-cors',
    'Sec-Fetch-Site': 'cross-site',
    'DNT': '1',
    'Connection': 'keep-alive',
    'Icy-Metadata': '1'
};

function findFirst(html, pattern) {
    var regex = new RegExp(pattern, 'i');
    var match = regex.exec(html);
    return match ? match : null;
}

function detectFormat(url) {
    var lowerUrl = url.toLowerCase();
    
    if (lowerUrl.includes('.m3u8') || lowerUrl.includes('/m3u8/') || lowerUrl.includes('playlist')) {
        return 'HLS';
    }
    if (lowerUrl.includes('.mpd') || lowerUrl.includes('/mpd/')) {
        return 'DASH';
    }
    if (lowerUrl.includes('.mp4') || lowerUrl.includes('/mp4/')) {
        return 'MP4';
    }
    if (lowerUrl.includes('.ts') || lowerUrl.includes('/ts/')) {
        return 'TS';
    }
    if (lowerUrl.includes('.mkv')) {
        return 'MKV';
    }
    if (lowerUrl.includes('.webm')) {
        return 'WEBM';
    }
    
    return 'HLS';
}

function searchFilmModu(title) {
    var searchUrl = BASE_URL + '/film-ara?term=' + encodeURIComponent(title);
    console.log('[FilmModu] Search URL:', searchUrl);

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
                
                var posterMatch = findFirst(movieHtml, '<picture[^>]*>.*?<img[^>]+data-src="([^"]+)"');
                var poster = posterMatch ? posterMatch[1] : null;
                
                if (href && movieTitle) {
                    results.push({
                        title: movieTitle,
                        url: href.startsWith('http') ? href : BASE_URL + href,
                        poster: poster
                    });
                }
            });

            console.log('[FilmModu] Search results:', results.length);
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
    console.log('[FilmModu] Loading movie page:', url);

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
            var title = titleMatch ? titleMatch[1].trim() : '';
            
            var yearMatch = findFirst(html, '<span[^>]*itemprop="dateCreated"[^>]*>([^<]*)<\\/span>');
            var year = yearMatch ? titleMatch[1].trim() : '';
            
            return {
                title: title,
                year: year,
                alternatives: streams
            };
        });
}

function resolveRedirect(url) {
    return fetch(url, {
        method: 'GET', // HEAD yerine GET kullan
        headers: STREAM_HEADERS,
        redirect: 'follow'
    }).then(function(res) {
        return res.url;
    }).catch(function() {
        return url;
    });
}

function fetchM3u8Content(url) {
    return fetch(url, {
        headers: STREAM_HEADERS
    }).then(function(res) {
        return res.text();
    }).then(function(content) {
        return {
            url: url,
            content: content,
            isMaster: content.includes('#EXT-X-STREAM-INF'),
            hasSegments: content.includes('#EXTINF')
        };
    }).catch(function(err) {
        console.log('[FilmModu] M3U8 fetch error:', err.message);
        return null;
    });
}

function extractVideoFromAlternate(altUrl, altName, mainTitle, year) {
    console.log('[FilmModu] Loading alternate:', altUrl);

    return fetch(altUrl, { headers: HEADERS })
        .then(function(res) { return res.text(); })
        .then(function(html) {
            var vidIdMatch = findFirst(html, "var\\s+videoId\\s*=\\s*['\"]([^'\"]+)['\"]");
            var vidTypeMatch = findFirst(html, "var\\s+videoType\\s*=\\s*['\"]([^'\"]+)['\"]");
            
            if (!vidIdMatch || !vidTypeMatch) {
                console.log('[FilmModu] No videoId/videoType found');
                return null;
            }
            
            var videoId = vidIdMatch[1];
            var videoType = vidTypeMatch[1];
            
            var sourceUrl = BASE_URL + '/get-source?movie_id=' + videoId + '&type=' + videoType;
            console.log('[FilmModu] Source URL:', sourceUrl);
            
            return fetch(sourceUrl, { headers: HEADERS })
                .then(function(res) { return res.json(); });
        })
        .then(function(data) {
            if (!data) return null;
            
            var streams = [];
            var subtitles = [];
            
            if (data.subtitle) {
                subtitles.push({
                    label: 'türkçee',
                    url: data.subtitle.startsWith('http') ? data.subtitle : BASE_URL + data.subtitle
                });
            }
            
            if (data.sources && Array.isArray(data.sources)) {
                return Promise.all(data.sources.map(function(source) {
                    var quality = '720p';
                    if (source.label) {
                        var label = source.label.toLowerCase();
                        if (label.includes('1080') || label.includes('fhd')) quality = '1080p';
                        else if (label.includes('720') || label.includes('hd')) quality = '720p';
                        else if (label.includes('480')) quality = '480p';
                        else if (label.includes('360')) quality = '360p';
                    }
                    
                    var streamUrl = source.src.startsWith('http') ? source.src : BASE_URL + source.src;
                    
                    // M3U8 içeriğini kontrol et
                    return fetchM3u8Content(streamUrl).then(function(m3u8Info) {
                        if (!m3u8Info) return null;
                        
                        var format = detectFormat(m3u8Info.url);
                        var finalUrl = m3u8Info.url;
                        
                        // Eğer master playlist ise ve tek bir stream varsa, direkt onu kullan
                        if (m3u8Info.isMaster) {
                            console.log('[FilmModu] Master playlist detected');
                        }
                        
                        // Stream objesi - HLS için özel ayarlar
                        var streamObj = {
                            name: '⌜ FilmModu ⌟ | ' + (altName || 'Kaynak'),
                            title: mainTitle + (year ? ' (' + year + ')' : '') + ' · ' + quality,
                            url: finalUrl,
                            quality: quality,
                            size: format + (m3u8Info.isMaster ? ' (Master)' : ' (Direct)'),
                            headers: {
                                'User-Agent': STREAM_HEADERS['User-Agent'],
                                'Accept': '*/*',
                                'Referer': BASE_URL + '/',
                                'Origin': BASE_URL
                            },
                            subtitles: subtitles,
                            provider: 'filmmodu',
                            type: 'hls'
                        };
                        
                        console.log('[FilmModu] Stream URL:', finalUrl.substring(0, 100) + '...');
                        console.log('[FilmModu] Is Master:', m3u8Info.isMaster);
                        console.log('[FilmModu] Has Segments:', m3u8Info.hasSegments);
                        
                        return streamObj;
                    });
                })).then(function(resolvedStreams) {
                    return resolvedStreams.filter(function(s) { return s && s.url; });
                });
            }
            
            return [];
        })
        .catch(function(err) {
            console.error('[FilmModu] Error extracting video:', err.message);
            return [];
        });
}

function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
    return new Promise(function(resolve, reject) {
        if (mediaType !== 'movie') {
            console.log('[FilmModu] Only movies supported');
            resolve([]);
            return;
        }

        var tmdbUrl = 'https://api.themoviedb.org/3/movie/' + tmdbId +
            '?language=tr-TR&api_key=4ef0d7355d9ffb5151e987764708ce96';

        console.log('[FilmModu] Starting for tmdbId:', tmdbId);

        fetch(tmdbUrl)
            .then(function(res) { return res.json(); })
            .then(function(data) {
                var title = data.title || data.original_title || '';
                var year = (data.release_date || '').substring(0, 4);
                
                console.log('[FilmModu] TMDB title:', title, 'year:', year);
                
                if (!title) {
                    resolve([]);
                    return Promise.resolve(null);
                }

                return searchFilmModu(title)
                    .then(function(results) {
                        var best = findBestMatch(results, title);
                        if (!best) {
                            console.log('[FilmModu] No match found');
                            return null;
                        }
                        
                        console.log('[FilmModu] Best match:', best.title, best.url);
                        return loadMoviePage(best.url);
                    })
                    .then(function(movieData) {
                        if (!movieData || !movieData.alternatives || movieData.alternatives.length === 0) {
                            console.log('[FilmModu] No alternatives found');
                            return [];
                        }
                        
                        var mainTitle = movieData.title || title;
                        var movieYear = movieData.year || year;
                        
                        var promises = movieData.alternatives.map(function(alt) {
                            return extractVideoFromAlternate(alt.url, alt.name, mainTitle, movieYear);
                        });
                        
                        return Promise.all(promises);
                    })
                    .then(function(results) {
                        var allStreams = [];
                        results.forEach(function(streamList) {
                            if (streamList && Array.isArray(streamList)) {
                                allStreams = allStreams.concat(streamList);
                            }
                        });
                        return allStreams;
                    });
            })
            .then(function(streams) {
                resolve(streams || []);
            })
            .catch(function(err) {
                console.error('[FilmModu] Error:', err.message);
                resolve([]);
            });
    });
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { getStreams };
} else {
    global.getStreams = getStreams;
}
