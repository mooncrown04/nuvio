// ! Bu araç @keyiflerolsun tarafından | @KekikAkademi için yazılmıştır.
var BASE_URL = 'https://www.fullhdfilmizlesene.live';

var HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Referer': BASE_URL + '/'
};

// Player (Oynatıcı) için kritik başlıklar
var STREAM_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    'Referer': BASE_URL + '/',
    'Origin': BASE_URL,
    'Accept-Encoding': 'identity'
};

// ==================== YARDIMCI FONKSİYONLAR ====================

function atobFixed(str) {
    try { return atob(str.replace(/\s/g, '')); } catch (e) { return null; }
}

function rot13Fixed(str) {
    if (!str) return null;
    return str.replace(/[a-zA-Z]/g, function(c) {
        return String.fromCharCode((c <= "Z" ? 90 : 122) >= (c = c.charCodeAt(0) + 13) ? c : c - 26);
    });
}

function decodeLinkFixed(encoded) {
    try {
        var decoded = atobFixed(rot13Fixed(encoded));
        return (decoded && decoded.startsWith('http')) ? decoded : null;
    } catch (e) { return null; }
}

// ==================== ANA MANTIK ====================

function fetchDetailAndStreams(filmUrl) {
    return fetch(filmUrl, { headers: HEADERS })
        .then(function(res) { return res.text(); })
        .then(function(html) {
            var titleMatch = html.match(/<h1[^>]*>([^<]+)<\/h1>/i);
            var title = titleMatch ? titleMatch[1].trim() : 'Film';
            
            var scxMatch = html.match(/scx\s*=\s*(\{[\s\S]*?\});/);
            if (!scxMatch) return [];

            var scxData = JSON.parse(scxMatch[1]);
            var allStreams = [];
            // CloudStream'deki tüm kaynaklar
            var keys = ["atom", "advid", "proton", "fast", "tr", "en"];

            keys.forEach(function(key) {
                if (!scxData[key] || !scxData[key].sx || !scxData[key].sx.t) return;
                var t = scxData[key].sx.t;
                
                var items = Array.isArray(t) ? t.map(function(v, i) { return { val: v, label: key.toUpperCase() + ' #' + (i+1) }; }) 
                                           : Object.keys(t).map(function(k) { return { val: t[k], label: key.toUpperCase() + ' ' + k }; });

                items.forEach(function(item) {
                    var decoded = decodeLinkFixed(item.val);
                    if (!decoded) return;

                    // M3U8 Kontrolü (Senin örneğindeki gibi)
                    var isHls = decoded.includes('.m3u8') || ["proton", "fast", "atom"].indexOf(key) > -1;

                    allStreams.push({
                        name: '⌜ FHD ⌟ | ' + item.label,
                        title: title,
                        url: decoded,
                        quality: '1080p',
                        // ÖNEMLİ: Nuvio oynatıcısı bu headerlar olmadan 3003 hatası verir
                        headers: STREAM_HEADERS,
                        is_direct: true,
                        streamType: isHls ? 'hls' : 'video',
                        mimeType: isHls ? 'application/x-mpegURL' : 'video/mp4'
                    });
                });
            });

            return allStreams;
        });
}

function getStreams(tmdbId, mediaType) {
    if (mediaType !== 'movie') return Promise.resolve([]);
    
    var tmdbUrl = 'https://api.themoviedb.org/3/movie/' + tmdbId + '?language=tr-TR&api_key=4ef0d7355d9ffb5151e987764708ce96';
    
    return fetch(tmdbUrl)
        .then(function(res) { return res.json(); })
        .then(function(data) {
            var searchUrl = BASE_URL + '/arama/' + encodeURIComponent(data.title);
            return fetch(searchUrl, { headers: HEADERS });
        })
        .then(function(res) { return res.text(); })
        .then(function(html) {
            var match = html.match(/<li class="film">[\s\S]*?<a href="([^"]+)"/);
            if (!match) return [];
            var filmUrl = match[1].startsWith('http') ? match[1] : BASE_URL + match[1];
            return fetchDetailAndStreams(filmUrl);
        })
        .catch(function() { return []; });
}

if (typeof module !== 'undefined') module.exports = { getStreams };
