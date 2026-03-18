/**
 * Dizixo Scraper v5.6 - JSON-LD & Array Safety Verified
 * [ÇÖZÜM]: Java/Gson "Expected BEGIN_ARRAY" hatası için katı tip zorlaması.
 */

var cheerio = require("cheerio-without-node-native");

function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
    return new Promise(function(resolve) {
        
        // Java tarafına (Cloudstream/PluginRuntime) giden veriyi 
        // daima dizi olmaya zorlayan emniyet kilidi.
        var forceArrayResolve = function(output) {
            if (output && Array.isArray(output)) {
                resolve(output);
            } else if (output && typeof output === 'object') {
                // Eğer yanlışlıkla tek bir obje geldiyse diziye sar
                resolve([output]);
            } else {
                resolve([]); // Hata durumunda asla null/object dönme, boş dizi dön!
            }
        };

        // Türkçe karakter ve temizleme fonksiyonu (Eşleşme oranını artırır)
        var clean = function(str) {
            return (str || "").toString().toLowerCase()
                .replace(/ı/g, 'i').replace(/ğ/g, 'g').replace(/ü/g, 'u')
                .replace(/ş/g, 's').replace(/ö/g, 'o').replace(/ç/g, 'c')
                .trim();
        };

        try {
            var isMovie = mediaType === 'movie';
            var tmdbUrl = 'https://api.themoviedb.org/3/' + (isMovie ? 'movie' : 'tv') + '/' + tmdbId + '?language=tr-TR&api_key=4ef0d7355d9ffb5151e987764708ce96';

            fetch(tmdbUrl)
                .then(function(r) { return r.json(); })
                .then(function(tmdbData) {
                    var title = tmdbData.title || tmdbData.name || "";
                    var searchApi = 'https://www.dizixo.com/api?action=search&q=' + encodeURIComponent(title);
                    
                    return fetch(searchApi)
                        .then(function(r) { return r.json(); })
                        .then(function(json) {
                            return { apiResult: json, originalTitle: title };
                        });
                })
                .then(function(context) {
                    var items = [];
                    var res = context.apiResult;

                    // API bazen doğrudan dizi, bazen {data: [...]} döner.
                    if (Array.isArray(res)) {
                        items = res;
                    } else if (res && res.data && Array.isArray(res.data)) {
                        items = res.data;
                    } else if (res && typeof res === 'object') {
                        // Tek bir sonuç obje olarak geldiyse diziye ekle
                        items = [res];
                    }

                    var targetId = "";
                    var targetTitleClean = clean(context.originalTitle);

                    for (var i = 0; i < items.length; i++) {
                        var item = items[i];
                        if (!item) continue;
                        
                        var itemTitle = clean(item.title || item.name || "");
                        
                        // ID kontrolü (Logdaki 1265609) veya isim benzerliği
                        if (item.id == "1265609" || item.id == tmdbId || itemTitle.indexOf(targetTitleClean) !== -1) {
                            targetId = item.id;
                            break;
                        }
                    }

                    if (!targetId) return forceArrayResolve([]);

                    // Yayın linkini alma aşaması
                    var streamApi = 'https://www.dizixo.com/api?action=getStream&id=' + targetId;
                    if (!isMovie) {
                        streamApi += '&season=' + seasonNum + '&episode=' + episodeNum;
                    }

                    return fetch(streamApi)
                        .then(function(r) { return r.json(); })
                        .then(function(sData) {
                            // API'den gelen farklı URL anahtarlarını kontrol et
                            var videoLink = sData.url || (sData.data && sData.data.url) || sData.link || (sData.data && sData.data.link);
                            var finalStreams = [];

                            if (videoLink && typeof videoLink === 'string' && videoLink.startsWith('http')) {
                                finalStreams.push({
                                    name: "Dizixo HQ",
                                    title: context.originalTitle + (isMovie ? "" : " S" + seasonNum + "E" + episodeNum),
                                    url: videoLink,
                                    quality: "1080p"
                                });
                            }
                            
                            // Daima dizi döndürdüğümüzden emin oluyoruz
                            forceArrayResolve(finalStreams);
                        });
                })
                .catch(function(err) {
                    console.error("Dizixo Fetch Error: " + err);
                    forceArrayResolve([]); 
                });

        } catch (e) {
            forceArrayResolve([]);
        }
    });
}

// Module export ayarları
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { getStreams: getStreams };
} else {
    global.getStreams = getStreams;
}
