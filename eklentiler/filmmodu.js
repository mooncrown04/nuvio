var BASE_URL = 'https://www.filmmodu.ws';
var HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    'Referer': BASE_URL + '/'
};

// Loglama yardımcısı
function log(msg) {
    console.log("DEBUG_FILMMODU: " + msg);
}

function searchFilmModu(title) {
    log("Arama başlatıldı: " + title);
    var searchUrl = BASE_URL + '/film-ara?term=' + encodeURIComponent(title);
    return fetch(searchUrl, { headers: HEADERS })
        .then(function(res) { 
            log("Arama yanıtı geldi, status: " + res.status);
            return res.text(); 
        })
        .then(function(html) {
            var results = [];
            var moviePattern = /<div[^>]*class="[^"]*movie[^"]*"[^>]*>([\s\S]*?)<\/div>/gi;
            var match;
            while ((match = moviePattern.exec(html)) !== null) {
                var movieHtml = match[1];
                var linkMatch = /<a[^>]+href="([^"]+)"[^>]*>([^<]*)<\/a>/i.exec(movieHtml);
                if (linkMatch) {
                    results.push({
                        title: linkMatch[2].trim(),
                        url: linkMatch[1].startsWith('http') ? linkMatch[1] : BASE_URL + linkMatch[1]
                    });
                }
            }
            log("Bulunan sonuç sayısı: " + results.length);
            return results;
        });
}

function extractVideoFromAlternate(altUrl, altName, mainTitle) {
    log("Alternatif çözülüyor: " + altName + " -> " + altUrl);
    return fetch(altUrl, { headers: HEADERS })
        .then(function(res) { return res.text(); })
        .then(function(html) {
            var vidIdMatch = /var\s+videoId\s*=\s*['"]([^'"]+)['"]/i.exec(html);
            var vidTypeMatch = /var\s+videoType\s*=\s*['"]([^'"]+)['"]/i.exec(html);
            
            if (!vidIdMatch) {
                log("HATA: Video ID bulunamadı (" + altName + ")");
                return [];
            }
            
            var sourceUrl = BASE_URL + '/get-source?movie_id=' + vidIdMatch[1] + '&type=' + vidTypeMatch[1];
            log("Source URL alındı: " + sourceUrl);

            return fetch(sourceUrl, { 
                headers: { 'X-Requested-With': 'XMLHttpRequest', 'Referer': altUrl }
            }).then(function(r) { return r.json(); });
        })
        .then(function(data) {
            if (!data || !data.sources) return [];
            
            return data.sources.map(function(source) {
                var streamUrl = source.src.startsWith('http') ? source.src : BASE_URL + source.src;
                var isHls = streamUrl.includes('m3u8');
                
                log("STREAM HAZIR: " + streamUrl.substring(0, 50) + "...");

                return {
                    name: '⌜ FilmModu ⌟',
                    title: mainTitle + ' · ' + (source.label || 'Video'),
                    url: streamUrl,
                    // Player Hatalarını Gidermek İçin Genişletilmiş Parametreler
                    type: isHls ? 'hls' : 'mp4',
                    renderType: isHls ? 'hls' : 'mp4',
                    mimeType: isHls ? 'application/vnd.apple.mpegurl' : 'video/mp4',
                    hw_decode: false,          // Donanım hızlandırmayı kapat
                    software_decode: true,     // Yazılımsal decoder'ı zorla
                    force_software: true,      // Bazı player versiyonları için
                    is_direct: true,
                    headers: {
                        'User-Agent': HEADERS['User-Agent'],
                        'Referer': BASE_URL + '/',
                        'Origin': BASE_URL,
                        'Connection': 'keep-alive'
                    }
                };
            });
        }).catch(function(e) { 
            log("HATA (extract): " + e.message);
            return []; 
        });
}

function getStreams(tmdbId, mediaType) {
    return new Promise(function(resolve) {
        if (mediaType !== 'movie') return resolve([]);

        var tmdbUrl = 'https://api.themoviedb.org/3/movie/' + tmdbId + '?language=tr-TR&api_key=4ef0d7355d9ffb5151e987764708ce96';

        fetch(tmdbUrl)
            .then(function(res) { return res.json(); })
            .then(function(data) {
                return searchFilmModu(data.title || data.original_title).then(function(results) {
                    if (!results.length) return [];
                    var best = results[0]; 
                    return fetch(best.url, { headers: HEADERS })
                        .then(function(r) { return r.text(); })
                        .then(function(html) {
                            var alts = [];
                            var linkPattern = /<a[^>]+href="([^"]+)"[^>]*>([^<]*)<\/a>/gi;
                            var match;
                            while ((match = linkPattern.exec(html)) !== null) {
                                if (match[1].includes('/izle/')) {
                                    alts.push({ url: match[1], name: match[2] });
                                }
                            }
                            log("Bulunan kaynak sayısı: " + alts.length);
                            return Promise.all(alts.slice(0, 2).map(function(a) { 
                                return extractVideoFromAlternate(a.url, a.name, data.title); 
                            }));
                        });
                });
            })
            .then(function(allResults) {
                var finalStreams = [];
                allResults.forEach(function(arr) { if(arr) finalStreams = finalStreams.concat(arr); });
                log("TOPLAM STREAM: " + finalStreams.length);
                resolve(finalStreams);
            })
            .catch(function(e) { 
                log("GENEL HATA: " + e.message);
                resolve([]); 
            });
    });
}
