/**
 * FullHDFilmizlesene - Sniff (3003) ve Malformed (1004) Çözümlü
 */

var BASE_URL = 'https://www.fullhdfilmizlesene.live';

// Player'ın engellenmemesi için gereken headerlar
var HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    'Accept': '*/*',
    'Accept-Language': 'tr-TR,tr;q=0.9',
    'X-Requested-With': 'XMLHttpRequest'
};

// ==================== YARDIMCI ARAÇLAR ====================

function atobFixed(str) {
    try { return (typeof Buffer !== 'undefined') ? Buffer.from(str, 'base64').toString('utf-8') : atob(str); } catch (e) { return null; }
}

function rot13Fixed(str) {
    if (!str) return null;
    return str.replace(/[a-zA-Z]/g, function(c) {
        return String.fromCharCode((c <= "Z" ? 90 : 122) >= (c = c.charCodeAt(0) + 13) ? c : c - 26);
    });
}

// 1004 HATASINI ÇÖZEN HEX DECODER
function decodeHexVideo(hex) {
    try {
        var raw = hex.replace(/\\\\x/g, '').replace(/\\x/g, '');
        var res = '';
        for (var i = 0; i < raw.length; i += 2) {
            res += String.fromCharCode(parseInt(raw.substr(i, 2), 16));
        }
        return res.replace(/\\/g, '').replace(/["']/g, "").trim();
    } catch (e) { return null; }
}

// ==================== ANA MOTOR ====================

function getStreams(tmdbId, mediaType) {
    if (mediaType !== 'movie') return Promise.resolve([]);
    
    var tmdbUrl = 'https://api.themoviedb.org/3/movie/' + tmdbId + '?language=tr-TR&api_key=4ef0d7355d9ffb5151e987764708ce96';
    
    return fetch(tmdbUrl)
        .then(function(res) { return res.json(); })
        .then(function(data) {
            return fetch(BASE_URL + '/arama/' + encodeURIComponent(data.title), { headers: HEADERS });
        })
        .then(function(res) { return res.text(); })
        .then(function(html) {
            var match = html.match(/<li[^>]*class=["']film["'][^>]*>[\s\S]*?<a[^>]+href=["']([^"']+)["']/i);
            if (!match) return [];
            var movieUrl = match[1].startsWith('http') ? match[1] : BASE_URL + match[1];
            return fetchDetailAndStreams(movieUrl);
        });
}

function fetchDetailAndStreams(movieUrl) {
    return fetch(movieUrl, { headers: HEADERS })
        .then(function(res) { return res.text(); })
        .then(function(html) {
            var scxMatch = html.match(/scx\s*=\s*(\{[\s\S]*?\});/);
            if (!scxMatch) return [];

            var scx = JSON.parse(scxMatch[1]);
            var allPromises = [];

            Object.keys(scx).forEach(function(key) {
                if (scx[key].sx && scx[key].sx.t) {
                    var links = Array.isArray(scx[key].sx.t) ? scx[key].sx.t : Object.values(scx[key].sx.t);
                    
                    links.forEach(function(enc) {
                        var embedUrl = atobFixed(rot13Fixed(enc));
                        if (!embedUrl) return;

                        // 3003 ve 1004 HATALARINI ÇÖZEN ASIL KISIM
                        // Sayfa linkini alıp içinden gerçek videoyu çekiyoruz
                        if (embedUrl.includes('atom') || embedUrl.includes('rapidvid') || embedUrl.includes('vidmoxy') || embedUrl.includes('proton')) {
                            allPromises.push(
                                fetch(embedUrl, { headers: { 'Referer': movieUrl, 'User-Agent': HEADERS['User-Agent'] } })
                                    .then(function(r) { return r.text(); })
                                    .then(function(iframeHtml) {
                                        var hexMatch = iframeHtml.match(/file["']:\s*["']([^"']+)["']/);
                                        if (hexMatch) {
                                            var finalVideoUrl = decodeHexVideo(hexMatch[1]);
                                            return {
                                                name: '⌜ FHD ⌟ ' + key.toUpperCase(),
                                                url: finalVideoUrl,
                                                type: 'VIDEO',
                                                headers: { 
                                                    'Referer': embedUrl, // Referer burada embedUrl olmalı!
                                                    'User-Agent': HEADERS['User-Agent'],
                                                    'Origin': BASE_URL
                                                }
                                            };
                                        }
                                        // Eğer hex yoksa ama direkt m3u8 varsa
                                        var m3u8Match = iframeHtml.match(/["'](http[^"']+\.m3u8[^"']*)["']/);
                                        if (m3u8Match) {
                                            return {
                                                name: '⌜ FHD ⌟ ' + key.toUpperCase(),
                                                url: m3u8Match[1],
                                                type: 'M3U8',
                                                headers: { 'Referer': embedUrl }
                                            };
                                        }
                                        return null;
                                    }).catch(function() { return null; })
                            );
                        } else {
                            // Diğer doğrudan linkler
                            allPromises.push(Promise.resolve({
                                name: '⌜ FHD ⌟ ' + key.toUpperCase(),
                                url: embedUrl,
                                type: embedUrl.includes('m3u8') ? 'M3U8' : 'VIDEO',
                                headers: { 'Referer': movieUrl }
                            }));
                        }
                    });
                }
            });
            return Promise.all(allPromises);
        })
        .then(function(results) {
            return results.filter(function(r) { return r !== null; });
        });
}

module.exports = { getStreams };
