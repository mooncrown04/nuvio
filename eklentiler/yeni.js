// Nuvio için HDFilmCehennemi Resolver
const PROVIDER_NAME = "HDFilmCehennemi";

async function getStreams(args) {
    // Nuvio'da link genelde args.url üzerinden gelir
    const targetUrl = args.url || "https://www.hdfilmcehennemi.nl/1-ready-or-not-izle-hdf-8/";
    const bridgeUrl = `https://stream.watchbuddy.tv/izle/HDFilmCehennemi?url=${encodeURIComponent(targetUrl)}`;

    try {
        // Nuvio'nun fetch yeteneğini kullanıyoruz
        const response = await fetch(bridgeUrl, {
            headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
                "Referer": "https://stream.watchbuddy.tv/"
            }
        });

        const html = await response.text();

        // WatchBuddy sayfasındaki gizli video linkini buluyoruz
        // file: "https://...index.m3u8" formatını arar
        const streamUrlMatch = html.match(/file["']?\s*:\s*["'](http[^"']+)["']/);

        if (streamUrlMatch && streamUrlMatch[1]) {
            const finalStream = streamUrlMatch[1];
            
            // Nuvio'nun beklediği stream objesi formatı
            return [{
                name: "HDFC - 1080p",
                url: finalStream,
                headers: {
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
                    "Referer": "https://stream.watchbuddy.tv/"
                }
            }];
        } else {
            // Eğer link çözülemezse, son çare olarak ham bridge linkini gönder
            // Ama 422 hatası almamak için Nuvio'nun bunu bir webview/iframe olarak açması gerekir
            return [{
                name: "HDFC (Web Player)",
                url: bridgeUrl,
                type: "embed" // Nuvio bu tag'i destekliyorsa tarayıcıda açar
            }];
        }
    } catch (err) {
        console.log("Nuvio Error: " + err.message);
        return [];
    }
}
