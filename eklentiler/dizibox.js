var BASE_URL = 'https://www.dizibox.live';

function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
    return new Promise(function(resolve) {
        if (mediaType !== 'tv') return resolve([]);

        // Sertifika hatalarını ve yavaşlığı aşmak için TMDB sorgusunu çok hızlı tutuyoruz
        var tmdbUrl = 'https://api.themoviedb.org/3/tv/' + tmdbId + '?api_key=4ef0d7355d9ffb5151e987764708ce96';

        fetch(tmdbUrl)
            .then(function(res) { 
                if(!res.ok) throw new Error('tmdb_fail');
                return res.json(); 
            })
            .then(function(data) {
                var query = data.name || data.original_name;
                var searchUrl = BASE_URL + '/?s=' + encodeURIComponent(query);
                
                // Cihazın "trust" sürecini hızlandırmak için sadece gerekli headerlar
                return fetch(searchUrl, { 
                    headers: { 'User-Agent': 'Mozilla/5.0' },
                    timeout: 5000 
                });
            })
            .then(function(res) { return res.text(); })
            .then(function(html) {
                // Regex ile dizi slug'ını bul
                var linkMatch = html.match(/href="https:\/\/www\.dizibox\.live\/dizi\/([^/"]+)/);
                if (!linkMatch) return resolve([]);

                var slug = linkMatch[1];
                var targetUrl = BASE_URL + '/' + slug + '-' + seasonNum + '-sezon-' + episodeNum + '-bolum-hd-1-izle/';

                return fetch(targetUrl, { 
                    headers: { 'Referer': BASE_URL },
                    timeout: 5000
                });
            })
            .then(function(res) { return res.text(); })
            .then(function(html) {
                // Iframe yakala
                var iframeMatch = html.match(/<iframe[^>]+src="([^"]+)"/i);
                if (iframeMatch) {
                    var src = iframeMatch[1];
                    if (src.startsWith('//')) src = 'https:' + src;
                    
                    resolve([{
                        name: "DiziBox",
                        url: src,
                        quality: "1080p",
                        headers: { 'Referer': BASE_URL }
                    }]);
                } else {
                    resolve([]);
                }
            })
            .catch(function() {
                // Herhangi bir hatada (timeout, cert error) boş dön ki sistem kilitlenmesin
                resolve([]);
            });
    });
}

if (typeof module !== 'undefined') module.exports = { getStreams };
