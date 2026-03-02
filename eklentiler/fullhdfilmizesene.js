// ! Bu araç @keyiflerolsun tarafından | @KekikAkademi için yazılmıştır.
var BASE_URL = 'https://www.fullhdfilmizlesene.live';

// Arama ve sayfa çekme için kullanılan standart başlıklar
var HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'tr-TR,tr;q=0.9',
    'Referer': BASE_URL + '/'
};

// Player'ın 1004 hatası almaması için kullanılan özel başlıklar (Dizipal'den alındı)
var STREAM_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'video/webm,video/ogg,video/*;q=0.9,application/ogg;q=0.7,audio/*;q=0.6,*/*;q=0.5',
    'Accept-Language': 'tr-TR,tr;q=0.9',
    'Accept-Encoding': 'identity',
    'Origin': BASE_URL,
    'Referer': BASE_URL + '/',
    'Sec-Fetch-Dest': 'video',
    'Sec-Fetch-Mode': 'no-cors',
    'Sec-Fetch-Site': 'cross-site'
};

// ==================== YARDIMCI FONKSİYONLAR (DEĞİŞMEDİ) ====================
function atobFixed(str) { try { return typeof Buffer !== 'undefined' ? Buffer.from(str, 'base64').toString('utf-8') : window.atob(str); } catch (e) { return null; } }
function rot13Fixed(str) { if (!str) return null; return str.replace(/[a-zA-Z]/g, function(char) { var code = char.charCodeAt(0); var base = code < 97 ? 65 : 97; return String.fromCharCode(((code - base + 13) % 26) + base); }); }
function decodeLinkFixed(encoded) { try { var result = atobFixed(rot13Fixed(encoded)); return (result && result.startsWith('http')) ? result : null; } catch (e) { return null; } }
function hexDecodeFixed(hexString) { if (!hexString) return null; try { var bytes = []; if (hexString.includes('\\x')) { var parts = hexString.split('\\x'); for (var i = 1; i < parts.length; i++) bytes.push(parseInt(parts[i].substring(0, 2), 16)); } else { for (var j = 0; j < hexString.length; j += 2) bytes.push(parseInt(hexString.substring(j, j + 2), 16)); } return String.fromCharCode.apply(null, bytes); } catch (e) { return null; } }

// ==================== EXTRACTOR'LAR ====================
function extractVideoUrl(url, sourceKey, referer) {
    var isHls = url.includes('.m3u8') || sourceKey === 'proton' || sourceKey === 'fast';
    return Promise.resolve([{ url: url, quality: 'HD', type: isHls ? 'hls' : 'video' }]);
}

// ==================== ANA MANTIK ====================
function fetchDetailAndStreams(filmUrl) {
    return fetch(filmUrl, { headers: HEADERS })
        .then(function(res) { return res.text(); })
        .then(function(html) {
            var titleMatch = html.match(/<h1[^>]*>([^<]+)<\/h1>/i);
            var title = titleMatch ? titleMatch[1].trim() : 'FullHD';
            var yearMatch = html.match(/(\d{4})/);
            var year = yearMatch ? yearMatch[1] : '';
            
            var scxMatch = html.match(/scx\s*=\s*(\{[\s\S]*?\});/);
            if (!scxMatch) return [];

            var scxData = JSON.parse(scxMatch[1]);
            var allPromises = [];
            
            // Kaynak önceliği
            var keys = ['proton', 'fast', 'tr', 'en', 'atom', 'advid'];

            keys.forEach(function(key) {
                var sourceData = scxData[key];
                if (!sourceData || !sourceData.sx || !sourceData.sx.t) return;
                var t = sourceData.sx.t;

                var items = Array.isArray(t) ? t.map(function(v, i) { return { encoded: v, label: key.toUpperCase() + (t.length > 1 ? ' #' + (i+1) : '') }; }) 
                                           : Object.keys(t).map(function(k) { return { encoded: t[k], label: key.toUpperCase() + ' ' + k }; });

                items.forEach(function(item) {
                    var decoded = decodeLinkFixed(item.encoded);
                    if (!decoded) return;

                    allPromises.push(extractVideoUrl(decoded, key, filmUrl).then(function(results) {
                        return results.map(function(r) {
                            return {
                                name: '⌜ FullHD ⌟ | ' + item.label,
                                title: title + (year ? ' (' + year + ')' : '') + ' · ' + r.quality,
                                url: r.url,
                                quality: r.quality,
                                headers: STREAM_HEADERS, // Player için Dizipal başlıkları
                                is_direct: true,
                                type: r.type,
                                hw_decode: false, // MediaTek Siyah Ekran Fix
                                force_sw: true,
                                android_config: {
                                    "is_hls": r.type === 'hls',
                                    "force_software": true
                                }
                            };
                        });
                    }));
                });
            });

            return Promise.all(allPromises);
        })
        .then(function(results) { 
            var streams = [];
            results.forEach(function(r) { if (Array.isArray(r)) streams = streams.concat(r); });
            return streams.filter(function(s) { return s && s.url; });
        });
}

function searchFullHD(title) {
    // Arama kısmında standart HEADERS kullanıyoruz ki linkleri bulabilsin
    return fetch(BASE_URL + '/arama/' + encodeURIComponent(title), { headers: HEADERS })
        .then(function(res) { return res.text(); })
        .then(function(html) {
            var results = [];
            var regex = /<li[^>]*class=["']film["'][^>]*>[\s\S]*?<a[^>]+href=["']([^"']+)["'][\s\S]*?<span[^>]+>([^<]+)<\/span>/gi;
            var m;
            while ((m = regex.exec(html)) !== null) {
                results.push({ url: m[1].startsWith('http') ? m[1] : BASE_URL + m[1], title: m[2].trim() });
            }
            return results;
        });
}

function getStreams(tmdbId, mediaType) {
    if (mediaType !== 'movie') return Promise.resolve([]);
    var tmdbUrl = 'https://api.themoviedb.org/3/movie/' + tmdbId + '?language=tr-TR&api_key=4ef0d7355d9ffb5151e987764708ce96';
    
    return fetch(tmdbUrl).then(function(res) { return res.json(); }).then(function(data) {
        return searchFullHD(data.title).then(function(results) {
            if (!results || results.length === 0) return [];
            return fetchDetailAndStreams(results[0].url);
        });
    });
}

if (typeof module !== 'undefined') module.exports = { getStreams };
