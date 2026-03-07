/**
 * DiziBox Scraper - Lite Version
 * Hiçbir dış bağımlılık (cheerio, vb.) gerektirmez.
 * Android/FireTV kütüphane hatalarını bypass eder.
 */

var BASE_URL = 'https://www.dizibox.live';

// Video oynatıcı için gerekli temel headerlar
var STREAM_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    'Referer': BASE_URL + '/',
    'Origin': BASE_URL
};

/**
 * Ana fonksiyon: Nuvio tarafından çağrılır.
 */
function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
    return new Promise(function(resolve, reject) {
        // DiziBox sadece diziler için sonuç üretir
        if (mediaType !== 'tv') {
            return resolve([]);
        }

        console.log('[DiziBox] İşlem başlıyor... ID:', tmdbId);

        // 1. ADIM: TMDB'den orijinal ismi al
        var tmdbUrl = 'https://api.themoviedb.org/3/tv/' + tmdbId + '?language=tr-TR&api_key=4ef0d7355d9ffb5151e987764708ce96';

        fetch(tmdbUrl)
            .then(function(res) { return res.json(); })
            .then(function(data) {
                var query = data.name || data.original_name;
                if (!query) throw new Error('İsim bulunamadı');

                // 2. ADIM: DiziBox üzerinde arama yap
                var searchUrl = BASE_URL + '/?s=' + encodeURIComponent(query);
                console.log('[DiziBox] Aranıyor:', query);
                
                return fetch(searchUrl, { headers: { 'User-Agent': STREAM_HEADERS['User-Agent'] } });
            })
            .then(function(res) { return res.text(); })
            .then(function(html) {
                // 3. ADIM: Arama sonuçlarından dizi linkini regex ile ayıkla
                // Cheerio hatası almamak için saf RegExp kullanıyoruz
                var linkMatch = html.match(/href="(https:\/\/www\.dizibox\.live\/dizi\/[^"]+)"/);
                
                if (!linkMatch) {
                    console.log('[DiziBox] Arama sonucu bulunamadı.');
                    return resolve([]);
                }

                var diziUrl = linkMatch[1];
                // Linkten slug (dizi-adi) kısmını al
                var slug = diziUrl.split('/dizi/')[1].replace(/\//g, '');
                
                // 4. ADIM: Hedef bölüm URL'sini inşa et
                var targetUrl = BASE_URL + '/' + slug + '-' + seasonNum + '-sezon-' + episodeNum + '-bolum-hd-1-izle/';
                console.log('[DiziBox] Bölüm linkine gidiliyor:', targetUrl);

                return fetch(targetUrl, { headers: STREAM_HEADERS });
            })
            .then(function(res) { return res.text(); })
            .then(function(html) {
                // 5. ADIM: Video iframe linkini yakala
                // Farklı player tiplerine göre (king, moly, vb.) genişletilmiş regex
                var iframeMatch = html.match(/<iframe[^>]+src="([^"]+)"/i);
                
                var streams = [];
                if (iframeMatch && iframeMatch[1]) {
                    var finalUrl = iframeMatch[1];
                    if (finalUrl.startsWith('//')) finalUrl = 'https:' + finalUrl;

                    console.log('[DiziBox] Başarılı! Link bulundu.');

                    streams.push({
                        name: "⌜ DiziBox ⌟",
                        title: "1080p | Kaynak 1",
                        url: finalUrl,
                        quality: "1080p",
                        headers: STREAM_HEADERS,
                        provider: "dizibox"
                    });
                }

                resolve(streams);
            })
            .catch(function(err) {
                console.log('[DiziBox] Hata:', err.message);
                resolve([]);
            });
    });
}

// Export işlemleri
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { getStreams: getStreams };
} else {
    global.getStreams = getStreams;
}
