const PROVIDER_NAME = "WatchBuddy_V40_Final";
const BASE_URL = "https://stream.watchbuddy.tv";

async function getStreams(args) {
    var tmdbId = (typeof args === 'object') ? (args.tmdbId || args.id) : args;
    if (!tmdbId) return [];

    try {
        // TMDB'den film ismini al
        var tmdbRes = await fetch("https://api.themoviedb.org/3/movie/" + tmdbId + "?api_key=4ef0d7355d9ffb5151e987764708ce96&language=tr-TR");
        var data = await tmdbRes.json();
        var title = data.title;

        console.error("[" + PROVIDER_NAME + "] Aranıyor: " + title);

        var searchUrl = BASE_URL + "/api/v1/search?q=" + encodeURIComponent(title) + "&type=movie";
        var response = await fetch(searchUrl, { 
            headers: { "User-Agent": "Mozilla/5.0", "Accept": "application/json" }
        });

        var json = await response.json();
        var items = json.result || json.results || [];

        // Eğer arama sonucu boşsa veya hata varsa direkt Catch-all (Tünel) tetikle
        if (!items || items.length === 0) throw new Error("NoResults");

        return items.map(function(item) {
            return {
                name: item.provider,
                title: item.title + " [" + item.provider + "]",
                url: BASE_URL + "/izle/" + item.provider + "?url=" + encodeURIComponent(item.url || item.path) + "&force_proxy=1",
                quality: "1080p",
                // EXOPLAYER İÇİN KRİTİK: Player'ın 422 almasını önlemek için header ekliyoruz
                headers: {
                    "User-Agent": "KekikStream/4.0",
                    "Referer": BASE_URL + "/"
                }
            };
        });

    } catch (e) {
        console.error("[" + PROVIDER_NAME + "] Tünel Devreye Alındı: " + tmdbId);
        // 422 HATASINI ÖNLEYEN REÇETE:
        return [{
            name: "WatchBuddy (Direct Pipeline)",
            // Bazı sunucular tmdbId'yi path'de sever, bazıları query'de. İkisini de besleyelim:
            url: BASE_URL + "/izle/SineWix?url=" + encodeURIComponent("http://px-webservisler:2585/sinewix/movie/" + tmdbId) + "&force_proxy=1",
            quality: "1080p",
            headers: {
                "User-Agent": "Mozilla/5.0 (Linux; Android 11; Fire TV)", // Cihaz taklidi
                "Referer": BASE_URL + "/",
                "X-Requested-With": "XMLHttpRequest"
            }
        }];
    }
}

globalThis.getStreams = getStreams;
