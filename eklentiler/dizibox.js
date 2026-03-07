/**
 * DiziBox Scraper - Ultra Safe Edition
 * Amazon FireTV Compatibility fix
 */

var BASE_URL = 'https://www.dizibox.live';

function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
    return new Promise(function(resolve) {
        console.log('[DZB-LOG] Uygulama baslatildi. ID: ' + tmdbId);

        // 1. ADIM: Dizi adını TMDB'den çek (En temel fetch)
        var tmdbUrl = 'https://api.themoviedb.org/3/tv/' + tmdbId + '?api_key=4ef0d7355d9ffb5151e987764708ce96';

        fetch(tmdbUrl)
            .then(function(res) { 
                return res.json(); 
            })
            .then(function(data) {
                var name = data.name || data.original_name;
                if (!name) throw new Error('Isim bulunamadi');
                
                console.log('[DZB-LOG] Dizi bulundu: ' + name);
                var searchUrl = BASE_URL + '/?s=' + encodeURIComponent(name);
                
                return fetch(searchUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } });
            })
            .then(function(res) { return res.text(); })
            .then(function(html) {
                // Regex ile dizi slug'ını yakala
                var match = html.match(/href="https:\/\/www\.dizibox\.live\/dizi\/([^/"]+)/);
                if (!match) {
                    console.log('[DZB-LOG] Arama sonucu bos.');
                    return resolve([]);
                }

                var slug = match[1];
                var targetUrl = BASE_URL + '/' + slug + '-' + seasonNum + '-sezon-' + episodeNum + '-bolum-hd-1-izle/';
                console.log('[DZB-LOG] Bolum URL: ' + targetUrl);

                return fetch(targetUrl, { headers: { 'Referer': BASE_URL } });
            })
            .then(function(res) { return res.text(); })
            .then(function(html) {
                // Video iframe'ini bul
                var iframe = html.match(/<iframe[^>]+src="([^"]+)"/i);
                if (iframe && iframe[1]) {
                    var finalUrl = iframe[1].startsWith('//') ? 'https:' + iframe[1] : iframe[1];
                    console.log('[DZB-LOG] Final Link: ' + finalUrl);

                    resolve([{
                        name: "DiziBox",
                        url: finalUrl,
                        quality: "1080p",
                        headers: { 'Referer': BASE_URL }
                    }]);
                } else {
                    console.log('[DZB-LOG] Video iframe bulunamadi.');
                    resolve([]);
                }
            })
            .catch(function(err) {
                console.log('[DZB-LOG] Kritik Hata: ' + err.message);
                resolve([]);
            });
    });
}

// Global tanım
if (typeof module !== 'undefined') {
    module.exports = { getStreams: getStreams };
} else {
    this.getStreams = getStreams;
}
