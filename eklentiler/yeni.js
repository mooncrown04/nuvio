/**
 * Nuvio Local Scraper - PornHub & Chaturbate
 * Sunucu gerektirmez, doğrudan uygulama içinde çalışır.
 */

// Nuvio'nun içindeki cheerio kütüphanesini çağırıyoruz
var cheerio = require("cheerio-without-node-native");

/**
 * Nuvio bu fonksiyonu otomatik tetikler.
 * @param {string} id - İçeriğin ID'si (Örn: cb_modeladi veya ph_videoid)
 */
function getStreams(id, mediaType) {
    return new Promise(function(resolve, reject) {
        
        // 1. ID Kontrolü (PornHub mu yoksa Chaturbate mi?)
        if (id.indexOf('ph_') !== -1) {
            // PORNHUB MANTIĞI
            var videoId = id.replace('ph_', '');
            var embedUrl = "https://www.pornhub.com/embed/" + videoId;

            fetch(embedUrl, {
                headers: { 'User-Agent': 'Mozilla/5.0' }
            })
            .then(function(res) { return res.text(); })
            .then(function(html) {
                // Senin paylaştığın Regex mantığı
                var regexp = /videoUrl["']?\s*:\s*["']?(https?:\\?\/\\?\/[a-z]+\.phncdn\.com[^"']+)/gi;
                var match = regexp.exec(html);

                if (match && match[1]) {
                    var finalUrl = match[1].replace(/[\\/]+/g, '/').replace(/(https?:\/)/, '$1/');
                    resolve([{
                        name: "PornHub Local",
                        title: "HD İzle",
                        url: finalUrl,
                        quality: "720p"
                    }]);
                } else {
                    resolve([]);
                }
            })
            .catch(function() { resolve([]); });

        } else if (id.indexOf('cb_') !== -1) {
            // CHATURBATE MANTIĞI
            var user = id.replace('cb_', '');
            var apiUrl = "https://chaturbate.com/get_edge_hls_url_ajax/";

            fetch(apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'X-Requested-With': 'XMLHttpRequest',
                    'Referer': 'https://chaturbate.com/' + user
                },
                body: "room_slug=" + user + "&bandwidth=high"
            })
            .then(function(res) { return res.json(); })
            .then(function(json) {
                if (json.success && json.url) {
                    resolve([{
                        name: "Chaturbate Canlı",
                        title: user,
                        url: json.url,
                        live: true
                    }]);
                } else {
                    resolve([]);
                }
            })
            .catch(function() { resolve([]); });
        } else {
            resolve([]);
        }
    });
}

// Nuvio'nun fonksiyonu tanıması için dışa aktar
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { getStreams: getStreams };
} else {
    global.getStreams = getStreams;
}
