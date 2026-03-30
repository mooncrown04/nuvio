/**
 * Nuvio Local Scraper - PornTube Katalog Uyumlu
 * Manifest ID: pw.ers.porntube
 * Desteklenen ID'ler: ptXXXX, porndbXXXX
 */

var cheerio = require("cheerio-without-node-native");

function getStreams(id, mediaType) {
    return new Promise(function(resolve, reject) {
        
        // 1. ID Ayıklama (Manifestteki idPrefixes'e göre)
        // Katalogdan gelen ID "pt12345" veya "porndb:12345" olabilir.
        // Bizim kazıyıcının çalışması için sadece rakam/kod kısmını alıyoruz.
        var cleanId = id.replace('pt', '').replace('porndb', '').replace(':', '');
        
        // 2. PornHub Embed URL'sini Oluştur
        // Not: Eğer katalogdaki ID'ler direkt PornHub ID'si ise bu çalışır.
        var embedUrl = "https://www.pornhub.com/embed/" + cleanId;

        fetch(embedUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Referer': 'https://www.pornhub.com/'
            }
        })
        .then(function(res) { 
            return res.text(); 
        })
        .then(function(html) {
            // 3. Video URL'sini Regex ile Ayıkla (Paylaştığın adaptör mantığı)
            var regexp = /videoUrl["']?\s*:\s*["']?(https?:\\?\/\\?\/[a-z]+\.phncdn\.com[^"']+)/gi;
            var match = regexp.exec(html);

            if (!match || !match[1]) {
                return resolve([]); 
            }

            // 4. URL Normalleştirme
            var videoUrl = match[1]
                .replace(/[\\/]+/g, '/') 
                .replace(/(https?:\/)/, '$1/');

            if (videoUrl.indexOf('/') === 0) {
                videoUrl = "https:" + videoUrl;
            }

            // 5. Nuvio'ya Oynatılabilir Linki Dön
            resolve([{
                name: "PornTube Local",
                title: "HD Kaynak (Kazıyıcı)",
                url: videoUrl,
                quality: "720p",
                headers: {
                    'User-Agent': 'Mozilla/5.0',
                    'Referer': 'https://www.pornhub.com/'
                }
            }]);
        })
        .catch(function(err) {
            console.log("Local Scraper Hatası: " + err);
            resolve([]);
        });
    });
}

// Nuvio'nun fonksiyonu tanıması için exports
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { getStreams: getStreams };
} else {
    global.getStreams = getStreams;
}
