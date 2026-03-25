/**
 * 666FilmIzle Nuvio Scraper - v1.4
 * Site Link Yapısı: /film/ID-film-adi-izle/
 */

var BASE_URL = "https://666filmizle.site";

function getStreams(tmdbId, mediaType, title) {
    return new Promise(function(resolve) {
        // 1. ADIM: Arama Terimi Belirleme
        // Eğer başlık gelmiyorsa tmdbId'yi string olarak kullan
        var query = title || tmdbId;
        
        if (!query || query.length < 2) {
            console.error("[666Film] Arama için geçerli bir isim gelmedi.");
            return resolve([]);
        }

        console.log("[666Film] Aranan Terim:", query);

        // 2. ADIM: Sitede Arama Yap
        var searchUrl = BASE_URL + "/arama/?q=" + encodeURIComponent(query);

        fetch(searchUrl)
            .then(function(res) { return res.text(); })
            .then(function(html) {
                // Sitedeki film kartını yakala (Örn: /film/3094-the-gorge-izle/)
                var cardRegex = /href="(\/film\/[^"]+)"/i;
                var match = html.match(cardRegex);

                if (match && match[1]) {
                    var fullPageUrl = BASE_URL + match[1];
                    console.log("[666Film] Sayfa Bulundu:", fullPageUrl);
                    
                    // 3. ADIM: Film Sayfasına Git ve Kaynakları Çek
                    extractFromPage(fullPageUrl, resolve);
                } else {
                    console.error("[666Film] Sitede sonuç bulunamadı: " + query);
                    resolve([]);
                }
            })
            .catch(function(err) {
                console.error("[666Film] Arama Hatası:", err.message);
                resolve([]);
            });
    });
}

function extractFromPage(pageUrl, resolve) {
    fetch(pageUrl)
        .then(function(res) { return res.text(); })
        .then(function(html) {
            var streams = [];
            
            // Rapidplay Ayıklama (Senin paylaştığın Kotlin mantığı)
            var rapidRegex = /data-frame="([^"]*rapidplay\.website[^"]*)#([^"]+)"/g;
            var match;
            while ((match = rapidRegex.exec(html)) !== null) {
                var videoId = match[2]; // # işaretinden sonraki ID
                streams.push({
                    name: "⌜ Rapidplay ⌟",
                    url: "https://p.rapidplay.website/videos/" + videoId + "/master.m3u8",
                    quality: "Auto",
                    headers: { 'Referer': 'https://p.rapidplay.website/' },
                    isM3U8: true
                });
            }

            // Alternatif Iframe'ler
            var iframeRegex = /<iframe[^>]+src="([^"]+)"/g;
            while ((match = iframeRegex.exec(html)) !== null) {
                var src = match[1];
                if (src.indexOf("youtube") === -1 && src.indexOf("google") === -1) {
                    streams.push({
                        name: "⌜ Alternatif ⌟",
                        url: src,
                        quality: "Auto"
                    });
                }
            }

            console.log("[666Film] Bulunan Kaynak Sayısı:", streams.length);
            resolve(streams);
        })
        .catch(function(err) {
            console.error("[666Film] Sayfa okuma hatası:", err.message);
            resolve([]);
        });
}

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { getStreams: getStreams };
} else {
    global.getStreams = getStreams;
}
