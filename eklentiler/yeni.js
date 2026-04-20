const PROVIDER_NAME = "WatchBuddy_V43_Stable";
const BASE_URL = "https://stream.watchbuddy.tv";

async function getStreams(args) {
    var tmdbId = (typeof args === 'object') ? (args.tmdbId || args.id) : args;
    if (!tmdbId) return [];

    // Player'ın (VLC/Exo) reddedilmemesi için en standart headerlar
    var headers = {
        "User-Agent": "Mozilla/5.0",
        "Referer": BASE_URL + "/"
    };

    try {
        // Doğrudan arama yapmadan tünel linkini oluşturuyoruz (Hız ve 422'den kaçış için)
        // Çünkü loglarda 422'yi 'izle' route'undan alıyoruz.
        
        var tunnelUrl = BASE_URL + "/izle/SineWix?url=" + encodeURIComponent("http://px-webservisler:2585/sinewix/movie/" + tmdbId) + "&force_proxy=1";

        return [{
            name: "WatchBuddy (Direct Line)",
            url: tunnelUrl,
            quality: "1080p",
            headers: headers
        }];

    } catch (e) {
        console.error("[" + PROVIDER_NAME + "] Kritik Hata: " + e.toString());
        return [];
    }
}

globalThis.getStreams = getStreams;
