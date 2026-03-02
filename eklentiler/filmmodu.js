var BASE_URL = 'https://www.filmmodu.ws';

// Cloudstream kodundaki gibi ana header yapısı
var HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    'Referer': BASE_URL + '/'
};

function getStreams(tmdbId, mediaType, season, episode) {
    return new Promise(function(resolve, reject) {
        if (mediaType !== 'movie') return resolve([]);

        // 1. TMDB'den film bilgisini al
        var tmdbUrl = 'https://api.themoviedb.org/3/movie/' + tmdbId + '?language=tr-TR&api_key=4ef0d7355d9ffb5151e987764708ce96';

        fetch(tmdbUrl)
            .then(function(res) { return res.json(); })
            .then(function(movieData) {
                var query = movieData.title || movieData.original_title;
                // 2. FilmModu'nda ara (Cloudstream search mantığı)
                return fetch(BASE_URL + '/film-ara?term=' + encodeURIComponent(query), { headers: HEADERS });
            })
            .then(function(res) { return res.text(); })
            .then(function(html) {
                // İlk çıkan film sonucunu yakala
                var movieMatch = html.match(/class="movie"[^>]*>[\s\S]*?href="([^"]+)"/i);
                if (!movieMatch) return resolve([]);

                var movieUrl = movieMatch[1].startsWith('http') ? movieMatch[1] : BASE_URL + movieMatch[1];
                // 3. Film sayfasını yükle (Cloudstream load mantığı)
                return fetch(movieUrl, { headers: HEADERS });
            })
            .then(function(res) { return res.text(); })
            .then(function(html) {
                // 4. Alternatifleri bul (Cloudstream loadLinks mantığı: div.alternates a)
                var alternates = [];
                var altPattern = /<div[^>]*class="alternates"[^>]*>([\s\S]*?)<\/div>/i;
                var altBlock = html.match(altPattern);
                
                if (altBlock) {
                    var linkPattern = /<a[^>]+href="([^"]+)"[^>]*>([^<]+)<\/a>/gi;
                    var match;
                    while ((match = linkPattern.exec(altBlock[1])) !== null) {
                        if (match[2].trim() !== "Fragman") {
                            alternates.push({ url: match[1], name: match[2].trim() });
                        }
                    }
                } else {
                    // Eğer alternatif bloğu yoksa ana sayfayı ekle
                    alternates.push({ url: '', name: 'Ana Kaynak' });
                }

                // Her bir alternatif için get-source isteği yap
                var promises = alternates.map(function(alt) {
                    var altUrl = alt.url ? (alt.url.startsWith('http') ? alt.url : BASE_URL + alt.url) : null;
                    var fetchTarget = altUrl || movieUrl;

                    return fetch(fetchTarget, { headers: HEADERS })
                        .then(function(r) { return r.text(); })
                        .then(function(altHtml) {
                            // Kotlin kodundaki Regex mantığı
                            var vidId = altHtml.match(/var\s+videoId\s*=\s*['"]([^'"]+)['"]/i);
                            var vidType = altHtml.match(/var\s+videoType\s*=\s*['"]([^'"]+)['"]/i);
                            
                            if (vidId && vidType) {
                                return fetch(BASE_URL + '/get-source?movie_id=' + vidId[1] + '&type=' + vidType[1], {
                                    headers: { 'X-Requested-With': 'XMLHttpRequest', 'Referer': fetchTarget }
                                }).then(function(r) { return r.json(); });
                            }
                            return null;
                        })
                        .then(function(sourceData) {
                            if (!sourceData || !sourceData.sources) return [];
                            return sourceData.sources.map(function(s) {
                                return {
                                    name: '⌜ FilmModu ⌟',
                                    title: alt.name + ' - ' + (s.label || 'HD'),
                                    url: s.src.startsWith('http') ? s.src : BASE_URL + s.src,
                                    headers: { 'Referer': BASE_URL + '/', 'User-Agent': HEADERS['User-Agent'] },
                                    is_direct: true,
                                    // MTK İşlemci dostu ayarlar
                                    hw_decode: false,
                                    force_sw: true
                                };
                            });
                        });
                });

                return Promise.all(promises);
            })
            .then(function(results) {
                var finalStreams = [].concat.apply([], results);
                resolve(finalStreams);
            })
            .catch(function(err) {
                console.error('[FilmModu] Hata:', err);
                resolve([]);
            });
    });
}

module.exports = { getStreams };
