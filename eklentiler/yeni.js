/**
 * 666FilmIzle Nuvio Scraper - v1.8
 * Örnek Yapı: /film/3094-the-gorge-izle/
 */

var BASE_URL = "https://666filmizle.site";

async function getStreams(data, mediaType, title) {
    return new Promise(async (resolve) => {
        // --- LOG ANALİZİ ---
        console.log("[666Film] Gelen Veri:", data);

        let targetUrl = "";

        // 1. DURUM: Eğer Nuvio doğrudan sayfa linkini gönderiyorsa
        if (typeof data === 'string' && data.includes("/film/")) {
            targetUrl = data.startsWith("http") ? data : BASE_URL + data;
            console.log("[666Film] Direkt Link Kullanılıyor:", targetUrl);
        } 
        // 2. DURUM: Eğer sadece isim veya ID geliyorsa arama yap
        else {
            let searchQuery = title || data;
            if (!searchQuery || searchQuery === "null") {
                console.error("[666Film] HATA: Arama için isim veya link gelmedi!");
                return resolve([]);
            }

            console.log("[666Film] İsim ile aranıyor:", searchQuery);
            const searchRes = await fetch(`${BASE_URL}/arama/?q=${encodeURIComponent(searchQuery)}`);
            const searchHtml = await searchRes.text();
            const match = searchHtml.match(/href="(\/film\/[^"]+)"/i);

            if (match && match[1]) {
                targetUrl = BASE_URL + match[1];
                console.log("[666Film] Arama Sonucu Bulundu:", targetUrl);
            }
        }

        // --- SAYFA ANALİZİ ---
        if (!targetUrl) {
            console.error("[666Film] İşlenecek bir URL bulunamadı.");
            return resolve([]);
        }

        try {
            const response = await fetch(targetUrl);
            const html = await response.text();
            const streams = [];

            // Rapidplay Ayıklama (Örn: #3094 kısmını çeker)
            const rapidRegex = /data-frame="([^"]*rapidplay\.website[^"]*)#([^"]+)"/g;
            let r;
            while ((r = rapidRegex.exec(html)) !== null) {
                streams.push({
                    name: "⌜ Rapidplay ⌟",
                    url: `https://p.rapidplay.website/videos/${r[2]}/master.m3u8`,
                    quality: "Auto",
                    headers: { 'Referer': 'https://p.rapidplay.website/' },
                    isM3U8: true
                });
            }

            // Standart Iframe Ayıklama
            const iframeRegex = /<iframe[^>]+src="([^"]+)"/g;
            let i;
            while ((i = iframeRegex.exec(html)) !== null) {
                let src = i[1];
                if (!src.includes("youtube") && !src.includes("google")) {
                    streams.push({
                        name: "⌜ Player ⌟",
                        url: src.startsWith("//") ? "https:" + src : src,
                        quality: "Auto"
                    });
                }
            }

            console.log(`[666Film] Bitti. ${streams.length} kaynak eklendi.`);
            resolve(streams);

        } catch (err) {
            console.error("[666Film] Sayfa hatası:", err.message);
            resolve([]);
        }
    });
}

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { getStreams: getStreams };
} else {
    global.getStreams = getStreams;
}
