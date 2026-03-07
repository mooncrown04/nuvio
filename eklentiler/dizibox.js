var BASE_URL = 'https://dizigom104.com';

var HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    'Referer': BASE_URL + '/',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8'
};

/**
 * Yeni Dizigom adresi üzerinden stream çekme
 */
function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
    return new Promise(function(resolve, reject) {
        if (mediaType !== 'tv') return resolve([]);

        var tmdbUrl = 'https://api.themoviedb.org/3/tv/' + tmdbId + '?api_key=4ef0d7355d9ffb5151e987764708ce96&language=tr-TR';

        fetch(tmdbUrl)
            .then(function(res) { return res.json(); })
            .then(function(data) {
                var name = data.name || data.original_name;
                
                // Türkçe karakterleri temizle ve slug oluştur
                var slug = name.toLowerCase()
                    .replace(/[üçşğöı]/g, function(m) { 
                        return {'ü':'u','ç':'c','ş':'s','ğ':'g','ö':'o','ı':'i'}[m]; 
                    })
                    .replace(/[^a-z0-9]+/g, '-')
                    .replace(/^-+|-+$/g, '');

                var epUrl = BASE_URL + '/dizi/' + slug + '-' + seasonNum + '-sezon-' + episodeNum + '-bolum/';
                console.log('[Dizigom] Yeni Adres Deneniyor:', epUrl);

                // Fetch isteğine timeout ekleyemediğimiz için hızlı hata yönetimi yapıyoruz
                return fetch(epUrl, { headers: HEADERS });
            })
            .then(function(res) { 
                if (!res.ok) throw new Error('Sayfaya ulaşılamadı: ' + res.status);
                return res.text(); 
            })
            .then(function(html) {
                var streams = [];

                // Dizigom'daki video kaynaklarını tara
                var iframeMatches = html.match(/<iframe[^>]+src="([^"]+)"/gi) || [];
                
                iframeMatches.forEach(function(iframe) {
                    var src = iframe.match(/src="([^"]+)"/i)[1];
                    // Reklam ve sosyal medya dışındaki kaynakları al
                    if (src.indexOf('google') === -1 && src.indexOf('facebook') === -1 && src.indexOf('twitter') === -1) {
                        if (src.startsWith('//')) src = 'https:' + src;
                        
                        streams.push({
                            name: 'Dizigom | ' + (src.includes('moly') ? 'Moly' : 'Kaynak'),
                            url: src,
                            quality: '1080p',
                            headers: { 'Referer': BASE_URL + '/' }
                        });
                    }
                });

                console.log('[Dizigom] İşlem başarıyla tamamlandı. Link sayısı:', streams.length);
                resolve(streams);
            })
            .catch(function(err) {
                console.error('[Dizigom] Hata oluştu:', err.message);
                resolve([]); // Hata durumunda boş dönerek uygulamanın çökmesini engelle
            });
    });
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { getStreams: getStreams };
} else {
    global.getStreams = getStreams;
}
