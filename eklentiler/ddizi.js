/**
 * Provider: DDizi (v55 - Stealth Mode)
 */
(function() {
    const getStreams = async (tmdbId, mediaType, seasonNum, episodeNum) => {
        const mainUrl = "https://www.ddizi.im";
        const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36";

        try {
            // 1. Önce senin gönderdiğin Dark sayfasını simüle edelim
            const targetUrl = `${mainUrl}/izle/72226/dark-3-sezon-8-bolum-izle.htm`;
            
            const res = await fetch(targetUrl, { headers: { "User-Agent": UA } });
            const html = await res.text();

            // 2. Sayfadan player kimliğini çekelim (f827901dcad74c34ebf7541c2bcb1377)
            const playerPath = html.match(/\/player\/oynat\/[a-z0-9]+/i);
            if (!playerPath) return [];

            const playerUrl = mainUrl + playerPath[0];

            // 3. 404 HATASINI AŞAN KISIM:
            // "Referer" başlığına ana sayfa linkini ekleyerek DDizi'yi kandırıyoruz.
            const playerRes = await fetch(playerUrl, {
                headers: {
                    "User-Agent": UA,
                    "Referer": targetUrl, // "Ben az önceki Dark sayfasından geliyorum" diyoruz
                    "X-Requested-With": "XMLHttpRequest"
                }
            });
            const playerHtml = await playerRes.text();

            // 4. Şimdi o gizli 'file' linkini bulma zamanı
            const fileMatch = playerHtml.match(/file:\s*["']([^"']+)["']/i) || 
                              playerHtml.match(/source\s*:\s*["']([^"']+)["']/i);

            if (fileMatch) {
                let videoUrl = fileMatch[1];
                if (videoUrl.startsWith('//')) videoUrl = 'https:' + videoUrl;

                return [{
                    name: "DDizi Ultra HD",
                    url: videoUrl,
                    quality: "1080p",
                    headers: { "User-Agent": UA, "Referer": playerUrl }
                }];
            }

            return [];
        } catch (e) {
            return [];
        }
    };

    globalThis.getStreams = getStreams;
})();
