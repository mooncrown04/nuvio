// ! Bu araç @keyiflerolsun tarafından | @KekikAkademi için yazılmıştır.
var BASE_URL = 'https://www.fullhdfilmizlesene.live';

// Dizipal ve SineWix örneklerinden alınan, dahili player'ın sevdiği header yapısı
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

// ... (atobFixed, rot13Fixed, decodeLinkFixed, hexDecodeFixed fonksiyonları aynı kalacak) ...

function extractVideoUrl(url, sourceKey, referer) {
    if (url.includes('rapidvid.net') || url.includes('vidmoxy.com')) return rapid2m3u8(url, referer);
    if (url.includes('trstx.org')) return trstx2m3u8(url, referer);
    
    // Dahili player'ın M3U8 olduğunu anlaması için tip tanımlama
    var isHls = url.includes('.m3u8') || sourceKey === 'proton';
    return Promise.resolve([{ url: url, quality: 'HD', type: isHls ? 'hls' : 'video' }]);
}

function fetchDetailAndStreams(filmUrl) {
    return fetch(filmUrl, { headers: { 'User-Agent': STREAM_HEADERS['User-Agent'] } })
        .then(function(res) { return res.text(); })
        .then(function(html) {
            var title = (html.match(/<h1[^>]*>([^<]+)<\/h1>/i) || [null, 'FullHD'])[1].trim();
            var year = (html.match(/(\d{4})/) || [null, null])[1];
            var scxMatch = html.match(/scx\s*=\s*(\{[\s\S]*?\});/);
            if (!scxMatch) return [];

            var scxData = JSON.parse(scxMatch[1]);
            var allPromises = [];
            
            var keys = ['proton', 'fast', 'tr', 'en', 'atom', 'advid'];

            keys.forEach(function(key) {
                var sourceData = scxData[key];
                if (!sourceData || !sourceData.sx || !sourceData.sx.t) return;
                var t = sourceData.sx.t;

                var items = Array.isArray(t) ? t.map(function(v, i) { return { encoded: v, label: key.toUpperCase() }; }) 
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
                                headers: STREAM_HEADERS, // KRİTİK: Dizipal stili başlıklar
                                is_direct: true,
                                // Player Kontrol Parametreleri
                                type: r.type,
                                hw_decode: false, // MTK İşlemci Fix
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

// ... (Arama ve getStreams kısımları aynı) ...
