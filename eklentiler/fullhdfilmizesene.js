// ! Bu araç @keyiflerolsun tarafından | @KekikAkademi için yazılmıştır.
var BASE_URL = 'https://www.fullhdfilmizlesene.live';

var HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': '*/*',
    'Referer': BASE_URL + '/'
};

// Player için gerekli kimlik bilgileri
var STREAM_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    'Referer': BASE_URL + '/',
    'Origin': BASE_URL,
    'Accept-Encoding': 'identity'
};

// --- Şifre Çözücüler (CloudStream'deki atob ve rtt karşılığı) ---
function atobFixed(str) {
    try { return decodeURIComponent(escape(atob(str.replace(/\s/g, '')))); } catch (e) { return null; }
}

function rot13(str) {
    return str.replace(/[a-zA-Z]/g, function(c) {
        return String.fromCharCode((c <= "Z" ? 90 : 122) >= (c = c.charCodeAt(0) + 13) ? c : c - 26);
    });
}

function decodeFullHDLink(encoded) {
    if (!encoded) return null;
    try {
        // CloudStream mantığı: rtt(atob()) veya atob(rtt())
        var decoded = atobFixed(rot13(encoded));
        if (decoded && decoded.indexOf('http') === 0) return decoded;
        return null;
    } catch (e) { return null; }
}

// --- Ana Fonksiyonlar ---
function fetchDetailAndStreams(filmUrl) {
    return fetch(filmUrl, { headers: HEADERS })
        .then(function(res) { return res.text(); })
        .then(function(html) {
            var titleMatch = html.match(/<h1[^>]*>([^<]+)<\/h1>/i);
            var title = titleMatch ? titleMatch[1].trim() : 'Film';
            
            var scxMatch = html.match(/scx\s*=\s*(\{[\s\S]*?\});/);
            if (!scxMatch) return [];

            var scxData = JSON.parse(scxMatch[1]);
            var streams = [];
            // CloudStream'deki tüm keyler
            var keys = ["atom", "advid", "advidprox", "proton", "fast", "fastly", "tr", "en"];

            keys.forEach(function(key) {
                if (!scxData[key] || !scxData[key].sx || !scxData[key].sx.t) return;
                var t = scxData[key].sx.t;
                
                // Veri Liste mi yoksa Obje mi (CloudStream "when (t)" bloğu)
                var sourceEntries = [];
                if (Array.isArray(t)) {
                    t.forEach(function(val, index) { sourceEntries.push({ val: val, label: key.toUpperCase() + " #" + (index + 1) }); });
                } else {
                    Object.keys(t).forEach(function(k) { sourceEntries.push({ val: t[k], label: key.toUpperCase() + " " + k }); });
                }

                sourceEntries.forEach(function(entry) {
                    var decodedUrl = decodeFullHDLink(entry.val);
                    if (!decodedUrl) return;

                    // HLS Kontrolü
                    var isM3u8 = decodedUrl.includes('.m3u8') || key === 'proton' || key === 'fast' || key === 'atom';

                    streams.push({
                        name: '⌜ FHD ⌟ | ' + entry.label,
                        title: title,
                        url: decodedUrl,
                        quality: '1080p',
                        headers: STREAM_HEADERS,
                        is_direct: true,
                        // Player'ın m3u8 olduğunu anlaması için:
                        streamType: isM3u8 ? 'hls' : 'video',
                        mimeType: isM3u8 ? 'application/x-mpegURL' : 'video/mp4'
                    });
                });
            });

            return streams;
        });
}

function getStreams(tmdbId, mediaType) {
    if (mediaType !== 'movie') return Promise.resolve([]);
    
    // TMDB'den isim alıp arama yapma
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
