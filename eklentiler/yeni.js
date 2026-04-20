const PROVIDER_NAME = "WatchBuddy_Logger";
const BASE_URL = "https://stream.watchbuddy.tv";

function getStreams(args) {
    var tmdbId = (typeof args === 'object') ? (args.tmdbId || args.id) : args;

    return new Promise(function(resolve) {
        if (!tmdbId) return resolve([]);

        fetch("https://api.themoviedb.org/3/movie/" + tmdbId + "?api_key=4ef0d7355d9ffb5151e987764708ce96&language=tr-TR")
        .then(res => res.json())
        .then(data => {
            var title = data.title || data.original_title;
            console.error("[" + PROVIDER_NAME + "] Sorgu: " + title);
            return fetch(BASE_URL + "/search?q=" + encodeURIComponent(title));
        })
        .then(res => res.text())
        .then(html => {
            console.error("[" + PROVIDER_NAME + "] Sayfa çekildi. Boyut: " + html.length);

            // 1. ADIM: Sayfadaki tüm script bloklarını bulup loglayalım
            var scripts = html.match(/<script\b[^>]*>([\s\S]*?)<\/script>/gm) || [];
            console.error("[" + PROVIDER_NAME + "] Bulunan Script Sayısı: " + scripts.length);

            // 2. ADIM: Senin paylaştığın JSON yapısına (with/result) benzer metinleri avlayalım
            // Metin içinde "with" ve "url" geçen yerleri 500 karakterlik bloklar halinde alıyoruz
            var regex = /\{[^{}]*"with"[^{}]*"url"[^{}]*\}/g;
            var matches = html.match(regex) || [];
            
            if (matches.length > 0) {
                matches.forEach((m, i) => {
                    console.error("[" + PROVIDER_NAME + "] BULGU " + (i+1) + ": " + m.substring(0, 800));
                });
            } else {
                console.error("[" + PROVIDER_NAME + "] JSON yapısı ham metinde bulunamadı. Scriptleri inceliyoruz...");
                // Eğer ham metinde yoksa, scriptlerin içine bakalım
                scripts.forEach((s, i) => {
                    if (s.includes("url") || s.includes("results")) {
                        console.error("[" + PROVIDER_NAME + "] ŞÜPHELİ SCRİPT " + i + ": " + s.substring(0, 500));
                    }
                });
            }

            // 3. ADIM: Ekranda gördüğün o verilerin kaynağı olabilecek değişkenleri arayalım
            var suspects = ["config", "data", "results", "payload"];
            suspects.forEach(key => {
                var pos = html.indexOf(key + "=");
                if (pos !== -1) {
                    console.error("[" + PROVIDER_NAME + "] DEĞİŞKEN YAKALANDI (" + key + "): " + html.substring(pos, pos + 200));
                }
            });

            resolve([]); // Sadece log okumak için şimdilik boş dönüyoruz
        })
        .catch(e => {
            console.error("[" + PROVIDER_NAME + "] Hata: " + e.message);
            resolve([]);
        });
    });
}

globalThis.getStreams = getStreams;
