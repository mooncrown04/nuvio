const PROVIDER_NAME = "WatchBuddy_V41_Overdrive";
const BASE_URL = "https://stream.watchbuddy.tv";

async function getStreams(args) {
    var tmdbId = (typeof args === 'object') ? (args.tmdbId || args.id) : args;
    if (!tmdbId) return [];

    // Header setini en başta tanımlayalım - hem fetch hem player kullanacak
    var commonHeaders = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Referer": BASE_URL + "/",
        "X-Requested-With": "XMLHttpRequest"
    };

    try {
        var tmdbRes = await fetch("https://api.themoviedb.org/3/movie/" + tmdbId + "?api_key=4ef0d7355d9ffb5151e987764708ce96&language=tr-TR");
        var data = await tmdbRes.json();
        var title = data.title;

        console.error("[" + PROVIDER_NAME + "] Film: " + title);

        var searchUrl = BASE_URL + "/api/v1/search?q=" + encodeURIComponent(title) + "&type=movie";
        var response = await fetch(searchUrl, { headers: commonHeaders });
        var json = await response.json();
        var items = json.result || json.results || [];

        if (!items || items.length === 0) throw new Error("NoResults");

        return items.map(function(item) {
            // Sunucu tarafındaki build_proxy_url mantığına tam uyum
            var finalUrl = BASE_URL + "/proxy/video?url=" + encodeURIComponent(item.url || item.path) + "&force_proxy=1";
            
            return {
                name: item.provider,
                title: item.title + " (Hızlı)",
                url: finalUrl,
                headers: commonHeaders // Player'a "bunu bu headerla aç" diyoruz
            };
        });

    } catch (e) {
        console.error("[" + PROVIDER_NAME + "] Tünel Aktif: " + tmdbId);
        
        // Tünel linkini GitHub'daki /izle route'una göre optimize ediyoruz
        var tunnelUrl = BASE_URL + "/izle/SineWix?url=" + encodeURIComponent("http://px-webservisler:2585/sinewix/movie/" + tmdbId) + "&force_proxy=1";
        
        return [{
            name: "WatchBuddy (Rescure)",
            url: tunnelUrl,
            headers: commonHeaders
        }];
    }
}

globalThis.getStreams = getStreams;
