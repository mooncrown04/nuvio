const PROVIDER_NAME = "WatchBuddy_V39_Native";
const BASE_URL = "https://stream.watchbuddy.tv";

async function getStreams(args) {
    var tmdbId = (typeof args === 'object') ? (args.tmdbId || args.id) : args;
    if (!tmdbId) return [];

    try {
        // En basit API isteği - TMDB verisini çekiyoruz
        var tmdbRes = await fetch("https://api.themoviedb.org/3/movie/" + tmdbId + "?api_key=4ef0d7355d9ffb5151e987764708ce96&language=tr-TR");
        var data = await tmdbRes.json();
        var title = data.title;

        console.error("[" + PROVIDER_NAME + "] Film: " + title);

        // Arama isteği - Karmaşık olmayan sade headerlar
        var searchUrl = BASE_URL + "/api/v1/search?q=" + encodeURIComponent(title) + "&type=movie";
        
        var response = await fetch(searchUrl, { 
            method: "GET",
            headers: {
                "User-Agent": "Mozilla/5.0",
                "Accept": "application/json"
            }
        });

        var json = await response.json();
        var items = json.result || json.results || [];

        if (!items || items.length === 0) {
             console.error("[" + PROVIDER_NAME + "] Sonuç yok, tünele gidiliyor.");
             throw new Error("NoResults");
        }

        return items.map(function(item) {
            return {
                name: item.provider,
                title: item.title + " [" + item.provider + "]",
                url: BASE_URL + "/izle/" + item.provider + "?url=" + encodeURIComponent(item.url || item.path) + "&force_proxy=1&format=hls",
                quality: "1080p"
            };
        });

    } catch (e) {
        console.error("[" + PROVIDER_NAME + "] Hata: " + e.toString());
        // Hata anında (SSL veya Boş sonuç) kurtarıcı link
        return [{
            name: "WatchBuddy (Tünel)",
            url: BASE_URL + "/izle/SineWix?url=http://px-webservisler:2585/sinewix/movie/" + tmdbId + "&force_proxy=1",
            quality: "1080p"
        }];
    }
}

globalThis.getStreams = getStreams;
