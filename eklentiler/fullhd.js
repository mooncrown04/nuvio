// Fonksiyonu dışarıya aktarmak için en sağlam yöntem
function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
    // Değişkeni fonksiyon içine alarak "not defined" hatasını önlüyoruz
    var FHD_BASE = 'https://www.fullhdfilmizlesene.live';
    
    var FHD_STREAM_HEADERS = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Referer': FHD_BASE
    };

    return new Promise(function(resolve) {
        var tmdbType = mediaType === 'movie' ? 'movie' : 'tv';
        var tmdbUrl = 'https://api.themoviedb.org/3/' + tmdbType + '/' + tmdbId +
            '?language=tr-TR&api_key=4ef0d7355d9ffb5151e987764708ce96';

        fetch(tmdbUrl)
            .then(function(res) { return res.json(); })
            .then(function(data) {
                var title = data.title || data.name || '';
                if (!title) return resolve([]);
                
                var searchUrl = FHD_BASE + '/arama/' + encodeURIComponent(title);
                return fetch(searchUrl, { headers: { 'User-Agent': FHD_STREAM_HEADERS['User-Agent'] } });
            })
            .then(function(res) { return res.text(); })
            .then(function(html) {
                var match = html.match(/href="(https?:\/\/www\.fullhdfilmizlesene\.live\/film\/[^"']+)"/);
                if (!match) return resolve([]);
                
                // Detay çözme fonksiyonunu çağırırken BASE ve HEADERS parametrelerini de gönderelim veya içeride tanımlayalım
                return fetchDetailAndSolve(match[1], FHD_BASE, FHD_STREAM_HEADERS);
            })
            .then(function(streams) {
                resolve(streams || []);
            })
            .catch(function(err) {
                console.error('[FHD-FATAL]', err.message);
                resolve([]);
            });
    });
}

function fetchDetailAndSolve(filmUrl, FHD_BASE, FHD_STREAM_HEADERS) {
    return fetch(filmUrl, { headers: { 'User-Agent': FHD_STREAM_HEADERS['User-Agent'] } })
        .then(function(res) { return res.text(); })
        .then(function(html) {
            var vidIdMatch = html.match(/vidid\s*=\s*['"]([^'"]+)['"]/);
            if (!vidIdMatch) return [];
            
            var api = FHD_BASE + '/player/api.php?id=' + vidIdMatch[1] + '&type=t&name=atom&get=video&format=json';
            
            return fetch(api, { 
                headers: { 
                    'User-Agent': FHD_STREAM_HEADERS['User-Agent'], 
                    'Referer': filmUrl,
                    'X-Requested-With': 'XMLHttpRequest' 
                } 
            });
        })
        .then(function(res) { return res.json(); })
        .then(function(data) {
            if (!data.html) return [];
            var playerUrl = data.html.startsWith('//') ? 'https:' + data.html : data.html;
            return fetch(playerUrl, { headers: { 'User-Agent': FHD_STREAM_HEADERS['User-Agent'] } });
        })
        .then(function(res) { return res.text(); })
        .then(function(atomHtml) {
            var av = atomHtml.match(/av\(['"]([^'"]+)['"]\)/);
            if (av) {
                var decodedUrl = decodeRapidLink(av[1]);
                if (decodedUrl) {
                    return [{
                        name: 'FullHD - Rapid',
                        url: decodedUrl,
                        quality: '1080p',
                        headers: { 'User-Agent': FHD_STREAM_HEADERS['User-Agent'], 'Referer': 'https://rapidvid.net/' }
                    }];
                }
            }
            return [];
        })
        .catch(function() { return []; });
}

// decodeRapidLink ve atobSafe fonksiyonlarını buraya eklemeyi unutmayın...

// EXPORT (Sistemin fonksiyonu görmesi için kritik)
if (typeof module !== 'undefined') { module.exports = { getStreams: getStreams }; }
else { globalThis.getStreams = getStreams; }
