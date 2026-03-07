/**
 * Provider: DDizi (v59 - Deep Regex & Redirect Hunter)
 */
(function() {
    const getStreams = async (tmdbId, mediaType, seasonNum, episodeNum) => {
        const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36";
        const mainUrl = "https://www.ddizi.im";
        
        // Loglardaki spesifik player ID'si üzerinden gidiyoruz
        const playerBase = "https://www.ddizi.im/player/oynat/f827901dcad74c34ebf7541c2bcb1377";

        try {
            const response = await fetch(playerBase, {
                headers: {
                    "User-Agent": UA,
                    "Referer": "https://www.ddizi.im/",
                    "X-Requested-With": "XMLHttpRequest"
                }
            });

            const html = await response.text();
            let streams = [];

            // 1. Agresif Iframe Tarama (Vidmoly, Uqload, Moly, vb.)
            const frames = html.match(/iframe[^>]+src=["']([^"']+)["']/gi) || [];
            frames.forEach(f => {
                let src = f.match(/src=["']([^"']+)["']/i)[1];
                if (src.startsWith('//')) src = 'https:' + src;
                
                if (src.includes('vidmoly') || src.includes('moly') || src.includes('uqload')) {
                    streams.push({ name: "DDizi (External Server)", url: src, quality: "720p" });
                }
            });

            // 2. Gizli 'eval' veya JSON Verisi İçindeki Linkleri Yakala
            // Bu regex, tırnak içindeki her türlü m3u8 veya mp4 linkini bulur
            const deepLinks = html.match(/https?:\/\/[^"']+\.(?:m3u8|mp4)[^"']*/gi) || [];
            deepLinks.forEach(link => {
                if (!link.includes('google-analytics') && !link.includes('schema.org')) {
                    streams.push({ name: "DDizi HD Source", url: link, quality: "1080p" });
                }
            });

            // 3. Base64 veya Paketlenmiş Link Kontrolü
            if (html.includes('base64') || html.includes('atob')) {
                const b64Matches = html.match(/["']([A-Za-z0-9+/=]{50,})["']/g) || [];
                b64Matches.forEach(b => {
                    try {
                        const decoded = atob(b.replace(/["']/g, ''));
                        if (decoded.includes('http')) {
                            const foundUrl = decoded.match(/https?:\/\/[^"']+/)[0];
                            streams.push({ name: "DDizi Cloud", url: foundUrl, quality: "720p" });
                        }
                    } catch(e) {}
                });
            }

            // Sonuçları temizle ve header ekle
            return streams.map(s => ({
                ...s,
                headers: {
                    "User-Agent": UA,
                    "Referer": playerBase,
                    "Origin": mainUrl
                }
            }));

        } catch (e) {
            console.log("DDizi Error: " + e.message);
            return [];
        }
    };

    globalThis.getStreams = getStreams;
})();
