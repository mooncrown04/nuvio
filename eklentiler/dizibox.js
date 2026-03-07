/**
 * Dizigom Provider - v17 (High Compatibility)
 */
function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
    var BASE_URL = 'https://dizigom104.com';
    var HEADERS = {
        'User-Agent': 'Mozilla/5.0 (Linux; Android 10; TV) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'X-Requested-With': 'XMLHttpRequest',
        'Referer': BASE_URL + '/'
    };

    return new Promise(function(resolve) {
        if (mediaType !== 'tv') return resolve([]);

        // 1. TMDB Bilgisi
        var tmdbUrl = 'https://api.themoviedb.org/3/tv/' + tmdbId + '?api_key=4ef0d7355d9ffb5151e987764708ce96&language=tr-TR';

        fetch(tmdbUrl)
            .then(function(res) { return res.json(); })
            .then(function(data) {
                var name = data.name || data.original_name;
                var slug = name.toLowerCase().trim()
                    .replace(/[üçşğöı]/g, function(m) { return {'ü':'u','ç':'c','ş':'s','ğ':'g','ö':'o','ı':'i'}[m]; })
                    .replace(/[^a-z0-9]+/g, '-')
                    .replace(/^-+|-+$/g, '');

                // Dizigom'un 3 farklı URL varyasyonu (En olasıdan en az olasıya)
                var urls = [
                    BASE_URL + '/dizi/' + slug + '-izle-' + seasonNum + '-sezon-' + episodeNum + '-bolum/',
                    BASE_URL + '/dizi/' + slug + '-' + seasonNum + '-sezon-' + episodeNum + '-bolum/',
                    BASE_URL + '/dizi/' + slug + '-' + seasonNum + '-sezon-' + episodeNum + '-bolum-hd1/'
                ];

                // URL'leri sırayla dene
                return tryDizigomUrls(urls);
            })
            .then(function(html) {
                if (!html) return resolve([]);

                var streams = [];
                // Video kaynaklarını tara (Moly, Vidmoly, player vb.)
                var regex = /src="([^"]*(?:vidmoly|moly|player|embed|ok\.ru)[^"]*)"/gi;
                var match;
                while ((match = regex.exec(html)) !== null) {
                    var src = match[1].startsWith('//') ? 'https:' + match[1] : match[1];
                    streams.push({
                        name: 'Dizigom | ' + (src.includes('moly') ? 'MolyStream' : 'Kaynak'),
                        url: src,
                        quality: '1080p',
                        headers: { 'Referer': BASE_URL + '/' }
                    });
                }
                resolve(streams);
            })
            .catch(function() { resolve([]); });
    });
}

// Yardımcı Fonksiyon: URL listesini sırayla dener
function tryDizigomUrls(urls) {
    return new Promise(function(resolve) {
        var index = 0;
        function next() {
            if (index >= urls.length) return resolve(null);
            fetch(urls[index], { headers: { 'User-Agent': 'Mozilla/5.0' } })
                .then(function(res) {
                    if (res.status === 200) return res.text().then(resolve);
                    index++;
                    next();
                })
                .catch(function() {
                    index++;
                    next();
                });
        }
        next();
    });
}

// Global Export
if (typeof module !== 'undefined') { module.exports = { getStreams: getStreams }; }
globalThis.getStreams = getStreams;
