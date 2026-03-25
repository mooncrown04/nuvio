/**
 * 666FilmIzle Nuvio Scraper - v1.2
 * Sorun: getStreams fonksiyonuna URL yerine TMDB ID (950396) geliyor.
 * Çözüm: ID gelirse önce TMDB'den isim çekilir, sitede aranır ve gerçek URL bulunur.
 */

var BASE_URL = "https://666filmizle.site";
var TMDB_API_KEY = "4ef0d7355d9ffb5151e987764708ce96"; // TMDB Anahtarın

// --- 1. TMDB ID -> FİLM ADI ÇEVİRİCİ ---
function getMovieNameFromTMDB(tmdbId) {
    return new Promise(function(resolve) {
        var tmdbUrl = "https://api.themoviedb.org/3/movie/" + tmdbId + "?api_key=" + TMDB_API_KEY + "&language=tr-TR";
        
        console.log("[666Film-TMDB] ID'den film adı aranıyor. ID:", tmdbId);

        fetch(tmdbUrl)
            .then(function(res) { return res.json(); })
            .then(function(data) {
                if (data.title) {
                    console.log("[666Film-TMDB] Film adı bulundu:", data.title);
                    resolve(data.title);
                } else {
                    console.error("[666Film-TMDB] TMDB'den isim gelmedi!");
                    resolve(null);
                }
            })
            .catch(function(err) {
                console.error("[666Film-TMDB] TMDB Bağlantı Hatası:", err.message);
                resolve(null);
            });
    });
}

// --- 2. FİLM ADI -> 666FİLM URL ÇEVİRİCİ ---
function findUrlBySearch(query) {
    return new Promise(function(resolve) {
        var searchUrl = BASE_URL + "/arama/?q=" + encodeURIComponent(query);
        console.log("[666Film-Search] Sitede film aranıyor:", query);

        fetch(searchUrl)
            .then(function(res) { return res.text(); })
            .then(function(html) {
                var cardRegex = /<a class="film-card__link" href="([^"]+)">[\s\S]*?<h3>([^<]+)<\/h3>/;
                var match = cardRegex.exec(html);

                if (match && match[1]) {
                    var finalUrl = match[1].startsWith("http") ? match[1] : BASE_URL + match[1];
                    console.log("[666Film-Search] Gerçek site URL'si bulundu:", finalUrl);
                    resolve(finalUrl);
                } else {
                    console.error("[666Film-Search] Sitede bu isimle film bulunamadı.");
                    resolve(null);
                }
            })
            .catch(function(err) {
                console.error("[666Film-Search] Arama isteği patladı:", err.message);
                resolve(null);
            });
    });
}


// --- 3. YAYIN LİNKLERİNİ AYIKLAMA ---
function getStreams(inputUrl) {
    return new Promise(function(resolve) {
        console.log("[666Film] getStreams tetiklendi. Girdi:", inputUrl);

        // HATA ÇÖZÜMÜ: Eğer gelen veri URL değil de sayıysa (TMDB ID)
        var isTmdbId = /^\d+$/.test(inputUrl);

        var prepareUrlPromise;

        if (isTmdbId) {
            console.log("[666Film] Sayı algılandı, TMDB üzerinden URL aranacak...");
            prepareUrlPromise = getMovieNameFromTMDB(inputUrl).then(function(movieName) {
                if (!movieName) return null;
                return findUrlBySearch(movieName);
            });
        } else {
            prepareUrlPromise = Promise.resolve(inputUrl);
        }

        prepareUrlPromise.then(function(realUrl) {
            if (!realUrl) {
                console.error("[666Film] İşlenecek gerçek bir URL bulunamadı.");
                return resolve([]);
            }

            console.log("[666Film] Sayfa içeriği çekiliyor:", realUrl);

            fetch(realUrl)
                .then(function(res) { return res.text(); })
                .then(function(html) {
                    var streams = [];

                    // 1. Kısım: Rapidplay Data Frame (Kotlin: button.player-sources__btn)
                    var btnRegex = /data-frame="([^"]+)"/g;
                    var match;

                    while ((match = btnRegex.exec(html)) !== null) {
                        var iframeSrc = match[1];
                        console.log("[666Film] data-frame yakalandı:", iframeSrc);

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
                            streams.push({ name: "⌜ Player ⌟", url: iframeSrc, quality: "Auto" });
                        }
                    }

                    // 2. Kısım: Sayfadaki İframe'ler (Kotlin: iframe)
                    var iframeRegex = /<iframe[^>]+src="([^"]+)"/g;
                    while ((match = iframeRegex.exec(html)) !== null) {
                        var src = match[1];
                        if (src.indexOf("youtube") === -1 && src.indexOf("google") === -1) {
                            console.log("[666Film] Standart iframe yakalandı:", src);
                            streams.push({ name: "⌜ Alternatif ⌟", url: src, quality: "Auto" });
                        }
                    }

                    console.log("[666Film] Toplam link üretildi:", streams.length);
                    resolve(streams);
                })
                .catch(function(err) {
                    console.error("[666Film] Sayfa okuma hatası:", err.message);
                    resolve([]);
                });
        });
    });
}

// Nuvio Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { getStreams: getStreams };
} else {
    global.getStreams = getStreams;
}
