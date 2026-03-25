/**
 * 666FilmIzle Nuvio Scraper - v1.6
 * Sorun: Gelen veriler 'null' görünüyor.
 * Çözüm: Parametreleri tek tek kontrol et ve fallback (yedek) mekanizması kur.
 */

var BASE_URL = "https://666filmizle.site";
var TMDB_KEY = "65c3f6f9662a67a030704945a0b93855";

async function getStreams(arg1, arg2, arg3) {
    return new Promise(async (resolve) => {
        // --- PARAMETRE ANALİZİ (Loglar hayat kurtarır) ---
        console.log("[666Film] Arg1:", arg1, "| Arg2:", arg2, "| Arg3:", arg3);

        let finalTitle = "";
        let finalId = "";
        let type = "movie";

        // 1. ADIM: Nuvio'nun gönderdiği karmaşık yapıyı çöz
        if (typeof arg1 === 'object' && arg1 !== null) {
            finalTitle = arg1.title || arg1.name;
            finalId = arg1.tmdbId || arg1.id;
        } else {
            finalId = arg1;
            finalTitle = arg3; // Genelde 3. parametre başlıktır
        }

        // 2. ADIM: Eğer hala null ise veya ID gelmişse TMDB'den ismi zorla al
        if (!finalTitle || finalTitle === "null" || !isNaN(finalTitle)) {
            if (finalId && finalId !== "null") {
                console.log("[666Film] İsim bulunamadı, ID üzerinden TMDB'ye gidiliyor:", finalId);
                try {
                    const res = await fetch(`https://api.themoviedb.org/3/movie/${finalId}?api_key=${TMDB_KEY}&language=tr-TR`);
                    const data = await res.json();
                    finalTitle = data.title || data.name;
                } catch (e) {
                    console.error("[666Film] TMDB Fetch Hatası!");
                }
            }
        }

        // 3. ADIM: Arama Yap (Final Check)
        if (!finalTitle || finalTitle === "null") {
            console.error("[666Film] HATA: Film ismi hiçbir şekilde elde edilemedi!");
            return resolve([]);
        }

        console.log("[666Film] Arama terimi kesinleşti:", finalTitle);
        const searchUrl = `${BASE_URL}/arama/?q=${encodeURIComponent(finalTitle)}`;

        try {
            const response = await fetch(searchUrl);
            const html = await response.text();

            // Film sayfası linkini bul (/film/...)
            const cardMatch = html.match(/href="(\/film\/[^"]+)"/i);

            if (cardMatch && cardMatch[1]) {
                const pageUrl = BASE_URL + cardMatch[1];
                console.log("[666Film] Sayfa Bulundu:", pageUrl);

                const pageRes = await fetch(pageUrl);
                const pageHtml = await pageRes.text();
                const streams = [];

                // Rapidplay (Kotlin Mantığı)
                const rapidRegex = /data-frame="([^"]*rapidplay\.website[^"]*)#([^"]+)"/g;
                let r;
                while ((r = rapidRegex.exec(pageHtml)) !== null) {
                    streams.push({
                        name: "⌜ Rapidplay ⌟",
                        url: `https://p.rapidplay.website/videos/${r[2]}/master.m3u8`,
                        quality: "Auto",
                        headers: { 'Referer': 'https://p.rapidplay.website/' },
                        isM3U8: true
                    });
                }

                // Standart Iframe
                const iframeRegex = /<iframe[^>]+src="([^"]+)"/g;
                let i;
                while ((i = iframeRegex.exec(pageHtml)) !== null) {
                    if (!i[1].includes("youtube") && !i[1].includes("google")) {
                        streams.push({
                            name: "⌜ Player ⌟",
                            url: i[1].startsWith("//") ? "https:" + i[1] : i[1],
                            quality: "Auto"
                        });
                    }
                }

                console.log(`[666Film] İşlem Tamam! Bulunan: ${streams.length}`);
                resolve(streams);
            } else {
                console.error("[666Film] Sitede sonuç yok:", finalTitle);
                resolve([]);
            }
        } catch (err) {
            console.error("[666Film] Akış Hatası:", err.message);
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
