/**
 * Provider: DDizi (v68 - Dedicated Fix)
 */
(function() {
    const getStreams = async (tmdbId, mediaType, seasonNum, episodeNum) => {
        const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
        
        try {
            // 1. TMDB'den dizi adını alıp DDizi'de aratıyoruz (ID'yi dinamik bulmak için)
            const tmdbRes = await fetch(`https://api.themoviedb.org/3/${mediaType}/${tmdbId}?language=tr-TR&api_key=4ef0d7355d9ffb5151e987764708ce96`);
            const tmdbData = await tmdbRes.json();
            const query = tmdbData.name || tmdbData.title;

            // DDizi Arama
            const searchUrl = `https://www.ddizi.im/arama/?q=${encodeURIComponent(query)}`;
            const sRes = await fetch(searchUrl, { headers: { "User-Agent": UA } });
            const sHtml = await sRes.text();

            // Dizi ana sayfasını bul
            const diziLinkMatch = sHtml.match(/class="dizi-kutu">[^>]+href="([^"]+)"/i);
            if (!diziLinkMatch) return [];

            // Bölüm sayfasını oluştur (DDizi standart yapısı: dizi-adi-sezon-X-bolum-Y.html)
            const episodeUrl = `${diziLinkMatch[1]}-${seasonNum}-sezon-${episodeNum}-bolum.html`;
            const epRes = await fetch(episodeUrl, { headers: { "User-Agent": UA } });
            const epHtml = await epRes.text();

            // 2. Player sayfasının ID'sini çek (Loglardaki f827... gibi olan ID)
            const playerIdMatch = epHtml.match(/player\/oynat\/([a-f0-9]+)/i);
            if (!playerIdMatch) return [];

            const playerUrl = `https://www.ddizi.im/player/oynat/${playerIdMatch[1]}`;
            
            // 3. Şifreli player sayfasını oku
            const pRes = await fetch(playerUrl, { 
                headers: { 
                    "User-Agent": UA,
                    "Referer": episodeUrl,
                    "X-Requested-With": "XMLHttpRequest"
                } 
            });
            const pHtml = await pRes.text();

            let streams = [];

            // 4. ŞİFRE ÇÖZÜCÜ (atob/Base64 Kırma)
            // DDizi linki 'atob("YmFzZTY0...")' şeklinde saklar.
            const b64Regex = /atob\(["']([^"']{20,})["']\)/g;
            let match;
            while ((match = b64Regex.exec(pHtml)) !== null) {
                try {
                    const decoded = atob(match[1]); // Şifreyi burada kırıyoruz
                    
                    // Decode edilen metin genelde bir <iframe src="..."> bloğudur
                    const finalUrlMatch = decoded.match(/src=["']([^"']+)["']/i);
                    const finalUrl = finalUrlMatch ? finalUrlMatch[1] : (decoded.includes('http') ? decoded : null);

                    if (finalUrl) {
                        let streamUrl = finalUrl.startsWith('//') ? 'https:' + finalUrl : finalUrl;
                        
                        streams.push({
                            name: "DDizi " + (streamUrl.includes('vidmoly') ? "Vidmoly" : "Moly"),
                            url: streamUrl,
                            quality: "1080p",
                            headers: {
                                "Referer": "https://www.ddizi.im/",
                                "User-Agent": UA
                            }
                        });
                    }
                } catch (e) {
                    console.error("Decode hatası:", e);
                }
            }

            return streams;

        } catch (e) {
            return [];
        }
    };

    globalThis.getStreams = getStreams;
})();
