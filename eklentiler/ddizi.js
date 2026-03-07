/**
 * Provider: DDizi (v65 - The Gatekeeper)
 */
(function() {
    const getStreams = async (tmdbId, mediaType, seasonNum, episodeNum) => {
        const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
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

            // 1. STRATEJİ: Dinamik Script Değişkenlerini Yakala
            // Bazı sistemler linki 'videoSource = "..."' şeklinde tanımlar
            const scriptVars = [
                /videoSource\s*=\s*["']([^"']+)["']/i,
                /file\s*:\s*["']([^"']+)["']/i,
                /link\s*:\s*["']([^"']+)["']/i,
                /source\s*=\s*["']([^"']+)["']/i
            ];

            scriptVars.forEach(regex => {
                const match = html.match(regex);
                if (match && match[1] && !match[1].includes('.jpg')) {
                    let streamUrl = match[1];
                    if (streamUrl.startsWith('//')) streamUrl = 'https:' + streamUrl;
                    
                    streams.push({
                        name: "DDizi Source (Dinamik)",
                        url: streamUrl,
                        quality: "720p"
                    });
                }
            });

            // 2. STRATEJİ: Iframe/Embed Linkleri (Vidmoly, Moly vb.)
            const embedRegex = /(?:iframe|embed|source)[^>]+(?:src|data-src)=["']([^"']*(?:vidmoly|moly|uqload|streamwish|dood)[^"']*)["']/gi;
            let m;
            while ((m = embedRegex.exec(html)) !== null) {
                let foundUrl = m[1];
                if (foundUrl.startsWith('//')) foundUrl = 'https:' + foundUrl;
                
                streams.push({
                    name: "DDizi " + (foundUrl.includes('moly') ? "Moly" : "Vidmoly"),
                    url: foundUrl,
                    quality: "720p"
                });
            }

            // 3. STRATEJİ: Base64 Şifreli Link Kontrolü
            // DDizi bazen linkleri 'eval(atob(...))' içine saklar
            if (html.includes("atob(")) {
                const b64 = html.match(/atob\(["']([^"']+)["']\)/);
                if (b64) {
                    try {
                        const decoded = atob(b64[1]);
                        if (decoded.includes("http")) {
                            streams.push({ name: "DDizi Decoded", url: decoded, quality: "720p" });
                        }
                    } catch(e) {}
                }
            }

            // 4. STRATEJİ: Master.m3u8 (HLS) Doğrudan Tarama
            const hlsMatch = html.match(/["'](https?:\/\/[^"']+\.m3u8[^"']*)["']/i);
            if (hlsMatch) {
                streams.push({ name: "DDizi HLS Master", url: hlsMatch[1], quality: "1080p" });
            }

            // Sonuçları temizle ve header ekle
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
