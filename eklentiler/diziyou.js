// ! Bu araç @keyiflerolsun tarafından | @KekikAkademi için yazılmıştır.
// DiziYou JavaScript versiyonu - SineWix yapısı

var BASE_URL = 'https://www.diziyou.one';
var STORAGE_URL = 'https://storage.diziyou.one';

var HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7'
};

var STREAM_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    'Accept': 'video/webm,video/ogg,video/*;q=0.9,application/ogg;q=0.7,audio/*;q=0.6,*/*;q=0.5',
    'Accept-Language': 'tr-TR,tr;q=0.9',
    'Accept-Encoding': 'identity',
    'Referer': BASE_URL + '/',
    'Origin': BASE_URL,
    'Sec-Fetch-Dest': 'video',
    'Sec-Fetch-Mode': 'no-cors',
    'Sec-Fetch-Site': 'cross-site',
    'DNT': '1'
};

function getApiPaths(mediaType) {
    // DiziYou'da movie yok, sadece dizi
    return { genre: 'series', endpoint: 'show' };
}

function resolveMediaFireLink(link) {
    // DiziYou'da MediaFire yok, direkt link dön
    return Promise.resolve(link);
}

function buildStreams(videoLinks, title, year, subtitles) {
    var streams = [];
    
    videoLinks.forEach(function(stream) {
        var streamHeaders = Object.assign({}, STREAM_HEADERS, {
            'Referer': stream.iframeOrigin || BASE_URL + '/',
            'Origin': stream.iframeOrigin || BASE_URL
        });
        
        // Kalite seçenekleri varsa
        if (stream.qualities && stream.qualities.length > 0) {
            stream.qualities.forEach(function(q) {
                streams.push({
                    name: '⌜ DiziYou ⌟ | ' + stream.name + ' | ' + q.quality,
                    title: title + (year ? ' (' + year + ')' : '') + ' · ' + q.quality,
                    url: q.url,
                    quality: q.quality,
                    size: 'Unknown',
                    headers: streamHeaders,
                    subtitles: subtitles,
                    provider: 'diziyou'
                });
            });
        } else {
            // Tek kalite
            streams.push({
                name: '⌜ DiziYou ⌟ | ' + stream.name,
                title: title + (year ? ' (' + year + ')' : ''),
                url: stream.url,
                quality: stream.quality || '720p',
                size: 'Unknown',
                headers: streamHeaders,
                subtitles: subtitles,
                provider: 'diziyou'
            });
        }
    });
    
    return Promise.resolve(streams);
}

function parseMasterM3u8(masterUrl, streamHeaders) {
    return fetch(masterUrl, { headers: streamHeaders })
        .then(function(res) { return res.text(); })
        .then(function(m3u8) {
            var lines = m3u8.split('\n');
            var turkishAudioUrl = null;
            var qualities = [];

            // Türkçe audio track bul
            for (var i = 0; i < lines.length; i++) {
                var line = lines[i].trim();
                if (line.includes('TYPE=AUDIO') && line.includes('LANGUAGE="tr"')) {
                    var uriMatch = line.match(/URI="([^"]+)"/);
                    if (uriMatch) turkishAudioUrl = uriMatch[1];
                }
            }

            // Kalite seçeneklerini bul
            for (var j = 0; j < lines.length; j++) {
                var l = lines[j].trim();
                if (l.startsWith('#EXT-X-STREAM-INF:')) {
                    var nextLine = lines[j + 1] ? lines[j + 1].trim() : '';
                    if (!nextLine || nextLine.startsWith('#')) continue;

                    var resMatch = l.match(/RESOLUTION=(\d+x\d+)/);
                    var resolution = resMatch ? resMatch[1] : '';
                    var quality = '720p';
                    if (resolution.includes('1920')) quality = '1080p';
                    else if (resolution.includes('1280')) quality = '720p';
                    else if (resolution.includes('854')) quality = '480p';
                    else if (resolution.includes('640')) quality = '360p';

                    var streamUrl = nextLine.startsWith('http') ? nextLine : masterUrl.split('/').slice(0, -1).join('/') + '/' + nextLine;
                    qualities.push({ url: streamUrl, quality: quality, resolution: resolution });
                }
            }

            return { qualities: qualities, turkishAudioUrl: turkishAudioUrl };
        })
        .catch(function() { return { qualities: [], turkishAudioUrl: null }; });
}

