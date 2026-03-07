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
                // Aramayı kolaylaştırmak için sadece ilk iki kelimeyi al (Örn: "The Walking Dead" -> "The Walking")
                var cleanName = name.replace(/[:\-!]/g, '').split(' ').slice(0, 2).join(' ');
                
                console.log('[Dizigom] Kritik Sorgu:', cleanName);
                return fetch(BASE_URL + '/?s=' + encodeURIComponent(cleanName), { headers: HEADERS });
            })
            .then(function(res) { return res.text(); })
            .then(function(searchHtml) {
                // 1. Arama sonuçlarında link ara
                var linkMatch = searchHtml.match(/href="(https:\/\/dizigom104\.com\/dizi\/[^"]+)"/i);
                var targetUrl;

                if (linkMatch) {
                    var showUrl = linkMatch[1].replace(/\/$/, '');
                    targetUrl = showUrl + '-' + seasonNum + '-sezon-' + episodeNum + '-bolum/';
                } else {
                    // 2. Arama başarısızsa manuel tahmin et (B planı)
                    console.log('[Dizigom] Arama başarısız, manuel deneniyor...');
                    return resolve(getFallbackStream(tmdbId, seasonNum, episodeNum));
                }

                // 3. Bölüm sayfasını çek (hd1 veya normal halini kontrol ederek)
                return fetch(targetUrl, { headers: HEADERS })
                    .then(function(res) {
                        if (res.status === 404) return fetch(targetUrl.replace(/\/$/, '') + '-hd1/', { headers: HEADERS });
                        return res;
                    })
                    .then(function(res) { return res.text(); })
                    .then(function(html) {
                        resolve(parseVideoLinks(html));
                    });
            })
            .catch(function(err) {
                console.error('[Dizigom] Hata:', err.message);
                resolve([]);
            });
    });
}

// Video linklerini ayıklayan yardımcı fonksiyon
function parseVideoLinks(html) {
    var streams = [];
    var iframeMatches = html.match(/src="([^"]*(?:vidmoly|moly|player|embed|ok\.ru)[^"]*)"/gi) || [];
    
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
    return streams;
}

// Hiçbir şey bulunamazsa yedek mekanizma
function getFallbackStream(tmdbId, s, e) {
    // Burada istersen başka bir siteye (örn: Diziyou) yönlendirme yapabilirsin
    return [];
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { getStreams: getStreams };
} else {
    global.getStreams = getStreams;
}
