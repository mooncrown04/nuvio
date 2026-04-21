/**
 * JetFilmizle — Nuvio Provider (ULTRA COMPATIBLE)
 * Hem Film Hem Dizi - Hata Vermeyen Saf JS Sürümü
 */

var BASE_URL = 'https://jetfilmizle.net';
var TMDB_API_KEY = '500330721680edb6d5f7f12ba7cd9023';

var HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36',
    'Referer': 'https://jetfilmizle.net/'
};

function getStreams(id, mediaType, season, episode) {
    var tmdbId = id.toString().replace(/[^0-9]/g, '');
    var type = (mediaType === 'tv') ? 'tv' : 'movie';

    return fetch('https://api.themoviedb.org/3/' + type + '/' + tmdbId + '?api_key=' + TMDB_API_KEY + '&language=tr-TR')
        .then(function(r) { return r.json(); })
        .then(function(info) {
            var searchTitle = info.name || info.title;
            
            // Object.assign HATASI ÇÖZÜMÜ: Manuel header
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

                console.error('[JetFilm] Gidilen URL: ' + finalUrl);
                return fetch(finalUrl, { headers: HEADERS }).then(function(r) { return r.text(); });
            });
        })
        .then(function(html) {
            if (!html || html.indexOf('Sayfa Bulunamadı') !== -1) return [];

            var streams = [];
            var dil = (html.indexOf('dublaj') !== -1) ? "Dublaj" : "Altyazı";

            // 1. VIDEOPARK (TITAN) - Dizi ve Filmlerdeki Asıl Kaynak
            var sdMatch = html.match(/var\s+_sd\s*=\s*({[\s\S]*?});/);
            if (sdMatch) {
                try {
                    var videoData = JSON.parse(sdMatch[1]);
                    if (videoData.stream_url) {
                        // map() yerine FOR döngüsü (Eski JS uyumu için)
                        var subList = [];
                        if (videoData.subtitles) {
                            for (var i = 0; i < videoData.subtitles.length; i++) {
                                var s = videoData.subtitles[i];
                                subList.push({ url: s.file, language: s.label, format: 'vtt' });
                            }
                        }

                        streams.push({
                            name: "JetFilmizle",
                            title: '⌜ Videopark ⌟ | 🇹🇷 ' + dil,
                            url: videoData.stream_url,
                            type: 'hls',
                            quality: '1080p',
                            subtitles: subList,
                            headers: { 
                                'Referer': 'https://videopark.top/', 
                                'User-Agent': HEADERS['User-Agent'] 
                            }
                        });
                    }
                } catch(e) {}
            }

            // 2. PIXELDRAIN & DİĞERLERİ
            var linkRe = /(?:src|data-src|href)="([^"]+)"/gi;
            var match;
            while ((match = linkRe.exec(html)) !== null) {
                var url = match[1];

                // Pixeldrain Yakala
                if (url.indexOf('pixeldrain.com/u/') !== -1) {
                    var pdId = url.split('/u/')[1].split('?')[0];
                    streams.push({
                        name: "JetFilmizle",
                        title: '⌜ Pixeldrain ⌟ | 🇹🇷 ' + dil,
                        url: 'https://pixeldrain.com/api/file/' + pdId + '?download',
                        type: 'video',
                        quality: '1080p',
                        headers: { 'Referer': 'https://pixeldrain.com/' }
                    });
                }

                // Iframe Kaynakları (JetV, D2RS vb.)
                if (url.indexOf('jetv') !== -1 || url.indexOf('d2rs') !== -1) {
                    streams.push({
                        name: "JetFilmizle",
                        title: '⌜ Hızlı Kaynak ⌟ | 🇹🇷 ' + dil,
                        url: url.indexOf('//') === 0 ? 'https:' + url : url,
                        type: 'embed'
                    });
                }
            }

            // Mükerrer linkleri temizle (Eski usul filter)
            var finalStreams = [];
            var seen = {};
            for (var j = 0; j < streams.length; j++) {
                var sUrl = streams[j].url;
                if (!seen[sUrl]) {
                    finalStreams.push(streams[j]);
                    seen[sUrl] = true;
                }
            }

            return finalStreams;
        })
        .catch(function(e) {
            console.error('[JetFilm-Error]: ' + e.message);
            return [];
        });
}

module.exports = { getStreams: getStreams };
