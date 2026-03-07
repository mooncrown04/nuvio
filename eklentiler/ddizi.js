/**
 * Provider: DDizi (v58 - Iframe & Script Deep Scan)
 */
(function() {
    const getStreams = async (tmdbId, mediaType, seasonNum, episodeNum) => {
        const UA = "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Mobile Safari/537.36";
        const mainUrl = "https://www.ddizi.im";

        try {
            // 1. Player sayfasına Referer ile git
            const playerUrl = "https://www.ddizi.im/player/oynat/f827901dcad74c34ebf7541c2bcb1377";
            const pRes = await fetch(playerUrl, {
                headers: {
                    "User-Agent": UA,
                    "Referer": "https://www.ddizi.im/izle/72226/dark-3-sezon-8-bolum-izle.htm"
                }
            });
            const pHtml = await pRes.text();

            let streams = [];

            // STRATEJİ A: Iframe Kaynağını Yakala (Vidmoly, Uqload, etc)
            const iframeMatch = pHtml.match(/iframe[^>]+src=["']([^"']+)["']/i);
            if (iframeMatch) {
                let frameUrl = iframeMatch[1];
                if (frameUrl.startsWith('//')) frameUrl = 'https:' + frameUrl;
                
                // Eğer iframe bir video sitesiyse ekle
                if (frameUrl.includes('vidmoly') || frameUrl.includes('uqload') || frameUrl.includes('moly')) {
                    streams.push({ name: "DDizi (External)", url: frameUrl, quality: "720p" });
                }
            }

            // STRATEJİ B: Script İçindeki Gizli Değişkenleri Tara
            // DDizi bazen 'var video_url = ...' veya 'file: "..."' kullanır
            const scriptMatches = [...pHtml.matchAll(/["']?(?:file|url|source|link)["']?\s*[:=]\s*["']([^"']+\.(?:m3u8|mp4)[^"']*)["']/gi)];
            
            for (let m of scriptMatches) {
                let rawUrl = m[1];
                if (rawUrl.startsWith('//')) rawUrl = 'https:' + rawUrl;
                streams.push({ name: "DDizi HD", url: rawUrl, quality: "1080p" });
            }

            // STRATEJİ C: Base64 decode denemesi (Eğer stream bulunamadıysa)
            if (streams.length === 0) {
                const b64Strings = pHtml.match(/[a-zA-Z0-9+/=]{100,}/g) || [];
                for (let b of b64Strings) {
                    try {
                        const decoded = atob(b);
                        if (decoded.includes('.m3u8') || decoded.includes('.mp4')) {
                            const urlMatch = decoded.match(/https?:\/\/[^\s"']+/);
                            if (urlMatch) streams.push({ name: "DDizi Decoded", url: urlMatch[0], quality: "1080p" });
                        }
                    } catch(e) {}
                }
            }

            // Temizleme ve Header ekleme
            return streams.filter(s => s.url).map(s => ({
                ...s,
                headers: {
                    "User-Agent": UA,
                    "Referer": playerUrl,
                    "Origin": mainUrl
                }
            }));

        } catch (e) {
            return [];
        }
    };

    globalThis.getStreams = getStreams;
})();
