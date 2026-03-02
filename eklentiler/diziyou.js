var BASE_URL = 'https://www.diziyou.one';
var STORAGE_URL = 'https://storage.diziyou.one';

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

function searchDiziYou(title) {
    var searchUrl = BASE_URL + '/?s=' + encodeURIComponent(title);
    console.log('[DiziYou] Search:', searchUrl);

    return fetch(searchUrl, { headers: HEADERS })
        .then(function(res) { return res.text(); })
        .then(function(html) {
            var results = [];
            
            // div#list-series içindeki sonuçlar
            var seriesPattern = /<div[^>]*id="list-series"[^>]*>([\s\S]*?)<\/div>\s*(?=<div[^>]*id="list-series"|$)/gi;
            var seriesMatches = html.match(seriesPattern) || [];
            
            seriesMatches.forEach(function(seriesHtml) {
                var linkMatch = findFirst(seriesHtml, '<a[^>]+href="([^"]+)"[^>]*>[\s\S]*?<div[^>]*id="categorytitle"[^>]*>([\s\S]*?)<\/div>');
                if (!linkMatch) return;
                
                var href = linkMatch[1];
                var titleDiv = seriesHtml.match(/<div[^>]*id="categorytitle"[^>]*>[\s\S]*?<a[^>]*>([^<]*)<\/a>/i);
                var seriesTitle = titleDiv ? titleDiv[1].trim() : '';
                
                var posterMatch = findFirst(seriesHtml, '<img[^>]+src="([^"]+)"');
                var poster = posterMatch ? posterMatch[1] : null;
                
                if (href && seriesTitle) {
                    results.push({
                        title: seriesTitle,
                        url: href.startsWith('http') ? href : BASE_URL + href,
                        poster: poster
                    });
                }
            });

            console.log('[DiziYou] Found:', results.length);
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

function loadSeriesPage(url) {
    console.log('[DiziYou] Loading:', url);

    return fetch(url, { headers: HEADERS })
        .then(function(res) { return res.text(); })
        .then(function(html) {
            var episodes = [];
            
            // div.bolumust içindeki bölümler
            var episodePattern = /<div[^>]*class="[^"]*bolumust[^"]*"[^>]*>([\s\S]*?)<\/div>\s*<\/a>/gi;
            var episodeMatches = html.match(episodePattern) || [];
            
            episodeMatches.forEach(function(epHtml) {
                // Parent anchor tag
                var parentAnchor = html.substring(0, html.indexOf(epHtml)).match(/<a[^>]+href="([^"]+)"[^>]*>[^<]*$/);
                var epHref = parentAnchor ? parentAnchor[1] : null;
                
                if (!epHref) {
                    // Alternatif: Sonraki anchor'ı bul
                    var afterHtml = html.substring(html.indexOf(epHtml) + epHtml.length);
                    var nextAnchor = afterHtml.match(/^[\s\S]*?<a[^>]+href="([^"]+)"/);
                    epHref = nextAnchor ? nextAnchor[1] : null;
                }
                
                var nameMatch = findFirst(epHtml, '<div[^>]*class="[^"]*bolumismi[^"]*"[^>]*>([^<]*)<\\/div>');
                var epName = nameMatch ? nameMatch[1].trim() : '';
                
                var titleMatch = findFirst(epHtml, '<div[^>]*class="[^"]*baslik[^"]*"[^>]*>([^<]*)<\\/div>');
                var epTitle = titleMatch ? titleMatch[1].trim() : '';
                
                // Sezon ve bölüm numarası çıkar
                var seasonMatch = epName.match(/(\d+)\.\s*Sezon/i) || epTitle.match(/(\d+)\.\s*Sezon/i);
                var episodeMatch = epName.match(/(\d+)\.\s*Bölüm/i) || epTitle.match(/(\d+)\.\s*Bölüm/i);
                
                var seasonNum = seasonMatch ? parseInt(seasonMatch[1]) : 1;
                var episodeNum = episodeMatch ? parseInt(episodeMatch[1]) : null;
                
                if (epHref && epName) {
                    episodes.push({
                        url: epHref.startsWith('http') ? epHref : BASE_URL + epHref,
                        name: epName,
                        season: seasonNum,
                        episode: episodeNum
                    });
                }
            });

            // Dizi bilgileri
            var titleMatch = findFirst(html, '<h1[^>]*>([^<]*)<\\/h1>');
            var posterMatch = findFirst(html, '<div[^>]*class="[^"]*category_image[^"]*"[^>]*>[\s\S]*?<img[^>]+src="([^"]+)"');
            var descMatch = findFirst(html, '<div[^>]*class="[^"]*diziyou_desc[^"]*"[^>]*>([^<]*)<\\/div>');
            
            console.log('[DiziYou] Episodes:', episodes.length);

            return {
                title: titleMatch ? titleMatch[1].trim() : '',
                poster: posterMatch ? posterMatch[1] : null,
                description: descMatch ? descMatch[1].trim() : '',
                episodes: episodes
            };
        });
}

function extractStreams(episodeUrl) {
    console.log('[DiziYou] Episode:', episodeUrl);

    return fetch(episodeUrl, { headers: HEADERS })
        .then(function(res) { return res.text(); })
        .then(function(html) {
            // iframe#diziyouPlayer'dan itemId çıkar
            var iframeMatch = findFirst(html, '<iframe[^>]+id="[^"]*diziyouPlayer[^"]*"[^>]+src="([^"]+)"');
            if (!iframeMatch) {
                console.log('[DiziYou] No iframe found');
                return null;
            }
            
            var iframeSrc = iframeMatch[1];
            var itemId = iframeSrc.split('/').pop().replace('.html', '');
            
            console.log('[DiziYou] itemId:', itemId);
            
            var streams = [];
            var subtitles = [];
            
            // Türkçe Altyazılı
            var turkceAltyazili = html.includes('id="turkceAltyazili"') || html.includes("turkceAltyazili");
            if (turkceAltyazili) {
                subtitles.push({
                    label: 'türkçee',
                    url: STORAGE_URL + '/subtitles/' + itemId + '/tr.vtt'
                });
                streams.push({
                    name: '⌜ DiziYou ⌟ | Orjinal Dil (TR Altyazı)',
                    url: STORAGE_URL + '/episodes/' + itemId + '/play.m3u8',
                    quality: '720p'
                });
            }
            
            // İngilizce Altyazılı
            var ingilizceAltyazili = html.includes('id="ingilizceAltyazili"') || html.includes("ingilizceAltyazili");
            if (ingilizceAltyazili) {
                subtitles.push({
                    label: 'ingilizcee',
                    url: STORAGE_URL + '/subtitles/' + itemId + '/en.vtt'
                });
                // Eğer Türkçe altyazı yoksa, İngilizce altyazılı stream ekle
                if (!turkceAltyazili) {
                    streams.push({
                        name: '⌜ DiziYou ⌟ | Orjinal Dil (EN Altyazı)',
                        url: STORAGE_URL + '/episodes/' + itemId + '/play.m3u8',
                        quality: '720p'
                    });
                }
            }
            
            // Türkçe Dublaj
            var turkceDublaj = html.includes('id="turkceDublaj"') || html.includes("turkceDublaj");
            if (turkceDublaj) {
                streams.push({
                    name: '⌜ DiziYou ⌟ | Türkçe Dublaj',
                    url: STORAGE_URL + '/episodes/' + itemId + '_tr/play.m3u8',
                    quality: '720p'
                });
            }
            
            // Eğer hiçbir seçenek bulunamazsa, varsayılan olarak orijinal dil ekle
            if (streams.length === 0) {
                streams.push({
                    name: '⌜ DiziYou ⌟ | Orjinal Dil',
                    url: STORAGE_URL + '/episodes/' + itemId + '/play.m3u8',
                    quality: '720p'
                });
            }

            return {
                streams: streams,
                subtitles: subtitles
            };
        });
}

function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
    return new Promise(function(resolve, reject) {
        if (mediaType !== 'tv') {
            console.log('[DiziYou] Only TV series supported');
            resolve([]);
            return;
        }

        var tmdbUrl = 'https://api.themoviedb.org/3/tv/' + tmdbId +
            '?language=tr-TR&api_key=4ef0d7355d9ffb5151e987764708ce96';

        console.log('[DiziYou] Starting for tmdbId:', tmdbId);

        fetch(tmdbUrl)
            .then(function(res) { return res.json(); })
            .then(function(data) {
                var title = data.name || data.original_name || '';
                var year = (data.first_air_date || '').substring(0, 4);
                
                console.log('[DiziYou] TMDB title:', title);
                
                if (!title) {
                    resolve([]);
                    return Promise.resolve(null);
                }

                return searchDiziYou(title)
                    .then(function(results) {
                        var best = findBestMatch(results, title);
                        if (!best) {
                            console.log('[DiziYou] No match found');
                            return null;
                        }
                        
                        console.log('[DiziYou] Best match:', best.title, best.url);
                        return loadSeriesPage(best.url);
                    })
                    .then(function(seriesData) {
                        if (!seriesData || !seriesData.episodes || seriesData.episodes.length === 0) {
                            console.log('[DiziYou] No episodes found');
                            return [];
                        }
                        
                        // İstenen sezon ve bölümü bul
                        var targetEpisode = null;
                        for (var i = 0; i < seriesData.episodes.length; i++) {
                            var ep = seriesData.episodes[i];
                            if (ep.season === seasonNum && ep.episode === episodeNum) {
                                targetEpisode = ep;
                                break;
                            }
                        }
                        
                        // Eğer tam eşleşme yoksa, ilk bölümü dene
                        if (!targetEpisode && seriesData.episodes.length > 0) {
                            targetEpisode = seriesData.episodes[0];
                            console.log('[DiziYou] Using first episode:', targetEpisode.name);
                        }
                        
                        if (!targetEpisode) {
                            return [];
                        }
                        
                        return extractStreams(targetEpisode.url);
                    })
                    .then(function(streamData) {
                        if (!streamData) return [];
                        
                        var mainTitle = '';
                        
                        return streamData.streams.map(function(stream, idx) {
                            return {
                                name: stream.name,
                                title: mainTitle + ' · ' + stream.quality,
                                url: stream.url,
                                quality: stream.quality,
                                size: 'HLS',
                                headers: {
                                    'User-Agent': HEADERS['User-Agent'],
                                    'Referer': BASE_URL + '/'
                                },
                                subtitles: streamData.subtitles,
                                provider: 'diziyou',
                                type: 'hls'
                            };
                        });
                    });
            })
            .then(function(streams) {
                resolve(streams || []);
            })
            .catch(function(err) {
                console.error('[DiziYou] Error:', err.message);
                resolve([]);
            });
    });
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { getStreams };
} else {
    global.getStreams = getStreams;
}
