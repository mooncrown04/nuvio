// ! Bu araç @keyiflerolsun tarafından | @KekikAkademi için yazılmıştır.
var BASE_URL = 'https://www.fullhdfilmizlesene.live';

var HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': '*/*',
    'Referer': BASE_URL + '/'
};

// Player için kritik başlıklar
var STREAM_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    'Referer': BASE_URL + '/',
    'Origin': BASE_URL
};

// ... (atobFixed, rot13Fixed, decodeLinkFixed fonksiyonların aynı kalsın) ...

function extractVideoUrl(url, sourceKey) {
    // CloudStream'deki check mantığı
    var isHls = url.includes('.m3u8') || 
                sourceKey === 'proton' || 
                sourceKey === 'fast' || 
                sourceKey === 'atom' ||
                url.includes('turbo.imgz.me');
    
    return Promise.resolve([{ 
        url: url, 
        quality: '1080p', 
        isHls: isHls 
    }]);
}

function fetchDetailAndStreams(filmUrl) {
    return fetch(filmUrl, { headers: HEADERS })
        .then(function(res) { return res.text(); })
        .then(function(html) {
            var title = (html.match(/<h1[^>]*>([^<]+)<\/h1>/i) || [null, 'FullHD'])[1].trim();
            var year = (html.match(/(\d{4})/) || [null, ''])[1];
            var scxMatch = html.match(/scx\s*=\s*(\{[\s\S]*?\});/);
            if (!scxMatch) return [];

            var scxData = JSON.parse(scxMatch[1]);
            var allPromises = [];
            // CloudStream'deki anahtarların tamamı
            var keys = ["atom", "advid", "advidprox", "proton", "fast", "fastly", "tr", "en"];

            keys.forEach(function(key) {
                var sourceData = scxData[key];
                if (!sourceData || !sourceData.sx || !sourceData.sx.t) return;
                var t = sourceData.sx.t;
                
                var items = Array.isArray(t) ? t.map(function(v, i) { return { encoded: v, label: key.toUpperCase() + ' #' + (i+1) }; }) 
                                           : Object.keys(t).map(function(k) { return { encoded: t[k], label: key.toUpperCase() + ' ' + k }; });

                items.forEach(function(item) {
                    var decoded = decodeLinkFixed(item.encoded);
                    if (!decoded) return;

                    allPromises.push(extractVideoUrl(decoded, key).then(function(results) {
                        return results.map(function(r) {
                            // HATAYI ÇÖZEN ASIL KISIM BURASI (NUVIO PLAYER AYARLARI)
                            return {
                                name: '⌜ FHD ⌟ | ' + item.label,
                                title: title + (year ? ' (' + year + ')' : ''),
                                url: r.url,
                                quality: r.quality,
                                headers: STREAM_HEADERS,
                                // CloudStream'deki isM3u8 = true karşılığı:
                                is_direct: true, 
                                streamType: r.isHls ? 'hls' : 'video', 
                                mimeType: r.isHls ? 'application/x-mpegURL' : 'video/mp4',
                                // Altyazı veya Dil Etiketi (CloudStream'deki key'e göre)
                                group: key === 'en' ? 'Altyazılı' : 'Türkçe Dublaj'
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
            return streams;
        });
}
