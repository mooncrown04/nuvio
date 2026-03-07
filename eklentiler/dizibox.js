/**
 * Provider: Dizigom (v16 - Hızlı Tahmin)
 */
function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
    var BASE_URL = 'https://dizigom104.com';
    
    return new Promise(function(resolve) {
        if (mediaType !== 'tv') return resolve([]);

        // 1. TMDB Bilgisini çek
        var tmdbUrl = 'https://api.themoviedb.org/3/tv/' + tmdbId + '?api_key=4ef0d7355d9ffb5151e987764708ce96&language=tr-TR';

        fetch(tmdbUrl)
            .then(function(res) { return res.json(); })
            .then(function(data) {
                var name = data.name || data.original_name;
                // Slug oluştur (Türkçe karakter temizliği)
                var slug = name.toLowerCase().trim()
                    .replace(/[üçşğöı]/g, function(m) { return {'ü':'u','ç':'c','ş':'s','ğ':'g','ö':'o','ı':'i'}[m]; })
                    .replace(/[^a-z0-9]+/g, '-')
                    .replace(/^-+|-+$/g, '');

                console.log('--- DIZIGOM TARAMA: ' + slug + ' ---');

                // En yaygın 2 URL formatı
                var urls = [
                    BASE_URL + '/dizi/' + slug + '-izle-' + seasonNum + '-sezon-' + episodeNum + '-bolum/',
                    BASE_URL + '/dizi/' + slug + '-' + seasonNum + '-sezon-' + episodeNum + '-bolum/'
                ];

                // İlk URL'yi dene
                return fetch(urls[0]).then(function(r1) {
                    if (r1.status === 200) return r1.text();
                    // İlk URL 404 ise ikinciyi dene
                    console.log('URL1 404, URL2 deneniyor...');
                    return fetch(urls[1]).then(function(r2) { 
                        return r2.status === 200 ? r2.text() : null; 
                    });
                });
            })
            .then(function(html) {
                var streams = [];
                if (!html) {
                    console.log('DIZIGOM: Sayfa bulunamadi.');
                    return resolve([]);
                }

                // Video iframe'lerini yakala (Moly, Vidmoly vb.)
                var regex = /src="([^"]*(?:vidmoly|moly|player|embed|ok\.ru)[^"]*)"/gi;
                var match;
                while ((match = regex.exec(html)) !== null) {
                    var src = match[1];
                    if (src.startsWith('//')) src = 'https:' + src;
                    
                    streams.push({
                        name: 'Dizigom | ' + (src.includes('moly') ? 'Moly' : 'Kaynak'),
                        url: src,
                        quality: '1080p',
                        headers: { 'Referer': BASE_URL + '/' }
                    });
                }

                console.log('DIZIGOM: Bitti. Link: ' + streams.length);
                resolve(streams);
            })
            .catch(function(err) {
                console.log('DIZIGOM HATA: ' + err.message);
                resolve([]);
            });
    });
}

// Global Export
if (typeof module !== 'undefined') { module.exports = { getStreams: getStreams }; }
globalThis.getStreams = getStreams;
