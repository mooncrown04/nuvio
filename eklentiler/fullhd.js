/* --- CONFIG --- */
var FHD_BASE = 'https://www.fullhdfilmizlesene.live';
var FHD_HEADERS = {
    'User-Agent': 'okhttp/4.12.0',
    'Accept-Language': 'tr-TR,tr;q=0.9'
};

/* --- DECODER HELPERS --- */
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
    } catch (e) { return null; }
}

/* --- MAIN SOLVER --- */
function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
    return new Promise(function(resolve) {
        var tmdbType = mediaType === 'movie' ? 'movie' : 'tv';
        var tmdbUrl = 'https://api.themoviedb.org/3/' + tmdbType + '/' + tmdbId +
            '?language=tr-TR&api_key=4ef0d7355d9ffb5151e987764708ce96';

        console.log('[FHD] TMDB Name Fetch:', tmdbId);

        fetch(tmdbUrl)
            .then(function(res) { return res.json(); })
            .then(function(data) {
                var title = data.title || data.name || '';
                if (!title) return resolve([]);

                // .live domaini üzerinden arama
                var searchUrl = FHD_BASE + '/arama/' + encodeURIComponent(title);
                return fetch(searchUrl, { headers: FHD_HEADERS });
            })
            .then(function(res) { return res.text(); })
            .then(function(html) {
                var match = html.match(/href="https?:\/\/www\.fullhdfilmizlesene\.live\/film\/([^"']+)"/);
                if (!match) return resolve([]);
                
                return fetchDetailAndSolve(match[1], mediaType);
            })
            .then(function(streams) {
                resolve(streams || []);
            })
            .catch(function(err) {
                console.error('[FHD] Error:', err.message);
                resolve([]);
            });
    });
}

function fetchDetailAndSolve(filmSlug, mediaType) {
    var filmUrl = FHD_BASE + '/film/' + filmSlug + '/';
    
    return fetch(filmUrl, { headers: FHD_HEADERS })
        .then(function(res) { return res.text(); })
        .then(function(html) {
            var vidIdMatch = html.match(/vidid\s*=\s*['"]([^'"]+)['"]/);
            if (!vidIdMatch) return [];
            var vidId = vidIdMatch[1];

            // Her iki kaynağı da çözmek için Promise.all kullanıyoruz
            var sources = [
                { name: 'atom', label: 'RapidVid' },
                { name: 'advid', label: 'Turbo' }
            ];

            return Promise.all(sources.map(function(src) {
                var api = FHD_BASE + '/player/api.php?id=' + vidId + '&type=t&name=' + src.name + '&get=video&format=json';
                
                return fetch(api, { headers: FHD_HEADERS })
                    .then(function(r) { return r.text(); })
                    .then(function(t) {
                        var data = JSON.parse(t.replace(/\\/g, ''));
                        if (!data.html) return null;

                        if (src.name === 'atom') {
                            // RapidVid Çözümü
                            return fetch(data.html, { headers: FHD_HEADERS })
                                .then(function(h) { return h.text(); })
                                .then(function(atomHtml) {
                                    var av = atomHtml.match(/av\(['"]([^'"]+)['"]\)/);
                                    if (av) {
                                        var url = decodeRapidLink(av[1]);
                                        return { name: 'FHD - ' + src.label, url: url, headers: { 'Referer': 'https://rapidvid.net/' } };
                                    }
                                    return null;
                                });
                        } else {
                            // Turbo Çözümü
                            var slug = data.html.match(/\/watch\/([^"']+)/);
                            if (slug) {
                                return fetch('https://turbo.imgz.me/play/' + slug[1], { headers: { 'Referer': FHD_BASE } })
                                    .then(function(h) { return h.text(); })
                                    .then(function(turboHtml) {
                                        var m3u = turboHtml.match(/file:\s*"(https?[^"]+)"/);
                                        return m3u ? { name: 'FHD - ' + src.label, url: m3u[1], headers: { 'Referer': 'https://turbo.imgz.me/' } } : null;
                                    });
                            }
                        }
                    }).catch(function() { return null; });
            }));
        })
        .then(function(results) {
            return results.filter(Boolean).map(function(s) {
                return {
                    name: s.name,
                    title: filmSlug,
                    url: s.url,
                    quality: '1080p',
                    headers: Object.assign({}, FHD_HEADERS, s.headers),
                    provider: 'fhd'
                };
            });
        });
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { getStreams };
} else {
    global.getStreams = getStreams;
}