function extractSubtitles(html) {
    var subMatch = html.match(/"subtitle"\s*:\s*"([^"]+)"/);
    if (!subMatch) return [];
    
    var subtitles = [];
    var subStr = subMatch[1];
    
    subStr.split(',').forEach(function(sub) {
        sub = sub.trim();
        if (!sub) return;
        
        var langMatch = sub.match(/\[([^\]]+)\]/);
        var url = sub.replace(/\[[^\]]+\]/, '').trim();
        var label = 'Türkçe';
        
        if (langMatch) {
            var l = langMatch[1].toLowerCase();
            if (l.includes('tur') || l.includes('tr')) label = 'Türkçe';
            else if (l.includes('ing') || l.includes('en')) label = 'English';
            else label = langMatch[1];
        } else {
            if (sub.includes('_tur')) label = 'Türkçe';
            else if (sub.includes('_eng')) label = 'English';
            url = sub;
        }
        
        if (url) {
            subtitles.push({ label: label, url: url });
        }
    });
    
    return subtitles;
}

function extractM3u8FromIframe(iframeSrc) {
    if (!iframeSrc) return Promise.resolve(null);

    var iframeUrl = iframeSrc.startsWith('http') ? iframeSrc : BASE_URL + iframeSrc;
    var iframeOrigin = iframeUrl.split('/').slice(0, 3).join('/');

    return fetch(iframeUrl, {
        headers: Object.assign({}, HEADERS, { 'Referer': BASE_URL + '/' })
    })
    .then(function(res) { return res.text(); })
    .then(function(html) {
        // m3u8 ara
        var m3uMatch = html.match(/file:"([^"]+\.m3u8[^"]*)"/) ||
                      html.match(/"file"\s*:\s*"([^"]+\.m3u8[^"]*)"/);
        
        if (!m3uMatch) return null;
        
        var m3u8Url = m3uMatch[1];
        var subtitles = extractSubtitles(html);
        
        return {
            url: m3u8Url,
            subtitles: subtitles,
            iframeOrigin: iframeOrigin
        };
    });
}

function fetchDetailAndStreams(diziyouId, mediaType, seasonNum, episodeNum) {
    // DiziYou'da ID yerine direkt URL kullanıyoruz
    var detailUrl = seasonNum && episodeNum ? 
        getEpisodeUrl(diziyouId, seasonNum, episodeNum) :
        diziyouId;
    
    console.log('[DiziYou] Detail URL:', detailUrl);

    return fetch(detailUrl, { headers: HEADERS })
        .then(function(res) { return res.text(); })
        .then(function(html) {
            // Başlık ve yıl çıkar
            var titleMatch = html.match(/<h1[^>]*>([^<]+)<\/h1>/i) ||
                            html.match(/<title>([^<]+)<\/title>/i);
            var title = titleMatch ? titleMatch[1].trim() : 'DiziYou';
            
            var yearMatch = html.match(/(\d{4})/);
            var year = yearMatch ? yearMatch[1] : null;

            // iframe bul
            var iframeMatch = html.match(/<iframe[^>]+src="([^"]+)"[^>]*class="[^"]*(?:responsive-player|series-player)[^"]*"/) ||
                             html.match(/class="[^"]*(?:responsive-player|series-player)[^"]*"[^>]*>[\s\S]*?<iframe[^>]+src="([^"]+)"/) ||
                             html.match(/<div[^>]*id="vast_new"[^>]*>[\s\S]*?<iframe[^>]+src="([^"]+)"/) ||
                             html.match(/<iframe[^>]+src="([^"]+)"/);
            
            var iframeSrc = iframeMatch ? iframeMatch[1] : null;
            
            if (!iframeSrc) {
                console.log('[DiziYou] No iframe found');
                return [];
            }

            return extractM3u8FromIframe(iframeSrc)
                .then(function(result) {
                    if (!result) return [];

                    var streamHeaders = Object.assign({}, STREAM_HEADERS, {
                        'Referer': result.iframeOrigin + '/',
                        'Origin': result.iframeOrigin
                    });

                    // Master m3u8'i parse et
                    return parseMasterM3u8(result.url, streamHeaders)
                        .then(function(parsed) {
                            var videoLinks = [];

                            if (parsed.qualities.length > 0) {
                                videoLinks.push({
                                    name: 'Altyazılı',
                                    qualities: parsed.qualities,
                                    iframeOrigin: result.iframeOrigin
                                });
                            } else {
                                videoLinks.push({
                                    name: 'Altyazılı',
                                    url: result.url,
                                    quality: '720p',
                                    iframeOrigin: result.iframeOrigin
                                });
                            }

                            return buildStreams(videoLinks, title, year, result.subtitles);
                        });
                });
        });
}

