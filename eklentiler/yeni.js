/**
 * 666FilmIzle Nuvio Scraper - v1.5
 * Çözüm: Sayısal ID gelirse TMDB'den isim çekip arama yapar.
 */

var BASE_URL = "https://666filmizle.site";
var TMDB_API_KEY = "65c3f6f9662a67a030704945a0b93855"; // Standart Cloudstream/Nuvio keyi

async function getStreams(tmdbId, mediaType, title) {
    return new Promise(async (resolve) => {
        let searchQuery = title;

        // 1. ADIM: Eğer isim gelmediyse veya sadece ID geldiyse TMDB'den ismi al
        if (!searchQuery || !isNaN(searchQuery) || searchQuery === tmdbId) {
            console.log("[666Film] İsim eksik, TMDB'den çekiliyor. ID:", tmdbId);
            try {
                const tmdbRes = await fetch(`https://api.themoviedb.org/3/${mediaType === 'tv' ? 'tv' : 'movie'}/${tmdbId}?api_key=${TMDB_API_KEY}&language=tr-TR`);
                const tmdbData = await tmdbRes.json();
                searchQuery = tmdbData.title || tmdbData.name;
                console.log("[666Film] TMDB'den bulunan isim:", searchQuery);
            } catch (e) {
                console.error("[666Film] TMDB Hatası:", e.message);
                searchQuery = tmdbId; // Mecbur ID ile dene
            }
        }

        console.log("[666Film] Arama başlatılıyor ->", searchQuery);

        // 2. ADIM: Sitede Arama Yap
        const searchUrl = `${BASE_URL}/arama/?q=${encodeURIComponent(searchQuery)}`;
        
        try {
            const response = await fetch(searchUrl);
            const html = await response.text();

            // Film linkini yakala
            const cardRegex = /href="(\/film\/[^"]+)"/i;
            const match = html.match(cardRegex);

            if (match && match[1]) {
                const finalUrl = BASE_URL + match[1];
                console.log("[666Film] Sayfa Bulundu! Çekiliyor:", finalUrl);
                
                // 3. ADIM: Sayfa içeriğini analiz et
                const pageRes = await fetch(finalUrl);
                const pageHtml = await pageRes.text();
                const streams = [];

                // Rapidplay Ayıklama
                const rapidRegex = /data-frame="([^"]*rapidplay\.website[^"]*)#([^"]+)"/g;
                let rMatch;
                while ((rMatch = rapidRegex.exec(pageHtml)) !== null) {
                    streams.push({
                        name: "⌜ Rapidplay ⌟",
                        url: `https://p.rapidplay.website/videos/${rMatch[2]}/master.m3u8`,
                        quality: "Auto",
                        headers: { 'Referer': 'https://p.rapidplay.website/' },
                        isM3U8: true
                    });
                }

                // Diğer Iframe'ler
                const iframeRegex = /<iframe[^>]+src="([^"]+)"/g;
                let iMatch;
                while ((iMatch = iframeRegex.exec(pageHtml)) !== null) {
                    const src = iMatch[1];
                    if (!src.includes("youtube") && !src.includes("google")) {
                        streams.push({
                            name: "⌜ Alternatif ⌟",
                            url: src.startsWith("//") ? "https:" + src : src,
                            quality: "Auto"
                        });
                    }
                }

                console.log(`[666Film] Başarılı! ${streams.length} kaynak bulundu.`);
                resolve(streams);
            } else {
                console.error("[666Film] Sitede bu isimle sonuç yok:", searchQuery);
                resolve([]);
            }
        } catch (err) {
            console.error("[666Film] Genel İşlem Hatası:", err.message);
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
