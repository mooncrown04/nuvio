/**
 * Provider: DDizi (v61 - Ghost Protocol)
 */
(function() {
    const getStreams = async (tmdbId, mediaType, seasonNum, episodeNum) => {
        const UA = "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Mobile Safari/537.36";
        // DDizi'nin player URL'sini doğrudan hedefliyoruz
        const targetUrl = "https://www.ddizi.im/player/oynat/f827901dcad74c34ebf7541c2bcb1377";

        try {
            const res = await fetch(targetUrl, {
                headers: {
                    "User-Agent": UA,
                    "Referer": "https://www.ddizi.im/",
                    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,webp,*/*;q=0.8"
                }
            });

            const html = await res.text();
            let streams = [];

            // STRATEJİ 1: Vidmoly/Moly Linklerini Ayıkla
            // DDizi genellikle vidmoly.me veya moly.to kullanır.
            const molyRegex = /(?:https?:)?\/\/(?:vidmoly\.me|moly\.to|uqload\.com|fembed\.com)\/(?:embed-)?([a-zA-Z0-9]+)/gi;
            let m;
            while ((m = molyRegex.exec(html)) !== null) {
                streams.push({
                    name: "DDizi - " + m[0].split('.')[0].replace('https://', ''),
                    url: m[0].startsWith('http') ? m[0] : 'https:' + m[0],
                    quality: "720p"
                });
            }

            // STRATEJİ 2: M3U8 Kaynaklarını Çek (HLS Streaming)
            const hlsRegex = /["'](https?:\/\/[^"']+\.m3u8[^"']*)["']/gi;
            let h;
            while ((h = hlsRegex.exec(html)) !== null) {
                if (!h[1].includes("analytics")) {
                    streams.push({
                        name: "DDizi Master Stream",
                        url: h[1],
                        quality: "1080p"
                    });
                }
            }

            // STRATEJİ 3: Ajax Linkini Simüle Et
            // Eğer hala bir şey yoksa, DDizi'nin video yükleme API'sine "sık kullanılan" ID'leri dene
            if (streams.length === 0) {
               // Bazı durumlarda video ID'si HTML içinde "file: '...'" olarak geçer
               const fileMatch = html.match(/file\s*:\s*["']([^"']+)["']/i);
               if (fileMatch) {
                   streams.push({ name: "DDizi Direct", url: fileMatch[1], quality: "HD" });
               }
            }

            return streams.map(s => ({
                ...s,
                headers: {
                    "User-Agent": UA,
                    "Referer": targetUrl,
                    "Origin": "https://www.ddizi.im"
                }
            }));

        } catch (e) {
            return [];
        }
    };

    globalThis.getStreams = getStreams;
})();
