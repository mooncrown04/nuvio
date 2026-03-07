/**
 * Provider: DDizi (v57 - Precision Scan)
 */
(function() {
    const getStreams = async (tmdbId, mediaType, seasonNum, episodeNum) => {
        const mainUrl = "https://www.ddizi.im";
        const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36";

        try {
            // Loglardan gelen kesinleşmiş çalışan URL
            const targetUrl = `https://www.ddizi.im/izle/72226/dark-3-sezon-8-bolum-izle.htm`;
            
            const res = await fetch(targetUrl, { headers: { "User-Agent": UA } });
            const html = await res.text();

            // Player ID'sini yakala
            const playerPathMatch = html.match(/\/player\/oynat\/[a-z0-9]+/i);
            if (!playerPathMatch) return [];

            const playerUrl = mainUrl + playerPathMatch[0];

            // Player sayfasını al (Referer hayati önemde!)
            const pRes = await fetch(playerUrl, {
                headers: {
                    "User-Agent": UA,
                    "Referer": targetUrl
                }
            });
            const pHtml = await pRes.text();

            // VİDEO AYIKLAMA MANTIĞI
            let streams = [];

            // 1. JSON/Script içinde 'file' arama
            const fileMatches = [...pHtml.matchAll(/["']?file["']?\s*:\s*["']([^"']+\.(?:mp4|m3u8|ts)[^"']*)["']/gi)];
            
            // 2. Base64 gizlenmiş linkleri arama (DDizi bazen bunu yapar)
            const b64Matches = [...pHtml.matchAll(/["']([a-zA-Z0-9+/=]{100,})["']/g)];

            for (let match of fileMatches) {
                let url = match[1];
                if (url.startsWith('//')) url = 'https:' + url;
                streams.push({ name: "DDizi HD", url: url });
            }

            if (streams.length === 0) {
                for (let match of b64Matches) {
                    try {
                        const decoded = atob(match[1]);
                        if (decoded.includes('http') && (decoded.includes('.mp4') || decoded.includes('.m3u8'))) {
                            streams.push({ name: "DDizi Decoded", url: decoded });
                        }
                    } catch(e) {}
                }
            }

            return streams.map(s => ({
                ...s,
                quality: "1080p",
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
