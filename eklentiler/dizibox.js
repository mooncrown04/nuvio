// Dizibox eklentisi - Regex (Bellek Dostu) Versiyonu
var BASE_URL = 'http://www.dizibox.tv';
var TMDB_KEY = '4ef0d7355d9ffb5151e987764708ce96';

// Dizipal'den gelen yardımcı fonksiyonlar
function findFirst(html, pattern) {
    var regex = new RegExp(pattern, 'i');
    var match = regex.exec(html);
    return match ? match : null;
}

function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
    return new Promise(function(resolve, reject) {
        if (mediaType !== 'tv') return resolve([]);

        console.log('[Dizibox] Başlatıldı:', tmdbId, 'S:', seasonNum, 'E:', episodeNum);

        // 1. TMDB Bilgisi Al
        var tmdbUrl = 'https://api.themoviedb.org/3/tv/' + tmdbId + '?language=tr-TR&api_key=' + TMDB_KEY;

        fetch(tmdbUrl)
            .then(function(res) { return res.json(); })
            .then(function(data) {
                var query = data.name || '';
                if (!query) throw new Error('İsim bulunamadı');

                // 2. Arama Yap (HTTP üzerinden)
                var searchUrl = BASE_URL + '/?s=' + encodeURIComponent(query);
                return fetch(searchUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } });
            })
            .then(function(res) { return res.text(); })
            .then(function(html) {
                // Regex ile ilk dizi linkini ayıkla (Bellek dostu)
                var linkMatch = findFirst(html, '<h2 class="post-title"><a href="([^"]+)"');
                if (!linkMatch) throw new Error('Dizi linki bulunamadı');

                var mainUrl = linkMatch[1];
                // 3. Bölüm URL'sini oluştur
                var cleanUrl = mainUrl.endsWith('/') ? mainUrl.slice(0, -1) : mainUrl;
                var epUrl = cleanUrl + '-sezon-' + seasonNum + '-bolum-' + episodeNum + '-izle/';
                
                console.log('[Dizibox] Bölüm Taranıyor:', epUrl);
                return fetch(epUrl.replace('https:', 'http:'));
            })
            .then(function(res) { return res.text(); })
            .then(function(epHtml) {
                var streams = [];
                
                // 4. Iframe Linklerini Regex ile Topla
                // Bu kalıp hem vidmoly hem de dizibox playerlarını yakalar
                var iframeRegex = /<iframe[^>]+src="([^"]+)"/gi;
                var match;
                
                while ((match = iframeRegex.exec(epHtml)) !== null) {
                    var src = match[1];
                    if (src.includes('vidmoly') || src.includes('dizibox') || src.includes('moly')) {
                        var finalUrl = src.startsWith('//') ? 'https:' + src : src;
                        streams.push({
                            name: '⌜ Dizibox ⌟ | ' + (src.includes('vidmoly') ? 'Vidmoly' : 'Player'),
                            url: finalUrl,
                            quality: '720p',
                            headers: { 'Referer': BASE_URL + '/' }
                        });
                    }
                }

                console.log('[Dizibox] Bulunan Kaynak:', streams.length);
                resolve(streams);
            })
            .catch(function(err) {
                console.error('[Dizibox] Hata:', err.message);
                resolve([]);
            });
    });
}

// ÇALIŞAN EXPORT YAPISI (Dizipal.js'den alındı)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { getStreams: getStreams };
} else {
    global.getStreams = getStreams;
}
