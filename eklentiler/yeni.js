/**
 * 666FilmIzle Scraper - v7.0 (Deep Debugging)
 * Sorunu anlamak için tüm adımları loglar.
 */

var cheerio = require("cheerio-without-node-native");

var BASE_URL = "https://666filmizle.site";
var TMDB_API_KEY = "500330721680edb6d5f7f12ba7cd9023";

async function getStreams(tmdbId, mediaType) {
    try {
        console.log("[666-DEBUG] Islem basladi. TMDB ID:", tmdbId);

        // 1. ADIM: TMDB'den film adını al
        const tmdbRes = await fetch(`https://api.themoviedb.org/3/movie/${tmdbId}?api_key=${TMDB_API_KEY}&language=tr-TR`);
        const movieData = await tmdbRes.json();
        const title = movieData.title;
        console.log("[666-DEBUG] Film Adi:", title);

        // 2. ADIM: Sitede arama yap
        const searchUrl = `${BASE_URL}/arama/?q=${encodeURIComponent(title)}`;
        console.log("[666-DEBUG] Arama URL:", searchUrl);
        
        const searchRes = await fetch(searchUrl);
        const searchHtml = await searchRes.text();
        const $search = cheerio.load(searchHtml);
        
        let filmPageUrl = "";
        $search(".film-card").each((i, el) => {
            const link = $search(el).find("a.film-card__link").attr("href");
            if (link) { 
                filmPageUrl = link.startsWith('http') ? link : BASE_URL + link;
                return false; 
            }
        });

        console.log("[666-DEBUG] Sitedeki Film Sayfasi:", filmPageUrl);

        if (!filmPageUrl) {
            console.error("[666-DEBUG] HATA: Film sayfasi bulunamadi!");
            return [];
        }

        // 3. ADIM: Film sayfasını analiz et (ID ve Frame yakalama)
        const pageRes = await fetch(filmPageUrl);
        const pageHtml = await pageRes.text();
        console.log("[666-DEBUG] Sayfa Kaynagi Alindi (Uzunluk):", pageHtml.length);

        const frameMatch = pageHtml.match(/data-frame="([^"]+)"/);
        console.log("[666-DEBUG] Ham data-frame verisi:", frameMatch ? frameMatch[1] : "BULUNAMADI");

        const streams = [];

        if (frameMatch) {
            const rawUrl = frameMatch[1];
            // ID'yi temizle (En kritik yer)
            const videoId = rawUrl.split(/[#/]/).filter(p => p.length > 5).pop()?.split('?')[0];
            
            if (videoId) {
                const finalM3U8 = `https://p.rapidplay.website/videos/${videoId}/master.m3u8`;
                console.log("[666-DEBUG] OLUSTURULAN FINAL URL:", finalM3U8);
                
                streams.push({
                    name: "Rapidplay (Debug)",
                    url: finalM3U8,
                    quality: "Auto",
                    isM3U8: true,
                    headers: { 'Referer': 'https://rapidplay.website/' },
                    provider: "666film"
                });
            } else {
                console.error("[666-DEBUG] HATA: Video ID ayiklanamadi! Ham URL:", rawUrl);
            }
        }

        // Vidmoly Kontrolü
        const vidmolyMatch = pageHtml.match(/https:\/\/vidmoly\.to\/embed-([^.]+)\.html/);
        if (vidmolyMatch) {
            console.log("[666-DEBUG] Vidmoly Kaynagi Bulundu:", vidmolyMatch[0]);
            streams.push({
                name: "Vidmoly (Debug)",
                url: vidmolyMatch[0],
                quality: "HD",
                provider: "666film"
            });
        }

        return streams;
    } catch (e) {
        console.error("[666-DEBUG] SISTEMSEL HATA:", e.message);
        return [];
    }
}

module.exports = { getStreams };
