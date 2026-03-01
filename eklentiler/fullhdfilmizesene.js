/**
 * FullHDFilmizlesene Extractor - Modern Asenkron Yapı
 * SineWix ve Kuudere örneklerinden esinlenilmiştir.
 */

var BASE_URL = 'https://www.fullhdfilmizlesene.live';

// SineWix'ten gelen, 3003 (Sniff) hatasını aşan en kararlı header seti
var STREAM_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    'Accept': 'video/webm,video/ogg,video/*;q=0.9,application/ogg;q=0.7,audio/*;q=0.6,*/*;q=0.5',
    'Accept-Encoding': 'identity',
    'Connection': 'keep-alive',
    'Sec-Fetch-Dest': 'video',
    'Sec-Fetch-Mode': 'no-cors',
    'Sec-Fetch-Site': 'cross-site'
};

// ==================== EXTRACTORS (KUUDERE MANTIĞI) ====================

// Atom ve RapidVid linklerini çözen fonksiyon (Kotlin'deki rapid2m3u8'in JS karşılığı)
function extractAtomSource(embedUrl, pageUrl) {
    return fetch(embedUrl, { headers: { 'Referer': pageUrl } })
        .then(function(res) { return res.text(); })
        .then(function(html) {
            // Hex kodlu video adresini yakala
            var fileMatch = html.match(/file["']:\s*["']([^"']+)["']/);
            if (!fileMatch) return null;
            
            // Hex -> String dönüşümü (Kotlin'deki temizlik mantığı)
            var raw = fileMatch[1].replace(/\\\\x/g, '').replace(/\\x/g, '');
            var decoded = '';
            for (var i = 0; i < raw.length; i += 2) {
                decoded += String.fromCharCode(parseInt(raw.substr(i, 2), 16));
             dec
            return decoded.replace(/\\/g, '').replace(/["']/g, "").trim();
        }).catch(function() { return null; });
}

// ==================== ANA MOTOR (SINEWIX MANTIĞI) ====================

function getStreams(tmdbId, mediaType) {
    return new Promise(function(resolve) {
        if (mediaType !== 'movie') return resolve([]);

        var tmdbUrl = 'https://api.themoviedb.org/3/movie/' + tmdbId + '?language=tr-TR&api_key=4ef0d7355d9ffb5151e987764708ce96';

        fetch(tmdbUrl).then(function(res) { return res.json(); }).then(function(data) {
            return fetch(BASE_URL + '/arama/' + encodeURIComponent(data.title));
        }).then(function(res) { return res.text(); }).then(function(searchHtml) {
            // Arama sonucundan filmi bul
            var filmMatch = searchHtml.match(/<li[^>]*class=["']film["'][^>]*>[\s\S]*?<a[^>]+href=["']([^"']+)["']/i);
            if (!filmMatch) return resolve([]);
            
            var filmUrl = filmMatch[1].startsWith('http') ? filmMatch[1] : BASE_URL + filmMatch[1];
            return fetch(filmUrl).then(function(res) { 
                return res.text().then(function(html) { return { html: html, url: filmUrl }; });
            });
        }).then(function(detail) {
            // SCX değişkenini yakala (Sitedeki tüm kaynaklar burada gizli)
            var scxMatch = detail.html.match(/scx\s*=\s*(\{[\s\S]*?\});/);
            if (!scxMatch) return resolve([]);
            
            var scx = JSON.parse(scxMatch[1]);
            var keys = ['atom', 'advid', 'proton', 'fast', 'tr', 'en'];
            var streamPromises = [];

            keys.forEach(function(key) {
                if (!scx[key] || !scx[key].sx || !scx[key].sx.t) return;
                var t = scx[key].sx.t;
                var links = Array.isArray(t) ? t : Object.values(t);

                links.forEach(function(enc, index) {
                    // ROT13 + Base64 Çözümü (Site standardı)
                    var decoded = atob(enc.replace(/[a-zA-Z]/g, function(c){
                        return String.fromCharCode((c<="Z"?90:122)>=(c=c.charCodeAt(0)+13)?c:c-26);
                    }));

                    if (!decoded) return;

                    // Eğer Atom/Rapid gibi bir "ara sayfa" ise içine girip gerçek linki çek
                    if (decoded.includes('atom') || decoded.includes('rapidvid') || decoded.includes('vidmoxy')) {
                        streamPromises.push(
                            extractAtomSource(decoded, detail.url).then(function(realVideoUrl) {
                                if (!realVideoUrl) return null;
                                return {
                                    name: '⌜ FHD ⌟ ' + key.toUpperCase() + ' #' + (index + 1),
                                    url: realVideoUrl,
                                    type: realVideoUrl.includes('.m3u8') ? 'M3U8' : 'VIDEO',
                                    headers: Object.assign({}, STREAM_HEADERS, { 'Referer': decoded }) // Sniff hatası için kritik
                                };
                            })
                        );
                    } else {
                        // Doğrudan link ise (Proton, Fast vb.)
                        streamPromises.push(Promise.resolve({
                            name: '⌜ FHD ⌟ ' + key.toUpperCase() + ' #' + (index + 1),
                            url: decoded,
                            type: decoded.includes('.m3u8') ? 'M3U8' : 'VIDEO',
                            headers: Object.assign({}, STREAM_HEADERS, { 'Referer': detail.url })
                        }));
                    }
                });
            });

            return Promise.all(streamPromises);
        }).then(function(results) {
            resolve(results.filter(function(x) { return x !== null; }));
        }).catch(function() { resolve([]); });
    });
}
