/**
 * JetFilmizle — Nuvio Provider (Advanced Deobfuscator)
 */

var BASE_URL     = 'https://jetfilmizle.net';
var TMDB_API_KEY = '500330721680edb6d5f7f12ba7cd9023';

var HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36',
    'Referer': BASE_URL + '/'
};

function titleToSlug(t) {
    return (t || '').toLowerCase().trim()
        .replace(/ğ/g,'g').replace(/ü/g,'u').replace(/ş/g,'s')
        .replace(/ı/g,'i').replace(/İ/g,'i').replace(/ö/g,'o')
        .replace(/ç/g,'c').replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'');
}

function getStreams(id, mediaType, season, episode) {
    console.error('[JetFilm-Debug] Deobfuscator Aktif: S' + season + ' E' + episode);
    
    var tmdbId = id.toString().replace(/[^0-9]/g, '');
    var type = (mediaType === 'tv') ? 'tv' : 'movie';

    return fetch('https://api.themoviedb.org/3/' + type + '/' + tmdbId + '?api_key=' + TMDB_API_KEY + '&language=tr-TR')
        .then(function(r) { return r.json(); })
        .then(function(info) {
            var slug = titleToSlug(info.name || info.title);
            var finalUrl = BASE_URL + '/' + (mediaType === 'tv' ? 'dizi' : 'film') + '/' + slug;
            return fetch(finalUrl, { headers: HEADERS });
        })
        .then(function(r) { return r.text(); })
        .then(function(html) {
            var streams = [];
            
            // 1. ADIM: Buton Index'ini alalım (Doğru bölümü eşlemek için)
            var btnRegex = new RegExp('data-source-index="(\\d+)"[^>]*data-season="' + season + '"[^>]*data-episode="' + episode + '"', 'i');
            var btnMatch = btnRegex.exec(html);
            var targetIdx = btnMatch ? parseInt(btnMatch[1]) : -1;

            // 2. ADIM: Sayfa içindeki TÜM tırnak içindeki verileri topla
            // Obfuscated (karmaşıklaştırılmış) kodlarda URL'ler genelde parçalı durur.
            var stringRegex = /["']((?:https?:)?(?:\/\/)[^"']+)["']/gi;
            var matches = html.match(stringRegex) || [];
            
            // 3. ADIM: Agresif URL Temizleme ve Filtreleme
            matches.forEach(function(m) {
                var rawUrl = m.replace(/["']/g, '').replace(/\\/g, '');
                
                // JetFilm'in kullandığı tüm bilinen CDN ve Player yapıları
                if (/jetv|titan|videopark|d2rs|vcloud|moly|vcdn|play|embed|storage/i.test(rawUrl)) {
                    var cleanUrl = rawUrl.split('?')[0]; // Bazı query'leri temizle
                    if (!cleanUrl.endsWith('.jpg') && !cleanUrl.endsWith('.png') && !cleanUrl.endsWith('.css')) {
                        var fullUrl = cleanUrl.startsWith('//') ? 'https:' + cleanUrl : cleanUrl;
                        
                        if (!streams.some(function(s) { return s.url === fullUrl; })) {
                            streams.push({
                                name: "JetFilmizle",
                                title: '⌜ Kaynak ⌟ | HD',
                                url: fullUrl,
                                type: 'embed'
                            });
                        }
                    }
                }
            });

            // 4. ADIM: Eğer hala 0 ise, sayfa içinde gizli 'eval' paketleri varsa onları brute-force tara
            if (streams.length === 0) {
                console.error('[JetFilm-Debug] Kaynak bulunamadı, script blokları derinlemesine taranıyor...');
                // Sayfadaki tüm script içeriklerini birleştirip içinde link ara
                var scripts = html.match(/<script\b[^>]*>([\s\S]*?)<\/script>/gim) || [];
                scripts.forEach(function(s) {
                    if (s.includes('titan') || s.includes('player')) {
                        var innerMatch = s.match(/(?:https?:)?\/\/[^\s"'<>]+/gi);
                        if (innerMatch) {
                            innerMatch.forEach(function(url) {
                                if (url.includes('titan') || url.includes('jetv')) {
                                    streams.push({ name: "JetFilmizle", title: "⌜ Yedek ⌟", url: url, type: "embed" });
                                }
                            });
                        }
                    }
                });
            }

            console.error('[JetFilm-Debug] İşlem Tamam. Kaynak: ' + streams.length);
            return streams;
        })
        .catch(function(err) {
            console.error('[JetFilm-Debug] KRİTİK HATA: ' + err.message);
            return [];
        });
}

if (typeof module !== 'undefined' && module.exports) { module.exports = { getStreams: getStreams }; }
if (typeof globalThis !== 'undefined') { globalThis.getStreams = getStreams; }
