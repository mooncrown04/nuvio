const PROVIDER_NAME = "WatchBuddy_V22";
const BASE_URL = "https://stream.watchbuddy.tv";

async function getStreams(args) {
    var tmdbId = (typeof args === 'object') ? (args.tmdbId || args.id) : args;
    if (!tmdbId) return [];

    try {
        const tmdbRes = await fetch(`https://api.themoviedb.org/3/movie/${tmdbId}?api_key=4ef0d7355d9ffb5151e987764708ce96&language=tr-TR`);
        const tmdbData = await tmdbRes.json();
        const title = tmdbData.title || tmdbData.original_title;

        console.error(`[${PROVIDER_NAME}] Hedef: ${title}`);
        const searchRes = await fetch(`${BASE_URL}/search?q=${encodeURIComponent(title)}`);
        const html = await searchRes.text();

        let results = [];
        // Linkleri yakalamak için daha geniş bir pattern
        const urlPattern = /(?:url|path|href)["']?\s*[:=]\s*["']([^"'\s>]+)/g;
        let match;

        while ((match = urlPattern.exec(html)) !== null) {
            let foundPath = match[1].replace(/\\/g, "");
            if (foundPath.includes("icerik") || foundPath.includes("movie") || foundPath.includes("sinewix")) {
                let provider = foundPath.includes("sinewix") ? "SineWix" : (foundPath.includes("hdfilm") ? "HDFilm" : "Kaynak");
                let fullUrl = foundPath.startsWith("http") ? foundPath : BASE_URL + foundPath;

                // İZLEME SAYFASINA GİRİŞ
                const pageRes = await fetch(fullUrl);
                const pageHtml = await pageRes.text();
                
                // 1. ADIM: Ham m3u8/mp4 ara
                let videoMatch = pageHtml.match(/["'](http[^"']+\.(?:m3u8|mp4|mkv)[^"']*)["']/i);
                
                // 2. ADIM: Base64 şifreli m3u8 ara (Sık kullanılan yöntem)
                if (!videoMatch) {
                    let b64Match = pageHtml.match(/[A-Za-z0-9+/]{40,}/g); // Uzun base64 dizilerini ara
                    if (b64Match) {
                        for (let b of b64Match) {
                            try {
                                let decoded = atob(b);
                                if (decoded.includes(".m3u8") || decoded.includes(".mp4")) {
                                    videoMatch = [null, decoded.match(/(http[^\s"']+)/)[0]];
                                    break;
                                }
                            } catch(e) {}
                        }
                    }
                }

                // 3. ADIM: Packed (p,a,c,k,e,d) verileri ara
                if (!videoMatch && pageHtml.includes("eval(function(p,a,c,k,e,d)")) {
                    console.error(`[${PROVIDER_NAME}] Şifreli (Packed) veri tespit edildi, sökülüyor...`);
                    // Burada basitleştirilmiş bir sökücü çalıştırıyoruz
                    let packedData = pageHtml.match(/eval\(function\(p,a,c,k,e,d\)[\s\S]*?\.split\(['|']\)\)\)/);
                    if (packedData) {
                        // Linki temiz metin içinde ara
                        videoMatch = pageHtml.match(/https?:\/\/[^"']+\.m3u8/i);
                    }
                }

                if (videoMatch) {
                    results.push({
                        name: provider,
                        title: `${title} - ${provider}`,
                        url: videoMatch[1].replace(/\\/g, ""),
                        quality: "1080p",
                        headers: { "Referer": BASE_URL, "User-Agent": "Mozilla/5.0" }
                    });
                }
            }
        }

        const uniqueResults = results.filter((v, i, a) => a.findIndex(t => (t.url === v.url)) === i);
        console.error(`[${PROVIDER_NAME}] Başarılı Link: ${uniqueResults.length}`);
        return uniqueResults;

    } catch (e) {
        console.error(`[${PROVIDER_NAME}] Hata: ${e.message}`);
        return [];
    }
}

globalThis.getStreams = getStreams;
