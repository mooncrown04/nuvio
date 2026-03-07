var BASE_URL = 'https://www.dizibox.live';

var HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
    'Referer': BASE_URL + '/',
    'Cookie': 'isTrustedUser=true; LockUser=true; dbxu=' + Date.now()
};

function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
    return new Promise(function(resolve, reject) {
        if (mediaType !== 'tv') return resolve([]);

        // 1. TMDB'den Bilgi Al (Orijinal İsim)
        var tmdbUrl = 'https://api.themoviedb.org/3/tv/' + tmdbId + '?api_key=4ef0d7355d9ffb5151e987764708ce96&language=tr-TR';

        fetch(tmdbUrl)
            .then(function(res) { return res.json(); })
            .then(function(data) {
                var name = data.original_name || data.name;
                var slug = name.toLowerCase().trim()
                    .replace(/[^a-z0-9]+/g, '-')
                    .replace(/^-+|-+$/g, '');

                var epUrl = BASE_URL + '/' + slug + '-' + seasonNum + '-sezon-' + episodeNum + '-bolum-hd-izle/';
                
                // 2. Sayfayı Çek
                // EĞER NUVIODAYSAN: fetch yerine varsa app.get kullanılması korumayı aşabilir
                return fetch(epUrl, { headers: HEADERS });
            })
            .then(function(res) { return res.text(); })
            .then(function(html) {
                // Hâlâ engel varsa logla ve dur
                if (html.length < 280000) {
                    console.error('[DiziBox] Engel aşılamadı. Boyut:', html.length);
                    return resolve([]);
                }

                var streams = [];
                // Video ID'sini hem tırnaklı hem tırnaksız yakala
                var videoIdMatch = html.match(/video_id["']?\s*[:=]\s*["']?(\d+)["']?/i);

                if (videoIdMatch) {
                    streams.push({
                        name: '⌜ DiziBox ⌟ | King Player',
                        url: BASE_URL + '/player/king.php?wmode=opaque&v=' + videoIdMatch[1],
                        quality: '1080p',
                        headers: { 'Referer': BASE_URL + '/' }
                    });
                }
                
                resolve(streams);
            })
            .catch(function(err) {
                console.error('[DiziBox] Hata:', err);
                resolve([]);
            });
    });
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { getStreams: getStreams };
} else {
    global.getStreams = getStreams;
}
