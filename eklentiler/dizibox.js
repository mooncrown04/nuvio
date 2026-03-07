var BASE_URL = 'https://www.dizibox.live';

var HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
    'Referer': BASE_URL + '/',
    'Cookie': 'LockUser=true; isTrustedUser=true; dbxu=' + Date.now()
};

/**
 * Dizibox Link Çözücü
 */
function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
    return new Promise(function(resolve, reject) {
        // Dizibox temel olarak TV dizileri odaklıdır
        if (mediaType !== 'tv') return resolve([]);

        console.log('[DiziBox] Başlatıldı:', tmdbId, 'S:', seasonNum, 'E:', episodeNum);

        // 1. TMDB'den Orijinal İsmi Al (Slug oluşturmak için en güvenli yol)
        var tmdbUrl = 'https://api.themoviedb.org/3/tv/' + tmdbId + '?api_key=4ef0d7355d9ffb5151e987764708ce96&language=tr-TR';

        fetch(tmdbUrl)
            .then(function(res) { return res.json(); })
            .then(function(data) {
                var name = data.original_name || data.name;
                if (!name) throw new Error('Dizi ismi bulunamadı');

                // 2. Dizibox Formatına Uygun Slug Oluştur
                var slug = name.toLowerCase().trim()
                    .replace(/[^a-z0-9]+/g, '-')
                    .replace(/^-+|-+$/g, '');

                var epUrl = BASE_URL + '/' + slug + '-' + seasonNum + '-sezon-' + episodeNum + '-bolum-hd-izle/';
                console.log('[DiziBox] Hedef URL:', epUrl);

                return fetch(epUrl, { headers: HEADERS });
            })
            .then(function(res) { return res.text(); })
            .then(function(html) {
                // 3. Cloudflare Koruması Kontrolü (Loglardaki 261727 tespiti)
                if (html.length < 280000 && html.indexOf('cloudflare') !== -1) {
                    console.log('[DiziBox] Cloudflare engeli aşılamadı (bodyLen: ' + html.length + ')');
                    // Bazı durumlarda .live yerine .de veya .net denenebilir
                    return resolve([]); 
                }

                var streams = [];

                // 4. King Player ID Yakalama (Regex)
                var videoIdMatch = html.match(/video_id["']?\s*[:=]\s*["']?(\d+)["']?/i) || 
                                   html.match(/data-id=["']?(\d+)["']?/i);

                if (videoIdMatch) {
                    var finalId = videoIdMatch[1];
                    streams.push({
                        name: '⌜ DiziBox ⌟ | King Player',
                        url: BASE_URL + '/player/king.php?wmode=opaque&v=' + finalId,
                        quality: '1080p',
                        headers: { 'Referer': BASE_URL + '/' }
                    });
                }

                // 5. Vidmoly / Moly Kaynaklarını Yakalama
                var molyRegex = /https?:\/\/(?:www\.)?(?:vidmoly|moly)\.[a-z]+\/(?:embed-)?([a-z0-9]+)/gi;
                var match;
                while ((match = molyRegex.exec(html)) !== null) {
                    streams.push({
                        name: '⌜ DiziBox ⌟ | Kaynak #' + (streams.length + 1),
                        url: match[0],
                        quality: '720p',
                        headers: { 'Referer': BASE_URL + '/' }
                    });
                }

                console.log('[DiziBox] Bulunan Link Sayısı:', streams.length);
                resolve(streams);
            })
            .catch(function(err) {
                console.error('[DiziBox] Hata:', err.message);
                resolve([]);
            });
    });
}

// Export yapısı (Diğer dosyalarla uyumlu)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { getStreams: getStreams };
} else {
    global.getStreams = getStreams;
}