function getEpisodeUrl(contentUrl, seasonNum, episodeNum) {
    var slug = contentUrl.replace(/\/$/, '').split('/dizi/')[1] || '';
    slug = slug.replace(/\/$/, '');
    return BASE_URL + '/bolum/' + slug + '-' + seasonNum + '-sezon-' + episodeNum + '-bolum-izle/';
}

function searchDiziYou(title) {
    var searchUrl = BASE_URL + '/?s=' + encodeURIComponent(title);
    console.log('[DiziYou] Search URL:', searchUrl);

    return fetch(searchUrl, { headers: HEADERS })
        .then(function(res) { return res.text(); })
        .then(function(html) {
            var results = [];
            
            // Link pattern
            var linkRegex = /<a[^>]+href="(https:\/\/www\.diziyou\.one\/dizi\/[^"]+)"[^>]*title="([^"]+)"/gi;
            var match;
            
            while ((match = linkRegex.exec(html)) !== null) {
                var url = match[1];
                var itemTitle = match[2];
                
                // Duplicate kontrolü
                var duplicate = false;
                for (var i = 0; i < results.length; i++) {
                    if (results[i].url === url) { 
                        duplicate = true; 
                        break; 
                    }
                }
                
                if (!duplicate) {
                    results.push({ 
                        title: itemTitle, 
                        url: url, 
                        type: 'tv' 
                    });
                }
            }

            console.log('[DiziYou] Search results:', results.length);
            return results;
        });
}

function findBestMatch(results, query) {
    if (!results || results.length === 0) return null;

    var queryLower = query.toLowerCase();

    // Tam eşleşme
    for (var i = 0; i < results.length; i++) {
        if (results[i].title.toLowerCase() === queryLower) return results[i];
    }

    // İçeriyor
    for (var j = 0; j < results.length; j++) {
        if (results[j].title.toLowerCase().includes(queryLower)) return results[j];
    }

    return results[0];
}

function searchAndFetch(title, mediaType, seasonNum, episodeNum) {
    return searchDiziYou(title)
        .then(function(results) {
            var best = findBestMatch(results, title);
            if (!best) {
                console.log('[DiziYou] No match found for:', title);
                return [];
            }
            
            console.log('[DiziYou] Best match:', best.title, best.url);
            return fetchDetailAndStreams(best.url, mediaType, seasonNum, episodeNum);
        });
}

function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
    return new Promise(function(resolve, reject) {
        var tmdbType = mediaType === 'movie' ? 'movie' : 'tv';
        var tmdbUrl = 'https://api.themoviedb.org/3/' + tmdbType + '/' + tmdbId +
            '?language=tr-TR&api_key=4ef0d7355d9ffb5151e987764708ce96';

        console.log('[DiziYou] Starting for tmdbId:', tmdbId, 'type:', mediaType);

        fetch(tmdbUrl)
            .then(function(res) { return res.json(); })
            .then(function(data) {
                var title = data.title || data.name || '';
                var year = (data.release_date || data.first_air_date || '').substring(0, 4);
                
                console.log('[DiziYou] TMDB title:', title, 'year:', year);

                if (!title) {
                    resolve([]);
                    return;
                }

                var originalTitle = data.original_title || data.original_name || '';

                return searchAndFetch(title, mediaType, seasonNum, episodeNum)
                    .then(function(streams) {
                        if ((!streams || streams.length === 0) && originalTitle && originalTitle !== title) {
                            console.log('[DiziYou] Trying original title:', originalTitle);
                            return searchAndFetch(originalTitle, mediaType, seasonNum, episodeNum);
                        }
                        return streams;
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

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { getStreams };
} else {
    global.getStreams = getStreams;
}
