/**
 * JetFilmizle — Nuvio Provider
 * ULTIMATE SOURCE EXTRACTOR - DIZI FIX
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
    var type = (mediaType === 'tv') ? 'tv' : 'movie';
    var s = season || 1;
    var e = episode || 1;

    console.error('[JetFilm-Debug] Başladı: S' + s + ' E' + e);

    return fetch('https://api.themoviedb.org/3/' + type + '/' + tmdbId + '?api_key=' + TMDB_API_KEY + '&language=tr-TR')
        .then(function(r) { return r.json(); })
        .then(function(info) {
            var slugTR = jetSlug(info.name || info.title);
            var urls = [
                BASE_URL + '/dizi/' + slugTR,
                BASE_URL + '/dizi/' + slugTR + '-izle',
                BASE_URL + '/' + slugTR
            ];
            return attemptUrls(urls);
        })
        .then(function(html) {
            if (!html) return [];

            var streams = [];
            console.error('[JetFilm-Debug] Sayfa bulundu, bölüm verisi aranıyor...');

            // --- STRATEJİ 1: HTML ATTR TARAMASI (Agresif) ---
            // Sitede bazen linkler direkt butonların "data-source" veya "data-video" özniteliğinde durur.
            var attrRe = /data-(?:source|video|url|id)=["']([^"']+)["']/gi;
            var m;
            while ((m = attrRe.exec(html)) !== null) {
                var val = m[1];
                if (val.includes('pixeldrain.com/u/')) {
                    var pId = val.split('/u/')[1].split(/[?&"']/)[0];
                    addPd(streams, pId, s, e);
                } else if (/vidmoly|d2rs|jetv|moly/.test(val)) {
                    addEmbed(streams, val);
                }
            }

            // --- STRATEJİ 2: SADECE PIXELDRAIN ID TARAMASI (Çok Agresif) ---
            // Pixeldrain linkleri bazen sadece "u/ABCDEFGH" olarak geçer.
            var pdIdRe = /\/u\/([a-zA-Z0-9_-]{8,12})/g;
            while ((m = pdIdRe.exec(html)) !== null) {
                addPd(streams, m[1], s, e);
            }

            // --- STRATEJİ 3: IFRAME TARAMASI ---
            var iframeRe = /<iframe[^>]+src=["']([^"']+)["']/gi;
            while ((m = iframeRe.exec(html)) !== null) {
                addEmbed(streams, m[1]);
            }

            // --- STRATEJİ 4: JAVASCRIPT VAR TARAMASI ---
            var jsRe = /["']?(?:file|link|url|src)["']?\s*[:=]\s*["']([^"']+)["']/gi;
            while ((m = jsRe.exec(html)) !== null) {
                var link = m[1];
                if (link.includes('pixeldrain')) {
                    var pdId = link.split('/u/')[1].split(/[?&"']/)[0];
                    addPd(streams, pdId, s, e);
                }
            }

            console.error('[JetFilm-Debug] Tarama Bitti. Toplam: ' + streams.length);
            return streams;
        });
}

// Yardımcı Fonksiyonlar (Tekrarı önlemek için)
function addPd(list, id, s, e) {
    if (!list.some(x => x.url.includes(id))) {
        console.error('[JetFilm-Debug] Yakalandı (Pixeldrain): ' + id);
        list.push({
            name: "JetFilm",
            title: '⌜ Pixeldrain ⌟ | S' + s + ' E' + e,
            url: 'https://pixeldrain.com/api/file/' + id + '?download',
            type: 'video',
            quality: '1080p',
            headers: { 'Referer': 'https://pixeldrain.com/' }
        });
    }
}

function addEmbed(list, url) {
    if (/jetv|vidmoly|d2rs|moly|player/.test(url) && !list.some(x => x.url === url)) {
        var final = url.startsWith('//') ? 'https:' + url : url;
        console.error('[JetFilm-Debug] Yakalandı (Embed): ' + final);
        list.push({
            name: "JetFilm",
            title: '⌜ Player ⌟',
            url: final,
            type: 'embed'
        });
    }
}

function attemptUrls(urls) {
    if (urls.length === 0) return Promise.resolve(null);
    var currentUrl = urls.shift();
    return fetch(currentUrl, { headers: HEADERS })
        .then(function(r) { return r.status === 200 ? r.text() : null; })
        .then(function(html) {
            if (html && html.length > 5000) {
                console.error('[JetFilm-Success] Girdi: ' + currentUrl);
                return html;
            }
            return attemptUrls(urls);
        });
}

module.exports = { getStreams: getStreams };
