var cheerio = require("cheerio-without-node-native");

var BASE_URL = 'https://www.dizibox.tv'; 

// OG ve Sosyal Medya Botu Taklidi
var HEADERS = {
    'User-Agent': 'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)', // Facebook Bot taklidi
    'Referer': BASE_URL + '/',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    'Accept-Language': 'tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7',
    'X-Requested-With': 'com.facebook.orca' // Reklam sistemlerini şaşırtmak için app-id simülasyonu
};

function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); 

    return new Promise(function(resolve, reject) {
        if (mediaType !== 'tv') return resolve([]);

        var tmdbUrl = 'https://api.themoviedb.org/3/tv/' + tmdbId + '?language=tr-TR&api_key=4ef0d7355d9ffb5151e987764708ce96';

        fetch(tmdbUrl, { signal: controller.signal })
            .then(res => res.json())
            .then(data => {
                var query = data.name || '';
                var searchUrl = BASE_URL + '/?s=' + encodeURIComponent(query);
                
                // İlk istekte OG etiketlerini kontrol ederek gerçek linki bulma
                return fetch(searchUrl, { headers: HEADERS, signal: controller.signal });
            })
            .then(res => res.text())
            .then(html => {
                var $ = cheerio.load(html);
                
                // OG Etiketi Kontrolü: Eğer sayfada og:url varsa, reklam yönlendirmesini atlamışız demektir.
                var ogUrl = $('meta[property="og:url"]').attr('content');
                var firstMatch = ogUrl || $('.post-title a').first().attr('href');
                
                if (!firstMatch) throw new Error('Dizi/OG verisi bulunamadı');

                var cleanBase = firstMatch.endsWith('/') ? firstMatch.slice(0, -1) : firstMatch;
                var epUrl = cleanBase + '-sezon-' + seasonNum + '-bolum-' + episodeNum + '-izle/';
                
                return fetch(epUrl, { headers: HEADERS, signal: controller.signal });
            })
            .then(res => res.text())
            .then(epHtml => {
                clearTimeout(timeoutId);
                var $ = cheerio.load(epHtml);
                var streams = [];

                // Reklam Katmanlarını Filtrele (Ads skipping)
                $('iframe').each(function() {
                    var src = $(this).attr('src') || '';
                    
                    // Reklam içeren veya şüpheli iframe'leri filtrele
                    var isAds = /ads|popunder|click|doubleclick/i.test(src);
                    
                    if (!isAds && (src.includes('vidmoly') || src.includes('dizibox') || src.includes('moly'))) {
                        var finalUrl = src.startsWith('//') ? 'https:' + src : src;
                        
                        streams.push({
                            name: 'Dizibox - ' + (src.includes('vidmoly') ? 'Vidmoly' : 'Player'),
                            url: finalUrl,
                            quality: 'HD',
                            headers: { 'Referer': BASE_URL }
                        });
                    }
                });

                resolve(streams);
            })
            .catch(err => {
                clearTimeout(timeoutId);
                console.error('[Dizibox-OG] Hata:', err.message);
                resolve([]);
            });
    });
}
