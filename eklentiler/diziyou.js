var BASE_URL = 'https://www.diziyou.one';
var STORAGE_URL = 'https://storage.diziyou.one';

var HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    'Referer': BASE_URL + '/'
};

function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
    return new Promise(function(resolve) {
        if (mediaType !== 'tv') {
            resolve([]);
            return;
        }

        var tmdbUrl = 'https://api.themoviedb.org/3/tv/' + tmdbId + '?language=tr-TR&api_key=4ef0d7355d9ffb5151e987764708ce96';

        fetch(tmdbUrl)
            .then(function(res) { return res.json(); })
            .then(function(data) {
                var title = data.name || '';
                
                // Debug: title'ı göster
                var debugTitle = title ? title.substring(0, 20) : 'NOTFOUND';
                
                // DiziYou'da ara
                return fetch(BASE_URL + '/?s=' + encodeURIComponent(title), { headers: HEADERS })
                    .then(function(r) { return r.text(); })
                    .then(function(html) {
                        // İlk sonucu al
                        var match = html.match(/<a[^>]+href="([^"]+)"[^>]*>[\s\S]*?<div[^>]*id="categorytitle"[^>]*>([\s\S]*?)<\/div>/i);
                        
                        if (!match) {
                            // Debug: eşleşme bulunamadı
                            return [{
                                name: '⌜ DiziYou ⌟ | DEBUG',
                                title: 'No match for: ' + debugTitle,
                                url: 'http://example.com/test.m3u8',
                                quality: '720p',
                                size: 'NO_MATCH',
                                provider: 'diziyou',
                                type: 'hls'
                            }];
                        }
                        
                        var seriesUrl = match[1].startsWith('http') ? match[1] : BASE_URL + match[1];
                        
                        // Dizi sayfasına git
                        return fetch(seriesUrl, { headers: HEADERS })
                            .then(function(r) { return r.text(); })
                            .then(function(seriesHtml) {
                                // İlk bölümü bul
                                var epMatch = seriesHtml.match(/<div[^>]*class="[^"]*bolumust[^"]*"[^>]*>[\s\S]*?<a[^>]+href="([^"]+)"[^>]*>/i);
                                
                                if (!epMatch) {
                                    return [{
                                        name: '⌜ DiziYou ⌟ | DEBUG',
                                        title: 'No episode in: ' + debugTitle,
                                        url: 'http://example.com/test.m3u8',
                                        quality: '720p',
                                        size: 'NO_EPISODE',
                                        provider: 'diziyou',
                                        type: 'hls'
                                    }];
                                }
                                
                                var epUrl = epMatch[1].startsWith('http') ? epMatch[1] : BASE_URL + epMatch[1];
                                
                                // Bölüm sayfasına git
                                return fetch(epUrl, { headers: HEADERS })
                                    .then(function(r) { return r.text(); })
                                    .then(function(epHtml) {
                                        // iframe'den itemId çıkar
                                        var iframeMatch = epHtml.match(/<iframe[^>]+id="[^"]*diziyouPlayer[^"]*"[^>]+src="([^"]+)"/i);
                                        
                                        if (!iframeMatch) {
                                            return [{
                                                name: '⌜ DiziYou ⌟ | DEBUG',
                                                title: 'No iframe in episode',
                                                url: 'http://example.com/test.m3u8',
                                                quality: '720p',
                                                size: 'NO_IFRAME',
                                                provider: 'diziyou',
                                                type: 'hls'
                                            }];
                                        }
                                        
                                        var itemId = iframeMatch[1].split('/').pop().replace('.html', '');
                                        
                                        // Gerçek stream'leri döndür
                                        var streams = [];
                                        var subtitles = [];
                                        
                                        // Türkçe Altyazılı
                                        if (epHtml.includes('turkceAltyazili') || epHtml.includes('id="turkceAltyazili"')) {
                                            subtitles.push({ label: 'türkçee', url: STORAGE_URL + '/subtitles/' + itemId + '/tr.vtt' });
                                            streams.push({
                                                name: '⌜ DiziYou ⌟ | Orjinal (TR Alt)',
                                                title: 'S' + seasonNum + 'E' + episodeNum + ' · 720p [ID:' + itemId + ']',
                                                url: STORAGE_URL + '/episodes/' + itemId + '/play.m3u8',
                                                quality: '720p',
                                                size: 'HLS',
                                                headers: HEADERS,
                                                subtitles: subtitles,
                                                provider: 'diziyou',
                                                type: 'hls'
                                            });
                                        }
                                        
                                        // Türkçe Dublaj
                                        if (epHtml.includes('turkceDublaj') || epHtml.includes('id="turkceDublaj"')) {
                                            streams.push({
                                                name: '⌜ DiziYou ⌟ | Dublaj',
                                                title: 'S' + seasonNum + 'E' + episodeNum + ' · 720p [ID:' + itemId + ']',
                                                url: STORAGE_URL + '/episodes/' + itemId + '_tr/play.m3u8',
                                                quality: '720p',
                                                size: 'HLS',
                                                headers: HEADERS,
                                                subtitles: subtitles,
                                                provider: 'diziyou',
                                                type: 'hls'
                                            });
                                        }
                                        
                                        // Eğer hiçbir şey bulunamazsa
                                        if (streams.length === 0) {
                                            streams.push({
                                                name: '⌜ DiziYou ⌟ | Varsayılan',
                                                title: 'S' + seasonNum + 'E' + episodeNum + ' · 720p [ID:' + itemId + ']',
                                                url: STORAGE_URL + '/episodes/' + itemId + '/play.m3u8',
                                                quality: '720p',
                                                size: 'HLS',
                                                headers: HEADERS,
                                                subtitles: [],
                                                provider: 'diziyou',
                                                type: 'hls'
                                            });
                                        }
                                        
                                        return streams;
                                    });
                            });
                    });
            })
            .then(function(streams) { resolve(streams); })
            .catch(function(err) {
                resolve([{
                    name: '⌜ DiziYou ⌟ | ERROR',
                    title: err.message.substring(0, 30),
                    url: 'http://example.com/test.m3u8',
                    quality: '720p',
                    size: 'ERROR',
                    provider: 'diziyou',
                    type: 'hls'
                }]);
            });
    });
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { getStreams };
} else {
    global.getStreams = getStreams;
}
