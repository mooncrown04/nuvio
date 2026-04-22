/**
 * JetFilmizle — Nuvio Provider (Session-Hardened)
 */

var BASE_URL     = 'https://jetfilmizle.net';
var TMDB_API_KEY = '500330721680edb6d5f7f12ba7cd9023';

var HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36',
    'Referer': BASE_URL + '/',
    'X-Requested-With': 'XMLHttpRequest'
};

function titleToSlug(t) {
    return (t || '').toLowerCase().trim()
        .replace(/ğ/g,'g').replace(/ü/g,'u').replace(/ş/g,'s')
        .replace(/ı/g,'i').replace(/İ/g,'i').replace(/ö/g,'o')
        .replace(/ç/g,'c').replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'');
}

async function getStreams(id, mediaType, season, episode) {
    console.error('[JetFilm-Debug] Derin Tarama Başlatıldı: S' + season + ' E' + episode);
    
    try {
        var tmdbId = id.toString().replace(/[^0-9]/g, '');
        var type = (mediaType === 'tv') ? 'tv' : 'movie';

        // 1. TMDB Bilgisi
        const tmdbRes = await fetch('https://api.themoviedb.org/3/' + type + '/' + tmdbId + '?api_key=' + TMDB_API_KEY + '&language=tr-TR');
        const info = await tmdbRes.json();
        const slug = titleToSlug(info.name || info.title);
        const finalUrl = BASE_URL + '/' + (mediaType === 'tv' ? 'dizi' : 'film') + '/' + slug;

        // 2. Sayfayı Çek ve Oturum Parametrelerini Yakala
        const pageRes = await fetch(finalUrl, { headers: HEADERS });
        const html = await pageRes.text();
        
        var filmIdM = html.match(/name="film_id" value="(\d+)"/) || html.match(/post_id\s*:\s*(\d+)/);
        if (!filmIdM) return [];
        var filmId = filmIdM[1];

        // GÜVENLİK ANAHTARI (NONCE) AVLAMA: Bazı siteler 'jet_nonce' veya 'security' kullanır
        var nonceMatch = html.match(/"nonce"\s*:\s*"([^"]+)"/) || html.match(/data-nonce="([^"]+)"/);
        var nonce = nonceMatch ? nonceMatch[1] : '';

        console.error('[JetFilm-Debug] ID: ' + filmId + ' | Nonce: ' + nonce);

        // 3. AJAX İsteği (Daha detaylı parametreler ile)
        // Jetfilm bazen 'source_index' veya 'type' bekler
        var streams = [];
        var types = ['dublaj', 'altyazi']; // İkisini de dene
        
        for (let t of types) {
            var body = new URLSearchParams({
                'action': 'get_player_source',
                'film_id': filmId,
                'season': season,
                'episode': episode,
                'type': t,
                'security': nonce // Nonce varsa ekle
            });

            const ajaxRes = await fetch(BASE_URL + '/wp-admin/admin-ajax.php', {
                method: 'POST',
                headers: Object.assign({}, HEADERS, { 
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Referer': finalUrl // Referer mutlaka sayfanın kendisi olmalı
                }),
                body: body.toString()
            });

            const json = await ajaxRes.json();
            if (json.success && json.data && json.data.video_url) {
                let vUrl = json.data.video_url;
                if (!vUrl.includes('youtube.com')) {
                    streams.push({
                        name: "JetFilmizle",
                        title: "⌜ " + t.toUpperCase() + " ⌟",
                        url: vUrl.startsWith('//') ? 'https:' + vUrl : vUrl,
                        type: 'embed'
                    });
                }
            }
        }

        // 4. SON ÇARE: Titan Player'ın statik bir parçasını yakalamaya çalış
        if (streams.length === 0) {
            // Sayfa içinde gizlenmiş olabilecek her türlü player URL'sini ara (Youtube hariç)
            var regex = /(?:https?:)?\/\/[^\s"'<>]+(?:titan|jetv|videopark|d2rs|vcloud|moly|vcdn|play|embed|storage)[^\s"'<>]*/gi;
            var matches = html.match(regex) || [];
            matches.forEach(u => {
                if (!u.includes('youtube') && !u.includes('google')) {
                    var clean = u.replace(/\\/g, '').split(/[\\"']/)[0];
                    streams.push({ name: "JetFilmizle", title: "⌜ Yedek ⌟", url: clean, type: "embed" });
                }
            });
        }

        console.error('[JetFilm-Debug] Final: ' + streams.length + ' kaynak bulundu.');
        return streams;

    } catch (err) {
        console.error('[JetFilm-Debug] HATA: ' + err.message);
        return [];
    }
}

if (typeof module !== 'undefined' && module.exports) { module.exports = { getStreams: getStreams }; }
if (typeof globalThis !== 'undefined') { globalThis.getStreams = globalThis.getStreams || getStreams; }
