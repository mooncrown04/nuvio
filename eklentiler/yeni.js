/**
 * 666FilmIzle Nuvio Scraper - v1.0
 * Sadece paylaşılan Kotlin dosyasındaki mantık uyarlandı.
 */

// Not: Nuvio ortamında HTML parçalamak için cheerio yoksa regex kullanılabilir.
// Burada standart cheerio/JSDOM mantığıyla yapı kuruldu.

var BASE_URL = "https://666filmizle.site";

/**
 * Arama Fonksiyonu (Search API)
 */
function search(query) {
    return new Promise(function(resolve) {
        var searchUrl = BASE_URL + "/arama/?q=" + encodeURIComponent(query);
        
        fetch(searchUrl)
            .then(function(res) { return res.text(); })
            .then(function(html) {
                // Regex ile film kartlarını yakalıyoruz (Kotlin: a.film-card__link)
                var results = [];
                var cardRegex = /<a class="film-card__link" href="([^"]+)">[\s\S]*?<h3>([^<]+)<\/h3>/g;
                var match;

                while ((match = cardRegex.exec(html)) !== null) {
                    results.push({
                        title: match[2].trim(),
                        url: match[1].startsWith("http") ? match[1] : BASE_URL + match[1],
                        type: "movie"
                    });
                }
                resolve(results);
            })
            .catch(function(err) {
                console.error("[666Film] Arama Hatası:", err.message);
                resolve([]);
            });
    });
}

/**
 * Yayın Linklerini Çekme (loadLinks)
 */
function getStreams(url) {
    return new Promise(function(resolve) {
        console.log("[666Film] Kaynaklar aranıyor:", url);

        fetch(url)
            .then(function(res) { return res.text(); })
            .then(function(html) {
                var streams = [];
                
                // 1. ADIM: Rapidplay ve data-frame butonları (Kotlin: button.player-sources__btn)
                var btnRegex = /data-frame="([^"]+)"/g;
                var match;

                while ((match = btnRegex.exec(html)) !== null) {
                    var iframeSrc = match[1];

                    // Kotlin: if (iframeSrc.contains("rapidplay.website"))
                    if (iframeSrc.indexOf("rapidplay.website") !== -1) {
                        var id = iframeSrc.split("#").pop();
                        if (id && id !== iframeSrc) {
                            streams.push({
                                name: "⌜ Rapidplay ⌟",
                                url: "https://p.rapidplay.website/videos/" + id + "/master.m3u8",
                                quality: "Auto",
                                headers: { 'Referer': 'https://p.rapidplay.website/' },
                                isM3U8: true
                            });
                        }
                    } else {
                        // Diğer standart iframe'ler
                        streams.push({
                            name: "⌜ Player ⌟",
                            url: iframeSrc,
                            quality: "Auto"
                        });
                    }
                }

                // 2. ADIM: Sayfa içindeki direkt iframe'ler (Kotlin: div.player-content iframe)
                var iframeRegex = /<iframe[^>]+src="([^"]+)"/g;
                while ((match = iframeRegex.exec(html)) !== null) {
                    var src = match[1];
                    // YouTube fragmanlarını ele (Kotlin: !iframeSrc.contains("youtube"))
                    if (src.indexOf("youtube") === -1 && src.indexOf("google") === -1) {
                        streams.push({
                            name: "⌜ Alternatif ⌟",
                            url: src,
                            quality: "Auto"
                        });
                    }
                }

                console.log("[666Film] Toplam Bulunan:", streams.length);
                resolve(streams);
            })
            .catch(function(err) {
                console.error("[666Film] Yükleme Hatası:", err.message);
                resolve([]);
            });
    });
}

// --- NUVIO EXPORTS ---
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { 
        getStreams: getStreams,
        search: search 
    };
} else {
    global.getStreams = getStreams;
    global.search = search;
}
