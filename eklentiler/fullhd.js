/**
 * FullHDFilmizlesene Nuvio Scraper - v4.0 (Fixed)
 */

var cheerio = require("cheerio-without-node-native");

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

function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
    return new Promise(function(resolve) {
        
        var tmdbType = (mediaType === 'movie' ? 'movie' : 'tv');
        var tmdbUrl = 'https://api.themoviedb.org/3/' + tmdbType + '/' + tmdbId + '?language=tr-TR&api_key=4ef0d7355d9ffb5151e987764708ce96';

        console.log('[FullHD] Baslatiliyor ID:', tmdbId, 'Type:', mediaType);

        var targetUrl = null;

        fetch(tmdbUrl)
            .then(function(res) { 
                if (!res.ok) throw new Error('TMDB HTTP Hatasi: ' + res.status);
                return res.json(); 
            })
            .then(function(data) {
                console.log('[FullHD] TMDB yaniti:', data ? 'OK' : 'BOS');
                
                var query = data ? (data.title || data.name || data.original_title || data.original_name) : '';
                if (!query) throw new Error('Isim bulunamadi');
                
                console.log('[FullHD] Bulunan isim:', query);
                
                var searchUrl = CONFIG.BASE_URL + '/arama/' + encodeURIComponent(query);
                console.log('[FullHD] Arama URL:', searchUrl);
                
                return fetch(searchUrl, { headers: CONFIG.HEADERS });
            })
            .then(function(res) { 
                if (!res) throw new Error('Arama baglantisi kurulamadi');
                if (!res.ok) throw new Error('Arama HTTP Hatasi: ' + res.status);
                return res.text(); 
            })
            .then(function(html) {
                if (!html) throw new Error('Arama sonucu bos');
                
                console.log('[FullHD] Arama HTML uzunlugu:', html.length);
                
                var $ = cheerio.load(html);
                
                // Farklı selector denemeleri
                var firstResult = $('.film-liste ul li a').first().attr('href') ||
                                  $('.film-liste .item a').first().attr('href') ||
                                  $('.movie-item a').first().attr('href') ||
                                  $('a[href*="/film/"]').first().attr('href') ||
                                  $('a[href*="/diziler/"]').first().attr('href');
                
                console.log('[FullHD] Bulunan ilk sonuc:', firstResult);
                
                if (!firstResult) {
                    console.log('[FullHD] UYARI: Film listesi bulunamadi');
                    // HTML'in bir kısmını logla debug için
                    console.log('[FullHD] HTML preview:', html.substring(0, 800).replace(/\n/g, ' '));
                    return resolve([]);
                }

                // URL temizleme
                var slug = firstResult
                    .replace(CONFIG.BASE_URL, '')
                    .replace(/^\/+/, '')
                    .replace(/\/$/, '');

                console.log('[FullHD] Slug:', slug);

                if (mediaType === 'tv') {
                    // Dizi URL yapısı
                    var seriesName = slug
                        .replace('diziler/', '')
                        .replace('film/', '')
                        .split('-izle')[0]
                        .split('-bolum')[0]
                        .replace(/-$/, '');
                    
                    // Farklı URL pattern dene
                    targetUrl = CONFIG.BASE_URL + '/diziler/' + seriesName + '-' + seasonNum + '-sezon-' + episodeNum + '-bolum-izle';
                    console.log('[FullHD] Dizi URL (pattern 1):', targetUrl);
                } else {
                    // Film URL'si
                    targetUrl = CONFIG.BASE_URL + '/' + slug;
                    if (!targetUrl.includes('/film/') && !targetUrl.includes('/diziler/')) {
                        targetUrl = CONFIG.BASE_URL + '/film/' + slug;
                    }
                    console.log('[FullHD] Film URL:', targetUrl);
                }

                return fetch(targetUrl, { headers: CONFIG.HEADERS });
            })
            .then(function(res) {
                if (!res) {
                    console.log('[FullHD] HATA: Icerik sayfasindan yanit yok (res null)');
                    throw new Error('Icerik sayfasindan yanit yok');
                }

                // 404 durumunda alternatif URL dene
                if (res.status === 404 && mediaType === 'tv') {
                    console.log('[FullHD] 404 alindi, alternatif URL deneniyor...');
                    
                    // Pattern 2: /diziler/ olmadan
                    var altUrl1 = targetUrl.replace('/diziler/', '/');
                    console.log('[FullHD] Alternatif 1:', altUrl1);
                    
                    return fetch(altUrl1, { headers: CONFIG.HEADERS }).then(function(altRes) {
                        if (altRes.ok) return altRes;
                        
                        // Pattern 3: Farklı bolum yapisi
                        var seriesName = targetUrl.split('/').pop().split('-1-sezon')[0];
                        var altUrl2 = CONFIG.BASE_URL + '/diziler/' + seriesName + '-sezon-' + seasonNum + '/bolum-' + episodeNum;
                        console.log('[FullHD] Alternatif 2:', altUrl2);
                        
                        return fetch(altUrl2, { headers: CONFIG.HEADERS });
                    });
                }
                
                if (!res.ok) {
                    console.log('[FullHD] HTTP Hatasi:', res.status);
                    throw new Error('Icerik HTTP Hatasi: ' + res.status);
                }
                
                return res;
            })
            .then(function(res) {
                if (!res || !res.text) {
                    throw new Error('Sayfa metni okunamadi');
                }
                return res.text();
            })
            .then(function(pageHtml) {
                if (!pageHtml) {
                    console.log('[FullHD] HATA: Sayfa HTML\'i bos');
                    return resolve([]);
                }
                
                console.log('[FullHD] Sayfa HTML uzunlugu:', pageHtml.length);
                
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
                        
                        console.log('[FullHD] Bulunan iframe:', i, finalUrl.substring(0, 100));
                        
                        // Daha geniş filtre - neredeyse her seyi kabul et
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

                // Video tag'lerini de kontrol et
                $('video source').each(function(i, elem) {
                    var src = $(elem).attr('src');
                    if (src) {
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

                console.log('[FullHD] Toplam bulunan stream:', streams.length);
                resolve(streams);
            })
            .catch(function(err) {
                console.error('[FullHD] HATA:', err.message);
                console.error('[FullHD] Stack:', err.stack);
                resolve([]); 
            });
    });
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { getStreams: getStreams };
} else {
    global.getStreams = getStreams;
}
