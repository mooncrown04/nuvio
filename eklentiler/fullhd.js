/**
 * FullHDFilmizlesene Nuvio Scraper - v4.1 (Optimized Logging)
 */

var cheerio = require("cheerio-without-node-native");

// Fetch polyfill (Node.js ortamı için)
if (typeof fetch === 'undefined') {
    try {
        var fetch = require('node-fetch');
    } catch(e) {
        console.log('[FullHD] UYARI: node-fetch bulunamadi, native fetch kullanilacak');
    }
}

var CONFIG = {
    BASE_URL: 'https://www.fullhdfilmizlesene.live',
    HEADERS: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language': 'tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
    }
};

// Log seviyeleri
function logInfo(msg, data) {
    console.log('[FullHD] [INFO] ' + msg, data ? JSON.stringify(data) : '');
}

function logError(msg, error) {
    console.log('[FullHD] [ERROR] ' + msg, error ? (error.message || error) : '');
    if (error && error.stack) {
        console.log('[FullHD] [STACK] ' + error.stack);
    }
}

function logDebug(msg, data) {
    // Debug modu açıkken detaylı log
    if (CONFIG.DEBUG) {
        console.log('[FullHD] [DEBUG] ' + msg, data ? JSON.stringify(data).substring(0, 500) : '');
    }
}

function logWarn(msg, data) {
    console.log('[FullHD] [WARN] ' + msg, data ? JSON.stringify(data) : '');
}

