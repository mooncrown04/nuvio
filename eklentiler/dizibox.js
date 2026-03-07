/**
 * Provider: Dizigom (v20 - Direct Access / No Search)
 * Amaç: "Job was cancelled" hatasını aşmak için maksimum hız.
 */
function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
    var BASE_URL = 'https://dizigom104.com';
    var HEADERS = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Referer': BASE_URL + '/'
    };

    return new Promise(function(resolve) {
        if (mediaType !== 'tv') return resolve([]);

        // 1. TMDB'den isim al (Bu adım hızlıdır)
        fetch('https://api.themoviedb.org/3/tv/' + tmdbId + '?api_key=4ef0d7355d9ffb5151e987764708ce96&language=tr-TR')
            .then(function(res) { return res.json(); })
            .then(function(data) {
                var name = data.name || data.original_name;
                // Slug oluştur (Türkçe karakter ve boşluk temizleme)
                var slug = name.toLowerCase().trim()
                    .replace(/[üçşğöı]/g, function(m) { return {'ü':'u','ç':'c','ş':'s','ğ':'g','ö':'o','ı':'i'}[m]; })
                    .replace(/[^a-z0-9]+/g, '-')
                    .replace(/^-+|-+$/g, '');

                // ARAMA YAPMADAN DOĞRUDAN URL TAHMİNİ (Hız için)
                var targetUrl = BASE_URL + '/dizi/' + slug + '-izle-' + seasonNum + '-sezon-' + episodeNum + '-bolum/';
                console.log('[Dizigom-v20] Hedef URL: ' + targetUrl);

                return fetch(targetUrl, { headers: HEADERS });
            })
            .then(function(res) {
                if (res.status !== 200) {
                    // Eğer 404 aldıysak sessizce bitir ki sistem kilitlenmesin
                    return resolve([]);
                }
                return res.text();
            })
            .then(function(html) {
                if (!html) return resolve([]);

                var streams = [];
                // Sayfadaki video linklerini yakala (Moly, Vidmoly vb.)
                var regex = /src="([^"]*(?:vidmoly|moly|player|embed|ok\.ru)[^"]*)"/gi;
                var match;
                
                while ((match = regex.exec(html)) !== null) {
                    var src = match[1].startsWith('//') ? 'https:' + match[1] : match[1];
                    streams.push({
                        name: 'Dizigom | ' + (src.includes('moly') ? 'Moly' : 'Kaynak'),
                        url: src,
                        quality: '1080p',
                        headers: { 'Referer': BASE_URL + '/' }
                    });
                }
                
                console.log('[Dizigom-v20] Link Bulundu: ' + streams.length);
                resolve(streams);
            })
            .catch(function(err) {
                console.log('[Dizigom-v20] Hata: ' + err.message);
                resolve([]);
            });
    });
}

if (typeof module !== 'undefined') { module.exports = { getStreams: getStreams }; }
globalThis.getStreams = getStreams;
