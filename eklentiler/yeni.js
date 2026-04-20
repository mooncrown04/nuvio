/**
 * JetFilmizle — Nuvio Provider (STANDART ŞABLON)
 * * NOT: Bu eklenti Nuvio standart şablonuna göre yapılandırılmıştır.
 * name  -> İçerik Adı (Film/Dizi İsmi)
 * title -> ⌜ Sağlayıcı ⌟ | 🇹🇷 Dil Bilgisi
 */

var BASE_URL     = 'https://jetfilmizle.net';
var TMDB_API_KEY = '500330721680edb6d5f7f12ba7cd9023';

var HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36',
    'Referer': BASE_URL + '/',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
};

// ── Yardımcılar ──────────────────────────────────────────────
function titleToSlug(t) {
    return (t || '').toLowerCase()
        .replace(/ğ/g,'g').replace(/ü/g,'u').replace(/ş/g,'s')
        .replace(/ı/g,'i').replace(/İ/g,'i').replace(/ö/g,'o')
        .replace(/ç/g,'c').replace(/â/g,'a').replace(/û/g,'u')
        .replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'');
}

function fetchTmdbInfo(tmdbId, mediaType) {
    var type = (mediaType === 'tv') ? 'tv' : 'movie';
    return fetch('https://api.themoviedb.org/3/' + type + '/' + tmdbId + '?api_key=' + TMDB_API_KEY + '&language=tr-TR')
        .then(function(r) { return r.json(); })
        .then(function(d) { return { title: d.name || d.title }; });
}

// ── Ana İşlem (Nuvio Hibrit Yapı) ─────────────────────────────
function getStreams(id, mediaType, season, episode) {
    var tmdbId = id.toString().replace(/[^0-9]/g, '');
    
    return fetchTmdbInfo(tmdbId, mediaType)
        .then(function(info) {
            var slug = titleToSlug(info.title);
            // Nuvio'da seçilen bölüme göre dinamik URL oluşturma
            var targetUrl = (mediaType === 'tv') 
                ? BASE_URL + '/dizi/' + slug + '/sezon-' + (season || 1) + '/bolum-' + (episode || 1)
                : BASE_URL + '/film/' + slug;

            console.error('[JetFilm-Debug] Hedef URL Deneniyor: ' + targetUrl);

            return fetch(targetUrl, { headers: HEADERS })
                .then(function(r) {
                    if (r.ok) return r.text();
                    
                    // Direkt link (Cobra Kai gibi) bulunamazsa arama yap
                    console.error('[JetFilm-Debug] Direkt link bulunamadı, aramaya geçiliyor: ' + info.title);
                    return fetch(BASE_URL + '/filmara.php', {
                        method: 'POST',
                        headers: Object.assign({}, HEADERS, { 'Content-Type': 'application/x-www-form-urlencoded' }),
                        body: 's=' + encodeURIComponent(info.title)
                    }).then(function(res) { return res.text(); })
                      .then(function(searchHtml) {
                          // Arama sonuçlarında hem /film/ hem /dizi/ içeren ilk mantıklı sonucu yakala
                          var regex = new RegExp('href="(https?://jetfilmizle\\.net/(film|dizi)/([^"/]+))"', 'i');
                          var m = regex.exec(searchHtml);
                          if (m) {
                              var foundSlug = m[3];
                              var foundType = m[2];
                              var finalLink = BASE_URL + '/' + foundType + '/' + foundSlug;
                              
                              if (mediaType === 'tv') {
                                  finalLink += '/sezon-' + (season || 1) + '/bolum-' + (episode || 1);
                              }
                              
                              console.error('[JetFilm-Debug] Arama ile eşleşen bulundu: ' + finalLink);
                              return fetch(finalLink, { headers: HEADERS }).then(function(r) { return r.text(); });
                          }
                          throw new Error('İçerik sitede bulunamadı');
                      });
                })
                .then(function(html) {
                    return { html: html, name: info.title };
                });
        })
        .then(function(res) {
            var streams = [];
            var m;

            // Dil Kontrolü
            var lowHtml = res.html.toLowerCase();
            var isDublaj = lowHtml.indexOf('dublaj') !== -1;
            var isAltyazi = lowHtml.indexOf('altyazı') !== -1 || lowHtml.indexOf('altyazi') !== -1;
            
            var dilEtiketi = "Türkçe";
            if (isDublaj && isAltyazi) dilEtiketi = "Dublaj & Altyazı";
            else if (isDublaj) dilEtiketi = "Dublaj";
            else if (isAltyazi) dilEtiketi = "Altyazı";

            // 1. Pixeldrain (Video Fix)
            var pdRe = /href="(https?:\/\/pixeldrain\.com\/u\/([^"]+))"/g;
            while ((m = pdRe.exec(res.html)) !== null) {
                streams.push({
                    name: res.name,
                    title: '⌜ JetFilmizle ⌟ | 🇹🇷 ' + dilEtiketi + ' (Pixeldrain)',
                    url: 'https://pixeldrain.com/api/file/' + m[2] + '?download',
                    type: 'video',
                    quality: '1080p',
                    language: 'tr',
                    headers: { 'Referer': 'https://pixeldrain.com/' }
                });
            }
            
            // 2. Iframe / Alternatif Kaynaklar
            var iframeRe = /<iframe[^>]+(?:src)="([^"]+)"/gi;
            while ((m = iframeRe.exec(res.html)) !== null) {
                var src = m[1];
                if (src.indexOf('jetv') !== -1 || src.indexOf('d2rs') !== -1) {
                    streams.push({
                        name: res.name,
                        title: '⌜ JetFilmizle ⌟ | 🇹🇷 ' + dilEtiketi + ' (Hızlı)',
                        url: src.startsWith('//') ? 'https:' + src : src,
                        type: 'embed',
                        language: 'tr'
                    });
                }
            }

            return streams;
        })
        .catch(function(err) {
            console.error('[Nuvio-Critical]: ' + err.message);
            return [];
        });
}

module.exports = { getStreams: getStreams };
