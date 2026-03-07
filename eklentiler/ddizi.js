/**
 * Provider: DDizi (v64 - Deep Parser)
 */
(function() {
    const getStreams = async (tmdbId, mediaType, seasonNum, episodeNum) => {
        const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
        // Loglardaki player sayfası
        const targetUrl = "https://www.ddizi.im/player/oynat/f827901dcad74c34ebf7541c2bcb1377";

        try {
            const res = await fetch(targetUrl, {
                headers: {
                    "User-Agent": UA,
                    "Referer": "https://www.ddizi.im/",
                    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
                }
            });

            const html = await res.text();
            let streams = [];

            // KRİTİK DÜZELTME: Player sayfasının içindeki 'src' veya 'file' linklerini ayıkla
            // DDizi genellikle bir 'iframe' içinde Vidmoly veya Moly barındırır.
            
            // 1. Vidmoly/Moly iframe tarayıcı (En yaygın olan)
            const iframeMatch = html.match(/(?:iframe|source)[^>]+(?:src|data-src)=["']([^"']*(?:vidmoly|moly|uqload|streamwish)[^"']*)["']/i);
            
            if (iframeMatch) {
                let videoPage = iframeMatch[1];
                if (videoPage.startsWith('//')) videoPage = 'https:' + videoPage;

                streams.push({
                    name: "DDizi - " + (videoPage.includes('moly') ? "Moly" : "Vidmoly"),
                    url: videoPage,
                    quality: "720p",
                    // Bu çok önemli! ExoPlayer'ın patlamaması için 'isExtractor' veya 'isHtml' 
                    // gibi bir bayrak gerekiyorsa buraya eklenmeli. 
                    // Ama plugin sistemi bunu otomatik algılamalı.
                });
            }

            // 2. Doğrudan m3u8 tarayıcı (Eğer varsa)
            const m3u8Match = html.match(/["'](https?:\/\/[^"']+\.m3u8[^"']*)["']/i);
            if (m3u8Match) {
                streams.push({
                    name: "DDizi HLS",
                    url: m3u8Match[1],
                    quality: "1080p"
                });
            }

            // 3. BASE64 veya Şifreli Linkleri Yakala (Bazen DDizi bunu yapar)
            if (html.includes("atob(")) {
                const base64Match = html.match(/atob\(["']([^"']+)["']\)/);
                if (base64Match) {
                    const decoded = atob(base64Match[1]);
                    if (decoded.includes("http")) {
                        streams.push({ name: "DDizi Decoded", url: decoded, quality: "720p" });
                    }
                }
            }

            return streams.map(s => ({
                ...s,
                headers: {
                    "User-Agent": UA,
                    "Referer": targetUrl, // Önemli: Referer player sayfası olmalı
                    "Origin": "https://www.ddizi.im"
                }
            }));

        } catch (e) {
            return [];
        }
    };

    globalThis.getStreams = getStreams;
})();
