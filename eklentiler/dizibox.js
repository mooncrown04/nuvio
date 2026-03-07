var BASE_URL = 'https://dizigom104.com';

var HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    'Referer': BASE_URL + '/'
};

function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
    return new Promise(function(resolve, reject) {
        if (mediaType !== 'tv') return resolve([]);

        // 1. TMDB'den ismi al
        var tmdbUrl = 'https://api.themoviedb.org/3/tv/' + tmdbId + '?api_key=4ef0d7355d9ffb5151e987764708ce96&language=tr-TR';

        fetch(tmdbUrl)
            .then(function(res) { return res.json(); })
            .then(function(data) {
                var query = data.name || data.original_name;
                console.log('[Dizigom] Aranıyor:', query);

                // 2. Site içinde arama yap
                return fetch(BASE_URL + '/?s=' + encodeURIComponent(query), { headers: HEADERS });
            })
            .then(function(res) { return res.text(); })
            .then(function(searchHtml) {
                // 3. Arama sonuçlarından dizi ana sayfasını bul
                var linkMatch = searchHtml.match(/<div class="poster">\s*<a href="(https:\/\/dizigom104\.com\/dizi\/[^"]+)"/i) ||
                                searchHtml.match(/href="(https:\/\/dizigom104\.com\/dizi\/[^"]+)"/i);
                
                if (!linkMatch) throw new Error('Dizi bulunamadı');

                var showUrl = linkMatch[1];
                console.log('[Dizigom] Dizi Sayfası:', showUrl);

                // 4. Sezon ve Bölüm sayfasını bulmak için ana sayfayı tara
                return fetch(showUrl, { headers: HEADERS });
            })
            .then(function(res) { return res.text(); })
            .then(function(showHtml) {
                // 5. Bölüm listesinden senin istediğin bölümü ara (Regex ile esnek arama)
                // Bu kısım senin verdiğin "-hd1" gibi takıları otomatik yakalar
                var epPattern = new RegExp('href="([^"]+-' + seasonNum + '-sezon-' + episodeNum + '-bolum[^"]*)"', 'i');
                var epMatch = showHtml.match(epPattern);

                if (!epMatch) throw new Error('Bölüm linki bulunamadı');

                var finalEpUrl = epMatch[1];
                console.log('[Dizigom] Gerçek Bölüm URL:', finalEpUrl);

                return fetch(finalEpUrl, { headers: HEADERS });
            })
            .then(function(res) { return res.text(); })
            .then(function(epHtml) {
                var streams = [];
                // 6. Iframe kaynaklarını topla
                var iframeMatches = epHtml.match(/src="([^"]*(?:moly|vidmoly|ok\.ru|player|embed)[^"]*)"/gi) || [];
                
                iframeMatches.forEach(function(m) {
                    var src = m.match(/src="([^"]+)"/i)[1];
                    if (src.startsWith('//')) src = 'https:' + src;
                    
                    streams.push({
                        name: 'Dizigom | ' + (src.includes('moly') ? 'Moly' : 'Kaynak'),
                        url: src,
                        quality: '1080p',
                        headers: { 'Referer': BASE_URL + '/' }
                    });
                });

                resolve(streams);
            })
            .catch(function(err) {
                console.error('[Dizigom] Hata:', err.message);
                resolve([]);
            });
    });
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { getStreams: getStreams };
} else {
    global.getStreams = getStreams;
}
