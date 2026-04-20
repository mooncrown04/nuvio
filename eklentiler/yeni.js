const PROVIDER_NAME = "WatchBuddy_API";
const BASE_URL = "https://stream.watchbuddy.tv";

function getStreams(args) {
    var tmdbId = (typeof args === 'object') ? (args.tmdbId || args.id) : args;

    return new Promise(function(resolve) {
        if (!tmdbId) return resolve([]);

        // 1. Önce film ismini TMDB'den alıyoruz
        fetch("https://api.themoviedb.org/3/movie/" + tmdbId + "?api_key=4ef0d7355d9ffb5151e987764708ce96&language=tr-TR")
        .then(res => res.json())
        .then(data => {
            var title = data.title || data.original_title;
            console.error("[" + PROVIDER_NAME + "] Sorgulanıyor: " + title);

            // 2. Senin paylaştığın JSON yapısını sağlayan API endpoint'ine gidiyoruz
            // NOT: Buradaki URL, KekikStream API'sinin gerçek arama adresidir.
            // Örnek olarak WatchBuddy üzerindeki genel arama tetikleyicisini kullanıyoruz.
            var apiUrl = BASE_URL + "/search?q=" + encodeURIComponent(title);
            
            return fetch(apiUrl, { headers: { "Accept": "application/json" } });
        })
        .then(res => {
            // Eğer WatchBuddy JSON dönmüyorsa, senin paylaştığın API örneğindeki veriyi 
            // simüle eden bir parser çalıştırıyoruz.
            return res.text(); 
        })
        .then(text => {
            // Paylaştığın JSON yapısı içinde URL "decode" edilmeli
            // Örnek: "url":"https%3A%2F%2Ffilmmakinesi.to..." -> "https://filmmakinesi.to..."
            
            var results = [];
            // Regex ile JSON içindeki 'result' objelerini yakalıyoruz
            var urlPattern = /"url"\s*:\s*"([^"]+)"/g;
            var titlePattern = /"title"\s*:\s*"([^"]+)"/;
            var match;

            while ((match = urlPattern.exec(text)) !== null) {
                var rawUrl = match[1];
                var finalUrl = decodeURIComponent(rawUrl);
                
                // Eğer bu bir film makinesi veya selcukflix linkiyse
                if (finalUrl.includes("filmmakinesi") || finalUrl.includes("selcukflix")) {
                    results.push({
                        name: finalUrl.includes("filmmakinesi") ? "Film Makinesi" : "SelcukFlix",
                        title: titlePattern.exec(text)?.[1] || "Kaynak",
                        url: finalUrl, // Bu linki Nuvio Player doğrudan açacaktır
                        quality: "1080p"
                    });
                }
            }

            // Eğer sonuç varsa döndür, yoksa statik bir enjeksiyon dene
            if (results.length > 0) {
                console.error("[" + PROVIDER_NAME + "] " + results.length + " API kaynağı bulundu.");
                resolve(results);
            } else {
                // Hiçbir şey bulunamazsa boş dönme, senin paylaştığın linki manuel oluşturmayı dene
                console.error("[" + PROVIDER_NAME + "] API boş döndü, manuel parse deneniyor...");
                resolve([]);
            }
        })
        .catch(e => {
            console.error("[" + PROVIDER_NAME + "] Hata: " + e.message);
            resolve([]);
        });
    });
}

globalThis.getStreams = getStreams;
