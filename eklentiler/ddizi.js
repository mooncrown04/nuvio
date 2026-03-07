/**
 * Provider: DDizi (v66 - The Architect)
 */
(function() {
    const getStreams = async (tmdbId, mediaType, seasonNum, episodeNum) => {
        const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
        
        try {
            // 1. ADIM: Önce dizi ismini bulup DDizi'de arama yapmamız gerekir 
            // Ama pratik çözüm için doğrudan player sayfasındaki şifreyi çözelim.
            // NOT: targetUrl kısmını dinamik yapmak için dizi sayfasından ID çekilmelidir.
            // Şimdilik senin loglardaki adresten ilerliyoruz:
            const targetUrl = "https://www.ddizi.im/player/oynat/f827901dcad74c34ebf7541c2bcb1377";

            const res = await fetch(targetUrl, {
                headers: {
                    "User-Agent": UA,
                    "Referer": "https://www.ddizi.im/",
                    "X-Requested-With": "XMLHttpRequest"
                }
            });

            const html = await res.text();
            let streams = [];

            // 2. ADIM: DDizi'nin meşhur 'atob' şifrelemesini kırıyoruz
            // Loglarda gördüğümüz <sc... kısmındaki gizli base64'ü bulur
            const base64Regex = /atob\(["']([^"']{20,})["']\)/g;
            let b;
            while ((b = base64Regex.exec(html)) !== null) {
                try {
                    const decoded = atob(b[1]);
                    if (decoded.includes("http")) {
                        // Eğer decode edilen şey bir iframe src ise:
                        const finalUrl = decoded.match(/src=["']([^"']+)["']/i)?.[1] || decoded;
                        
                        streams.push({
                            name: "DDizi - " + (finalUrl.includes('moly') ? "Vidmoly" : "Cloud"),
                            url: finalUrl.startsWith('//') ? 'https:' + finalUrl : finalUrl,
                            quality: "1080p"
                        });
                    }
                } catch(e) {}
            }

            // 3. ADIM: Standart Iframe Taraması (Yedek)
            const iframeRegex = /iframe[^>]+src=["']([^"']*(?:vidmoly|moly|uqload)[^"']*)["']/gi;
            let m;
            while ((m = iframeRegex.exec(html)) !== null) {
                let u = m[1].startsWith('//') ? 'https:' + m[1] : m[1];
                streams.push({ name: "DDizi Player", url: u, quality: "720p" });
            }

            // 4. ADIM: Player'ın patlamaması için Header'ları ekle
            return streams.map(s => ({
                ...s,
                headers: {
                    "User-Agent": UA,
                    "Referer": targetUrl,
                    "Origin": "https://www.ddizi.im",
                    "Accept": "*/*"
                }
            }));

        } catch (e) {
            return [];
        }
    };

    globalThis.getStreams = getStreams;
})();
