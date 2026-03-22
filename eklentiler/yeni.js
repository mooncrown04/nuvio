/**
 * Nuvio Local Scraper - İzle.plus (FilmciBaba) 
 * Hepsi Bir Arada: Proxy + Doğrudan Erişim + Derin Tarama
 */

var cheerio = require("cheerio-without-node-native");

const TMDB_API_KEY = '500330721680edb6d5f7f12ba7cd9023';
const WATCHBUDDY_BASE = "https://stream.watchbuddy.tv/icerik/FilmciBaba";
const DIRECT_BASE = "https://izle.plus";

// Tarayıcı gibi görünmek için gerekli başlıklar
const HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
    'Referer': DIRECT_BASE + '/'
};

function getStreams(inputData) {
    return new Promise(function(resolve) {
        console.error("[Eklenti] === SÜREÇ BAŞLATILDI ===");
        
        // 1. TMDB ID Yakala (inputData sayı veya obje olabilir)
        var id = (typeof inputData === 'object' ? (inputData.imdbId || inputData.tmdbId) : inputData).toString();
        if (!id || id === "undefined") {
            console.error("[Eklenti] Hata: Geçersiz ID");
            return resolve([]);
        }

        // 2. TMDB'den Film İsmini Çek (URL oluşturmak için)
        fetch('https://api.themoviedb.org/3/movie/' + id + '?api_key=' + TMDB_API_KEY + '&language=tr-TR')
            .then(function(r) { return r.json(); })
            .then(function(movie) {
                if (!movie.title) throw new Error("Film adı bulunamadı.");

                // URL Dostu İsim (Slug) Oluştur
                var slug = movie.title.toLowerCase()
                    .replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ş/g, 's')
                    .replace(/ı/g, 'i').replace(/ö/g, 'o').replace(/ç/g, 'c')
                    .replace(/ /g, '-').replace(/[^\w-]+/g, '');
                
                var izleUrl = DIRECT_BASE + "/" + slug + "/";
                var buddyUrl = WATCHBUDDY_BASE + "?url=" + encodeURIComponent(izleUrl);
                
                console.error("[Eklenti] Hedef Sayfa: " + izleUrl);

                // 3. Strateji: Önce WatchBuddy Proxy, sonra Doğrudan Siteyi dene
                return Promise.all([
                    fetch(buddyUrl, { headers: HEADERS }).then(function(r) { return r.text(); }).catch(function() { return ""; }),
                    fetch(izleUrl, { headers: HEADERS }).then(function(r) { return r.text(); }).catch(function() { return ""; })
                ]);
            })
            .then(function(contents) {
                var streams = [];
                
                contents.forEach(function(html, index) {
                    if (!html || html.length < 500) return; // Boş içerikleri atla

                    var $ = cheerio.load(html);
                    var sourceName = index === 0 ? "Buddy" : "Direct";

                    // A) Iframe ve Data-Src taraması
                    $('iframe, [data-src], .video-embed iframe').each(function(i, elem) {
                        var src = $(elem).attr('src') || $(elem).attr('data-src');
                        if (src && src.includes('http') && !src.includes('google')) {
                            streams.push({
                                name: "FilmciBaba (" + sourceName + " " + (i+1) + ")",
                                url: src,
                                quality: "1080p",
                                headers: { 'Referer': DIRECT_BASE + '/', 'Origin': DIRECT_BASE }
                            });
                        }
                    });

                    // B) Regex ile Gizli Link Avcılığı (m3u8, mp4, hotstream vb.)
                    // JSON örneğindeki gibi şifreli veya doğrudan m3u8 linklerini yakalar
                    var pattern = /https?:\/\/[^\s'"]+\.(?:m3u8|mp4|ts)[^\s'"]*/gi;
                    var matches = html.match(pattern);
                    if (matches) {
                        matches.forEach(function(link) {
                            streams.push({
                                name: "FilmciBaba (" + sourceName + " Auto)",
                                url: link,
                                quality: "Auto",
                                isM3u8: link.includes('m3u8'),
                                headers: { 'Referer': DIRECT_BASE + '/' }
                            });
                        });
                    }
                });

                // 4. Sonuçları Temizle (Aynı linkleri sil)
                var unique = streams.filter(function(v, i, a) {
                    return a.findIndex(function(t) { return t.url === v.url; }) === i;
                });

                console.error("[Eklenti] İşlem Bitti. Bulunan Kaynak Sayısı: " + unique.length);
                resolve(unique);
            })
            .catch(function(err) {
                console.error("[Eklenti] KRİTİK HATA: " + err.message);
                resolve([]);
            });
    });
}

// Modül export ayarları
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { getStreams: getStreams };
} else {
    global.getStreams = getStreams;
}
