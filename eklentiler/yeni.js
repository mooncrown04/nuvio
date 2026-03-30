/**
 * Nuvio Local Scraper - PornHub
 * Sunucusuz (Render gerektirmez) direkt uygulama içi çalışır.
 */

var cheerio = require("cheerio-without-node-native");

function getStreams(id, mediaType) {
    return new Promise(function(resolve, reject) {
        
        // 1. ID Kontrolü (Sadece PornHub ID'lerini kabul et)
        // Örn ID: "ph55e43... " veya "cb_..." ayrımı yapabilirsiniz
        var videoId = id.replace('ph_', ''); // ID'den prefix temizleme
        var embedUrl = "https://www.pornhub.com/embed/" + videoId;

        // 2. Sayfayı Fetch ile Çek
        fetch(embedUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            }
        })
        .then(function(res) { 
            return res.text(); 
        })
        .then(function(html) {
            // 3. Adaptöründeki Regex Mantığını Uygula
            // videoUrl:"https://..." formatındaki linki yakalar
            var regexp = /videoUrl["']?\s*:\s*["']?(https?:\\?\/\\?\/[a-z]+\.phncdn\.com[^"']+)/gi;
            var match = regexp.exec(html);

            if (!match || !match[1]) {
                return resolve([]); // Link bulunamadıysa boş dön
            }

            // 4. URL'yi Temizle (Senin adaptöründeki normalleştirme)
            var cleanUrl = match[1]
                .replace(/[\\/]+/g, '/') 
                .replace(/(https?:\/)/, '$1/');

            // URL "/" ile başlıyorsa düzelt
            if (cleanUrl.charAt(0) === '/') {
                cleanUrl = "https:" + cleanUrl;
            }

            // 5. Nuvio'ya Yayın Linkini Gönder
            resolve([{
                name: "PornHub (Yerel)",
                title: "Video Oynat",
                url: cleanUrl,
                quality: "720p",
                headers: {
                    'Referer': 'https://www.pornhub.com/',
                    'User-Agent': 'Mozilla/5.0'
                }
            }]);
        })
        .catch(function(err) {
            console.log("PornHub Scraper Hatası: " + err);
            resolve([]);
        });
    });
}

// Modül dışa aktarma (Nuvio standartı)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { getStreams: getStreams };
} else {
    global.getStreams = getStreams;
}
