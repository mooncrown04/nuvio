var BASE_URL = 'https://dizigom104.com';
var HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    'Referer': BASE_URL + '/'
};

function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
    return new Promise(function(resolve, reject) {
        if (mediaType !== 'tv') return resolve([]);

        var tmdbUrl = 'https://api.themoviedb.org/3/tv/' + tmdbId + '?api_key=4ef0d7355d9ffb5151e987764708ce96&language=tr-TR';

        fetch(tmdbUrl)
            .then(function(res) { return res.json(); })
            .then(function(data) {
                var name = data.name || data.original_name;
                // Arama sorgusunu temizle (Özel karakterleri at)
                var query = name.replace(/[:\-!]/g, '').trim();
                
                console.log('[Dizigom] Sorgu:', query);
                return fetch(BASE_URL + '/?s=' + encodeURIComponent(query), { headers: HEADERS });
            })
            .then(function(res) { return res.text(); })
            .then(function(searchHtml) {
                // Arama sonuçlarından ilk geçerli dizi linkini bul
                var linkMatch = searchHtml.match(/href="(https:\/\/dizigom104\.com\/dizi\/[^"]+)"/i);
                var finalEpUrl;

                if (linkMatch) {
                    var showUrl = linkMatch[1].replace(/\/$/, '');
                    // Dizigom'un farklı bölüm sonu eklerini (hd1, tek-part vb.) yakalamak için ana sayfayı çekmeliyiz
                    return fetch(showUrl, { headers: HEADERS })
                        .then(function(r) { return r.text(); })
                        .then(function(showHtml) {
                            var epRegex = new RegExp('href="([^"]+-' + seasonNum + '-sezon-' + episodeNum + '-bolum[^"]*)"', 'i');
                            var epMatch = showHtml.match(epRegex);
                            
                            if (epMatch) {
                                return fetch(epMatch[1], { headers: HEADERS });
                            } else {
                                // Eğer ana sayfada bulamazsa manuel tahmin et (hd1 ekleyerek)
                                return fetch(showUrl + '-' + seasonNum + '-sezon-' + episodeNum + '-bolum-hd1/', { headers: HEADERS });
                            }
                        });
                } else {
                    throw new Error('Arama sonucu bulunamadı.');
                }
            })
            .then(function(res) { return res.text(); })
            .then(function(html) {
                var streams = [];
                // Video kaynaklarını tara
                var patterns = [
                    /src="([^"]*(?:vidmoly|moly|player|embed|ok\.ru)[^"]*)"/gi,
                    /data-video="([^"]+)"/gi
                ];

                patterns.forEach(function(pattern) {
                    var m;
                    while ((m = pattern.exec(html)) !== null) {
                        var src = m[1];
                        if (src.startsWith('//')) src = 'https:' + src;
                        if (!streams.find(s => s.url === src)) {
                            streams.push({
                                name: 'Dizigom | ' + (src.includes('moly') ? 'Moly' : 'Kaynak'),
                                url: src,
                                quality: '1080p',
                                headers: { 'Referer': BASE_URL + '/' }
                            });
                        }
                    }
                });

                console.log('[Dizigom] Tamamlandı. Link:', streams.length);
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
