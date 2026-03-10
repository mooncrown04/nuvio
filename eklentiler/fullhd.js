/**
 * FullHDFilmizlesene - v4.6 (Site Analiz)
 */

var cheerio = require("cheerio-without-node-native");

var BASE_URL = 'https://www.fullhdfilmizlesene.live';

var HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'tr-TR,tr;q=0.9',
    'Referer': BASE_URL + '/'
};

function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
    return new Promise(function(resolve, reject) {
        
        console.log('[FullHD] ========== BASLATILIYOR ==========');
        console.log('[FullHD] Parametreler:', {tmdbId, mediaType, seasonNum, episodeNum});

        // ADIM 0: Önce siteye erişilebiliyor mu kontrol et
        console.log('[FullHD] Adim 0: Site erisimi testi');
        
        fetch(BASE_URL, { 
            method: 'HEAD',
            headers: HEADERS,
            redirect: 'manual'
        })
        .then(function(testRes) {
            console.log('[FullHD] Site test status:', testRes.status);
            console.log('[FullHD] Site test location:', testRes.headers.get('location'));
            
            // Eğer redirect varsa yeni URL'yi kullan
            if (testRes.status >= 300 && testRes.status < 400) {
                var newLocation = testRes.headers.get('location');
                if (newLocation) {
                    console.log('[FullHD] Yonlendirme algilandi:', newLocation);
                    // Yeni URL'yi kullan
                    BASE_URL = newLocation.replace(/\/$/, '');
                }
            }
            
            // Devam et
            var tmdbType = (mediaType === 'movie' ? 'movie' : 'tv');
            var tmdbUrl = 'https://api.themoviedb.org/3/' + tmdbType + '/' + tmdbId + 
                          '?language=tr-TR&api_key=4ef0d7355d9ffb5151e987764708ce96';
            
            console.log('[FullHD] Adim 1: TMDB istegi');
            return fetch(tmdbUrl);
        })
        .then(function(res) { 
            console.log('[FullHD] TMDB status:', res.status);
            if (!res.ok) throw new Error('TMDB HTTP: ' + res.status);
            return res.json(); 
        })
        .then(function(data) {
            console.log('[FullHD] TMDB verisi:', data ? 'OK' : 'BOS');
            
            var query = data ? (data.title || data.name || data.original_title || data.original_name) : '';
            if (!query) throw new Error('Isim bulunamadi');
            
            console.log('[FullHD] Aranacak isim:', query);
            
            // ADIM 2: Arama yap
            var searchUrl = BASE_URL + '/arama/' + encodeURIComponent(query);
            console.log('[FullHD] Adim 2: Arama URL:', searchUrl);
            
            return fetch(searchUrl, { headers: HEADERS });
        })
        .then(function(res) { 
            console.log('[FullHD] Arama status:', res.status);
            if (!res.ok) throw new Error('Arama HTTP: ' + res.status);
            return res.text(); 
        })
        .then(function(html) {
            console.log('[FullHD] Arama HTML uzunlugu:', html.length);
            
            // HTML'den title çıkar (debug için)
            var titleMatch = html.match(/<title>([^<]+)<\/title>/i);
            console.log('[FullHD] Arama sayfasi title:', titleMatch ? titleMatch[1] : 'YOK');
            
            var $ = cheerio.load(html);
            
            // Tüm linkleri topla ve logla
            var allLinks = [];
            $('a').each(function(i, elem) {
                var href = $(elem).attr('href');
                var text = $(elem).text().trim();
                if (href && (href.includes('/film/') || href.includes('/diziler/') || href.includes('/izle/'))) {
                    if (!allLinks.find(l => l.href === href)) {
                        allLinks.push({href: href, text: text.substring(0, 50)});
                    }
                }
            });
            
            console.log('[FullHD] Bulunan link sayisi:', allLinks.length);
            console.log('[FullHD] Ilk 5 link:', JSON.stringify(allLinks.slice(0, 5)));
            
            // En uygun linki seç
            var firstResult = null;
            for (var i = 0; i < allLinks.length; i++) {
                var link = allLinks[i].href;
                if (mediaType === 'movie' && link.includes('/film/')) {
                    firstResult = link;
                    break;
                } else if (mediaType === 'tv' && link.includes('/diziler/')) {
                    firstResult = link;
                    break;
                }
            }
            
            // Film için /izle/ de dene
            if (!firstResult && mediaType === 'movie') {
                for (var j = 0; j < allLinks.length; j++) {
                    if (allLinks[j].href.includes('/izle/')) {
                        firstResult = allLinks[j].href;
                        break;
                    }
                }
            }
            
            // Hala bulunamadıysa ilk herhangi birini al
            if (!firstResult && allLinks.length > 0) {
                firstResult = allLinks[0].href;
            }
            
            console.log('[FullHD] Secilen link:', firstResult);
            
            if (!firstResult) {
                console.log('[FullHD] HATA: Hic link bulunamadi');
                // HTML preview göster
                console.log('[FullHD] HTML preview:', html.substring(0, 1000).replace(/\n/g, ' '));
                return resolve([]);
            }

            // ADIM 3: URL oluştur
            var targetUrl;
            
            if (firstResult.startsWith('http')) {
                targetUrl = firstResult;
            } else {
                targetUrl = BASE_URL + (firstResult.startsWith('/') ? '' : '/') + firstResult;
            }
            
            console.log('[FullHD] Adim 3: Hedef URL:', targetUrl);
            
            // Film için direkt bu URL'yi kullan
            // Dizi için bölüm URL'si oluştur
            if (mediaType === 'tv' && seasonNum && episodeNum) {
                // Dizi URL'sini parse et
                var urlObj = new URL(targetUrl);
                var pathParts = urlObj.pathname.split('/').filter(p => p);
                
                console.log('[FullHD] Dizi path parcalari:', pathParts);
                
                // Farklı patternler dene
                var seriesSlug = pathParts[pathParts.length - 1] || pathParts[0];
                seriesSlug = seriesSlug.replace(/-izle$/, '').replace(/\/$/, '');
                
                var patterns = [
                    BASE_URL + '/diziler/' + seriesSlug + '-' + seasonNum + '-sezon-' + episodeNum + '-bolum-izle',
                    BASE_URL + '/diziler/' + seriesSlug + '/' + seasonNum + '-sezon/' + episodeNum + '-bolum',
                    BASE_URL + '/' + seriesSlug + '-' + seasonNum + '-sezon-' + episodeNum + '-bolum',
                    targetUrl + '/' + seasonNum + '-sezon/' + episodeNum + '-bolum'
                ];
                
                console.log('[FullHD] Dizi patternleri:', patterns);
                targetUrl = patterns[0];
            }
            
            console.log('[FullHD] Son hedef URL:', targetUrl);
            
            // ADIM 4: Sayfayı çek
            return fetch(targetUrl, { 
                headers: HEADERS,
                redirect: 'follow'
            });
        })
        .then(function(res) {
            console.log('[FullHD] Icerik status:', res.status);
            console.log('[FullHD] Icerik final URL:', res.url);
            
            if (res.status === 404) {
                console.log('[FullHD] 404 hatasi - URL yanlis olabilir');
                throw new Error('Sayfa bulunamadi (404)');
            }
            
            if (!res.ok) {
                throw new Error('Icerik HTTP: ' + res.status);
            }
            
            return res.text();
        })
        .then(function(pageHtml) {
            console.log('[FullHD] Icerik HTML uzunlugu:', pageHtml.length);
            
            var $ = cheerio.load(pageHtml);
            var streams = [];
            
            // iframe'leri bul
            $('iframe').each(function(i, elem) {
                var src = $(elem).attr('src') || $(elem).attr('data-src');
                if (src) {
                    var url = src.startsWith('//') ? 'https:' + src : src;
                    if (!url.startsWith('http')) url = 'https:' + url;
                    
                    console.log('[FullHD] iframe bulundu:', i, url.substring(0, 100));
                    
                    streams.push({
                        name: '⌜ FullHD ⌟ | Kaynak ' + (i + 1),
                        title: 'FullHD Stream',
                        url: url,
                        quality: 'Auto',
                        headers: HEADERS,
                        provider: 'fullhd'
                    });
                }
            });

            console.log('[FullHD] Toplam stream:', streams.length);
            console.log('[FullHD] ========== TAMAMLANDI ==========');
            
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
