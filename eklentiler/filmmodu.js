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

function detectRealFormat(url) {
    var lowerUrl = url.toLowerCase();
    if (lowerUrl.includes('.m3u8') || lowerUrl.includes('/m3u8/')) return 'HLS';
    if (lowerUrl.includes('.mp4')) return 'MP4';
    return 'UNKNOWN';
}

function searchFilmModu(title) {
    var searchUrl = BASE_URL + '/film-ara?term=' + encodeURIComponent(title);
    console.log('[FilmModu] Arama Başlatıldı:', title, 'URL:', searchUrl);
    
    return fetch(searchUrl, { headers: HEADERS })
        .then(function(res) { return res.text(); })
        .then(function(html) {
            var results = [];
            var moviePattern = /<div[^>]*class="[^"]*movie[^"]*"[^>]*>([\s\S]*?)<\/div>\s*(?=<div[^>]*class="[^"]*movie[^"]*"|$)/gi;
            var movieMatches = html.match(moviePattern) || [];
            
            console.log('[FilmModu] Arama Sayfası Alındı. Bulunan Ham Eşleşme Sayısı:', movieMatches.length);
            
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
            console.log('[FilmModu] Ayıklanan Arama Sonuçları:', JSON.stringify(results));
            return results;
        });
}

function findBestMatch(results, query) {
    if (!results || results.length === 0) return null;
    var queryLower = query.toLowerCase();
    console.log('[FilmModu] En İyi Eşleşme Aranıyor. Sorgu:', queryLower);
    
    for (var i = 0; i < results.length; i++) {
        if (results[i].title.toLowerCase() === queryLower) return results[i];
    }
    for (var j = 0; j < results.length; j++) {
        if (results[j].title.toLowerCase().includes(queryLower)) return results[j];
    }
    return results[0];
}

function loadMoviePage(url) {
    console.log('[FilmModu] Film Sayfası Yükleniyor:', url);
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
            
            console.log('[FilmModu] Film Sayfası Çözüldü. Alternatif Kaynak Sayısı:', streams.length);
            return {
                title: titleMatch ? titleMatch[1].trim() : '',
                year: yearMatch ? yearMatch[1].trim() : '',
                alternatives: streams
            };
        });
}

function extractVideoFromAlternate(altUrl, altName, mainTitle, year) {
    console.log('[FilmModu] Kaynak API Sorgulanıyor:', altName, 'URL:', altUrl);
    return fetch(altUrl, { headers: HEADERS })
        .then(function(res) { return res.text(); })
        .then(function(html) {
            var vidIdMatch = findFirst(html, "var\\s+videoId\\s*=\\s*['\"]([^'\"]+)['\"]");
            var vidTypeMatch = findFirst(html, "var\\s+videoType\\s*=\\s*['\"]([^'\"]+)['\"]");
            
            if (!vidIdMatch || !vidTypeMatch) {
                console.warn('[FilmModu] VideoID veya VideoType bulunamadı:', altName);
                return [];
            }
            
            var sourceUrl = BASE_URL + '/get-source?movie_id=' + vidIdMatch[1] + '&type=' + vidTypeMatch[1];
            console.log('[FilmModu] get-source İsteği Atılıyor:', sourceUrl);
            
            return fetch(sourceUrl, { 
                headers: {
                    'User-Agent': HEADERS['User-Agent'],
                    'X-Requested-With': 'XMLHttpRequest',
                    'Referer': altUrl
                }
            }).then(function(r) { return r.json(); });
        })
        .then(function(data) {
            if (!data || !data.sources) {
                console.warn('[FilmModu] API veri döndürmedi:', altName);
                return [];
            }
            
            var subtitles = [];
            if (data.subtitle) {
                subtitles.push({
                    label: 'Türkçe',
                    url: data.subtitle.startsWith('http') ? data.subtitle : BASE_URL + data.subtitle
                });
            }
            
            return Promise.all(data.sources.map(function(source, idx) {
                var streamUrl = source.src.startsWith('http') ? source.src : BASE_URL + source.src;
                
                // Player için format tespiti ve HEAD kontrolü
                return fetch(streamUrl, {
                    method: 'HEAD',
                    headers: { 'Referer': BASE_URL + '/' }
                }).then(function(headRes) {
                    var finalUrl = headRes.url;
                    var contentType = headRes.headers.get('content-type') || '';
                    var playerType = (contentType.includes('mpegurl') || contentType.includes('m3u8')) ? 'hls' : 'mp4';
                    
                    console.log('[FilmModu] FINAL LINK:', finalUrl, '| Type:', playerType);

                    return {
                        name: '⌜ FilmModu ⌟ | ' + altName,
                        title: mainTitle + (year ? ' (' + year + ')' : '') + ' · ' + (source.label || '720p'),
                        url: finalUrl,
                        type: playerType, // Player'ın tanıması için kritik
                        headers: {
                            'User-Agent': HEADERS['User-Agent'],
                            'Referer': 'https://www.filmmodu.ws/',
                            'Origin': 'https://www.filmmodu.ws'
                        },
                        subtitles: subtitles,
                        provider: 'filmmodu'
                    };
                }).catch(function(e) {
                    console.error('[FilmModu] HEAD İsteği Hatası:', e.message);
                    return null;
                });
            }));
        });
}

function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
    return new Promise(function(resolve) {
        console.log('[FilmModu] SÜREÇ BAŞLADI. TMDB ID:', tmdbId, 'Tip:', mediaType);
        
        if (mediaType !== 'movie') {
            console.log('[FilmModu] Sadece filmler destekleniyor. Çıkılıyor.');
            resolve([]);
            return;
        }

        var tmdbUrl = 'https://api.themoviedb.org/3/movie/' + tmdbId + '?language=tr-TR&api_key=4ef0d7355d9ffb5151e987764708ce96';

        fetch(tmdbUrl)
            .then(function(res) { return res.json(); })
            .then(function(data) {
                var title = data.title || data.original_title || '';
                var year = (data.release_date || '').substring(0, 4);
                
                return searchFilmModu(title)
                    .then(function(results) {
                        var best = findBestMatch(results, title);
                        if (!best) throw new Error('Film sitede bulunamadı.');
                        return loadMoviePage(best.url);
                    })
                    .then(function(movieData) {
                        var promises = movieData.alternatives.map(function(alt) {
                            return extractVideoFromAlternate(alt.url, alt.name, movieData.title || title, movieData.year || year);
                        });
                        return Promise.all(promises);
                    })
                    .then(function(allResults) {
                        var streams = [];
                        allResults.forEach(function(r) { 
                            if (r && Array.isArray(r)) streams = streams.concat(r); 
                        });
                        console.log('[FilmModu] BİTTİ. Toplam Stream Sayısı:', streams.length);
                        resolve(streams.filter(Boolean));
                    });
            })
            .catch(function(err) {
                console.error('[FilmModu] KRİTİK HATA:', err.message);
                resolve([]);
            });
    });
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { getStreams };
} else {
    global.getStreams = getStreams;
}
