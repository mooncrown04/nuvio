var BASE_URL = 'https://www.dizibox.tv';

var HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Referer': BASE_URL + '/'
};

// Yardımcı Fonksiyonlar
function findFirst(html, pattern) {
    var regex = new RegExp(pattern, 'i');
    var match = regex.exec(html);
    return match ? match : null;
}

function findAll(html, pattern) {
    var results = [];
    var regex = new RegExp(pattern, 'gi');
    var match;
    while ((match = regex.exec(html)) !== null) {
        results.push(match);
    }
    return results;
}

// 1. ADIM: Dizibox üzerinde arama yapma
function searchDizibox(title) {
    var searchUrl = BASE_URL + '/?s=' + encodeURIComponent(title);
    console.log('[Dizibox] Arama yapılıyor:', searchUrl);

    return fetch(searchUrl, { headers: HEADERS })
        .then(function(res) { return res.text(); })
        .then(function(html) {
            var results = [];
            // Dizibox arama sonuç yapısı: <div class="result-item">...<a href="LINK">TITLE</a>
            var linkPattern = /<div class="result-item">[\s\S]*?<a href="(https:\/\/www\.dizibox\.tv\/[^"]+)">([\s\S]*?)<\/a>/gi;
            var match;
            while ((match = linkPattern.exec(html)) !== null) {
                results.push({ 
                    title: match[2].replace(/<[^>]*>?/gm, '').trim(), 
                    url: match[1] 
                });
            }
            return results;
        });
}

// 2. ADIM: Bölüm URL'sini oluşturma (Dizi ise)
function getEpisodeUrl(contentUrl, seasonNum, episodeNum) {
    // Örnek: dizibox.tv/dizi-adi/ -> dizibox.tv/dizi-adi-season-bolum-izle/
    var slug = contentUrl.replace(/\/$/, '').split('/').pop();
    return BASE_URL + '/' + slug + '-' + seasonNum + '-sezon-' + episodeNum + '-bolum-izle/';
}

// 3. ADIM: Sayfadan video linklerini (iframe) çekme
function extractStreams(targetUrl) {
    console.log('[Dizibox] İçerik yükleniyor:', targetUrl);
    return fetch(targetUrl, { headers: HEADERS })
        .then(function(res) { return res.text(); })
        .then(function(html) {
            var streams = [];
            // Sayfadaki tüm iframe (video kaynakları)
            var iframePattern = /<iframe[^>]+src="([^"]+)"/gi;
            var match;
            while ((match = iframePattern.exec(html)) !== null) {
                var src = match[1];
                if (src.startsWith('//')) src = 'https:' + src;
                
                // Kaynak adını tahmin et (vidmoly, odysee vb.)
                var name = "Kaynak " + (streams.length + 1);
                if (src.includes('vidmoly')) name = "Vidmoly";
                else if (src.includes('ok.ru')) name = "Ok.ru";

                streams.push({
                    name: '⌜ Dizibox ⌟ | ' + name,
                    url: src,
                    quality: 'HD',
                    headers: HEADERS
                });
            }
            return streams;
        });
}

// ANA FONKSİYON: TMDB üzerinden tetiklenen ana motor
function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
    return new Promise(function(resolve) {
        // TMDB'den isim bilgisi al
        var tmdbType = mediaType === 'movie' ? 'movie' : 'tv';
        var tmdbUrl = 'https://api.themoviedb.org/3/' + tmdbType + '/' + tmdbId + 
                     '?language=tr-TR&api_key=4ef0d7355d9ffb5151e987764708ce96';

        fetch(tmdbUrl)
            .then(function(res) { return res.json(); })
            .then(function(data) {
                var title = data.title || data.name;
                if (!title) return resolve([]);

                return searchDizibox(title)
                    .then(function(results) {
                        if (!results || results.length === 0) return resolve([]);
                        
                        // En iyi eşleşmeyi al (ilk sonuç)
                        var best = results[0];
                        var targetUrl = best.url;

                        // Eğer TV dizisiyse bölüm linkine git
                        if (mediaType === 'tv' && seasonNum && episodeNum) {
                            targetUrl = getEpisodeUrl(best.url, seasonNum, episodeNum);
                        }

                        return extractStreams(targetUrl);
                    })
                    .then(function(streams) {
                        resolve(streams || []);
                    });
            })
            .catch(function(err) {
                console.error('[Dizibox] Hata:', err);
                resolve([]);
            });
    });
}

// Uygulama Entegrasyonu
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { getStreams };
} else {
    globalThis.getStreams = getStreams;
}
