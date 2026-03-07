var TMDB_KEY = '4ef0d7355d9ffb5151e987764708ce96';

function findFirst(html, pattern) {
    var regex = new RegExp(pattern, 'i');
    var match = regex.exec(html);
    return match ? match : null;
}

function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
    return new Promise(function(resolve, reject) {
        if (mediaType !== 'tv') return resolve([]);

        // URL'yi www olmadan ve hem http hem https deneyerek tanımlıyoruz
        var BASE_URL = 'https://dizibox.tv'; 

        fetch('https://api.themoviedb.org/3/tv/' + tmdbId + '?language=tr-TR&api_key=' + TMDB_KEY)
            .then(function(res) { return res.json(); })
            .then(function(data) {
                var query = data.name || '';
                var searchUrl = BASE_URL + '/?s=' + encodeURIComponent(query);
                
                console.log('[Dizibox] Arama yapılıyor:', searchUrl);

                // Timeout süresini biraz düşürüp hata yönetimini hızlandırıyoruz
                return fetch(searchUrl, { 
                    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
                    redirect: 'follow'
                });
            })
            .then(function(res) { 
                if(!res.ok) throw new Error('Siteye ulaşılamadı: ' + res.status);
                return res.text(); 
            })
            .then(function(html) {
                // Dizibox'ın farklı HTML yapılarına karşı 2 farklı Regex deniyoruz
                var linkMatch = findFirst(html, '<h2 class="post-title"><a href="([^"]+)"') || 
                                findFirst(html, '<div class="post-title">\\s*<a href="([^"]+)"');
                
                if (!linkMatch) throw new Error('Dizi linki bulunamadı');

                var mainUrl = linkMatch[1].replace('http:', 'https:');
                var epUrl = mainUrl.replace(/\/$/, '') + '-sezon-' + seasonNum + '-bolum-' + episodeNum + '-izle/';
                
                return fetch(epUrl, { headers: { 'Referer': BASE_URL } });
            })
            .then(function(res) { return res.text(); })
            .then(function(epHtml) {
                var streams = [];
                var iframeRegex = /<iframe[^>]+src="([^"]+)"/gi;
                var match;
                
                while ((match = iframeRegex.exec(epHtml)) !== null) {
                    var src = match[1];
                    if (src.includes('vidmoly') || src.includes('dizibox') || src.includes('moly')) {
                        streams.push({
                            name: '⌜ Dizibox ⌟ | ' + (src.includes('vidmoly') ? 'Vidmoly' : 'Player'),
                            url: src.startsWith('//') ? 'https:' + src : src,
                            quality: '720p',
                            headers: { 'Referer': BASE_URL + '/' }
                        });
                    }
                }
                resolve(streams);
            })
            .catch(function(err) {
                console.error('[Dizibox] Hata:', err.message);
                // Eğer hata bağlantı kaynaklıysa boş dön ki sistem kilitlenmesin
                resolve([]);
            });
    });
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { getStreams: getStreams };
} else {
    global.getStreams = getStreams;
}
