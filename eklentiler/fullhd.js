/* --- DERİN LOGLAMA VE GÜVENLİ OYNATMA --- */
var FHD_BASE = 'https://www.fullhdfilmizlesene.live';

// VLC ve ExoPlayer'ın reddedilmemesi için tarayıcı kimliği
var FHD_STREAM_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    'Accept': '*/*',
    'Accept-Language': 'tr-TR,tr;q=0.9',
    'Connection': 'keep-alive'
};

/* --- DECODER (PHP MANTIĞI) --- */
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
        console.error('[FHD-Decode] Şifre çözme hatası:', e.message);
        return null; 
    }
}

/* --- ANA AKIŞ --- */
function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
    return new Promise(function(resolve) {
        var tmdbType = mediaType === 'movie' ? 'movie' : 'tv';
        var tmdbUrl = 'https://api.themoviedb.org/3/' + tmdbType + '/' + tmdbId +
            '?language=tr-TR&api_key=4ef0d7355d9ffb5151e987764708ce96';

        console.log('[FHD] TMDB aranıyor:', tmdbId);

        fetch(tmdbUrl)
            .then(function(res) { return res.json(); })
            .then(function(data) {
                var title = data.title || data.name || '';
                if (!title) {
                    console.error('[FHD] TMDB başlığı bulunamadı!');
                    return resolve([]);
                }
                
                var searchUrl = FHD_BASE + '/arama/' + encodeURIComponent(title);
                return fetch(searchUrl, { headers: { 'User-Agent': FHD_STREAM_HEADERS['User-Agent'] } });
            })
            .then(function(res) { return res.text(); })
            .then(function(html) {
                var match = html.match(/href="(https?:\/\/www\.fullhdfilmizlesene\.live\/film\/[^"']+)"/);
                if (!match) {
                    console.error('[FHD] Sitede film eşleşmesi bulunamadı.');
                    return resolve([]);
                }
                return fetchDetailAndSolve(match[1]);
            })
            .then(function(streams) {
                resolve(streams || []);
            })
            .catch(function(err) {
                console.error('[FHD-Global] Hata:', err.message);
                resolve([]);
            });
    });
}

function fetchDetailAndSolve(filmUrl) {
    console.log('[FHD] Sayfa analiz ediliyor:', filmUrl);
    return fetch(filmUrl, { headers: { 'User-Agent': FHD_STREAM_HEADERS['User-Agent'] } })
        .then(function(res) { return res.text(); })
        .then(function(html) {
            var vidIdMatch = html.match(/vidid\s*=\s*['"]([^'"]+)['"]/);
            if (!vidIdMatch) {
                console.error('[FHD] Sayfada vidid bulunamadı!');
                return [];
            }
            var vidId = vidIdMatch[1];

            // 503 Hatasını önlemek için Referer ve User-Agent kritik
            var api = FHD_BASE + '/player/api.php?id=' + vidId + '&type=t&name=atom&get=video&format=json';
            
            return fetch(api, { 
                headers: { 
                    'User-Agent': FHD_STREAM_HEADERS['User-Agent'], 
                    'Referer': filmUrl,
                    'X-Requested-With': 'XMLHttpRequest'
                } 
            })
            .then(function(r) { return r.text(); })
            .then(function(t) {
                var data;
                try {
                    data = JSON.parse(t.replace(/\\/g, ''));
                } catch(e) {
                    console.error('[FHD] JSON Parse Hatası (Muhtemelen 503 döndü):', t.substring(0, 100));
                    return [];
                }
                
                if (!data.html) {
                    console.error('[FHD] API html alanı boş döndü.');
                    return [];
                }
                return fetch(data.html, { headers: { 'User-Agent': FHD_STREAM_HEADERS['User-Agent'] } });
            })
            .then(function(res) { return res.text(); })
            .then(function(atomHtml) {
                var av = atomHtml.match(/av\(['"]([^'"]+)['"]\)/);
                if (av) {
                    var decodedUrl = decodeRapidLink(av[1]);
                    if (decodedUrl) {
                        console.log('[FHD] Başarılı! Link çözüldü.');
                        return [{
                            name: 'FHD - Rapid (Loglu)',
                            title: 'FullHD Film',
                            url: decodedUrl,
                            quality: '1080p',
                            headers: Object.assign({}, FHD_STREAM_HEADERS, { 'Referer': 'https://rapidvid.net/' }),
                            provider: 'fhd'
                        }];
                    }
                }
                console.error('[FHD] av() şifresi bulunamadı.');
                return [];
            });
        })
        .catch(function(e) {
            console.error('[FHD-Detail] Kritik Hata:', e.message);
            return [];
        });
}

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { getStreams };
} else {
    global.getStreams = getStreams;
}
