/**
 * DiziBox Scraper - Amazon FireTV & Android TV Optimized
 * Path: eklentiler/dizibox.js
 */

var BASE_URL = 'https://www.dizibox.live';

function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
    return new Promise(function(resolve) {
        console.log('[DZB-LOG] Tetiklendi. ID: ' + tmdbId + ' S:' + seasonNum + ' E:' + episodeNum);

        if (mediaType !== 'tv') {
            console.log('[DZB-LOG] Sadece diziler destekleniyor.');
            return resolve([]);
        }

        // 1. TMDB'den isim çek
        var tmdbUrl = 'https://api.themoviedb.org/3/tv/' + tmdbId + '?api_key=4ef0d7355d9ffb5151e987764708ce96';

        fetch(tmdbUrl)
            .then(function(res) { return res.json(); })
            .then(function(data) {
                var query = data.name || data.original_name;
                console.log('[DZB-LOG] Aranacak Dizi: ' + query);
                
                var searchUrl = BASE_URL + '/?s=' + encodeURIComponent(query);
                return fetch(searchUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } });
            })
            .then(function(res) { return res.text(); })
            .then(function(html) {
                // Arama sonuçlarından dizi linkini regex ile çek
                var linkMatch = html.match(/href="(https:\/\/www\.dizibox\.live\/dizi\/[^"]+)"/);
                if (!linkMatch) {
                    console.log('[DZB-LOG] Dizi bulunamadı.');
                    return resolve([]);
                }

                var slug = linkMatch[1].split('/dizi/')[1].replace(/\//g, '');
                // DiziBox URL yapısı: dizi-adi-sezon-X-bolum-Y-hd-1-izle/
                var targetUrl = BASE_URL + '/' + slug + '-' + seasonNum + '-sezon-' + episodeNum + '-bolum-hd-1-izle/';
                console.log('[DZB-LOG] Hedef URL: ' + targetUrl);

                return fetch(targetUrl, { headers: { 'Referer': BASE_URL } });
            })
            .then(function(res) { return res.text(); })
            .then(function(html) {
                // Iframe yakalama (Player linki)
                var iframeMatch = html.match(/<iframe[^>]+src="([^"]+)"/i);
                
                if (iframeMatch && iframeMatch[1]) {
                    var videoUrl = iframeMatch[1];
                    if (videoUrl.startsWith('//')) videoUrl = 'https:' + videoUrl;
                    
                    console.log('[DZB-LOG] Video bulundu: ' + videoUrl);
                    
                    resolve([{
                        name: "DiziBox",
                        title: "1080p | Kaynak 1",
                        url: videoUrl,
                        quality: "1080p",
                        headers: { 'Referer': BASE_URL, 'User-Agent': 'Mozilla/5.0' }
                    }]);
                } else {
                    console.log('[DZB-LOG] Video oynatıcısı bulunamadı.');
                    resolve([]);
                }
            })
            .catch(function(err) {
                console.log('[DZB-LOG] HATA: ' + err.message);
                resolve([]);
            });
    });
}

// Export tanımı (Uygulamanın tanıması için kritik)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { getStreams: getStreams };
} else {
    global.getStreams = getStreams;
}
