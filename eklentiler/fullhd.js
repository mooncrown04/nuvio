/**
 * FullHDFilmizlesene Nuvio Scraper - v4.4 (Nuvio Uyumlu)
 */

var cheerio = require("cheerio-without-node-native");

var BASE_URL = 'https://www.fullhdfilmizlesene.live';

var HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
    'Accept-Language': 'tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7',
    'Referer': BASE_URL + '/'
};

var STREAM_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    'Accept': 'video/webm,video/ogg,video/*;q=0.9,application/ogg;q=0.7,audio/*;q=0.6,*/*;q=0.5',
    'Accept-Language': 'tr-TR,tr;q=0.9',
    'Accept-Encoding': 'identity',
    'Origin': BASE_URL,
    'Referer': BASE_URL + '/',
    'Sec-Fetch-Dest': 'video',
    'Sec-Fetch-Mode': 'no-cors',
    'Sec-Fetch-Site': 'cross-site',
    'DNT': '1'
};

function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
    return new Promise(function(resolve, reject) {
        
        console.log('[FullHD] Starting for tmdbId:', tmdbId, 'type:', mediaType);

        var tmdbType = (mediaType === 'movie' ? 'movie' : 'tv');
        var tmdbUrl = 'https://api.themoviedb.org/3/' + tmdbType + '/' + tmdbId + 
                      '?language=tr-TR&api_key=4ef0d7355d9ffb5151e987764708ce96';

        var targetUrl = null;

        fetch(tmdbUrl)
            .then(function(res) { 
                if (!res.ok) throw new Error('TMDB HTTP: ' + res.status);
                return res.json(); 
            })
            .then(function(data) {
                var query = data ? (data.title || data.name || data.original_title || data.original_name) : '';
                if (!query) throw new Error('Isim bulunamadi');
                
                console.log('[FullHD] TMDB title:', query);
                
                var searchUrl = BASE_URL + '/arama/' + encodeURIComponent(query);
                console.log('[FullHD] Search URL:', searchUrl);
                
                return fetch(searchUrl, { headers: HEADERS });
            })
            .then(function(res) { 
                if (!res.ok) throw new Error('Arama HTTP: ' + res.status);
                return res.text(); 
            })
            .then(function(html) {
                console.log('[FullHD] Search HTML length:', html.length);
                
                var $ = cheerio.load(html);
                
                // Çalışan örneklerdeki gibi birden fazla selector dene
                var firstResult = $('.film-liste ul li a').first().attr('href') ||
                                  $('.film-liste .item a').first().attr('href') ||
                                  $('a[href*="/film/"]').first().attr('href') ||
                                  $('a[href*="/diziler/"]').first().attr('href');
                
                console.log('[FullHD] First result:', firstResult);
                
                if (!firstResult) {
                    console.log('[FullHD] No results found');
                    return resolve([]);
                }

                var slug = firstResult.replace(BASE_URL, '').replace(/^\/+/, '').replace(/\/$/, '');
                
                if (mediaType === 'tv') {
                    var seriesName = slug.replace('diziler/', '').split('-izle')[0].replace(/-$/, '');
                    targetUrl = BASE_URL + '/diziler/' + seriesName + '-' + 
                               seasonNum + '-sezon-' + episodeNum + '-bolum-izle';
                } else {
                    targetUrl = BASE_URL + '/film/' + slug;
                }
                
                console.log('[FullHD] Target URL:', targetUrl);
                return fetch(targetUrl, { headers: HEADERS });
            })
            .then(function(res) {
                if (res.status === 404 && mediaType === 'tv') {
                    var altUrl = targetUrl.replace('/diziler/', '/');
                    console.log('[FullHD] 404, trying alternative:', altUrl);
                    return fetch(altUrl, { headers: HEADERS });
                }
                if (!res.ok) throw new Error('Icerik HTTP: ' + res.status);
                return res;
            })
            .then(function(res) {
                return res.text();
            })
            .then(function(pageHtml) {
                var $ = cheerio.load(pageHtml);
                var streams = [];
                var subtitles = [];

                $('iframe').each(function(i, elem) {
                    var src = $(elem).attr('src') || $(elem).attr('data-src');
                    if (src) {
                        var url = src.startsWith('//') ? 'https:' + src : src;
                        if (!url.startsWith('http')) url = 'https:' + url;
                        
                        console.log('[FullHD] Found iframe:', i, url.substring(0, 80));
                        
                        streams.push({
                            name: '⌜ FullHD ⌟ | Kaynak ' + (i + 1),
                            title: 'FullHD Stream',
                            url: url,
                            quality: 'Auto',
                            size: 'Unknown',
                            headers: STREAM_HEADERS,
                            subtitles: subtitles,
                            provider: 'fullhd'
                        });
                    }
                });

                console.log('[FullHD] Total streams:', streams.length);
                resolve(streams);
            })
            .catch(function(err) {
                console.error('[FullHD] Error:', err.message);
                resolve([]); 
            });
    });
}

// Çalışan örneklerle AYNI export yapısı
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { getStreams: getStreams };
} else {
    global.getStreams = getStreams;
}
