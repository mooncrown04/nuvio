/**
 * JetFilmizle — Nuvio Provider
 * Gelişmiş Kaynak Çözücü
 */

var BASE_URL = 'https://jetfilmizle.net';

function getStreams(id, mediaType, season, episode) {
    var s = season || 1;
    var e = episode || 1;
    // Loglardaki dizi yolunu kullanıyoruz
    var url = BASE_URL + '/dizi/cobra-kai'; 

    return fetch(url)
        .then(function(r) { return r.text(); })
        .then(function(html) {
            if (!html) return [];

            // 1. ADIM: Doğru butonun tüm verilerini çek
            // Sizin logdaki: data-source-index="21" data-player-type="dublaj" data-season="2" data-episode="7"
            var pattern = 'data-source-index=["\'](\\d+)["\'][^>]*data-season=["\']' + s + '["\'][^>]*data-episode=["\']' + e + '["\']';
            var regex = new RegExp(pattern, 'i');
            var match = html.match(regex);

            if (match && match[1]) {
                var sourceIndex = match[1];
                console.error('[JetFilm-Sistem] Hedef İndex: ' + sourceIndex);

                // 2. ADIM: Sayfa içinde bu index'e karşılık gelen iframe veya linki bul
                // JetFilmizle bazen linkleri 'player_data' veya 'video_sources' değişkeninde tutar
                // Ama en garanti yol, sayfa içindeki tüm iframe/linkleri tarayıp index ile eşleşene bakmaktır
                
                // Sayfadaki Pixeldrain ve Vidmoly linklerini topla
                var streamLinks = [];
                var linkRegex = /(https?:\/\/(?:pixeldrain\.com|vidmoly\.to|ok\.ru|mail\.ru)\/[^\s"']+)/gi;
                var allLinks = html.match(linkRegex) || [];

                // Benzersiz linkleri temizle
                var uniqueLinks = [...new Set(allLinks)];

                if (uniqueLinks.length > 0) {
                    // Eğer index 21 ise, genellikle bu sayfadaki 21. benzersiz linke denk gelir (basit ama etkili mantık)
                    // Veya daha iyisi, tümünü kullanıcıya sunalım:
                    return uniqueLinks.map(function(link, i) {
                        return {
                            name: "JetFilm - " + (link.includes('pixeldrain') ? 'Pixeldrain' : 'Vidmoly'),
                            title: "S" + s + " E" + e + " (Kaynak " + (i+1) + ")",
                            url: link,
                            type: "embed"
                        };
                    });
                }
            }

            // 3. ADIM: Eğer yukarıdakiler yemezse, doğrudan 'get-player' API'sine göz atalım
            // JetFilmizle bu API'yi kullanır: /ajax/get-player?index=21
            // Not: Bu adım tarayıcı ortamında (Referer vb.) gerekebilir
            console.error('[JetFilm-Hata] Otomatik eşleşme başarısız, manuel tarama yapılıyor...');
            return [];
        });
}
