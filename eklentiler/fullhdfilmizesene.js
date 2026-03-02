// ! Bu araç @keyiflerolsun tarafından | @KekikAkademi için yazılmıştır.
var BASE_URL = 'https://www.fullhdfilmizlesene.live';

var HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Referer': BASE_URL + '/'
};

// Player'ın videoyu çekebilmesi için gereken headerlar
var STREAM_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    'Referer': BASE_URL + '/',
    'Origin': BASE_URL
};

// --- Şifre Çözücü Yardımcılar ---

// Cloudstream'deki 'atob' karşılığı (Daha güvenli versiyon)
function decodeBase64(str) {
    if (!str) return null;
    try {
        return decodeURIComponent(escape(atob(str.replace(/\s/g, ''))));
    } catch (e) {
        try { return atob(str); } catch (e2) { return null; }
    }
}

// Cloudstream'deki 'rtt' (ROT13) karşılığı
function rot13(str) {
    return str.replace(/[a-zA-Z]/g, function(c) {
        return String.fromCharCode((c <= "Z" ? 90 : 122) >= (c = c.charCodeAt(0) + 13) ? c : c - 26);
    });
}

// --- Ana Fonksiyonlar ---

function fetchDetailAndStreams(filmUrl) {
    return fetch(filmUrl, { headers: HEADERS })
        .then(function(res) { return res.text(); })
        .then(function(html) {
            var titleMatch = html.match(/<h1[^>]*>([^<]+)<\/h1>/i);
            var title = titleMatch ? titleMatch[1].trim() : 'Film';
            
            // scx verisini yakala
            var scxMatch = html.match(/scx\s*=\s*(\{[\s\S]*?\});/);
            if (!scxMatch) return [];

            var scxData = JSON.parse(scxMatch[1]);
            var streams = [];
            // Cloudstream'deki anahtarlar
            var keys = ["atom", "advid", "advidprox", "proton", "fast", "fastly", "tr", "en"];

            keys.forEach(function(key) {
                if (!scxData[key] || !scxData[key].sx || !scxData[key].sx.t) return;
                var t = scxData[key].sx.t;
                
                var sourceEntries = [];
                if (Array.isArray(t)) {
                    t.forEach(function(val, i) { sourceEntries.push({ val: val, label: key.toUpperCase() + " #" + (i + 1) }); });
                } else if (typeof t === 'object') {
                    Object.keys(t).forEach(function(k) { sourceEntries.push({ val: t[k], label: key.toUpperCase() + " " + k }); });
                }

                sourceEntries.forEach(function(entry) {
                    // Cloudstream mantığı: Önce ROT13 sonra Base64 (veya tam tersi)
                    // Genelde site rot13(base64) kullanır
                    var decodedUrl = decodeBase64(rot13(entry.val));
                    
                    if (!decodedUrl || decodedUrl.indexOf('http') !== 0) {
                        // Tersini dene: base64(rot13)
                        decodedUrl = rot13(decodeBase64(entry.val) || "");
                    }

                    if (!decodedUrl || decodedUrl.indexOf('http') !== 0) return;

                    // Oynatıcı Hatasını (3003) Çözen Kısım:
                    var isHls = decodedUrl.includes('.m3u8') || ["proton", "fast", "atom", "fastly"].indexOf(key) > -1;

                    streams.push({
                        name: '⌜ FHD ⌟ | ' + entry.label,
                        title: title,
                        url: decodedUrl,
                        quality: '1080p',
                        headers: STREAM_HEADERS,
                        is_direct: true, // Nuvio için doğrudan link olduğunu belirtir
                        streamType: isHls ? 'hls' : 'video', 
                        mimeType: isHls ? 'application/x-mpegURL' : 'video/mp4'
                    });
                });
            });

            return streams;
        });
}

function getStreams(tmdbId, mediaType) {
    if (mediaType !== 'movie') return Promise.resolve([]);
    
    // TMDB Bilgilerini Al
    var tmdbUrl = 'https://api.themoviedb.org/3/movie/' + tmdbId + '?language=tr-TR&api_key=4ef0d7355d9ffb5151e987764708ce96';
    
    return fetch(tmdbUrl)
        .then(function(res) { return res.json(); })
        .then(function(data) {
            var query = data.title || data.original_title;
            return fetch(BASE_URL + '/arama/' + encodeURIComponent(query), { headers: HEADERS });
        })
        .then(function(res) { return res.text(); })
        .then(function(html) {
            // İlk arama sonucunu al
            var match = html.match(/<li class="film">[\s\S]*?<a href="([^"]+)"/);
            if (!match) return [];
            
            var filmUrl = match[1];
            if (!filmUrl.startsWith('http')) filmUrl = BASE_URL + filmUrl;
            
            return fetchDetailAndStreams(filmUrl);
        })
        .catch(function(err) {
            console.log("Hata:", err);
            return [];
        });
}

if (typeof module !== 'undefined') module.exports = { getStreams };
