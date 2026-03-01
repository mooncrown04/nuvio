/**
 * FullHDFilmizlesene - Gelişmiş Çözücü
 * Hem linkleri listeler hem de şifreli kaynakları (Atom/Rapid) oynatılabilir yapar.
 */

var BASE_URL = 'https://www.fullhdfilmizlesene.live';

var HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7',
    'Referer': BASE_URL + '/'
};

// ==================== YARDIMCI ÇÖZÜCÜLER ====================

function atobFixed(str) {
    try {
        return (typeof Buffer !== 'undefined') ? Buffer.from(str, 'base64').toString('utf-8') : atob(str);
    } catch (e) { return null; }
}

function rot13Fixed(str) {
    if (!str) return null;
    return str.replace(/[a-zA-Z]/g, function(c) {
        return String.fromCharCode((c <= "Z" ? 90 : 122) >= (c = c.charCodeAt(0) + 13) ? c : c - 26);
    });
}

// Kotlin dosyasındaki hex temizleme mantığı (Oynatma hatasını çözen kısım)
function cleanHex(hex) {
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
            return searchFullHD(data.title);
        })
        .then(function(results) {
            var best = results[0];
            return best ? fetchDetailAndStreams(best.url) : [];
        });
}

function searchFullHD(title) {
    return fetch(BASE_URL + '/arama/' + encodeURIComponent(title), { headers: HEADERS })
        .then(function(res) { return res.text(); })
        .then(function(html) {
            var results = [];
            var regex = /<li[^>]*class=["']film["'][^>]*>[\s\S]*?<a[^>]+href=["']([^"']+)["']/gi;
            var match;
            while ((match = regex.exec(html)) !== null) {
                results.push({ url: match[1].startsWith('http') ? match[1] : BASE_URL + match[1] });
            }
            return results;
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

            // Senin çalışan link toplama döngün
            Object.keys(scx).forEach(function(key) {
                if (scx[key].sx && scx[key].sx.t) {
                    var links = Array.isArray(scx[key].sx.t) ? scx[key].sx.t : Object.values(scx[key].sx.t);
                    
                    links.forEach(function(enc) {
                        var decoded = atobFixed(rot13Fixed(enc));
                        if (!decoded) return;

                        // Link bir iframe ise (Atom/Rapid/Vidmoxy), içine girip asıl videoyu çekiyoruz
                        if (decoded.includes('atom') || decoded.includes('rapidvid') || decoded.includes('vidmoxy')) {
                            allPromises.push(
                                fetch(decoded, { headers: { 'Referer': movieUrl } })
                                    .then(function(r) { return r.text(); })
                                    .then(function(iframeHtml) {
                                        var hexMatch = iframeHtml.match(/file["']:\s*["']([^"']+)["']/);
                                        if (hexMatch) {
                                            var finalUrl = cleanHex(hexMatch[1]);
                                            return {
                                                name: '⌜ FHD ⌟ ' + key.toUpperCase(),
                                                url: finalUrl,
                                                type: 'VIDEO',
                                                headers: { 'Referer': decoded, 'User-Agent': HEADERS['User-Agent'] }
                                            };
                                        }
                                        return null;
                                    }).catch(function() { return null; })
                            );
                        } else {
                            // Doğrudan çalışan kaynaklar (Proton, Fast)
                            allPromises.push(Promise.resolve({
                                name: '⌜ FHD ⌟ ' + key.toUpperCase(),
                                url: decoded,
                                type: decoded.includes('m3u8') ? 'M3U8' : 'VIDEO',
                                headers: { 'Referer': movieUrl }
                            }));
                        }
                    });
                }
            });
            return Promise.all(allPromises);
        })
        .then(function(results) {
            // Null olanları temizle ve listeyi döndür
            return results.filter(function(r) { return r !== null; });
        });
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { getStreams };
}
