var BASE_URL = 'https://www.dizigom.tv';

var HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    'Referer': BASE_URL + '/',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8'
};

/**
 * Dizigom Link Çözücü
 */
function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
    return new Promise(function(resolve, reject) {
        // Dizigom temel olarak TV dizileri odaklıdır
        if (mediaType !== 'tv') return resolve([]);

        console.log('[Dizigom] Başlatıldı:', tmdbId, 'S:', seasonNum, 'E:', episodeNum);

        // 1. TMDB'den Orijinal İsmi Al (Slug oluşturmak için)
        var tmdbUrl = 'https://api.themoviedb.org/3/tv/' + tmdbId + '?api_key=4ef0d7355d9ffb5151e987764708ce96&language=tr-TR';

        fetch(tmdbUrl)
            .then(function(res) { return res.json(); })
            .then(function(data) {
                var name = data.name || data.original_name;
                if (!name) throw new Error('Dizi ismi bulunamadı');

                // 2. Dizigom Formatına Uygun Slug Oluştur
                // Örnek: "The Boys" -> "the-boys"
                var slug = name.toLowerCase().trim()
                    .replace(/[^a-z0-9]+/g, '-')
                    .replace(/^-+|-+$/g, '');

                // Dizigom Bölüm URL Yapısı: /dizi/slug-season-sezon-episode-bolum/
                var epUrl = BASE_URL + '/dizi/' + slug + '-' + seasonNum + '-sezon-' + episodeNum + '-bolum/';
                console.log('[Dizigom] Hedef URL:', epUrl);

                return fetch(epUrl, { headers: HEADERS });
            })
            .then(function(res) { return res.text(); })
            .then(function(html) {
                var streams = [];

                // 3. Iframe/Player Linklerini Yakala
                // Dizigom genellikle "player.php" veya "embed" linkleri kullanır
                var iframeRegex = /<iframe[^>]+src="([^"]+)"/gi;
                var match;
                
                while ((match = iframeRegex.exec(html)) !== null) {
                    var src = match[1];
                    
                    // Reklam veya sosyal medya linklerini filtrele
                    if (src.includes('facebook') || src.includes('twitter')) continue;

                    // URL'yi temizle (protocol eksikse ekle)
                    if (src.startsWith('//')) src = 'https:' + src;

                    streams.push({
                        name: '⌜ Dizigom ⌟ | Kaynak #' + (streams.length + 1),
                        url: src,
                        quality: '1080p',
                        headers: { 'Referer': BASE_URL + '/' }
                    });
                }

                // 4. Alternatif: data-video-url gibi öznitelikleri ara
                if (streams.length === 0) {
                    var altMatch = html.match(/data-video-url="([^"]+)"/i);
                    if (altMatch) {
                        streams.push({
                            name: '⌜ Dizigom ⌟ | Ana Player',
                            url: altMatch[1],
                            quality: 'HD',
                            headers: { 'Referer': BASE_URL + '/' }
                        });
                    }
                }

                console.log('[Dizigom] Bulunan Link:', streams.length);
                resolve(streams);
            })
            .catch(function(err) {
                console.error('[Dizigom] Hata:', err.message);
                resolve([]);
            });
    });
}

// Export yapısı
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { getStreams: getStreams };
} else {
    global.getStreams = getStreams;
}
