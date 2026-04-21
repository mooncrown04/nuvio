/**
 * JetFilmizle — Nuvio Pro Ultra
 * Film ve Diziler için Gelişmiş Kaynak Yakalayıcı
 */

var BASE_URL = 'https://jetfilmizle.net';
var TMDB_API_KEY = '500330721680edb6d5f7f12ba7cd9023';

var HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36',
    'Referer': 'https://jetfilmizle.net/'
};

function toSlug(t) {
    if(!t) return "";
    return t.toLowerCase()
        .replace(/ğ/g,'g').replace(/ü/g,'u').replace(/ş/g,'s')
        .replace(/ı/g,'i').replace(/İ/g,'i').replace(/ö/g,'o')
        .replace(/ç/g,'c').replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'');
}

function getStreams(id, mediaType, season, episode) {
    console.error('[Hata-Nerede] 1: Basladi');
    var tmdbId = id.toString().replace(/[^0-9]/g, '');
    var type = (mediaType === 'tv') ? 'tv' : 'movie';

    return fetch('https://api.themoviedb.org/3/' + type + '/' + tmdbId + '?api_key=' + TMDB_API_KEY + '&language=tr-TR')
        .then(function(r) { return r.json(); })
        .then(function(info) {
            var trName = info.name || info.title;
            var enName = info.original_name || info.original_title;
            var year = (info.first_air_date || info.release_date || "").split("-")[0];
            
            // Aday URL listesi oluştur
            var candidates = [];
            var s = season || 1;
            var e = episode || 1;

            if (mediaType === 'tv') {
                var slugs = [toSlug(trName), toSlug(enName), toSlug(enName) + '-' + year];
                for(var i=0; i<slugs.length; i++){
                    // Sitenin kullandığı 3 farklı dizi-bölüm formatı
                    candidates.push(BASE_URL + '/dizi/' + slugs[i] + '/sezon-' + s + '/bolum-' + e);
                    candidates.push(BASE_URL + '/dizi/' + slugs[i] + '/sezon-' + s + '-bolum-' + e + '-izle');
                }
            } else {
                candidates.push(BASE_URL + '/film/' + toSlug(trName));
                candidates.push(BASE_URL + '/film/' + toSlug(enName));
                candidates.push(BASE_URL + '/film/' + toSlug(enName) + '-' + year);
            }

            // Önce arama motorunu dene (Bulursa en başa ekle)
            return fetch(BASE_URL + '/filmara.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: 's=' + encodeURIComponent(trName)
            }).then(function(r){ return r.text(); }).then(function(html){
                var m = /href=['"](https?:\/\/jetfilmizle\.net\/(film|dizi)\/([^'"]+))['"]/i.exec(html);
                if(m) {
                    var found = m[1];
                    if(mediaType === 'tv' && found.indexOf('sezon') === -1) {
                        found = found.replace(/\/$/, '') + '/sezon-' + s + '/bolum-' + e;
                    }
                    candidates.unshift(found);
                }
                return fetchSequential(candidates, 0);
            });
        })
        .then(function(html) {
            if (!html) return [];
            var streams = [];
            var dil = (html.indexOf('dublaj') !== -1) ? "Dublaj" : "Altyazı";

            // 1. SD/Stream Yakalayıcı (Gelişmiş Regex)
            var sdRegex = /var\s+_sd\s*=\s*({[\s\S]*?});/g;
            var sdMatch;
            while ((sdMatch = sdRegex.exec(html)) !== null) {
                try {
                    var data = JSON.parse(sdMatch[1]);
                    if (data.stream_url) {
                        streams.push({
                            name: "JetFilm",
                            title: '⌜ Kaynak 1 ⌟ | ' + dil,
                            url: data.stream_url,
                            type: 'hls',
                            headers: { 'Referer': 'https://videopark.top/' }
                        });
                    }
                } catch(e) {}
            }

            // 2. Titan/Videopark Iframe Tarayıcı
            var playerUrls = [];
            var pRe = /(?:src|data-video|data-src)=['"](https?:\/\/videopark\.top\/titan\/w\/[^'"]+)['"]/gi;
            var match;
            while ((match = pRe.exec(html)) !== null) {
                playerUrls.push(match[1]);
            }

            var promises = playerUrls.map(function(u) {
                return fetch(u, { headers: HEADERS }).then(function(r){ return r.text(); }).then(function(p_html){
                    var m = /var\s+_sd\s*=\s*({[\s\S]*?});/.exec(p_html);
                    if(m){
                        var d = JSON.parse(m[1]);
                        return { name: "Titan", title: '⌜ Videopark ⌟ | ' + dil, url: d.stream_url, type: 'hls', headers: { 'Referer': 'https://videopark.top/' } };
                    }
                    return null;
                }).catch(function(){ return null; });
            });

            return Promise.all(promises).then(function(results) {
                results.forEach(function(r){ if(r) streams.push(r); });
                
                // Yedek: Pixeldrain
                var pd = /https?:\/\/pixeldrain\.com\/u\/([a-zA-Z0-9]+)/.exec(html);
                if(pd) streams.push({ name: "Yedek", title: "Pixeldrain", url: "https://pixeldrain.com/api/file/"+pd[1]+"?download", type: "video" });

                console.error('[Hata-Nerede] 10: Bitti. Kaynak: ' + streams.length);
                return streams;
            });
        });
}

function fetchSequential(urls, i) {
    if (i >= urls.length) return Promise.resolve(null);
    console.error('[Hata-Nerede] 6: Deneniyor -> ' + urls[i]);
    return fetch(urls[i], { headers: HEADERS }).then(function(res) {
        if (res.status === 200) return res.text();
        return fetchSequential(urls, i + 1);
    });
}

module.exports = { getStreams: getStreams };
