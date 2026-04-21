/**
 * JetFilmizle — Universal Debugger
 * Film + Dinamik Dizi (Titan/Videopark)
 */

var BASE_URL = 'https://jetfilmizle.net';
var TMDB_API_KEY = '500330721680edb6d5f7f12ba7cd9023';

var HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36',
    'Referer': 'https://jetfilmizle.net/'
};

function getStreams(id, mediaType, season, episode) {
    console.error('[Hata-Nerede] 1: Basladi');
    var tmdbId = id.toString().replace(/[^0-9]/g, '');
    var type = (mediaType === 'tv') ? 'tv' : 'movie';

    return fetch('https://api.themoviedb.org/3/' + type + '/' + tmdbId + '?api_key=' + TMDB_API_KEY + '&language=tr-TR')
        .then(function(r) { return r.json(); })
        .then(function(info) {
            var searchTitle = info.name || info.title;
            console.error('[Hata-Nerede] 2: TMDB Isim -> ' + searchTitle);
            
            var searchHeaders = {
                'User-Agent': HEADERS['User-Agent'],
                'Referer': HEADERS['Referer'],
                'Content-Type': 'application/x-www-form-urlencoded'
            };

            return fetch(BASE_URL + '/filmara.php', {
                method: 'POST',
                headers: searchHeaders,
                body: 's=' + encodeURIComponent(searchTitle)
            });
        })
        .then(function(res) { return res.text(); })
        .then(function(searchHtml) {
            console.error('[Hata-Nerede] 3: Arama yapildi');
            var regex = new RegExp('href="(https?://jetfilmizle\\.net/(film|dizi)/([^"/]+))"', 'i');
            var m = regex.exec(searchHtml);
            
            var finalUrl = '';
            if (m) {
                finalUrl = BASE_URL + '/' + m[2] + '/' + m[3];
                if (mediaType === 'tv') {
                    finalUrl += '/sezon-' + (season || 1) + '/bolum-' + (episode || 1);
                }
            }
            
            if (!finalUrl) {
                console.error('[Hata-Nerede] 4: Sayfa bulunamadi');
                return [];
            }

            console.error('[Hata-Nerede] 5: Gidiliyor -> ' + finalUrl);
            return fetch(finalUrl, { headers: HEADERS }).then(function(r) { return r.text(); });
        })
        .then(function(html) {
            console.error('[Hata-Nerede] 6: HTML Okundu');
            var streams = [];
            var dil = (html.indexOf('dublaj') !== -1) ? "Dublaj" : "Altyazı";

            // --- DIZILER ICIN TITAN/VIDEOPARK IFRAME BULUCU ---
            console.error('[Hata-Nerede] 7: Iframe taraniyor');
            var iframeRe = /<iframe[^>]+src="([^"]+)"/gi;
            var match;
            var playerUrls = [];

            while ((match = iframeRe.exec(html)) !== null) {
                var src = match[1];
                if (src.indexOf('videopark.top') !== -1) {
                    playerUrls.push(src.indexOf('//') === 0 ? 'https:' + src : src);
                }
            }

            // Eğer iframe içinde bulamazsak direkt sayfa içinde _sd ara (Filmler için)
            if (html.indexOf('var _sd =') !== -1) {
                console.error('[Hata-Nerede] 8: Sayfa icinde _sd bulundu');
                try {
                    var raw = html.split('var _sd =')[1].split('};')[0] + '}';
                    var vData = JSON.parse(raw);
                    if (vData.stream_url) {
                        streams.push({
                            name: "JetFilmizle (Titan)",
                            url: vData.stream_url,
                            type: 'hls',
                            title: '⌜ Videopark ⌟ | 🇹🇷 ' + dil,
                            headers: { 'Referer': 'https://videopark.top/' }
                        });
                    }
                } catch(e) { console.error('[Hata-Nerede] 9: JSON Hatasi'); }
            }

            // Dizilerdeki her bir Titan Player linkine fetch at (Senin calisan mantigin)
            var titanPromises = [];
            for (var i = 0; i < playerUrls.length; i++) {
                console.error('[Hata-Nerede] 10: Titan Player Bulundu -> ' + playerUrls[i]);
                titanPromises.push(
                    fetch(playerUrls[i], { headers: HEADERS })
                    .then(function(r) { return r.text(); })
                    .then(function(p_html) {
                        if (p_html.indexOf('var _sd =') !== -1) {
                            var p_raw = p_html.split('var _sd =')[1].split('};')[0] + '}';
                            var p_data = JSON.parse(p_raw);
                            return {
                                name: "JetFilmizle (Titan)",
                                url: p_data.stream_url,
                                type: 'hls',
                                title: '⌜ Videopark ⌟ | 🇹🇷 ' + dil,
                                headers: { 'Referer': 'https://videopark.top/' }
                            };
                        }
                        return null;
                    }).catch(function(){ return null; })
                );
            }

            return Promise.all(titanPromises).then(function(results) {
                for (var j = 0; j < results.length; j++) {
                    if (results[j]) streams.push(results[j]);
                }
                
                // PIXELDRAIN (Filmler için)
                var pdRe = /href="(https?:\/\/pixeldrain\.com\/u\/([^"]+))"/g;
                var pdM;
                while ((pdM = pdRe.exec(html)) !== null) {
                    streams.push({
                        name: "JetFilmizle",
                        title: '⌜ Pixeldrain ⌟ | 🇹🇷 ' + dil,
                        url: 'https://pixeldrain.com/api/file/' + pdM[2] + '?download',
                        type: 'video'
                    });
                }

                console.error('[Hata-Nerede] 11: Toplam Kaynak -> ' + streams.length);
                return streams;
            });
        })
        .catch(function(e) {
            console.error('[JetFilm-KRITIK]: ' + e.name + ' - ' + e.message);
            return [];
        });
}

module.exports = { getStreams: getStreams };
