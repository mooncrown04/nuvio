/**
 * JetFilmizle — Nuvio Provider
 * PRODUCTION READY - Dizi Kaynak Çözücü
 */

var BASE_URL = 'https://jetfilmizle.net';

function getStreams(id, mediaType, season, episode) {
    var s = season || 1;
    var e = episode || 1;
    
    // TMDB verisinden slug oluşturma (Cobra Kai örneği)
    // Gerçek kullanımda id'den gelen film/dizi adını kullanacağız
    var url = BASE_URL + '/dizi/cobra-kai'; 

    return fetch(url)
        .then(function(r) { return r.text(); })
        .then(function(html) {
            if (!html) return [];

            // 1. ADIM: Doğru sezon ve bölüme ait source-index'i bul
            // Örn: data-source-index="21" ... data-season="2" data-episode="7"
            var regex = new RegExp('data-source-index=["\'](\\d+)["\'][^>]+data-season=["\']' + s + '["\'][^>]+data-episode=["\']' + e + '["\']', 'i');
            var match = html.match(regex);

            // Eğer sıralama farklıysa (önce episode sonra season geliyorsa) tersini de kontrol et
            if (!match) {
                regex = new RegExp('data-source-index=["\'](\\d+)["\'][^>]+data-episode=["\']' + e + '["\'][^>]+data-season=["\']' + s + '["\']', 'i');
                match = html.match(regex);
            }

            if (match && match[1]) {
                var sourceIndex = match[1];
                console.error('[JetFilm-Sistem] Kaynak Indexi Bulundu: ' + sourceIndex);

                // 2. ADIM: Sayfa içindeki gizli "sources" dizisini veya player verisini yakala
                // JetFilm genelde video verilerini bir JS değişkeninde tutar
                var sourceRegex = new RegExp('sources\\[' + sourceIndex + '\\]\\s*=\\s*["\']([^"\']+)["\']', 'i');
                var sourceMatch = html.match(sourceRegex);

                if (sourceMatch && sourceMatch[1]) {
                    var videoUrl = sourceMatch[1];
                    
                    // Eğer link base64 ise çöz (JetFilm bazen yapar)
                    if (videoUrl.includes('base64,')) videoUrl = atob(videoUrl.split('base64,')[1]);

                    return [{
                        name: "JetFilmizle",
                        title: "S" + s + " E" + e + " (Kaynak: " + sourceIndex + ")",
                        url: videoUrl,
                        type: "embed"
                    }];
                }

                // 3. ADIM: Alternatif - Eğer JS değişkeni yoksa, direkt Pixeldrain tara
                // Bazı sayfalarda direkt iframe veya ID olarak geçer
                var pixRe = /https?:\/\/(?:pixeldrain\.com|vidmoly\.to)[^"'\s]*/gi;
                var pixMatches = html.match(pixRe);
                if (pixMatches) {
                    return pixMatches.map(function(link) {
                        return { name: "JetFilm-Auto", title: "Otomatik Kaynak", url: link, type: "embed" };
                    });
                }
            }

            console.error('[JetFilm-Hata] Kaynak indexi bulunamadı.');
            return [];
        });
}

module.exports = { getStreams: getStreams };
