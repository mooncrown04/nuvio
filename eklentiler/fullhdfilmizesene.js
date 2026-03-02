// ! Bu araç @keyiflerolsun tarafından | @KekikAkademi için yazılmıştır.
// FullHDFilmizlesene - H.264/AVC Uyumlu (Nuvio/ExoPlayer için)

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

// ==================== ANA MANTIK (SADECE PROTON - H.264 UYUMLU) ====================

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
            
            // SADECE PROTON - H.264/AVC formatı için optimize
            if (scxData.proton && scxData.proton.sx && scxData.proton.sx.t) {
                var t = scxData.proton.sx.t;
                var items = [];
                
                if (Array.isArray(t)) {
                    items = t.map(function(v, i) { 
                        return { encoded: v, label: 'PROTON #' + (i+1) }; 
                    });
                } else if (typeof t === 'object') {
                    items = Object.keys(t).map(function(k) { 
                        return { encoded: t[k], label: 'PROTON ' + k }; 
                    });
                }
                
                items.forEach(function(item) {
                    var decoded = decodeLinkFixed(item.encoded);
                    if (!decoded || !decoded.startsWith('http')) return;
                    
                    // URL'den formatı belirle
                    var isMp4 = decoded.includes('.mp4');
                    var isM3u8 = decoded.includes('.m3u8');
                    
                    // ==================== EXOPLAYER/NUVIO UYUMLU H.264 STREAM ====================
                    streams.push({
                        name: '⌜ FullHD ⌟ | ' + item.label,
                        title: title + (year ? ' (' + year + ')' : '') + ' · 720p',
                        url: decoded,
                        quality: '720p',
                        
                        // H.264/AVC için uygun type ve mimeType
                        type: isM3u8 ? 'hls' : 'video',
                        mimeType: isM3u8 ? 'application/x-mpegURL' : 'video/mp4',
                        container: isM3u8 ? 'm3u8' : 'mp4',
                        
                        // Codec bilgisi (H.264/AVC)
                        codecs: 'avc1.640028', // H.264 High Profile Level 4.0
                        
                        // ExoPlayer için gerekli alanlar
                        drmScheme: null,
                        drmLicenseUrl: null,
                        
                        // Headers
                        headers: { 
                            'User-Agent': HEADERS['User-Agent'], 
                            'Referer': filmUrl, 
                            'Origin': BASE_URL 
                        },
                        
                        provider: 'fullhdfilmizlesene'
                    });
                });
            }
            
            console.log('[FullHD] Proton streams:', streams.length);
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
            var regex = /<li[^>]*class=["']film["'][^>]*>[\s\S]*?<a[^>]+href=["']([^"']+)["'][\s\S]*?<span[^>]+class=["']film-title["'][^>]*>([^<]+)<\/span>/gi;
            var m;
            while ((m = regex.exec(html)) !== null) {
                results.push({ 
                    url: m[1].startsWith('http') ? m[1] : BASE_URL + m[1], 
                    title: m[2].trim() 
                });
            }
            return results;
        });
}

function getStreams(tmdbId, mediaType) {
    if (mediaType !== 'movie') return Promise.resolve([]);
    var tmdbUrl = 'https://api.themoviedb.org/3/movie/' + tmdbId + '?language=tr-TR&api_key=4ef0d7355d9ffb5151e987764708ce96';
    
    return fetch(tmdbUrl)
        .then(function(res) { return res.json(); })
        .then(function(data) {
            return searchFullHD(data.title);
        })
        .then(function(results) {
            if (!results || results.length === 0) return [];
            return fetchDetailAndStreams(results[0].url);
        })
        .catch(function() { return []; });
}

if (typeof module !== 'undefined') module.exports = { getStreams };
