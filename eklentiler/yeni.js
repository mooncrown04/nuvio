const PROVIDER_NAME = "WatchBuddy_Debug";
const BASE_URL = "https://stream.watchbuddy.tv";

function getStreams(args) {
    var tmdbId = (typeof args === 'object') ? (args.tmdbId || args.id) : args;

    return new Promise(function(resolve) {
        if (!tmdbId) return resolve([]);

        // 1. TMDB Aşaması
        var tmdbUrl = "https://api.themoviedb.org/3/movie/" + tmdbId + "?api_key=4ef0d7355d9ffb5151e987764708ce96&language=tr-TR";
        console.error("[" + PROVIDER_NAME + "] 1. TMDB İsteği Atılıyor: " + tmdbUrl);

        fetch(tmdbUrl)
        .then(res => res.json())
        .then(data => {
            var title = data.title || data.original_title;
            var searchUrl = BASE_URL + "/search?q=" + encodeURIComponent(title);
            
            console.error("[" + PROVIDER_NAME + "] 2. Film Bulundu: " + title);
            console.error("[" + PROVIDER_NAME + "] 3. Siteye Atılan Sorgu: " + searchUrl);

            // 2. WatchBuddy Arama Sayfası İsteği
            return fetch(searchUrl, {
                headers: { "User-Agent": "Mozilla/5.0", "Accept": "text/html,application/json" }
            });
        })
        .then(res => {
            console.error("[" + PROVIDER_NAME + "] 4. Site Yanıt Kodu: " + res.status);
            return res.text();
        })
        .then(body => {
            // SİTENİN GÖNDERDİĞİ HAM VERİNİN İLK 500 KARAKTERİNİ GÖRÜYORUZ
            console.error("[" + PROVIDER_NAME + "] 5. Ham İçerik (Kısa): " + body.substring(0, 500));
            
            // Eğer paylaştığın o JSON yapısı buradaysa logda görünmesi lazım
            if (body.includes("result") || body.includes("url")) {
                console.error("[" + PROVIDER_NAME + "] BULDUM: Ham veri içinde 'url' veya 'result' anahtar kelimesi var!");
                
                // Link sökme denemesi
                var urlMatch = body.match(/"url"\s*:\s*"([^"]+)"/);
                if (urlMatch) {
                    var decoded = decodeURIComponent(urlMatch[1]);
                    console.error("[" + PROVIDER_NAME + "] Çözülen Link: " + decoded);
                    
                    resolve([{
                        name: "Debug_Found",
                        title: "Bulunan Kaynak",
                        url: decoded,
                        quality: "1080p"
                    }]);
                }
            } else {
                console.error("[" + PROVIDER_NAME + "] HATA: Gelen sayfa boş veya aranan link yapısı bulunamadı.");
                resolve([]);
            }
        })
        .catch(e => {
            console.error("[" + PROVIDER_NAME + "] KRİTİK HATA: " + e.message);
            resolve([]);
        });
    });
}

globalThis.getStreams = getStreams;
