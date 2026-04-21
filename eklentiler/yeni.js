/**
 * JetFilmizle — Nuvio Provider
 * FINAL ANALYZER (KEY HUNTER)
 */

var BASE_URL = 'https://jetfilmizle.net';

function getStreams(id, mediaType, season, episode) {
    var s = season || 1;
    var e = episode || 1;
    
    // Test için Cobra Kai üzerinden devam
    var url = BASE_URL + '/dizi/cobra-kai'; 

    console.error('[JetFilm-Avcı] İzleme Başladı: S' + s + ' E' + e);

    return fetch(url)
        .then(function(r) { return r.text(); })
        .then(function(html) {
            
            // 1. ADIM: Bölüm listesinin olduğu HTML bloğunu izole et
            // data-episode="7" olan div'in tüm içeriğini ve özniteliklerini dök
            var targetEpisodePattern = new RegExp('<[^>]+data-episode=["\']' + e + '["\'][^>]*>', 'gi');
            var match;
            while ((match = targetEpisodePattern.exec(html)) !== null) {
                console.error('[HEDEF-BULUNDU] ' + match[0]);
            }

            // 2. ADIM: Tüm sayfa boyunca "id=" veya "post=" içeren sayısal değerleri bul
            // Genelde video çekmek için kullanılan benzersiz kimlik budur
            var idHunter = /(?:id|post|data-id|data-post)=["'](\d+)["']/gi;
            while ((match = idHunter.exec(html)) !== null) {
                console.error('[POTANSIYEL-ID] Bulundu: ' + match[1] + ' (Öznitelik: ' + match[0] + ')');
            }

            // 3. ADIM: Sayfadaki tüm script src'lerini listele (kontrol için)
            var scripts = html.match(/src=["']([^"']+\.js[^"']*)["']/gi);
            if (scripts) {
                scripts.forEach(function(s) {
                    if(s.includes('assets')) console.error('[SCRIPT-DOSYASI] ' + s);
                });
            }

            return []; 
        });
}

module.exports = { getStreams: getStreams };
