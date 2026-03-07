/**
 * Dizigom Provider - v18 (AJAX Search Engine)
 */
function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
    var BASE_URL = 'https://dizigom104.com';
    var HEADERS = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Referer': BASE_URL + '/',
        'X-Requested-With': 'XMLHttpRequest'
    };

    return new Promise(function(resolve) {
        if (mediaType !== 'tv') return resolve([]);

        // 1. TMDB Bilgisi ile Dizi Adını Al
        var tmdbUrl = 'https://api.themoviedb.org/3/tv/' + tmdbId + '?api_key=4ef0d7355d9ffb5151e987764708ce96&language=tr-TR';

        fetch(tmdbUrl)
            .then(function(res) { return res.json(); })
            .then(function(data) {
                var query = data.name || data.original_name;
                // Sadece ana ismi al (Örn: "The Boys: Gen V" -> "The Boys")
                var cleanQuery = query.split(':')[0].trim();
                
                console.log('[Dizigom-v18] Aranıyor: ' + cleanQuery);

                // 2. Dizigom Arama Sayfasına İstek At
                // Not: Bazı siteler arama sonuçlarını direkt HTML döndürür
                return fetch(BASE_URL + '/?s=' + encodeURIComponent(cleanQuery), { headers: HEADERS });
            })
            .then(function(res) { return res.text(); })
            .then(function(searchHtml) {
                // 3. Arama sonuçlarından en alakalı dizi linkini regex ile yakala
                // Örn: <a href="https://dizigom104.com/dizi/breaking-bad-izle/">
                var linkMatch = searchHtml.match(/href="(https:\/\/dizigom104\.com\/dizi\/[^"]+)"/i);
                
                if (!linkMatch) throw new Error('Dizi linki bulunamadı');

                var showUrl = linkMatch[1].replace(/\/$/, '');
                // Bölüm URL'sini oluştur
                var epUrl = showUrl + '-' + seasonNum + '-sezon-' + episodeNum + '-bolum/';
                
                console.log('[Dizigom-v18] Hedef Sayfa: ' + epUrl);
                return fetch(epUrl, { headers: HEADERS });
            })
            .then(function(res) {
                if (res.status === 404) {
                    // Eğer 404 ise bir de HD1 takısını dene
                    var altUrl = res.url.replace(/\/$/, '') + '-hd1/';
                    return fetch(altUrl, { headers: HEADERS });
                }
                return res;
            })
            .then(function(res) { return res.text(); })
            .then(function(html) {
                var streams = [];
                // 4. Sayfadaki iframe kaynaklarını tara (Vidmoly, Moly, Player)
                var videoRegex = /src="([^"]*(?:vidmoly|moly|player|embed|ok\.ru)[^"]*)"/gi;
                var match;
                
                while ((match = videoRegex.exec(html)) !== null) {
                    var src = match[1];
                    if (src.startsWith('//')) src = 'https:' + src;
                    
                    streams.push({
                        name: 'Dizigom | ' + (src.includes('moly') ? 'Moly' : 'Kaynak'),
                        url: src,
                        quality: '1080p',
                        headers: { 'Referer': BASE_URL + '/' }
                    });
                }
                
                console.log('[Dizigom-v18] İşlem bitti. Link: ' + streams.length);
                resolve(streams);
            })
            .catch(function(err) {
                console.log('[Dizigom-v18] Hata: ' + err.message);
                resolve([]);
            });
    });
}

// Global Export
if (typeof module !== 'undefined') { module.exports = { getStreams: getStreams }; }
globalThis.getStreams = getStreams;
