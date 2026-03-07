/**
 * Dizigom Legacy Provider - v15
 * Async/Await kaldırıldı, Saf Promise yapısına dönüldü.
 */
function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
    var BASE_URL = 'https://dizigom104.com';
    var TMDB_API = 'https://api.themoviedb.org/3/tv/' + tmdbId + '?api_key=4ef0d7355d9ffb5151e987764708ce96&language=tr-TR';
    
    var HEADERS = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Referer': BASE_URL + '/'
    };

    return new Promise(function(resolve, reject) {
        if (mediaType !== 'tv') return resolve([]);

        console.log('[Dizigom] Baslatiliyor... TMDB ID: ' + tmdbId);

        // 1. TMDB İsmini Al
        fetch(TMDB_API)
            .then(function(res) { return res.json(); })
            .then(function(data) {
                var name = data.name || data.original_name;
                var slug = name.toLowerCase().trim()
                    .replace(/[üçşğöı]/g, function(m) { return {'ü':'u','ç':'c','ş':'s','ğ':'g','ö':'o','ı':'i'}[m]; })
                    .replace(/[^a-z0-9]+/g, '-')
                    .replace(/^-+|-+$/g, '');

                console.log('[Dizigom] Dizi: ' + name + ' | Slug: ' + slug);

                // Denenecek URL varyasyonları
                var url1 = BASE_URL + '/dizi/' + slug + '-izle-' + seasonNum + '-sezon-' + episodeNum + '-bolum/';
                var url2 = BASE_URL + '/dizi/' + slug + '-' + seasonNum + '-sezon-' + episodeNum + '-bolum/';
                var url3 = url2.replace(/\/$/, '') + '-hd1/';

                // 2. İlk URL'yi dene
                console.log('[Dizigom] Deneniyor: ' + url1);
                return fetch(url1, { headers: HEADERS }).then(function(r1) {
                    if (r1.status === 200) return r1.text().then(function(t) { return {html: t, url: url1}; });
                    
                    console.log('[Dizigom] URL1 basarisiz, URL2 deneniyor...');
                    return fetch(url2, { headers: HEADERS }).then(function(r2) {
                        if (r2.status === 200) return r2.text().then(function(t) { return {html: t, url: url2}; });
                        
                        console.log('[Dizigom] URL2 basarisiz, URL3 (HD1) deneniyor...');
                        return fetch(url3, { headers: HEADERS }).then(function(r3) {
                            if (r3.status === 200) return r3.text().then(function(t) { return {html: t, url: url3}; });
                            return null;
                        });
                    });
                });
            })
            .then(function(result) {
                if (!result || !result.html) {
                    console.log('[Dizigom] Hicbir URL sonuc vermedi.');
                    return resolve([]);
                }

                var streams = [];
                var html = result.html;
                var videoRegex = /src="([^"]*(?:vidmoly|moly|player|embed|ok\.ru)[^"]*)"/gi;
                var match;

                while ((match = videoRegex.exec(html)) !== null) {
                    var src = match[1];
                    if (src.startsWith('//')) src = 'https:' + src;
                    
                    console.log('[Dizigom] Link Bulundu: ' + src);
                    streams.push({
                        name: 'Dizigom | ' + (src.includes('moly') ? 'Moly' : 'Kaynak'),
                        url: src,
                        quality: '1080p',
                        headers: { 'Referer': result.url }
                    });
                }

                console.log('[Dizigom] Islem Tamam. Toplam: ' + streams.length);
                resolve(streams);
            })
            .catch(function(err) {
                console.log('[Dizigom] Kritik Hata: ' + err.message);
                resolve([]);
            });
    });
}

// Global Export
if (typeof module !== 'undefined') { module.exports = { getStreams: getStreams }; }
globalThis.getStreams = getStreams;
