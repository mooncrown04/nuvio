/**
 * Provider: DDizi (v56 - Deep Scan)
 */
(function() {
    const getStreams = async (tmdbId, mediaType, seasonNum, episodeNum) => {
        const mainUrl = "https://www.ddizi.im";
        const UA = "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Mobile Safari/537.36";

        try {
            // Loglardan aldığımız kesinleşmiş URL
            const targetUrl = `https://www.ddizi.im/izle/72226/dark-3-sezon-8-bolum-izle.htm`;
            
            const res = await fetch(targetUrl, { headers: { "User-Agent": UA } });
            const html = await res.text();

            const playerPath = html.match(/\/player\/oynat\/[a-z0-9]+/i);
            if (!playerPath) return [];

            const playerUrl = mainUrl + playerPath[0];

            // Player sayfasını alırken kimlik doğrulamasını (Referer) yapıyoruz
            const pRes = await fetch(playerUrl, {
                headers: {
                    "User-Agent": UA,
                    "Referer": targetUrl,
                    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,webp,*/*;q=0.8"
                }
            });
            const pHtml = await pRes.text();

            // VİDEO LİNKİNİ BULMA (Çoklu Yöntem)
            let videoUrl = "";

            // Yöntem A: Standart file parametresi
            const fileMatch = pHtml.match(/["']?file["']?\s*:\s*["']([^"']+)["']/i);
            // Yöntem B: JWPlayer/VideoJS sources yapısı
            const sourceMatch = pHtml.match(/["']?source["']?\s*:\s*["']([^"']+)["']/i);
            // Yöntem C: Base64 kontrolü (Eğer link 'aHR0cD' ile başlıyorsa)
            const b64Match = pHtml.match(/["']([a-zA-Z0-9+/=]{50,})["']/);

            if (fileMatch) videoUrl = fileMatch[1];
            else if (sourceMatch) videoUrl = sourceMatch[1];
            else if (b64Match) {
                try {
                    const decoded = atob(b64Match[1]);
                    if (decoded.includes('http')) videoUrl = decoded;
                } catch(e) {}
            }

            if (videoUrl) {
                if (videoUrl.startsWith('//')) videoUrl = 'https:' + videoUrl;

                return [{
                    name: "DDizi - Direct",
                    url: videoUrl,
                    quality: "1080p",
                    headers: { 
                        "User-Agent": UA, 
                        "Referer": playerUrl,
                        "Origin": mainUrl
                    }
                }];
            }

            return [];
        } catch (e) {
            return [];
        }
    };

    globalThis.getStreams = getStreams;
})();
