/**
 * Provider: Dizigom (v19 - Aggressive Logging)
 */
function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
    var BASE_URL = 'https://dizigom104.com';
    var HEADERS = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'X-Requested-With': 'XMLHttpRequest'
    };

    return new Promise(function(resolve) {
        if (mediaType !== 'tv') return resolve([]);

        console.log('[DEBUG-DIZIGOM] Istek baslatildi: TMDB-' + tmdbId);

        // 1. TMDB'den temiz isim al
        fetch('https://api.themoviedb.org/3/tv/' + tmdbId + '?api_key=4ef0d7355d9ffb5151e987764708ce96&language=tr-TR')
            .then(function(res) { return res.json(); })
            .then(function(data) {
                var query = (data.name || data.original_name).split(':')[0].trim();
                console.log('[DEBUG-DIZIGOM] Temiz Sorgu: ' + query);

                // 2. Arama motorunu sorgula
                return fetch(BASE_URL + '/?s=' + encodeURIComponent(query), { headers: HEADERS });
            })
            .then(function(res) {
                console.log('[DEBUG-DIZIGOM] Arama Yanit Status: ' + res.status);
                return res.text();
            })
            .then(function(html) {
                // 3. Link Ayıklama
                var linkMatch = html.match(/href="(https:\/\/dizigom104\.com\/dizi\/[^"]+)"/i);
                
                if (!linkMatch) {
                    console.log('[DEBUG-DIZIGOM] KRITIK: Sitede bu dizi bulunamadi!');
                    return resolve([]); 
                }

                var showUrl = linkMatch[1].replace(/\/$/, '');
                var epUrl = showUrl + '-' + seasonNum + '-sezon-' + episodeNum + '-bolum/';
                console.log('[DEBUG-DIZIGOM] Bolum URL Deneniyor: ' + epUrl);

                return fetch(epUrl, { headers: HEADERS }).then(function(r) {
                    if (r.status === 404) {
                        return fetch(epUrl.replace(/\/$/, '') + '-hd1/', { headers: HEADERS });
                    }
                    return r;
                });
            })
            .then(function(res) {
                if (!res) return null;
                return res.text();
            })
            .then(function(epHtml) {
                if (!epHtml) return resolve([]);

                var streams = [];
                // Video kaynaklarını (Vidmoly, Moly vb.) topla
                var regex = /src="([^"]*(?:vidmoly|moly|player|embed|ok\.ru)[^"]*)"/gi;
                var match;
                
                while ((match = regex.exec(epHtml)) !== null) {
                    var src = match[1].startsWith('//') ? 'https:' + match[1] : match[1];
                    console.log('[DEBUG-DIZIGOM] Kaynak Yakalandi: ' + src);
                    streams.push({
                        name: 'Dizigom | ' + (src.includes('moly') ? 'Moly' : 'Kaynak'),
                        url: src,
                        quality: '1080p',
                        headers: { 'Referer': BASE_URL + '/' }
                    });
                }
                
                console.log('[DEBUG-DIZIGOM] Islem Tamamlandi. Link Sayisi: ' + streams.length);
                resolve(streams);
            })
            .catch(function(err) {
                console.log('[DEBUG-DIZIGOM] HATA: ' + err.message);
                resolve([]);
            });
    });
}

if (typeof module !== 'undefined') { module.exports = { getStreams: getStreams }; }
globalThis.getStreams = getStreams;
