/**
 * Provider: DDizi (v60 - The Surgeon)
 */
(function() {
    const getStreams = async (tmdbId, mediaType, seasonNum, episodeNum) => {
        const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36";
        const playerUrl = "https://www.ddizi.im/player/oynat/f827901dcad74c34ebf7541c2bcb1377";

        try {
            const response = await fetch(playerUrl, {
                headers: {
                    "User-Agent": UA,
                    "Referer": "https://www.ddizi.im/izle/72226/dark-3-sezon-8-bolum-izle.htm"
                }
            });

            const html = await response.text();
            let streams = [];

            // 1. JSON veya Script içine gömülü linkleri yakala
            // (En çok m3u8 veya mp4 içeren uzun stringleri hedefler)
            const regex = /["'](https?[^"']+\.(?:m3u8|mp4)[^"']*)["']/gi;
            let match;
            while ((match = regex.exec(html)) !== null) {
                let foundUrl = match[1].replace(/\\/g, ''); // Backslash temizliği
                if (!foundUrl.includes('google') && !foundUrl.includes('analytics')) {
                    streams.push({ 
                        name: "DDizi HD Server", 
                        url: foundUrl, 
                        quality: foundUrl.includes('1080') ? "1080p" : "720p" 
                    });
                }
            }

            // 2. Iframe / Vidmoly / Moly yakalayıcı (Alternatif)
            const iframeRegex = /iframe[^>]+src=["']([^"']+)["']/gi;
            let iMatch;
            while ((iMatch = iframeRegex.exec(html)) !== null) {
                let s = iMatch[1];
                if (s.startsWith('//')) s = 'https:' + s;
                if (s.includes('moly') || s.includes('vid') || s.includes('play')) {
                    streams.push({ name: "DDizi (External)", url: s, quality: "720p" });
                }
            }

            // 3. Eğer hiçbir şey bulunamadıysa DDizi'nin kullandığı 'id' parametresini dene
            if (streams.length === 0) {
                // Sayfada 'id:' veya 'videoID:' gibi bir şey varsa
                const idMatch = html.match(/(?:id|file|source)\s*[:=]\s*["']([^"']+)["']/i);
                if (idMatch && idMatch[1].length > 10) {
                    // Bu bir id ise bazen api üzerinden çekmek gerekebilir, 
                    // ama şimdilik doğrudan linkleri taramak daha sağlıklı.
                }
            }

            // Temizlik ve Header Basma
            return streams.map(s => ({
                ...s,
                headers: {
                    "User-Agent": UA,
                    "Referer": playerUrl,
                    "Origin": "https://www.ddizi.im"
                }
            }));

        } catch (e) {
            return [];
        }
    };

    globalThis.getStreams = getStreams;
})();
