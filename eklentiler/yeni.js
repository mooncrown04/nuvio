function getStreams(id, mediaType, season, episode) {
    // --- KRİTİK HATA ÖNLEYİCİ ---
    if (!id) {
        console.error('[JetFilm-DEBUG] !!! KRİTİK HATA: "id" parametresi undefined geldi. Fonksiyon durduruldu.');
        return [];
    }

    var tmdbId = id.toString().replace(/[^0-9]/g, '');
    var type = (mediaType === 'tv') ? 'tv' : 'movie';

    return fetch('https://api.themoviedb.org/3/' + type + '/' + tmdbId + '?api_key=' + TMDB_API_KEY + '&language=tr-TR')
        .then(function(r) { return r.json(); })
        .then(function(info) {
            
            // --- TÜM BİLGİLERİ TEK SEFERDE BASAN LOG ---
            var debugInfo = {
                cihazdan_gelen_id: id,
                temizlenmis_tmdbId: tmdbId,
                medya_tipi: mediaType,
                sezon: season,
                bolum: episode,
                tmdb_donen_data: info
            };
            
            console.error('\n' + '━'.repeat(50) + 
                          '\n[JETFILMIZLE DEBUG PANEL]\n' + 
                          JSON.stringify(debugInfo, null, 2) + 
                          '\n' + '━'.repeat(50));

            var originalTitle = info.name || info.title;
            if (!originalTitle) {
                console.error('[JetFilm-Debug] HATA: TMDB başlık döndürmedi!');
                return [];
            }

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
                } else {
                    var fallbackSlug = titleToSlug(originalTitle);
                    finalUrl = (mediaType === 'tv') 
                        ? BASE_URL + '/dizi/' + fallbackSlug + '/sezon-' + (season || 1) + '/bolum-' + (episode || 1)
                        : BASE_URL + '/film/' + fallbackSlug;
                }

                console.error('[JetFilm-Debug] Hedef Adres: ' + finalUrl);
                return fetch(finalUrl, { headers: HEADERS });
            });
        })
        .then(function(r) { return r.text(); })
        .then(function(html) {
            if (html.indexOf('Sayfa Bulunamadı') !== -1) {
                console.error('[JetFilm-Debug] Hata: 404 - Sayfa yok.');
                return [];
            }

            var streams = [];
            var dil = (html.indexOf('dublaj') !== -1) ? "Dublaj" : "Altyazı";

            var pdRe = /href="(https?:\/\/pixeldrain\.com\/u\/([^"]+))"/g;
            var m;
            while ((m = pdRe.exec(html)) !== null) {
                streams.push({
                    name: "JetFilmizle",
                    title: '⌜ Pixeldrain ⌟ | 🇹🇷 ' + dil,
                    url: 'https://pixeldrain.com/api/file/' + m[2] + '?download',
                    type: 'video',
                    quality: '1080p',
                    headers: { 'Referer': 'https://pixeldrain.com/' }
                });
            }

            var iframeRe = /<iframe[^>]+src="([^"]+)"/gi;
            while ((m = iframeRe.exec(html)) !== null) {
                var src = m[1];
                if (src.indexOf('jetv') !== -1 || src.indexOf('d2rs') !== -1) {
                    streams.push({
                        name: "JetFilmizle",
                        title: '⌜ Hızlı Kaynak ⌟ | 🇹🇷 ' + dil,
                        url: src.startsWith('//') ? 'https:' + src : src,
                        type: 'embed'
                    });
                }
            }
            return streams;
        })
        .catch(function(e) {
            console.error('[JetFilm-Error] İşlem Hatası: ' + e.message);
            return [];
        });
}
