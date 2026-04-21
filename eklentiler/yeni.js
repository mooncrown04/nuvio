/**
 * JetFilmizle — Nuvio Ultra Final
 * TMDB hatalarını ve URL karmaşasını bitiren, kesin sonuç odaklı sürüm.
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
    
    // TMDB'den hem dizi hem film ihtimalini düşünerek isim alıyoruz
    var tmdbType = (mediaType === 'tv') ? 'tv' : 'movie';

    return fetch('https://api.themoviedb.org/3/' + tmdbType + '/' + tmdbId + '?api_key=' + TMDB_API_KEY + '&language=tr-TR')
        .then(function(r) { return r.json(); })
        .then(function(info) {
            var name = info.name || info.title || info.original_name || info.original_title;
            console.error('[Hata-Nerede] 2: TMDB -> ' + name);
            
            var s = season || 1;
            var e = episode || 1;
            var slug = toSlug(name);
            
            // Tüm URL olasılıklarını tek bir havuzda topla
            var candidates = [];
            
            // 1. Dizi Olasılıkları
            candidates.push(BASE_URL + '/dizi/' + slug + '/sezon-' + s + '/bolum-' + e);
            candidates.push(BASE_URL + '/dizi/' + slug + '/sezon-' + s + '-bolum-' + e + '-izle');
            
            // 2. Film Olasılıkları (Eğer yanlışlıkla film olarak geldiyse)
            candidates.push(BASE_URL + '/film/' + slug);
            
            // 3. Arama Motoru (GET yöntemiyle, Cloudflare dostu)
            var searchUrl = BASE_URL + '/arama/' + encodeURIComponent(name);
            
            return fetch(searchUrl, { headers: HEADERS })
                .then(function(res) { return res.text(); })
                .then(function(searchHtml) {
                    var m = /href=['"](https?:\/\/jetfilmizle\.net\/(film|dizi)\/([^'"]+))['"]/i.exec(searchHtml);
                    if (m) {
                        var found = m[1];
                        if (mediaType === 'tv' && found.indexOf('sezon') === -1) {
                            found = found.replace(/\/$/, '') + '/sezon-' + s + '/bolum-' + e;
                        }
                        candidates.unshift(found); // Aramada çıkanı en başa koy
                    }
                    return fetchSequential(candidates, 0);
                });
        })
        .then(function(html) {
            if (!html) return [];
            var streams = [];
            var dil = (html.indexOf('dublaj') !== -1) ? "Dublaj" : "Altyazı";

            // --- GİZLİ VERİ SÜPÜRGESİ (Hem sayfa içi hem player içi) ---
            
            // Metot A: Sayfa içindeki _sd objesi
            var sdMatch = html.match(/var\s+_sd\s*=\s*({[\s\S]*?});/);
            if (sdMatch) {
                try {
                    var d = JSON.parse(sdMatch[1]);
                    if (d.stream_url) {
                        streams.push({ name: "JetFilm", title: "Kaynak 1 | " + dil, url: d.stream_url, type: 'hls', headers: { 'Referer': 'https://videopark.top/' } });
                    }
                } catch(e) {}
            }

            // Metot B: Titan / Videopark Iframe'leri (Senin başarılı metodun)
            var pUrls = [];
            var pRe = /(?:src|data-video|data-src)=['"](https?:\/\/videopark\.top\/titan\/w\/[^'"]+)['"]/gi;
            var match;
            while ((match = pRe.exec(html)) !== null) {
                if (pUrls.indexOf(match[1]) === -1) pUrls.push(match[1]);
            }

            var promises = pUrls.map(function(u) {
                return fetch(u, { headers: HEADERS }).then(function(r){ return r.text(); }).then(function(p_html){
                    var inner = p_html.match(/var\s+_sd\s*=\s*({[\s\S]*?});/);
                    if(inner) {
                        var data = JSON.parse(inner[1]);
                        return { name: "Titan", title: "Videopark | " + dil, url: data.stream_url, type: 'hls', headers: { 'Referer': 'https://videopark.top/' } };
                    }
                    return null;
                }).catch(function(){ return null; });
            });

            return Promise.all(promises).then(function(results) {
                results.forEach(function(r){ if(r) streams.push(r); });
                
                // Metot C: Pixeldrain Yedek
                var pd = html.match(/https?:\/\/pixeldrain\.com\/u\/([a-zA-Z0-9]+)/);
                if(pd) streams.push({ name: "Yedek", title: "Pixeldrain", url: "https://pixeldrain.com/api/file/"+pd[1]+"?download", type: "video" });

                console.error('[Hata-Nerede] 10: Islem Bitti. Kaynak: ' + streams.length);
                return streams;
            });
        });
}

function fetchSequential(urls, i) {
    if (i >= urls.length) return Promise.resolve(null);
    // Aynı URL'yi tekrar denememek için kontrol
    if (i > 0 && urls[i] === urls[i-1]) return fetchSequential(urls, i + 1);
    
    console.error('[Hata-Nerede] 6: Deneniyor -> ' + urls[i]);
    return fetch(urls[i], { headers: HEADERS }).then(function(res) {
        if (res.status === 200) return res.text();
        return fetchSequential(urls, i + 1);
    }).catch(function() { return fetchSequential(urls, i + 1); });
}

module.exports = { getStreams: getStreams };
