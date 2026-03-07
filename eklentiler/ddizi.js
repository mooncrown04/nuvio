/**
 * Provider: DDizi (v63 - The Phantom)
 */
(function() {
    const getStreams = async (tmdbId, mediaType, seasonNum, episodeNum) => {
        const UA = "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Mobile Safari/537.36";
        // Loglardaki tespit edilen ana player URL'si
        const targetUrl = "https://www.ddizi.im/player/oynat/f827901dcad74c34ebf7541c2bcb1377";

        try {
            const res = await fetch(targetUrl, {
                headers: {
                    "User-Agent": UA,
                    "Referer": "https://www.ddizi.im/",
                    "X-Requested-With": "XMLHttpRequest"
                }
            });

            const html = await res.text();
            let streams = [];

            // 1. STRATEJİ: Iframe Kaynaklarını Derinlemesine Tara
            // DDizi bazen src="..." bazen data-src="..." kullanır
            const iframeRegex = /(?:src|data-src)=["']([^"']*(?:vidmoly|moly|uqload|fembed|dood|streamwish)[^"']*)["']/gi;
            let m;
            while ((m = iframeRegex.exec(html)) !== null) {
                let foundUrl = m[1];
                if (foundUrl.startsWith('//')) foundUrl = 'https:' + foundUrl;
                
                streams.push({
                    name: "DDizi Player (" + (foundUrl.includes('moly') ? 'Moly' : 'Vidmoly') + ")",
                    url: foundUrl,
                    quality: "720p"
                });
            }

            // 2. STRATEJİ: JWPlayer "sources" Bloğunu Yakala
            // Eğer sayfa içinde doğrudan bir video dosyası varsa yakalar
            const jwRegex = /["']?file["']?\s*:\s*["']([^"']+\.(?:m3u8|mp4)[^"']*)["']/gi;
            let j;
            while ((j = jwRegex.exec(html)) !== null) {
                streams.push({
                    name: "DDizi Master HD",
                    url: j[1],
                    quality: "1080p"
                });
            }

            // 3. STRATEJİ: Script İçindeki URL Tanımlamaları
            // Bazı yeni player'larda linkler 'var link = "..."' şeklinde tanımlanır
            const linkVarRegex = /var\s+(?:link|videoUrl|source)\s*=\s*["'](https?:\/\/[^"']+)["']/gi;
            let l;
            while ((l = linkVarRegex.exec(html)) !== null) {
                if (!l[1].includes('.jpg') && !l[1].includes('.png')) {
                    streams.push({
                        name: "DDizi Cloud Stream",
                        url: l[1],
                        quality: "720p"
                    });
                }
            }

            // Temizleme ve Header Ekleme
            return streams.map(s => ({
                ...s,
                headers: {
                    "User-Agent": UA,
                    "Referer": targetUrl,
                    "Origin": "https://www.ddizi.im"
                }
            }));

        } catch (e) {
            console.log("DDizi Error: " + e);
            return [];
        }
    };

    globalThis.getStreams = getStreams;
})();
