function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
    return new Promise(function(resolve) {
        var tmdbType = mediaType === 'movie' ? 'movie' : 'tv';
        var tmdbUrl = 'https://api.themoviedb.org/3/' + tmdbType + '/' + tmdbId +
            '?language=tr-TR&api_key=4ef0d7355d9ffb5151e987764708ce96';

        console.log('[FHD] İşlem başlatıldı ID:', tmdbId);

        fetch(tmdbUrl)
            .then(function(res) { return res.json(); })
            .then(function(data) {
                var title = data.title || data.name || '';
                if (!title) throw new Error('TMDB Başlığı bulunamadı');
                
                var searchUrl = FHD_BASE + '/arama/' + encodeURIComponent(title);
                return fetch(searchUrl, { headers: { 'User-Agent': FHD_STREAM_HEADERS['User-Agent'] } });
            })
            .then(function(res) { return res.text(); })
            .then(function(html) {
                // Regex'i daha esnek hale getirdik
                var match = html.match(/href="(https?:\/\/(www\.)?fullhdfilmizlesene\.live\/film\/[^"']+)"/);
                if (!match) throw new Error('Arama sonucu bulunamadı');
                
                return fetchDetailAndSolve(match[1]);
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

function fetchDetailAndSolve(filmUrl) {
    return fetch(filmUrl, { headers: { 'User-Agent': FHD_STREAM_HEADERS['User-Agent'] } })
        .then(function(res) { return res.text(); })
        .then(function(html) {
            var vidIdMatch = html.match(/vidid\s*=\s*['"]([^'"]+)['"]/);
            if (!vidIdMatch) throw new Error('vidid bulunamadı');
            
            var api = FHD_BASE + '/player/api.php?id=' + vidIdMatch[1] + '&type=t&name=atom&get=video&format=json';
            
            return fetch(api, { 
                headers: { 
                    'User-Agent': FHD_STREAM_HEADERS['User-Agent'], 
                    'Referer': filmUrl,
                    'X-Requested-With': 'XMLHttpRequest' 
                } 
            });
        })
        .then(function(res) { return res.json(); }) // replace(/\\/g, '') yerine direkt json dene
        .then(function(data) {
            if (!data.html) throw new Error('API html alanı boş');
            // Gelen URL bazen başında // ile başlar, protokol ekle
            var playerUrl = data.html.startsWith('//') ? 'https:' + data.html : data.html;
            return fetch(playerUrl, { headers: { 'User-Agent': FHD_STREAM_HEADERS['User-Agent'] } });
        })
        .then(function(res) { return res.text(); })
        .then(function(atomHtml) {
            var av = atomHtml.match(/av\(['"]([^'"]+)['"]\)/);
            if (!av) throw new Error('av() şifreli link bulunamadı');
            
            var decodedUrl = decodeRapidLink(av[1]);
            if (decodedUrl) {
                return [{
                    name: 'FHD - Rapid',
                    url: decodedUrl,
                    quality: '1080p',
                    headers: FHD_STREAM_HEADERS
                }];
            }
            return [];
        })
        .catch(function(e) {
            console.error('[FHD-DETAIL-ERROR]', e.message);
            return [];
        });
}

// EXPORT EKLEMESİ
if (typeof module !== 'undefined') { module.exports = { getStreams }; }
else { globalThis.getStreams = getStreams; }
