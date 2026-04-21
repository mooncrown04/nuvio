/**
 * JetFilmizle — Nuvio Provider
 * DATA ANALYZER & LOGGER
 */

var BASE_URL     = 'https://jetfilmizle.net';
var TMDB_API_KEY = '500330721680edb6d5f7f12ba7cd9023';

var HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36',
    'Referer': BASE_URL + '/'
};

function jetSlug(t) {
    return (t || '').toLowerCase()
        .replace(/ğ/g,'g').replace(/ü/g,'u').replace(/ş/g,'s')
        .replace(/ı/g,'i').replace(/İ/g,'i').replace(/ö/g,'o')
        .replace(/ç/g,'c').replace(/â/g,'a')
        .replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'');
}

function getStreams(id, mediaType, season, episode) {
    var tmdbId = id.toString().replace(/[^0-9]/g, '');
    var s = season || 1;
    var e = episode || 1;

    console.error('[JetFilm-Debug] Analiz Baslatildi: S' + s + ' E' + e);

    return fetch('https://api.themoviedb.org/3/' + (mediaType === 'tv' ? 'tv' : 'movie') + '/' + tmdbId + '?api_key=' + TMDB_API_KEY + '&language=tr-TR')
        .then(function(r) { return r.json(); })
        .then(function(info) {
            var slugTR = jetSlug(info.name || info.title);
            var url = BASE_URL + '/dizi/' + slugTR;
            return fetch(url, { headers: HEADERS });
        })
        .then(function(r) { return r.text(); })
        .then(function(html) {
            if (!html) return [];

            console.error('[JetFilm-Success] Sayfa Okundu. Ham Veri Analizi Basliyor...');

            // --- ANALIZ MODU: Tum supheli verileri Logcat'e dok ---
            
            // 1. Tum data-id ve data-video icerikleri
            var dataRe = /data-(?:id|video|url|source|episode|season)=["']([^"']+)["']/gi;
            var m;
            while ((m = dataRe.exec(html)) !== null) {
                console.error('[ANALIZ-VERI] Bulunan Data Attr: ' + m[0]);
            }

            // 2. Tum iframe src'leri
            var ifrRe = /<iframe[^>]+src=["']([^"']+)["']/gi;
            while ((m = ifrRe.exec(html)) !== null) {
                console.error('[ANALIZ-VERI] Bulunan Iframe: ' + m[1]);
            }

            // 3. Pixeldrain olabilecek tum 8-12 karakterli kodlar (Harf/Rakam)
            var pixRe = /\/u\/([a-zA-Z0-9]{8,12})/g;
            while ((m = pixRe.exec(html)) !== null) {
                console.error('[ANALIZ-VERI] Potansiyel Pixeldrain ID: ' + m[1]);
            }

            // --- ESLESTIRME MANTIGI (Gecici) ---
            var streams = [];
            // Bu kisim analiz bitene kadar sadece player linklerini toplasin
            var playerRe = /https?:\/\/(?:vidmoly|d2rs|jetv|vido)[^"'\s]*/gi;
            while ((m = playerRe.exec(html)) !== null) {
                streams.push({
                    name: "JetFilm-Analiz",
                    title: "Kaynak Bulundu",
                    url: m[0],
                    type: "embed"
                });
            }

            console.error('[JetFilm-Debug] Analiz Bitti. Lutfen Logcat-i kontrol et.');
            return streams;
        });
}

module.exports = { getStreams: getStreams };
