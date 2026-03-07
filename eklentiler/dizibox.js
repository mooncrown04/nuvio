/**
 * Dizigom v10 - Arama ve Link Çözücü
 */
function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
    var BASE_URL = 'https://dizigom104.com';
    var HEADERS = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Referer': BASE_URL + '/'
    };

    return new Promise(function(resolve, reject) {
        if (mediaType !== 'tv') return resolve([]);

        // 1. TMDB'den ismi al
        fetch('https://api.themoviedb.org/3/tv/' + tmdbId + '?api_key=4ef0d7355d9ffb5151e987764708ce96&language=tr-TR')
            .then(function(res) { return res.json(); })
            .then(function(data) {
                var query = data.name || data.original_name;
                // Arama sorgusunu temizle (Örn: "The Boys: Gen V" -> "The Boys")
                var cleanQuery = query.split(':')[0].split('-')[0].trim();
                console.log('[Dizigom] Aranıyor: ' + cleanQuery);

                return fetch(BASE_URL + '/?s=' + encodeURIComponent(cleanQuery), { headers: HEADERS });
            })
            .then(function(res) { return res.text(); })
            .then(function(searchHtml) {
                // 2. Arama sonuçlarından ilk dizi linkini yakala
                var linkMatch = searchHtml.match(/href="(https:\/\/dizigom104\.com\/dizi\/[^"]+)"/i);
                if (!linkMatch) throw new Error('Dizi bulunamadı');

                var showUrl = linkMatch[1].replace(/\/$/, '');
                // Bölüm URL'sini oluştur
                var epUrl = showUrl + '-' + seasonNum + '-sezon-' + episodeNum + '-bolum/';
                console.log('[Dizigom] Bölüm Sayfası: ' + epUrl);

                return fetch(epUrl, { headers: HEADERS });
            })
            .then(function(res) {
                // Eğer 404 ise HD1 varyasyonunu dene
                if (res.status === 404) {
                    var altUrl = res.url.replace(/\/$/, '') + '-hd1/';
                    return fetch(altUrl, { headers: HEADERS });
                }
                return res;
            })
            .then(function(res) { return res.text(); })
            .then(function(html) {
                var streams = [];
                // 3. Iframe/Embed kaynaklarını topla
                var videoRegex = /src="([^"]*(?:vidmoly|moly|player|embed|ok\.ru)[^"]*)"/gi;
                var match;
                
                while ((match = videoRegex.exec(html)) !== null) {
                    var src = match[1];
                    if (src.startsWith('//')) src = 'https:' + src;
                    
                    // Reklamları filtrele
                    if (src.includes('google') || src.includes('facebook')) continue;

                    streams.push({
                        name: '⌜ Dizigom ⌟ | ' + (src.includes('moly') ? 'Moly' : 'Kaynak'),
                        url: src,
                        quality: '1080p',
                        headers: { 'Referer': BASE_URL + '/' }
                    });
                }
                
                console.log('[Dizigom] Bitti. Link: ' + streams.length);
                resolve(streams);
            })
            .catch(function(err) {
                console.error('[Dizigom] Hata: ' + err.message);
                resolve([]);
            });
    });
}

// Global Tanımlama (Her iki sistem için de)
if (typeof module !== 'undefined') { module.exports = { getStreams: getStreams }; }
globalThis.getStreams = getStreams;
