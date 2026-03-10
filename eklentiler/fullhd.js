/**
 * FullHDFilmizlesene Nuvio Scraper - v5.0 (Kotlin Uyumlu)
 */

var cheerio = require("cheerio-without-node-native");

// Kotlin kodu ile AYNI base URL (www yok!)
var BASE_URL = 'https://fullhdfilmizlesene.live';

var HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'tr-TR,tr;q=0.9',
    'Referer': BASE_URL + '/'
};

function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
    return new Promise(function(resolve, reject) {
        
        console.log('[FullHD] Starting:', {tmdbId, mediaType});

        var tmdbType = (mediaType === 'movie' ? 'movie' : 'tv');
        var tmdbUrl = 'https://api.themoviedb.org/3/' + tmdbType + '/' + tmdbId + 
                      '?language=tr-TR&api_key=4ef0d7355d9ffb5151e987764708ce96';

        fetch(tmdbUrl)
            .then(function(res) { 
                if (!res.ok) throw new Error('TMDB: ' + res.status);
                return res.json(); 
            })
            .then(function(data) {
                var query = data ? (data.title || data.name || data.original_title || data.original_name) : '';
                if (!query) throw new Error('Isim bulunamadi');
                
                console.log('[FullHD] Aranacak:', query);
                
                // ✅ KRITIK: ?q= kullan (Kotlin ile aynı)
                var searchUrl = BASE_URL + '/arama?q=' + encodeURIComponent(query).replace(/%20/g, '+');
                console.log('[FullHD] Search URL:', searchUrl);
                
                return fetch(searchUrl, { headers: HEADERS });
            })
            .then(function(res) { 
                console.log('[FullHD] Arama status:', res.status);
                if (!res.ok) throw new Error('Arama: ' + res.status);
                return res.text(); 
            })
            .then(function(html) {
                console.log('[FullHD] HTML uzunluk:', html.length);
                
                var $ = cheerio.load(html);
                
                // Kotlin'deki gibi: .film-listesi .film-item
                var firstResult = $('.film-listesi .film-item a').first().attr('href') ||
                                  $('.film-liste .item a').first().attr('href') ||
                                  $('a[href*="/film/"]').first().attr('href') ||
                                  $('a[href*="/dizi/"]').first().attr('href');
                
                console.log('[FullHD] Bulunan link:', firstResult);
                
                if (!firstResult) {
                    // Debug için tüm linkleri göster
                    var allLinks = [];
                    $('a[href*="/film/"], a[href*="/dizi/"]').each(function(i, el) {
                        allLinks.push($(el).attr('href'));
                    });
                    console.log('[FullHD] Tum linkler:', allLinks.slice(0, 10));
                    return resolve([]);
                }

                // URL oluştur
                var targetUrl;
                
                if (firstResult.startsWith('http')) {
                    targetUrl = firstResult;
                } else {
                    targetUrl = BASE_URL + firstResult;
                }
                
                console.log('[FullHD] Hedef URL:', targetUrl);
                
                // Film mi dizi mi kontrol et
                var isDizi = firstResult.includes('/dizi/');
                
                if (isDizi && mediaType === 'tv' && seasonNum && episodeNum) {
                    // Dizi için bölüm URL'si oluştur
                    // Kotlin kodundan: $mainUrl/dizi/$fixedTitle?season=$season&episode=$episode
                    targetUrl = targetUrl + '?season=' + seasonNum + '&episode=' + episodeNum;
                    console.log('[FullHD] Dizi URL:', targetUrl);
                }
                
                return fetch(targetUrl, { headers: HEADERS });
            })
           
