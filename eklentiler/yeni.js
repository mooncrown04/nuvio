/**
 * JetFilmizle — Nuvio Provider
 * DEBUG MODE: Hata kodları eklendi, her adım loglanır.
 */

var BASE_URL = 'https://jetfilmizle.net';
var TMDB_API_KEY = '500330721680edb6d5f7f12ba7cd9023';

var HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36',
    'Referer': 'https://jetfilmizle.net/'
};

function getStreams(id, mediaType, season, episode) {
    console.error('[Hata-Nerede] 1: Fonksiyon basladi');
    
    var tmdbId = id.toString().replace(/[^0-9]/g, '');
    var type = (mediaType === 'tv') ? 'tv' : 'movie';
    var urlTMDB = 'https://api.themoviedb.org/3/' + type + '/' + tmdbId + '?api_key=' + TMDB_API_KEY + '&language=tr-TR';

    return fetch(urlTMDB)
        .then(function(r) { 
            console.error('[Hata-Nerede] 2: TMDB cevabi geldi');
            return r.json(); 
        })
        .then(function(info) {
            var searchTitle = info.name || info.title;
            console.error('[Hata-Nerede] 3: Aranan isim: ' + searchTitle);
            
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
        .then(function(res) { 
            console.error('[Hata-Nerede] 4: Arama yapildi');
            return res.text(); 
        })
        .then(function(searchHtml) {
            console.error('[Hata-Nerede] 5: Arama sonuclari taraniyor');
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
                console.error('[Hata-Nerede] 6: URL bulunamadi');
                return [];
            }

            console.error('[Hata-Nerede] 7: Gidiliyor -> ' + finalUrl);
            return fetch(finalUrl, { headers: HEADERS }).then(function(r) { return r.text(); });
        })
        .then(function(html) {
            console.error('[Hata-Nerede] 8: Sayfa HTML okundu');
            if (!html || html.indexOf('Sayfa Bulunamadı') !== -1) return [];

            var streams = [];
            var dil = (html.indexOf('dublaj') !== -1) ? "Dublaj" : "Altyazı";

            // --- VIDEOPARK (TITAN) TARAMA ---
            console.error('[Hata-Nerede] 9: Videopark taranıyor');
            var sdMatch = html.match(/var\s+_sd\s*=\s*({[\s\S]*?});/);
            if (sdMatch) {
                try {
                    var vData = JSON.parse(sdMatch[1]);
                    if (vData.stream_url) {
                        streams.push({
                            name: "JetFilmizle",
                            title: '⌜ Videopark ⌟ | 🇹🇷 ' + dil,
                            url: vData.stream_url,
                            type: 'hls',
                            quality: '1080p',
                            headers: { 'Referer': 'https://videopark.top/', 'User-Agent': HEADERS['User-Agent'] }
                        });
                    }
                } catch(e) { console.error('[Hata-Nerede] 10: JSON Parse hatası'); }
            }

            // --- DIGER KAYNAKLAR ---
            console.error('[Hata-Nerede] 11: Diger kaynaklar taranıyor');
            var linkRe = /(?:src|data-src|href)="([^"]+)"/gi;
            var match;
            while ((match = linkRe.exec(html)) !== null) {
                var u = match[1];
                if (u.indexOf('pixeldrain.com/u/') !== -1) {
                    var pid = u.split('/u/')[1].split('?')[0];
                    streams.push({
                        name: "JetFilmizle",
                        title: '⌜ Pixeldrain ⌟ | 🇹🇷 ' + dil,
                        url: 'https://pixeldrain.com/api/file/' + pid + '?download',
                        type: 'video',
                        quality: '1080p'
                    });
                }
                if (u.indexOf('jetv') !== -1 || u.indexOf('d2rs') !== -1) {
                    streams.push({
                        name: "JetFilmizle",
                        title: '⌜ Hızlı Kaynak ⌟ | 🇹🇷 ' + dil,
                        url: (u.indexOf('//') === 0) ? 'https:' + u : u,
                        type: 'embed'
                    });
                }
            }

            console.error('[Hata-Nerede] 12: Islem tamam. Kaynak sayisi: ' + streams.length);
            return streams;
        })
        .catch(function(e) {
            // HATAYI TAM OLARAK YAZDIR:
            console.error('[JetFilm-Kritik-Hata]: ' + e.name + ' - ' + e.message);
            return [];
        });
}

module.exports = { getStreams: getStreams };
