/**
 * FullHDFilmizlesene Nuvio Scraper - v4.2 (Export Fix)
 */

var cheerio = require("cheerio-without-node-native");

// Fetch polyfill
if (typeof fetch === 'undefined') {
    try {
        var fetch = require('node-fetch');
    } catch(e) {
        console.log('[FullHD] node-fetch yok, native fetch kullanilacak');
    }
}

var CONFIG = {
    BASE_URL: 'https://www.fullhdfilmizlesene.live',
    DEBUG: true,
    HEADERS: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7',
    }
};

function log(msg, data) {
    var line = '[FullHD] ' + msg;
    if (data) line += ' | ' + JSON.stringify(data);
    console.log(line);
}

// ========== ANA FONKSIYON ==========
function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
    log('========== BASLATILIYOR ==========', {tmdbId, mediaType});
    
    return new Promise(function(resolve, reject) {
        
        var tmdbType = (mediaType === 'movie' ? 'movie' : 'tv');
        var tmdbUrl = 'https://api.themoviedb.org/3/' + tmdbType + '/' + tmdbId + 
                      '?language=tr-TR&api_key=4ef0d7355d9ffb5151e987764708ce96';

        var targetUrl = null;

        // Adım 1: TMDB
        fetch(tmdbUrl)
            .then(function(res) { 
                log('TMDB yanit', {status: res.status});
                if (!res.ok) throw new Error('TMDB HTTP: ' + res.status);
                return res.json(); 
            })
            .then(function(data) {
                var query = data ? (data.title || data.name || data.original_title || data.original_name) : '';
                if (!query) throw new Error('Isim bulunamadi');
                
                log('Bulunan isim: ' + query);
                
                // Adım 2: Arama
                var searchUrl = CONFIG.BASE_URL + '/arama/' + encodeURIComponent(query);
                log('Arama: ' + searchUrl);
                
                return fetch(searchUrl, { headers: CONFIG.HEADERS });
            })
            .then(function(res) { 
                if (!res.ok) throw new Error('Arama HTTP: ' + res.status);
                return res.text(); 
            })
            .then(function(html) {
                log('Arama HTML: ' + html.length);
                
                var $ = cheerio.load(html);
                
                // Selector ara
                var firstResult = $('.film-liste ul li a').first().attr('href') ||
                                  $('a[href*="/film/"]').first().attr('href') ||
                                  $('a[href*="/diziler/"]').first().attr('href');
                
                log('Bulunan link: ' + firstResult);
                
                if (!firstResult) {
                    log('UYARI: Link bulunamadi');
                    return resolve([]);
                }

                // URL oluştur
                var slug = firstResult.replace(CONFIG.BASE_URL, '').replace(/^\/+/, '').replace(/\/$/, '');
                
                if (mediaType === 'tv') {
                    var seriesName = slug.replace('diziler/', '').split('-izle')[0];
                    targetUrl = CONFIG.BASE_URL + '/diziler/' + seriesName + '-' + 
                               seasonNum + '-sezon-' + episodeNum + '-bolum-izle';
                } else {
                    targetUrl = CONFIG.BASE_URL + '/film/' + slug;
                }
                
                log('Hedef URL: ' + targetUrl);
                return fetch(targetUrl, { headers: CONFIG.HEADERS });
            })
            .then(function(res) {
                if (res.status === 404 && mediaType === 'tv') {
                    var altUrl = targetUrl.replace('/diziler/', '/');
                    log('404, alternatif: ' + altUrl);
                    return fetch(altUrl, { headers: CONFIG.HEADERS });
                }
                if (!res.ok) throw new Error('Icerik HTTP: ' + res.status);
                return res;
            })
            .then(function(res) {
                if (!res.text) throw new Error('Yanit okunamadi');
                return res.text();
            })
            .then(function(pageHtml) {
                var $ = cheerio.load(pageHtml);
                var streams = [];

                $('iframe').each(function(i, elem) {
                    var src = $(elem).attr('src') || $(elem).attr('data-src');
                    if (src) {
                        var url = src.startsWith('//') ? 'https:' + src : src;
                        if (!url.startsWith('http')) url = 'https:' + url;
                        
                        streams.push({
                            name: "FullHD " + (i + 1),
                            url: url,
                            quality: "Auto",
                            headers: { 'Referer': CONFIG.BASE_URL + '/' },
                            provider: "fullhd"
                        });
                    }
                });

                log('Bulunan stream: ' + streams.length);
                resolve(streams);
            })
            .catch(function(err) {
                log('HATA: ' + err.message);
                resolve([]); 
            });
    });
}

// ========== EXPORT - BU KISIM KRITIK ==========

// 1. Global scope'a ekle (React Native/QuickJS için)
if (typeof global !== 'undefined') {
    global.getStreams = getStreams;
    log('Export: global.getStreams');
}

// 2. GlobalThis (modern JS)
if (typeof globalThis !== 'undefined') {
    globalThis.getStreams = getStreams;
    log('Export: globalThis.getStreams');
}

// 3. This context
if (typeof this !== 'undefined') {
    this.getStreams = getStreams;
    log('Export: this.getStreams');
}

// 4. Module exports (Node.js)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { getStreams: getStreams };
    log('Export: module.exports');
}

// 5. Window (browser)
if (typeof window !== 'undefined') {
    window.getStreams = getStreams;
    log('Export: window.getStreams');
}

// 6. Self (web worker)
if (typeof self !== 'undefined') {
    self.getStreams = getStreams;
    log('Export: self.getStreams');
}

// Test et
log('Plugin yuklendi - getStreams tipi: ' + typeof getStreams);
