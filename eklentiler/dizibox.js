/**
 * Provider: Hybrid (v37 - Strict Name Match & Dizipal Fix)
 */
function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
    var ddiziUrl = "https://www.ddizi.im";
    var dizipalUrl = "https://dizipal.bar";
    var userAgent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36";

    return new Promise(function(resolve) {
        if (mediaType !== 'tv') return resolve([]);

        var tmdbUrl = 'https://api.themoviedb.org/3/tv/' + tmdbId + '?api_key=4ef0d7355d9ffb5151e987764708ce96&language=tr-TR';
        
        fetch(tmdbUrl).then(function(res) { return res.json(); }).then(function(data) {
            var name = data.name || data.original_name || "";
            if (!name) return resolve([]);

            // İki siteye de eş zamanlı ama kontrollü istek at
            var searchName = name.split(' ')[0]; // Ana kelimeyi al (Örn: "Dark")

            // DDizi Araması
            var ddiziSearch = fetch(ddiziUrl + "/arama/", {
                method: "POST",
                headers: { "Content-Type": "application/x-www-form-urlencoded", "User-Agent": userAgent, "Referer": ddiziUrl },
                body: "arama=" + encodeURIComponent(name)
            }).then(function(r) { return r.text(); });

            // Dizipal Araması
            var dizipalSearch = fetch(dizipalUrl + "/?s=" + encodeURIComponent(name), {
                headers: { "User-Agent": userAgent }
            }).then(function(r) { return r.text(); });

            return Promise.all([ddiziSearch, dizipalSearch, name]);
        }).then(function(results) {
            var ddiziHtml = results[0];
            var dizipalHtml = results[1];
            var originalName = results[2].toLowerCase();
            
            var streams = [];

            // --- DIZIPAL AYIKLAMA (Gelişmiş) ---
            if (dizipalHtml) {
                // Sadece tam isim eşleşen linkleri topla
                var dizipalRegex = new RegExp('href="([^"]+)"[^>]*>([^<]*' + originalName + '[^<]*)', 'gi');
                var dMatch;
                while ((dMatch = dizipalRegex.exec(dizipalHtml)) !== null) {
                    var link = dMatch[1];
                    var text = dMatch[2].toLowerCase();
                    // "Dark Wolf" gibi alakasız sonuçları ele, tam sezon/bölüm kontrolü yap
                    if (text.indexOf(originalName) !== -1 && link.indexOf(seasonNum + "-sezon-" + episodeNum + "-bolum") !== -1) {
                        streams.push({ name: "Dizipal", url: link, quality: "720p" });
                        break;
                    }
                }
            }

            // --- DDizi AYIKLAMA (Kotlin Mantığı) ---
            if (ddiziHtml) {
                var ddiziRegex = new RegExp('href="([^"]*' + episodeNum + '-(?:bolum|Bölüm)[^"]*)"', 'i');
                var ddMatch = ddiziHtml.match(ddiziRegex);
                if (ddMatch) {
                    var fullLink = ddMatch[1].indexOf('http') === 0 ? ddMatch[1] : ddiziUrl + (ddMatch[1][0] === '/' ? '' : '/') + ddMatch[1];
                    streams.push({ name: "DDizi", url: fullLink, quality: "1080p" });
                }
            }

            // Eğer linkler bulunduysa, ilk geçerli olanın içine girip asıl videoyu çekmemiz gerekecek
            // Şimdilik sadece linkleri bulup bulmadığımızı test edelim
            resolve(streams);
        }).catch(function() {
            resolve([]);
        });
    });
}

if (typeof module !== 'undefined') { module.exports = { getStreams: getStreams }; }
globalThis.getStreams = getStreams;