function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
    return new Promise(function(resolve) {
        
        logInfo('========== PLUGIN BASLATILIYOR ==========');
        logInfo('Parametreler', {tmdbId, mediaType, seasonNum, episodeNum});

        var tmdbType = (mediaType === 'movie' ? 'movie' : 'tv');
        var tmdbUrl = 'https://api.themoviedb.org/3/' + tmdbType + '/' + tmdbId + '?language=tr-TR&api_key=4ef0d7355d9ffb5151e987764708ce96';

        var targetUrl = null;
        var step = 'INIT';

        fetch(tmdbUrl)
            .then(function(res) { 
                step = 'TMDB_FETCH';
                logInfo('TMDB istegi gonderiliyor...');
                
                if (!res.ok) {
                    throw new Error('TMDB HTTP Hatasi: ' + res.status);
                }
                return res.json(); 
            })
            .then(function(data) {
                step = 'TMDB_PARSE';
                logInfo('TMDB yaniti alindi', {hasData: !!data});
                
                var query = data ? (data.title || data.name || data.original_title || data.original_name) : '';
                if (!query) {
                    throw new Error('Isim bulunamadi (TMDB verisi bos)');
                }
                
                logInfo('Bulunan isim: ' + query);
                
                var searchUrl = CONFIG.BASE_URL + '/arama/' + encodeURIComponent(query);
                logInfo('Arama URL: ' + searchUrl);
                
                return fetch(searchUrl, { headers: CONFIG.HEADERS });
            })
            .then(function(res) { 
                step = 'SEARCH_FETCH';
                
                if (!res) {
                    throw new Error('Arama baglantisi kurulamadi (res null)');
                }
                if (!res.ok) {
                    throw new Error('Arama HTTP Hatasi: ' + res.status);
                }
                return res.text(); 
            })
            .then(function(html) {
                step = 'SEARCH_PARSE';
                
                if (!html) {
                    throw new Error('Arama sonucu bos (html null)');
                }
                
                logInfo('Arama HTML uzunlugu: ' + html.length);
                
                var $ = cheerio.load(html);
                
                // Farklı selector denemeleri
                var selectors = [
                    '.film-liste ul li a',
                    '.film-liste .item a',
                    '.movie-item a',
                    'a[href*="/film/"]',
                    'a[href*="/diziler/"]',
                    '.film a',
                    'a[href*="-izle"]'
                ];
                
                var firstResult = null;
                var usedSelector = null;
                
                for (var i = 0; i < selectors.length; i++) {
                    var result = $(selectors[i]).first().attr('href');
                    if (result) {
                        firstResult = result;
                        usedSelector = selectors[i];
                        break;
                    }
                }
                
                logInfo('Selector bulundu: ' + usedSelector);
                logInfo('Bulunan ilk sonuc: ' + firstResult);
                
                if (!firstResult) {
                    logWarn('Film listesi bulunamadi - HTML preview:', html.substring(0, 1000));
                    throw new Error('Film listesi bulunamadi (selector eslesmedi)');
                }

                // URL temizleme
                var slug = firstResult
                    .replace(CONFIG.BASE_URL, '')
                    .replace(/^\/+/, '')
                    .replace(/\/$/, '');

                logInfo('Slug: ' + slug);

                if (mediaType === 'tv') {
                    step = 'TV_URL_BUILD';
                    var seriesName = slug
                        .replace('diziler/', '')
                        .replace('film/', '')
                        .split('-izle')[0]
                        .split('-bolum')[0]
                        .replace(/-$/, '');
                    
                    targetUrl = CONFIG.BASE_URL + '/diziler/' + seriesName + '-' + seasonNum + '-sezon-' + episodeNum + '-bolum-izle';
                    logInfo('Dizi URL: ' + targetUrl);
                } else {
                    step = 'MOVIE_URL_BUILD';
                    targetUrl = CONFIG.BASE_URL + '/' + slug;
                    if (!targetUrl.includes('/film/') && !targetUrl.includes('/diziler/')) {
                        targetUrl = CONFIG.BASE_URL + '/film/' + slug;
                    }
                    logInfo('Film URL: ' + targetUrl);
                }

                return fetch(targetUrl, { headers: CONFIG.HEADERS });
            })
            .then(function(res) {
                step = 'CONTENT_FETCH';
                
                if (!res) {
                    throw new Error('Icerik sayfasindan yanit yok (res null)');
                }

                // 404 durumunda alternatif URL dene
                if (res.status === 404 && mediaType === 'tv') {
                    logWarn('404 alindi, alternatif URL deneniyor...');
                    
                    var altUrl1 = targetUrl.replace('/diziler/', '/');
                    logInfo('Alternatif 1: ' + altUrl1);
                    
                    return fetch(altUrl1, { headers: CONFIG.HEADERS }).then(function(altRes) {
                        if (altRes.ok) {
                            logInfo('Alternatif 1 basarili');
                            return altRes;
                        }
                        
                        var seriesName = targetUrl.split('/').pop().split('-1-sezon')[0];
                        var altUrl2 = CONFIG.BASE_URL + '/diziler/' + seriesName + '-sezon-' + seasonNum + '/bolum-' + episodeNum;
                        logInfo('Alternatif 2: ' + altUrl2);
                        
                        return fetch(altUrl2, { headers: CONFIG.HEADERS });
                    });
                }
                
                if (!res.ok) {
                    throw new Error('Icerik HTTP Hatasi: ' + res.status);
                }
                
                return res;
            })
            .then(function(res) {
                step = 'CONTENT_PARSE';
                
                if (!res || !res.text) {
                    throw new Error('Sayfa metni okunamadi (res.text yok)');
                }
                return res.text();
            })
            .then(function(pageHtml) {
                step = 'EXTRACT_STREAMS';
                
                if (!pageHtml) {
                    throw new Error('Sayfa HTML\'i bos');
                }
                
                logInfo('Sayfa HTML uzunlugu: ' + pageHtml.length);
                
                var $ = cheerio.load(pageHtml);
                var streams = [];

                // Tüm iframe'leri ara
                $('iframe').each(function(i, elem) {
                    var src = $(elem).attr('src') || $(elem).attr('data-src');
                    if (src) {
                        var finalUrl = src.startsWith('//') ? 'https:' + src : src;
                        if (!finalUrl.startsWith('http')) {
                            finalUrl = 'https:' + finalUrl;
                        }
                        
                        logInfo('Iframe bulundu [' + i + ']: ' + finalUrl.substring(0, 80));
                        
                        streams.push({
                            name: "FullHD Kaynak " + (i + 1),
                            url: finalUrl,
                            quality: "Auto",
                            headers: { 
                                'Referer': CONFIG.BASE_URL + '/',
                                'User-Agent': CONFIG.HEADERS['User-Agent']
                            },
                            provider: "fullhd-resilient"
                        });
                    }
                });

                // Video tag'lerini kontrol et
                $('video source').each(function(i, elem) {
                    var src = $(elem).attr('src');
                    if (src) {
                        logInfo('Video source bulundu [' + i + ']');
                        streams.push({
                            name: "FullHD Direct " + (i + 1),
                            url: src,
                            quality: $(elem).attr('res') || $(elem).attr('label') || "Auto",
                            headers: { 
                                'Referer': CONFIG.BASE_URL + '/',
                                'User-Agent': CONFIG.HEADERS['User-Agent']
                            },
                            provider: "fullhd-resilient"
                        });
                    }
                });

                // Script icindeki video URL'lerini ara
                var scriptText = $('script').text();
                var videoMatches = scriptText.match(/(https?:\/\/[^"'\s]+\.(?:mp4|m3u8|webm)[^"'\s]*)/gi);
                if (videoMatches) {
                    logInfo('Script icinde ' + videoMatches.length + ' video URL bulundu');
                    videoMatches.forEach(function(url, i) {
                        if (!streams.some(function(s) { return s.url === url; })) {
                            streams.push({
                                name: "FullHD Script " + (i + 1),
                                url: url,
                                quality: "Auto",
                                headers: { 
                                    'Referer': CONFIG.BASE_URL + '/',
                                    'User-Agent': CONFIG.HEADERS['User-Agent']
                                },
                                provider: "fullhd-resilient"
                            });
                        }
                    });
                }

                logInfo('Toplam bulunan stream: ' + streams.length);
                
                if (streams.length === 0) {
                    logWarn('Hic stream bulunamadi');
                }
                
                resolve(streams);
            })
            .catch(function(err) {
                logError('HATA (step: ' + step + ')', err);
                resolve([]); 
            });
    });
}

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { getStreams: getStreams };
} else if (typeof global !== 'undefined') {
    global.getStreams = getStreams;
} else if (typeof globalThis !== 'undefined') {
    globalThis.getStreams = getStreams;
}

logInfo('Plugin yuklendi - v4.1');
