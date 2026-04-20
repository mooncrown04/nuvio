// Nuvio HDFilmCehennemi Resolver (v13.0)

async function getStreams(args) {
    // Nuvio'da URL args içinden gelir
    const sourceUrl = args.url || "";
    if (!sourceUrl) return [];

    console.error("[HDFC] Resolver Tetiklendi: " + sourceUrl);

    // WatchBuddy köprüsü
    const bridgeUrl = `https://stream.watchbuddy.tv/izle/HDFilmCehennemi?url=${encodeURIComponent(sourceUrl)}`;

    try {
        // Nuvio'da standart fetch kullanımı
        const response = await fetch(bridgeUrl, {
            headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
                "Referer": "https://stream.watchbuddy.tv/"
            }
        });

        const html = await response.text();

        // Sayfa içindeki gerçek m3u8/mp4 linkini cımbızla çekme
        const streamUrlMatch = html.match(/file["']?\s*:\s*["'](http[^"']+)["']/);

        if (streamUrlMatch && streamUrlMatch[1]) {
            const finalUrl = streamUrlMatch[1];
            console.error("[HDFC] Link Bulundu: " + finalUrl);

            return [{
                name: "HDFC (WatchBuddy)",
                url: finalUrl,
                quality: "1080p",
                headers: {
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
                    "Referer": "https://stream.watchbuddy.tv/"
                }
            }];
        }
        
        console.error("[HDFC] Video linki sayfa içinde bulunamadı.");
        return [];

    } catch (err) {
        console.error("[HDFC] Hata oluştu: " + err.message);
        return [];
    }
}

// Nuvio'nun fonksiyonu bulabilmesi için her iki yöntemi de tanımlıyoruz:
if (typeof module !== 'undefined') {
    module.exports = { getStreams };
}
globalThis.getStreams = getStreams;
