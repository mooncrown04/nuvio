var BASE_URL = 'https://www.dizibox.live';

function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
    return new Promise(function(resolve) {
        if (mediaType !== 'tv') return resolve([]);

        console.log('[DZB-LOG] 1. İslem Basladi. TMDB ID:', tmdbId);

        var tmdbUrl = 'https://api.themoviedb.org/3/tv/' + tmdbId + '?api_key=4ef0d7355d9ffb5151e987764708ce96';

        fetch(tmdbUrl)
            .then(function(res) { 
                console.log('[DZB-LOG] 2. TMDB Yanit Kodu:', res.status);
                return res.json(); 
            })
            .then(function(data) {
                var query = data.name || data.original_name;
                console.log('[DZB-LOG] 3. Dizi Adi:', query);
                
                var searchUrl = BASE_URL + '/?s=' + encodeURIComponent(query);
                console.log('[DZB-LOG] 4. Arama Yapiliyor:', searchUrl);

                return fetch(searchUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } });
            })
            .then(function(res) { 
                console.log('[DZB-LOG] 5. Arama Sayfasi Geldi:', res.status);
                return res.text(); 
            })
            .then(function(html) {
                var linkMatch = html.match(/href="https:\/\/www\.dizibox\.live\/dizi\/([^/"]+)/);
                if (!linkMatch) {
                    console.log('[DZB-LOG] HATA: Arama sonucunda dizi linki bulunamadi!');
                    return resolve([]);
                }

                var slug = linkMatch[1];
                var targetUrl = BASE_URL + '/' + slug + '-' + seasonNum + '-sezon-' + episodeNum + '-bolum-hd-1-izle/';
                console.log('[DZB-LOG] 6. Bolum Sayfasina Gidiliyor:', targetUrl);

                return fetch(targetUrl, { headers: { 'Referer': BASE_URL } });
            })
            .then(function(res) { 
                console.log('[DZB-LOG] 7. Bolum Sayfasi Yaniti:', res.status);
                return res.text(); 
            })
            .then(function(html) {
                var iframeMatch = html.match(/<iframe[^>]+src="([^"]+)"/i);
                if (iframeMatch) {
                    var src = iframeMatch[1];
                    if (src.startsWith('//')) src = 'https:' + src;
                    console.log('[DZB-LOG] BASARI: Iframe Bulundu:', src);
                    
                    resolve([{
                        name: "DiziBox",
                        url: src,
                        quality: "1080p",
                        headers: { 'Referer': BASE_URL }
                    }]);
                } else {
                    console.log('[DZB-LOG] HATA: Sayfada Iframe bulunamadi.');
                    resolve([]);
                }
            })
            .catch(function(err) {
                console.log('[DZB-LOG] KRITIK HATA:', err.message);
                resolve([]);
            });
    });
}

if (typeof module !== 'undefined') module.exports = { getStreams };
