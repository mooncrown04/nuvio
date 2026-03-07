var BASE_URL = 'https://www.dizibox.live';

// Amazon/FireTV cihazları için timeout kontrolü eklenmiş fetch
function fetchWithTimeout(url, options, timeout = 7000) {
    return Promise.race([
        fetch(url, options),
        new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), timeout))
    ]);
}

function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
    return new Promise(function(resolve, reject) {
        if (mediaType !== 'tv') return resolve([]);

        // 1. ADIM: TMDB verisini beklemeden doğrudan arama yapmaya çalışıyoruz
        // Bu, loglardaki timeout ve certificate trust hatalarını azaltır.
        var tmdbUrl = 'https://api.themoviedb.org/3/tv/' + tmdbId + '?api_key=4ef0d7355d9ffb5151e987764708ce96';

        fetchWithTimeout(tmdbUrl, {})
            .then(function(res) { return res.json(); })
            .then(function(data) {
                var query = data.name || data.original_name;
                // Arama URL'sini oluştur
                var searchUrl = BASE_URL + '/?s=' + encodeURIComponent(query);
                
                return fetchWithTimeout(searchUrl, {
                    headers: { 'User-Agent': 'Mozilla/5.0' }
                });
            })
            .then(function(res) { return res.text(); })
            .then(function(html) {
                // Saf Regex: En hızlı sonuç ayıklama yöntemi
                var linkMatch = html.match(/href="(https:\/\/www\.dizibox\.live\/dizi\/[^"]+)"/);
                if (!linkMatch) return resolve([]);

                var slug = linkMatch[1].split('/dizi/')[1].replace(/\//g, '');
                var targetUrl = BASE_URL + '/' + slug + '-' + seasonNum + '-sezon-' + episodeNum + '-bolum-hd-1-izle/';

                return fetchWithTimeout(targetUrl, {
                    headers: { 'Referer': BASE_URL }
                });
            })
            .then(function(res) { return res.text(); })
            .then(function(html) {
                // Iframe'i hızlıca bul
                var iframeMatch = html.match(/<iframe[^>]+src="([^"]+)"/i);
                
                if (iframeMatch) {
                    var finalUrl = iframeMatch[1];
                    if (finalUrl.startsWith('//')) finalUrl = 'https:' + finalUrl;

                    resolve([{
                        name: "DiziBox",
                        url: finalUrl,
                        quality: "1080p",
                        headers: { 'Referer': BASE_URL, 'Origin': BASE_URL },
                        provider: "dizibox"
                    }]);
                } else {
                    resolve([]);
                }
            })
            .catch(function(err) {
                console.log('[DiziBox Error]', err.message);
                resolve([]);
            });
    });
}

if (typeof module !== 'undefined') module.exports = { getStreams };
