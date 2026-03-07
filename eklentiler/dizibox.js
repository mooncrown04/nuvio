var cheerio = require("cheerio-without-node-native");

// Nuvio eklenti standartlarına uygun header yapısı
var WORKING_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
    'Accept-Language': 'tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7',
    'Referer': 'https://www.dizibox.live/'
};

function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
    return new Promise(function(resolve, reject) {
        
        // 1. TMDB Sorgusu (Arama ve URL oluşturma için)
        var tmdbUrl = 'https://api.themoviedb.org/3/' + (mediaType === 'movie' ? 'movie' : 'tv') + '/' + tmdbId + '?language=tr-TR&api_key=4ef0d7355d9ffb5151e987764708ce96';

        fetch(tmdbUrl)
            .then(function(res) { return res.json(); })
            .then(function(data) {
                var title = data.name || data.title || '';
                var year = (data.first_air_date || data.release_date || '').substring(0, 4);
                
                // Slug Temizleme (URL formatına uygun hale getirme)
                var originalName = data.original_name || data.original_title || title;
                var slug = originalName.toLowerCase().trim()
                    .replace(/\s+/g, '-')       // Boşlukları - yap
                    .replace(/[^\w-]+/g, '')    // Özel karakterleri sil
                    .replace(/--+/g, '-');      // Çift çizgileri tek yap

                // 2. DiziBox URL'sini İnşa Et
                var targetUrl = '';
                if (mediaType === 'movie') {
                    targetUrl = 'https://www.dizibox.live/' + slug + '-izle/';
                } else {
                    targetUrl = 'https://www.dizibox.live/' + slug + '-' + seasonNum + '-sezon-' + episodeNum + '-bolum-hd-1-izle/';
                }

                console.log('[DiziBox] Hedef URL:', targetUrl);

                return fetch(targetUrl, { headers: WORKING_HEADERS })
                    .then(function(res) { return res.text(); })
                    .then(function(html) {
                        return { html: html, title: title, year: year };
                    });
            })
            .then(function(obj) {
                var $ = cheerio.load(obj.html);
                var streams = [];

                // 3. Iframe Player'ı Yakala
                // Not: Dizibox bazen 'iframe#diziboxPlayer' bazen 'div#video-area iframe' kullanır
                var iframeSrc = $('div#video-area iframe').attr('src') || $('iframe[src*="player"]').attr('src');

                if (iframeSrc) {
                    if (iframeSrc.startsWith('//')) iframeSrc = 'https:' + iframeSrc;

                    // 4. Manifest'teki id'ye (dizibox) uygun paketleme
                    streams.push({
                        name: "DiziBox - MolyStream",
                        title: obj.title + (obj.year ? " (" + obj.year + ")" : ""),
                        url: iframeSrc,
                        quality: "1080p",
                        size: "Auto",
                        headers: {
                            'User-Agent': WORKING_HEADERS['User-Agent'],
                            'Referer': 'https://www.dizibox.live/',
                            'Origin': 'https://www.dizibox.live'
                        },
                        provider: "dizibox" // manifest.json'daki "id" ile birebir aynı olmalı
                    });
                }

                console.log('[DiziBox] Arayüze aktarılan sonuç:', streams.length);
                resolve(streams);
            })
            .catch(function(err) {
                console.error('[DiziBox] Hata:', err.message);
                resolve([]); // Nuvio kuralı: Hata olsa dahi boş dizi dön ki uygulama donmasın
            });
    });
}

// React Native / Nuvio Export Standardı
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { getStreams: getStreams };
} else {
    global.getStreams = getStreams;
}
