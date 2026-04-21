/**
 * JetFilmizle — Universal Provider (Film & Dizi)
 * FIX: Object.assign hatası giderildi (Legacy JS Compatibility).
 */

var BASE_URL     = 'https://jetfilmizle.net';
var TMDB_API_KEY = '500330721680edb6d5f7f12ba7cd9023';

var HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36',
    'Referer': BASE_URL + '/'
};

function getStreams(id, mediaType, season, episode) {
    var tmdbId = id.toString().replace(/[^0-9]/g, '');
    var type = (mediaType === 'tv') ? 'tv' : 'movie';

    return fetch('https://api.themoviedb.org/3/' + type + '/' + tmdbId + '?api_key=' + TMDB_API_KEY + '&language=tr-TR')
        .then(function(r) { return r.json(); })
        .then(function(info) {
            var searchTitle = info.name || info.title;
            console.error('[JetFilm] Aranan: ' + searchTitle);
            
            // Object.assign yerine manuel header oluşturma (Hata çözümü)
            var searchHeaders = {
                'User-Agent': HEADERS['User-Agent'],
                'Referer': HEADERS['Referer'],
                'Content-Type': 'application/x-www-form-urlencoded'
            };

            return fetch(BASE_URL + '/filmara.php', {
                method: 'POST',
                headers: searchHeaders,
                body: 's=' + encodeURIComponent(searchTitle)
            })
            .then(function(res) { return res.text(); })
            .then(function(searchHtml) {
                var regex = new RegExp('href="(https?://jetfilmizle\\.net/(film|dizi)/([^"/]+))"', 'i');
                var m = regex.exec(searchHtml);
                
                var finalUrl = '';
                if (m) {
                    finalUrl = BASE_URL + '/' + m[2] + '/' + m[3];
                    if (mediaType === 'tv') {
                        finalUrl += '/sezon-' + (season || 1) + '/bolum-' + (episode || 1);
                    }
                }
                
                if (!finalUrl) return [];

                console.error('[JetFilm] Hedef URL: ' + finalUrl);
                return fetch(finalUrl, { headers: HEADERS }).then(function(r) { return r.text(); });
            });
        })
        .then(function(html) {
            if (!html || html.indexOf('Sayfa Bulunamadı') !== -1) return [];

            var streams = [];
            var dil = (html.indexOf('dublaj') !== -1) ? "Dublaj" : "Altyazı";

            // 1. Videopark (Titan) - Loglarda çözdüğümüz yöntem
            var sdMatch = html.match(/var\s+_sd\s*=\s*({[\s\S]*?});/);
            if (sdMatch) {
                try {
                    var videoData = JSON.parse(sdMatch[1]);
                    if (videoData.stream_url) {
                        streams.push({
                            name: "JetFilmizle",
                            title: '⌜ Videopark ⌟ | 🇹🇷 ' + dil,
                            url: videoData.stream_url,
                            type: 'hls',
                            quality: '1080p',
                            subtitles: videoData.subtitles ? videoData.subtitles.map(function(s) {
                                return { url: s.file, language: s.label, format: 'vtt' };
                            }) : [],
                            headers: { 'Referer': 'https://videopark.top/', 'User-Agent': HEADERS['User-Agent'] }
                        });
                    }
                } catch(e) {
                    console.error('[JetFilm] Videopark Parse Hatası');
                }
            }

            // 2. Pixeldrain
            var pdRe = /href="(https?:\/\/pixeldrain\.com\/u\/([^"]+))"/g;
            var m;
            while ((m = pdRe.exec(html)) !== null) {
                streams.push({
                    name: "JetFilmizle",
                    title: '⌜ Pixeldrain ⌟ | 🇹🇷 ' + dil,
                    url: 'https://pixeldrain.com/api/file/' + m[2] + '?download',
                    type: 'video',
                    quality: '1080p',
                    headers: { 'Referer': 'https://pixeldrain.com/' }
                });
            }

            // 3. Iframe/Embed
            var iframeRe = /<iframe[^>]+src="([^"]+)"/gi;
            while ((m = iframeRe.exec(html)) !== null) {
                var src = m[1];
                if (src.indexOf('jetv') !== -1 || src.indexOf('d2rs') !== -1 || src.indexOf('videopark') !== -1) {
                    streams.push({
                        name: "JetFilmizle",
                        title: '⌜ Hızlı Kaynak ⌟ | 🇹🇷 ' + dil,
                        url: src.startsWith('//') ? 'https:' + src : src,
                        type: 'embed'
                    });
                }
            }

            return streams;
        })
        .catch(function(e) {
            console.error('[JetFilm-Error]: ' + e.message);
            return [];
        });
}

module.exports = { getStreams: getStreams };
