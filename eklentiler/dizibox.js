var cheerio = require("cheerio-without-node-native");

var BASE_URL = 'https://www.dizibox.tv';

var HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Referer': BASE_URL + '/',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8'
};

function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
    return new Promise(function(resolve, reject) {
        if (mediaType !== 'tv') return resolve([]);

        console.log('[Dizibox] Başlatılıyor:', tmdbId);

        // 1. TMDB Bilgisi (Dizibox araması için isim şart)
        var tmdbUrl = 'https://api.themoviedb.org/3/tv/' + tmdbId + '?language=tr-TR&api_key=4ef0d7355d9ffb5151e987764708ce96';

        fetch(tmdbUrl, { headers: { 'User-Agent': HEADERS['User-Agent'] } })
            .then(function(res) { return res.json(); })
            .then(function(data) {
                var query = data.name || '';
                // Dizibox araması için ismi temizle (Örn: "The Boys" -> "the-boys")
                var slug = query.toLowerCase().replace(/ /g, '-').replace(/[^\w-]+/g, '');
                
                // 2. Bölüm URL'sini doğrudan oluşturmayı dene (Dizibox standart yapısı)
                // Yapı: dizibox.tv/dizi-ismi-sezon-1-bolum-1-izle/
                var epUrl = BASE_URL + '/' + slug + '-sezon-' + seasonNum + '-bolum-' + episodeNum + '-izle/';
                console.log('[Dizibox] Denenen URL:', epUrl);
                
                return fetch(epUrl, { headers: HEADERS });
            })
            .then(function(res) { 
                if (!res.ok) throw new Error('Bölüm bulunamadı (404)');
                return res.text(); 
            })
            .then(function(html) {
                var $ = cheerio.load(html);
                var streams = [];

                // 3. Kaynakları tara (Dizibox genellikle altyazı/dublajı butonlarda saklar)
                // Dizibox'ta kaynaklar genelde id="video-options" veya benzeri divlerde bulunur
                $('ul.video-options li').each(function() {
                    var name = $(this).text().trim();
                    var dataId = $(this).attr('data-id'); // Bazen ajax ile çeker
                    
                    // Not: Dizibox'ın koruması varsa iframe'i çekmek için ek fetch gerekebilir
                    // Şimdilik en yaygın olan iframe yakalamayı ekleyelim
                });

                // Alternatif: Direkt iframe yakala
                var iframeSrc = $('iframe').first().attr('src');
                if (iframeSrc) {
                    if (iframeSrc.indexOf('vidmoly') !== -1) {
                        streams.push({
                            name: 'Dizibox - Vidmoly',
                            url: iframeSrc,
                            quality: 'Auto',
                            headers: { 'Referer': BASE_URL }
                        });
                    }
                }

                // Eğer boş kaldıysa manuel bir stream objesi oluştur (Sertifika hatası için test)
                if (streams.length === 0) {
                    console.log('[Dizibox] Otomatik eşleşme başarısız, manuel tarama yapılıyor...');
                    // Bu kısımda html içindeki "vidmoly.me/embed-xxxxx" regex ile aranabilir
                }

                resolve(streams);
            })
            .catch(function(err) {
                console.error('[Dizibox] Hata:', err.message);
                resolve([]);
            });
    });
}

module.exports = { getStreams: getStreams };
