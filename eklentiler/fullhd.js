/**
 * FullHDFilmizlesene Nuvio Scraper - v4.5 (404 Fix)
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
                
                // Tüm linkleri bul ve logla
                var allLinks = [];
                $('a[href*="/film/"], a[href*="/diziler/"], a[href*="/izle/"]').each(function(i, elem) {
                    var href = $(elem).attr('href');
                    if (href && !allLinks.includes(href)) {
                        allLinks.push(href);
                    }
                });
                console.log('[FullHD] Bulunan tum linkler:', allLinks.slice(0, 5));
                
                var firstResult = $('.film-liste ul li a').first().attr('href') ||
                                  $('.film-liste .item a').first().attr('href') ||
                                  $('a[href*="/film/"]').first().attr('href') ||
                                  $('a[href*="/diziler/"]').first().attr('href') ||
                                  $('a[href*="/izle/"]').first().attr('href');
                
                console.log('[FullHD] First result:', firstResult);
                
                if (!firstResult) {
                    console.log('[FullHD] No results found');
                    return resolve([]);
                }

                // URL temizleme - BASE_URL'i kaldır
                var cleanPath = firstResult.replace(BASE_URL, '').replace(/^\/+/, '').replace(/\/$/, '');
                console.log('[FullHD] Clean path:', cleanPath);
                
                var targetUrl = null;
                
                if (mediaType === 'tv') {
                    // Dizi URL yapısı
                    var seriesName = cleanPath.replace('diziler/', '').split('-izle')[0].replace(/-$/, '');
                    
                    // Farklı patternler dene
                    var patterns = [
                        BASE_URL + '/diziler/' + seriesName + '-' + seasonNum + '-sezon-' + episodeNum + '-bolum-izle',
                        BASE_URL + '/diziler/' + seriesName + '-sezon-' + seasonNum + '/bolum-' + episodeNum,
                        BASE_URL + '/' + seriesName + '-' + seasonNum + '-sezon-' + episodeNum + '-bolum-izle',
                        BASE_URL + '/diziler/' + seriesName + '/' + seasonNum + '-sezon/' + episodeNum + '-bolum'
                    ];
                    
                    console.log('[FullHD] Dizi patternleri:', patterns);
                    targetUrl = patterns[0]; // İlkini dene
                    
                } else {
                    // Film URL yapısı - direkt bulunan linki kullan
                    if (cleanPath.startsWith('film/') || cleanPath.startsWith('izle/')) {
                        targetUrl = BASE_URL + '/' + cleanPath;
                    } else {
                        targetUrl = BASE_URL + '/film/' + cleanPath;
                    }
                }
                
                console.log('[FullHD] Target URL:', targetUrl);
                
                // Önce direkt dene
                return fetch(targetUrl, { headers: HEADERS }).then(function(res) {
                    if (res.ok) {
                        console.log('[FullHD] URL basarili:', res.status);
                        return res;
                    }
                    
                    // 404 ise alternatif dene
                    if (res.status === 404) {
                        console.log('[FullHD] 404 alindi, alternatif deneniyor...');
                        
                        if (mediaType === 'tv') {
                            // Dizi alternatifleri
                            var altPatterns = [
                                targetUrl.replace('/diziler/', '/'),
                                targetUrl.replace('-bolum-izle', '-bolum'),
                                targetUrl.replace('-sezon-', '/sezon-'),
                                BASE_URL + '/' + cleanPath.replace('diziler/', '') + '-' + seasonNum + '-sezon-' + episodeNum + '-bolum'
                            ];
                            
                            for (var i = 0; i < altPatterns.length; i++) {
                                console.log('[FullHD] Alternatif dene:', altPatterns[i]);
                                // Not: Burada sırayla denemek için recursive yapı gerekir
                                // Şimdilik ilk alternatifi dene
                                if (i === 0) return fetch(altPatterns[i], { headers: HEADERS });
                            }
                        } else {
                            // Film alternatifleri
                            var altUrl = targetUrl.replace('/film/', '/izle/');
                            console.log('[FullHD] Film alternatif:', altUrl);
                            return fetch(altUrl, { headers: HEADERS });
                        }
                    }
                    
                    return res;
                });
            })
            .then(function(res) {
                if (!res.ok) {
                    console.log('[FullHD] Tum URL\'ler basarisiz, son status:', res.status);
                    throw new Error('Icerik HTTP: ' + res.status);
                }
                return res.text();
            })
            .then(function(pageHtml) {
                console.log('[FullHD] Sayfa HTML uzunlugu:', pageHtml.length);
                
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

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { getStreams: getStreams };
} else {
    global.getStreams = getStreams;
}
