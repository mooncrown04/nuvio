const PROVIDER_NAME = "WatchBuddy_V53_Final";
const BASE_URL = "https://stream.watchbuddy.tv";

async function getStreams(args) {
    let mediaId = (typeof args === 'object') ? (args.tmdbId || args.id) : args;
    let mediaTitle = (typeof args === 'object') ? (args.title || args.name || "Film") : "Film";

    if (!mediaId) return [];

    // Proxy uzerinden gelen link
    const tunnelUrl = `${BASE_URL}/izle/SineWix?url=${encodeURIComponent("http://px-webservisler:2585/sinewix/movie/" + mediaId)}&baslik=${encodeURIComponent(mediaTitle)}&force_proxy=1`;

    return [{
        name: "WatchBuddy Direct",
        title: `SineWix: ${mediaTitle}`,
        url: tunnelUrl,
        // is_hls: true, <-- Bunu sildik, oynatıcı kendi karar versin
        headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Referer": "https://stream.watchbuddy.tv/",
            "Accept": "*/*"
        }
    }];
}

globalThis.getStreams = getStreams;
