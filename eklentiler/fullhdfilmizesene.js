// ! Bu araç @keyiflerolsun tarafından | @KekikAkademi için yazılmıştır.
// FullHDFilmizlesene - Sadece Direkt Linkler (Proton/Fast/Tr/En) + Nuvio Uyumlu

var BASE_URL = 'https://www.fullhdfilmizlesene.live';

var HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7',
    'Referer': BASE_URL + '/'
};

// ==================== YARDIMCI FONKSİYONLAR ====================

function atobFixed(str) {
    try {
        if (typeof Buffer !== 'undefined') {
            return Buffer.from(str, 'base64').toString('utf-8');
        }
        return window.atob(str);
    } catch (e) {
        return null;
    }
}

function rot13Fixed(str) {
    if (!str) return null;
    return str.replace(/[a-zA-Z]/g, function(char) {
        var code = char.charCodeAt(0);
        var base = code < 97 ? 65 : 97;
        return String.fromCharCode(((code - base + 13) % 26) + base);
    });
}

function decodeLinkFixed(encoded) {
    try {
        var result = atobFixed(rot13Fixed(encoded));
        return (result && result.startsWith('http')) ? result : null;
    } catch (e) {
        return null;
    }
}

// ==================== ANA MANTIK - SADECE DİREKT LİNKLER ====================

function fetchDetailAndStreams(filmUrl) {
    return fetch(filmUrl, { headers: HEADERS })
        .then(function(res) { return res.text(); })
        .then(function(html) {
            var title = (html.match(/<h1[^>]*>([^<]+)<\/h1>/i) || [null, 'FullHD'])[1].trim();
            var year = (html.match(/(\d{4})/) || [null, null])[1];
            var scxMatch = html.match(/scx\s*=\s*(\{[\s\S]*?\});/);
            if (!scxMatch) return [];

            var scxData = JSON.parse(scxMatch[1]);
            var streams = [];
            
            // SADECE DİREKT ÇALIŞAN KAYNAKLAR (Proton, Fast, Tr, En)
            // Atom, Advid, RapidVid vb. şifreli kaynaklar HARİÇ!
            var directKeys = ['proton', 'fast', 'fastly', 'tr', 'en'];
            
            directKeys.forEach(function(key) {
                var sourceData = scxData[key];
                if (!sourceData || !sourceData.sx || !sourceData.sx.t) return;
                
                var t = sourceData.sx.t;
                var items = [];

                if (Array.isArray(t)) {
                    items = t.map(function(v, i) { 
                        return { encoded: v, label: key.toUpperCase() + ' #' + (i+1) }; 
                    });
                } else if (typeof t === 'object') {
                    items = Object.keys(t).map(function(k) { 
                        return { encoded: t[k], label: key.toUpperCase() + ' ' + k }; 
                    });
                }

                items.forEach(function(item) {
                    var decoded = decodeLinkFixed(item.encoded);
                    if (!decoded || !decoded.startsWith('http')) return;
                    
                    // Sadece direkt M3U8 veya MP4
                    var isM3u8 = decoded.includes('.m3u8');
                    var isMp4 = decoded.includes('.mp4');
                    
                    if (!isM3u8 && !isMp4) return; // Diğer formatları atla
                    
                    // ==================== NUVIO UYUMLU STREAM ====================
                    streams.push({
                        name: '⌜ FullHD ⌟ | ' + item.label,
                        title: title + (year ? ' (' + year + ')' : '') + ' · ' + (isM3u8 ? 'M3U8' : 'MP4'),
                        url: decoded,
                        quality: '720p',
                        
                        // Nuvio/ExoPlayer için kritik alanlar
                        type: isM3u8 ? 'hls' : 'video',
                        format: isM3u8 ? 'hls' : 'mp4',
                        
                        // Headers - sadece gerekli olanlar
                        headers: {
                            'User-Agent': HEADERS['User-Agent'],
                            'Referer': filmUrl,
                            'Origin': BASE_URL
                        },
                        
                        provider: 'fullhdfilmizlesene'
                    });
                });
            });

            console.log('[FullHD] Direkt streams:', streams.length);
            return streams;
        })
        .catch(function(err) {
            console.error('[FullHD] Error:', err.message);
            return [];
        });
}

function searchFullHD(title) {
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
            var best = results[0];
            return best ? fetchDetailAndStreams(best.url) : [];
        });
    });
}

if (typeof module !== 'undefined') module.exports = { getStreams };
