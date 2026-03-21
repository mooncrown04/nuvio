/**
 * Nuvio Local Scraper - izle.plus / watchbuddy.tv
 */

var cheerio = require("cheerio-without-node-native");

const WORKING_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
    'Referer': 'https://izle.plus/'
};

function getStreams(searchResult) {
    return new Promise(function(resolve) {
        var streams = [];
        
        // searchResult.url genellikle izle.plus linkidir (Örn: Ajan Zeta)
        // Dosya 4.js'deki yapıya göre watchbuddy üzerinden çekim yapılır
        var targetUrl = "https://stream.watchbuddy.tv/icerik/FilmciBaba?url=" + encodeURIComponent(searchResult.url);

        fetch(targetUrl, { headers: WORKING_HEADERS })
            .then(function(res) { return res.text(); })
            .then(function(pageHtml) {
                var $ = cheerio.load(pageHtml);
                
                // Sayfa içindeki video kaynaklarını bulma (Örn: iframe veya direct link)
                // 4.js dosyasındaki HTML içeriğine göre ilgili seçiciler buraya eklenir
                var videoSource = $("iframe").attr("src") || ""; 

                if (videoSource) {
                    streams.push({
                        name: "İzlePlus - Sunucu",
                        title: searchResult.title,
                        url: videoSource,
                        quality: "1080p",
                        headers: WORKING_HEADERS,
                        provider: "izleplus_scraper"
                    });
                }

                resolve(streams);
            })
            .catch(function(err) {
                console.error('Hata:', err.message);
                resolve([]); // Hata durumunda boş liste dönülür
            });
    });
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { getStreams: getStreams };
} else {
    global.getStreams = getStreams;
}
