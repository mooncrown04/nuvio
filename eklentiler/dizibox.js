var cheerio = require("cheerio-without-node-native");

/**
 * DiziBox Nuvio Scraper - v1.0.0
 * Sadece 'tv' (dizi) desteği içerir.
 */

var BASE_URL = 'https://www.dizibox.live';

var WORKING_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
    'Accept-Language': 'tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7',
    'Referer': BASE_URL + '/'
};

function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
    return new Promise(function(resolve, reject) {
        
        // 1. Tip Kontrolü: Sadece dizileri işle
        if (mediaType !== 'tv') {
            console.log('[DiziBox] Sadece dizi (tv) desteklenmektedir.');
            return resolve([]);
        }

        console.log('[DiziBox] Sorgulanıyor ID:', tmdbId, 'S:', seasonNum, 'E:', episodeNum);

        // 2. TMDB üzerinden isim ve yıl bilgilerini al
        var tmdbUrl = 'https://api.themoviedb.org/3/tv/' + tmdbId + '?language=tr-TR&api_key=4ef0d7355d9ffb5151e987764708ce96';

        fetch(tmdbUrl)
            .then(function(res) { return res.json(); })
            .then(function(data) {
                var title = data.name || data.title || '';
                var year = (data.first_air_date || '').substring(0, 4);
                
                // URL dostu isim (Slug) oluşturma
                var originalName = data.original_name || title;
                var slug = originalName.toLowerCase().trim()
                    .replace(/\s+/g, '-')       // Boşlukları tire yap
                    .replace(/[^\w-]+/g, '')    // Harf, sayı ve tire dışındakileri sil
                    .replace(/--+/g, '-');      // Yan yana birden fazla tireyi tek yap

                // 3. DiziBox Bölüm URL'sini oluştur
                // Örn: https://www.dizibox.live/breaking-bad-1-sezon-1-bolum-hd-1-izle/
                var targetUrl = BASE_URL + '/' + slug + '-' + seasonNum + '-sezon-' + episodeNum + '-bolum-hd-1-izle/';

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

                // 4. Player iframe'ini bul (King/Moly player tespiti)
                var iframeSrc = $('div#video-area iframe').attr('src') || $('iframe[src*="player"]').attr('src');

                if (iframeSrc) {
                    // Protokol eksikse ekle
                    if (iframeSrc.startsWith('//')) iframeSrc = 'https:' + iframeSrc;

                    // 5. Nuvio Arayüz Formatında Nesneyi Hazırla
                    streams.push({
                        name: "DiziBox - MolyStream",
                        title: obj.title + (obj.year ? " (" + obj.year + ")" : ""),
                        url: iframeSrc,
                        quality: "1080p",
                        size: "Auto",
                        headers: {
                            'User-Agent': WORKING_HEADERS['User-Agent'],
                            'Referer': BASE_URL + '/',
                            'Origin': BASE_URL
                        },
                        provider: "dizibox" // manifest.json'daki "id" ile birebir aynı olmalı
                    });
                }

                console.log('[DiziBox] İşlem tamam, sonuç:', streams.length);
                resolve(streams);
            })
            .catch(function(err) {
                console.error('[DiziBox] Hata oluştu:', err.message);
                resolve([]); // Nuvio kuralı: Hata anında boş dizi dön
            });
    });
}

// React Native / Global Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { getStreams: getStreams };
} else {
    global.getStreams = getStreams;
}
