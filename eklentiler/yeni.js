function getStreams(id, mediaType, season, episode) {
    var tmdbId = id.toString().replace(/[^0-9]/g, '');
    var type = (mediaType === 'tv') ? 'tv' : 'movie';

    // 1. CİHAZDAN GELEN TÜM BİLGİLERİ BASALIM
    console.error('[JetFilm-Debug] Cihazdan Gelen Bilgiler -> ID: ' + id + ' | Tip: ' + mediaType + ' | Sezon: ' + season + ' | Bölüm: ' + episode);

    return fetch('https://api.themoviedb.org/3/' + type + '/' + tmdbId + '?api_key=' + TMDB_API_KEY + '&language=tr-TR')
        .then(function(r) { return r.json(); })
        .then(function(info) {
            // 2. TMDB'DEN DÖNEN TÜM CEVABI BASALIM
            console.error('[JetFilm-Debug] TMDB Cevabı: ' + JSON.stringify(info));

            var originalTitle = info.name || info.title;
            console.error('[JetFilm-Debug] İşlenecek Başlık: ' + originalTitle);
            
            return fetch(BASE_URL + '/filmara.php', {
                method: 'POST',
                headers: Object.assign({}, HEADERS, { 'Content-Type': 'application/x-www-form-urlencoded' }),
                body: 's=' + encodeURIComponent(originalTitle)
            })
            .then(function(res) { return res.text(); })
            .then(function(searchHtml) {
                var regex = new RegExp('href="(https?://jetfilmizle\\.net/(film|dizi)/([^"/]+))"', 'i');
                var m = regex.exec(searchHtml);
                
                var finalUrl = '';
                if (m) {
                    finalUrl = BASE_URL + '/' + m[2] + '/' + m[3];
                    if (mediaType === 'tv') {
                        finalUrl += '/sezon-' + (season || 1) + '/bolum-' + (episode || 1);
                    }
                    console.error('[JetFilm-Debug] Arama Sonucu Bulundu: ' + finalUrl);
                } else {
                    var fallbackSlug = titleToSlug(originalTitle);
                    finalUrl = (mediaType === 'tv') 
                        ? BASE_URL + '/dizi/' + fallbackSlug + '/sezon-' + (season || 1) + '/bolum-' + (episode || 1)
                        : BASE_URL + '/film/' + fallbackSlug;
                    console.error('[JetFilm-Debug] Arama Sonucu Bulunamadı, Tahmin Edilen URL: ' + finalUrl);
                }

                return fetch(finalUrl, { headers: HEADERS });
            });
        })
        .then(function(r) { return r.text(); })
        .then(function(html) {
            if (html.indexOf('Sayfa Bulunamadı') !== -1) {
                console.error('[JetFilm-Debug] Hata: Sayfa bulunamadı (404). URL hatalı olabilir.');
                return [];
            }

            var streams = [];
            // ... (Akış yakalama mantığı aynı kalıyor)
            
            console.error('[JetFilm-Debug] Toplam Bulunan Kaynak Sayısı: ' + streams.length);
            return streams;
        })
        .catch(function(e) {
            console.error('[JetFilm-Error] Yakalanan Hata: ' + e.message);
            return [];
        });
}
