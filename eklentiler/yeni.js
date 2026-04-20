const PROVIDER_NAME = "WatchBuddy_V52_FinalCheck";
const BASE_URL = "https://stream.watchbuddy.tv";

async function getStreams(args) {
    let mediaId = (typeof args === 'object') ? (args.tmdbId || args.id) : args;
    let mediaTitle = (typeof args === 'object') ? (args.title || args.name || "Film") : "Film";

    if (!mediaId) return [];

    // ÖNEMLİ: URL'yi sunucunun en sade beklediği hale getirdik
    const tunnelUrl = `${BASE_URL}/izle/SineWix?url=${encodeURIComponent("http://px-webservisler:2585/sinewix/movie/" + mediaId)}&baslik=${encodeURIComponent(mediaTitle)}&force_proxy=1`;

    return [{
        name: "WatchBuddy Final",
        title: `SineWix: ${mediaTitle}`,
        url: tunnelUrl,
        // Oynatıcıya bunun bir stream olduğunu zorla söylüyoruz
        is_hls: true, 
        type: "video",
        headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Referer": "https://stream.watchbuddy.tv/",
            "Accept": "*/*",
            "Connection": "keep-alive"
        }
    }];
}

globalThis.getStreams = getStreams;
