/**
 * Provider: DDizi (v69 - Dedicated)
 */
(function() {
    const getStreams = async (tmdbId, mediaType, seasonNum, episodeNum) => {
        const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
        
        try {
            // 1. TMDB'den dizi adını alıp DDizi'de aratıyoruz (Sabit ID'den kurtulmak için)
            const tmdbRes = await fetch(`https://api.themoviedb.org/3/${mediaType}/${tmdbId}?language=tr-TR&api_key=4ef0d7355d9ffb5151e987764708ce96`);
            const tmdbData = await tmdbRes.json();
            const query = tmdbData.name || tmdbData.title;

            // DDizi'de arama yap
            const searchUrl = `https://www.ddizi.im/arama/?q=${encodeURIComponent(query)}`;
            const sRes = await fetch(searchUrl, { headers: { "User-Agent": UA } });
            const sHtml = await sRes.text();

            // Arama sonucundan dizi linkini bul
            const diziLinkMatch = sHtml.match(/class="dizi-kutu">[^>]+href="([^"]+)"/i);
            if (!diziLinkMatch) return [];

            // Bölüm linkini oluştur (Standart DDizi yapısı)
            const episodeUrl = `${diziLinkMatch[1]}-${seasonNum}-sezon-${episodeNum}-bolum.html`;
            const epRes = await fetch(episodeUrl, { headers: { "User-Agent": UA } });
            const epHtml = await epRes.text();

            // 2. Player sayfasının gerçek ID'sini çek (f827... yerine o diziye özel olanı)
            const playerIdMatch = epHtml.match(/player\/oynat\/([a-f0-9]+)/i);
            if (!playerIdMatch) return [];

            const playerUrl = `https://www.ddizi.im/player/oynat/${playerIdMatch[1]}`;
            
            // 3. Player sayfasını çek (Loglardaki o 9004 baytlık sayfa)
            const pRes = await fetch(playerUrl, { 
                headers: { 
                    "User-Agent": UA,
                    "Referer": episodeUrl 
                } 
            });
            const pHtml = await pRes.text();

            let streams = [];

            // 4. ŞİFRE KIRICI (Base64/atob Dekoder)
            // Sayfa içindeki 'atob("...")' bloklarını bulur ve çözer
            const b64Regex = /atob\(["']([^"']{30,})["']\)/g;
            let m;
            while ((m = b64Regex.exec(pHtml)) !== null) {
                try {
                    const decoded = atob(m[1]); // Gizli HTML/Link burada çözülür
                    const srcMatch = decoded.match(/src=["']([^"']+)["']/i);
                    const finalUrl = srcMatch ? srcMatch[1] : (decoded.includes('http') ? decoded : null);

                    if (finalUrl) {
                        let streamUrl = finalUrl.startsWith('//') ? 'https:' + finalUrl : finalUrl;
                        
                        streams.push({
                            name: "DDizi " + (streamUrl.includes('vidmoly') ? "Vidmoly" : "Cloud"),
                            url: streamUrl,
                            quality: "1080p",
                            headers: {
                                "Referer": "https://www.ddizi.im/",
                                "User-Agent": UA
                            }
                        });
                    }
                } catch (e) {}
            }

            return streams;

        } catch (e) {
            return [];
        }
    };

    globalThis.getStreams = getStreams;
})();
