var FHD_BASE = 'https://www.fullhdfilmizlesene.live';

// Sunucuyu kandırmak için en güncel Chrome User-Agent'ı
var FHD_STREAM_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    'Accept': '*/*',
    'Accept-Language': 'tr-TR,tr;q=0.9',
    'Connection': 'keep-alive',
    'Sec-Ch-Ua': '"Chromium";v="122", "Not(A:Brand";v="24", "Google Chrome";v="122"',
    'Sec-Ch-Ua-Mobile': '?0',
    'Sec-Ch-Ua-Platform': '"Windows"',
    'Sec-Fetch-Dest': 'video',
    'Sec-Fetch-Mode': 'no-cors',
    'Sec-Fetch-Site': 'cross-site'
};

function atobSafe(s) {
    try {
        var str = String(s).replace(/\s/g, '');
        while (str.length % 4 !== 0) str += '=';
        var chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
        var output = '';
        var bc = 0, bs, buffer, idx = 0;
        while (buffer = str.charAt(idx++)) {
            buffer = chars.indexOf(buffer);
            if (buffer === -1) continue;
            bs = bc % 4 ? bs * 64 + buffer : buffer;
            if (bc++ % 4) output += String.fromCharCode(255 & bs >> (-2 * bc & 6));
        }
        return output;
    } catch (e) { return ''; }
}

function decodeRapidLink(encoded) {
    if (!encoded) return null;
    try {
        var reversed = encoded.split('').reverse().join('');
        var step1 = atobSafe(reversed);
        var key = 'K9L';
        var output = '';
        for (var i = 0; i < step1.length; i++) {
            var r = key.charCodeAt(i % 3);
            var n = step1.charCodeAt(i) - (r % 5 + 1);
            output += String.fromCharCode(n);
        }
        return atobSafe(output);
    } catch (e) { 
        console.error('[FHD-ERROR] Şifre çözme başarısız:', e.message);
        return null; 
    }
}

function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
    return new Promise(function(resolve) {
        var tmdbType = mediaType === 'movie' ? 'movie' : 'tv';
        var tmdbUrl = 'https://api.themoviedb.org/3/' + tmdbType + '/' + tmdbId +
            '?language=tr-TR&api_key=4ef0d7355d9ffb5151e987764708ce96';

        console.log('[FHD] İstek Başladı:', title || tmdbId);

        fetch(tmdbUrl)
            .then(function(res) { return res.json(); })
            .then(function(data) {
                var title = data.title || data.name || '';
                if (!title) {
                    console.error('[FHD-ERROR] TMDB başlığı boş!');
                    return resolve([]);
                }
                var searchUrl = FHD_BASE + '/arama/' + encodeURIComponent(title);
                return fetch(searchUrl, { headers: { 'User-Agent': FHD_STREAM_HEADERS['User-Agent'] } });
            })
            .then(function(res) { return res.text(); })
            .then(function(html) {
                var match = html.match(/href="(https?:\/\/www\.fullhdfilmizlesene\.live\/film\/[^"']+)"/);
                if (!match) {
                    console.error('[FHD-ERROR] Film aramada bulunamadı.');
                    return resolve([]);
                }
                return fetchDetailAndSolve(match[1]);
            })
            .then(function(streams) {
                resolve(streams || []);
            })
            .catch(function(err) {
                console.error('[FHD-FATAL] Genel Hata:', err.message);
                resolve([]);
            });
    });
}

function fetchDetailAndSolve(filmUrl) {
    return fetch(filmUrl, { headers: { 'User-Agent': FHD_STREAM_HEADERS['User-Agent'] } })
        .then(function(res) { return res.text(); })
        .then(function(html) {
            var vidIdMatch = html.match(/vidid\s*=\s*['"]([^'"]+)['"]/);
            if (!vidIdMatch) {
                console.error('[FHD-ERROR] vidid bulunamadı.');
                return [];
            }
            
            // RapidVid API isteği
            var api = FHD_BASE + '/player/api.php?id=' + vidIdMatch[1] + '&type=t&name=atom&get=video&format=json';
            
            return fetch(api, { 
                headers: { 
                    'User-Agent': FHD_STREAM_HEADERS['User-Agent'], 
                    'Referer': filmUrl,
                    'X-Requested-With': 'XMLHttpRequest' 
                } 
            });
        })
        .then(function(res) { return res.text(); })
        .then(function(text) {
            try {
                var data = JSON.parse(text.replace(/\\/g, ''));
                if (!data.html) throw new Error('HTML alanı boş');
                return fetch(data.html, { headers: { 'User-Agent': FHD_STREAM_HEADERS['User-Agent'] } });
            } catch(e) {
                console.error('[FHD-ERROR] API JSON Hatası:', text.substring(0, 50));
                return null;
            }
        })
        .then(function(res) { return res ? res.text() : null; })
        .then(function(atomHtml) {
            if (!atomHtml) return [];
            var av = atomHtml.match(/av\(['"]([^'"]+)['"]\)/);
            if (av) {
                var decodedUrl = decodeRapidLink(av[1]);
                if (decodedUrl) {
                    console.log('[FHD-SUCCESS] Link Çözüldü:', decodedUrl.substring(0, 30));
                    return [{
                        name: 'FHD - Rapid',
                        url: decodedUrl,
                        quality: '1080p',
                        headers: {
                            'User-Agent': FHD_STREAM_HEADERS['User-Agent'],
                            'Referer': 'https://rapidvid.net/',
                            'Origin': 'https://rapidvid.net'
                        }
                    }];
                }
            }
            console.error('[FHD-ERROR] av() bulunamadı.');
            return [];
        })
        .catch(function(e) {
            console.error('[FHD-ERROR] fetchDetail hatası:', e.message);
            return [];
        });
}
